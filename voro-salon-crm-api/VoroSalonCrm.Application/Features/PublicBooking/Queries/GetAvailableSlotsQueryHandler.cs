using MediatR;
using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;

namespace VoroSalonCrm.Application.Features.PublicBooking.Queries;

public class GetAvailableSlotsQueryHandler(
    ITenantRepository tenantRepository,
    IServiceRepository serviceRepository,
    ITenantBusinessHoursRepository businessHoursRepository,
    IAppointmentRepository appointmentRepository,
    ITimeSlotBlockRepository timeSlotBlockRepository,
    IEmployeeRepository employeeRepository
) : IRequestHandler<GetAvailableSlotsQuery, IEnumerable<AvailabilitySlotDto>>
{
    public async Task<IEnumerable<AvailabilitySlotDto>> Handle(GetAvailableSlotsQuery request, CancellationToken cancellationToken)
    {
        var tenant = await tenantRepository.GetBySlugAsync(request.TenantSlug);
        if (tenant == null) return [];

        var tenantSlug = request.TenantSlug;
        var date = request.Date;
        var serviceId = request.ServiceId;
        var employeeId = request.EmployeeId;
        var serviceIds = request.ServiceIds;

        // Resolve total service duration for conflict window calculation
        // serviceIds takes precedence over single serviceId
        int serviceDurationMinutes = 30;
        var effectiveServiceIds = (serviceIds != null && serviceIds.Count > 0)
            ? serviceIds
            : (serviceId.HasValue && serviceId.Value != Guid.Empty ? [serviceId.Value] : new List<Guid>());

        if (effectiveServiceIds.Count > 0)
        {
            int sumDuration = 0;
            Guid? firstValidId = null;
            foreach (var sid in effectiveServiceIds)
            {
                var svc = await serviceRepository.GetPublicByIdAsync(tenant.Id, sid);
                if (svc != null)
                {
                    sumDuration += svc.DurationMinutes;
                    firstValidId ??= sid;
                }
            }
            if (sumDuration > 0)
                serviceDurationMinutes = sumDuration;

            // Use first valid serviceId for employee count query when no specific employeeId
            if (firstValidId.HasValue && (!serviceId.HasValue || serviceId.Value == Guid.Empty))
                serviceId = firstValidId;
        }

        var nowBrasilia = DateTimeOffset.UtcNow.ToOffset(TimeSpan.FromHours(-3));

        // Fetch configured business hours for this tenant and day
        var dayOfWeek = (int)date.DayOfWeek;
        var allHours = await businessHoursRepository.GetByTenantAsync(tenant.Id);
        var dayHours = allHours.FirstOrDefault(h => h.DayOfWeek == dayOfWeek);

        // Se o dia está marcado como fechado, retorna vazio
        if (dayHours != null && !dayHours.IsOpen)
            return [];

        // Build sorted ranges (or use default if none configured)
        var orderedRanges = dayHours?.Ranges.OrderBy(r => r.SortOrder).ToList() ?? [];
        if (orderedRanges.Count == 0)
            orderedRanges.Add(new TenantBusinessHoursRange { OpenTime = "08:00", CloseTime = "18:00" });

        static DateTimeOffset ParseRangeTime(DateTime d, string time, TimeSpan tz)
        {
            var parts = time.Split(':');
            return new DateTimeOffset(d.Year, d.Month, d.Day,
                int.Parse(parts[0]), int.Parse(parts[1]), 0, tz);
        }

        var tz = TimeSpan.FromHours(-3);
        var firstRangeStart = ParseRangeTime(date, orderedRanges.First().OpenTime, tz);
        var lastRangeEnd    = ParseRangeTime(date, orderedRanges.Last().CloseTime, tz);

        // Full day window for appointment/block queries
        var dayStartUtc = firstRangeStart.ToUniversalTime();
        var dayEndUtc   = lastRangeEnd.ToUniversalTime();

        var query = appointmentRepository.Query(a =>
            a.TenantId == tenant.Id &&
            a.ScheduledDateTime >= dayStartUtc &&
            a.ScheduledDateTime < dayEndUtc &&
            a.Status != AppointmentStatus.Cancelled)
            .IgnoreQueryFilters();

        if (employeeId.HasValue && employeeId.Value != Guid.Empty)
            query = query.Where(a => a.EmployeeId == employeeId.Value);

        var appointments = await query.ToListAsync(cancellationToken);

        var blocks = await timeSlotBlockRepository
            .Query(b => b.TenantId == tenant.Id && b.StartDateTime < dayEndUtc && b.EndDateTime > dayStartUtc)
            .IgnoreQueryFilters()
            .ToListAsync(cancellationToken);

        int activeEmployeesCount;
        if (employeeId.HasValue && employeeId.Value != Guid.Empty)
        {
            activeEmployeesCount = 1;
        }
        else if (serviceId.HasValue && serviceId.Value != Guid.Empty)
        {
            activeEmployeesCount = await employeeRepository.Query(e =>
                e.TenantId == tenant.Id &&
                e.IsActive &&
                e.Specialties.Any(es => es.ServiceId == serviceId.Value))
                .IgnoreQueryFilters()
                .CountAsync(cancellationToken);
        }
        else
        {
            activeEmployeesCount = await employeeRepository.Query(e => e.TenantId == tenant.Id && e.IsActive)
                .IgnoreQueryFilters()
                .CountAsync(cancellationToken);
        }

        if (activeEmployeesCount <= 0 && (!employeeId.HasValue || employeeId.Value == Guid.Empty))
            activeEmployeesCount = 1;

        var slots = new List<AvailabilitySlotDto>();

        // Generate slots per range (supports lunch break gaps)
        foreach (var range in orderedRanges)
        {
            var rangeStart = ParseRangeTime(date, range.OpenTime, tz);
            var rangeEnd   = ParseRangeTime(date, range.CloseTime, tz);

            // For today, skip past slots
            var effectiveStart = rangeStart;
            if (date.Date == nowBrasilia.Date && nowBrasilia > rangeStart)
            {
                var minutesCeil = (int)Math.Ceiling(nowBrasilia.Minute / 30.0) * 30;
                effectiveStart = new DateTimeOffset(date.Year, date.Month, date.Day, nowBrasilia.Hour, 0, 0, tz)
                    .AddMinutes(minutesCeil);
                if (effectiveStart >= rangeEnd) continue;
            }

            var startUtc = rangeStart.ToUniversalTime();
            var endUtc   = rangeEnd.ToUniversalTime();
            var current  = effectiveStart.ToUniversalTime();

            while (current < endUtc)
            {
                var next    = current.AddMinutes(30);
                var slotEnd = current.AddMinutes(serviceDurationMinutes);

                // Slot não cabe dentro do horário de funcionamento — encerra este range
                if (slotEnd > endUtc)
                    break;

                var overlappingBlock = blocks.FirstOrDefault(b => b.StartDateTime < next && b.EndDateTime > current);
                if (overlappingBlock != null)
                {
                    slots.Add(new AvailabilitySlotDto(current, next, false, true, overlappingBlock.Reason));
                    current = next;
                    continue;
                }

                bool isBusy;
                if (activeEmployeesCount <= 0)
                {
                    isBusy = true;
                }
                else if (employeeId.HasValue && employeeId.Value != Guid.Empty)
                {
                    isBusy = appointments.Any(a =>
                        current < a.ScheduledDateTime.AddMinutes(a.DurationMinutes) &&
                        slotEnd > a.ScheduledDateTime);
                }
                else
                {
                    var overlappingCount = appointments.Count(a =>
                        current < a.ScheduledDateTime.AddMinutes(a.DurationMinutes) &&
                        slotEnd > a.ScheduledDateTime);
                    isBusy = overlappingCount >= activeEmployeesCount;
                }

                slots.Add(new AvailabilitySlotDto(current, next, !isBusy));
                current = next;
            }
        }

        return slots;
    }
}

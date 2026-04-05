using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.DTOs.Public;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class PublicBookingService(
        ITenantRepository tenantRepository,
        IClientRepository clientRepository,
        IServiceRepository serviceRepository,
        IEmployeeRepository employeeRepository,
        IAppointmentRepository appointmentRepository,
        IUnitOfWork unitOfWork,
        IUserTenantRepository userTenantRepository,
        IExpoPushNotificationService expoPushNotificationService,
        ITimeSlotBlockRepository timeSlotBlockRepository,
        ITenantModuleRepository tenantModuleRepository,
        ITenantSubscriptionRepository tenantSubscriptionRepository,
        ITenantBusinessHoursRepository businessHoursRepository,
        IServicePromotionRepository servicePromotionRepository,
        IClientRatingRepository clientRatingRepository) : IPublicBookingService
    {
        private readonly IUserTenantRepository _userTenantRepository = userTenantRepository;
        private readonly IExpoPushNotificationService _expoPushNotificationService = expoPushNotificationService;
        private readonly ITimeSlotBlockRepository _timeSlotBlockRepository = timeSlotBlockRepository;
        private readonly ITenantModuleRepository _tenantModuleRepository = tenantModuleRepository;
        private readonly ITenantSubscriptionRepository _tenantSubscriptionRepository = tenantSubscriptionRepository;
        private readonly IServicePromotionRepository _servicePromotionRepository = servicePromotionRepository;
        private readonly IClientRatingRepository _clientRatingRepository = clientRatingRepository;

        public async Task<PublicTenantDto?> GetTenantBySlugAsync(string slug)
        {
            var tenant = await tenantRepository.GetBySlugAsync(slug);
            if (tenant == null) return null;

            // Check plan feature flag first
            var subscription = await _tenantSubscriptionRepository.GetByTenantIdWithPlanAsync(tenant.Id);
            var planHasBooking = subscription?.Plan?.HasBooking ?? false; // default false if no subscription found

            // Also check the module toggle (can be disabled manually)
            // var bookingModule = await _tenantModuleRepository.GetModuleAsync(tenant.Id, AppModule.Booking);
            // var moduleEnabled = bookingModule == null || bookingModule.IsEnabled;

            // var isBookingEnabled = planHasBooking && moduleEnabled;
            var isBookingEnabled = planHasBooking;

            return new PublicTenantDto(
                tenant.Id,
                tenant.Name,
                tenant.Slug,
                tenant.ContactPhone,
                tenant.LogoUrl,
                tenant.PrimaryColor,
                tenant.SecondaryColor,
                tenant.ThemeMode?.ToString(),
                isBookingEnabled
            );
        }

        public async Task<PublicClientDto?> CheckClientByPhoneAsync(string tenantSlug, string phone)
        {
            var tenant = await tenantRepository.GetBySlugAsync(tenantSlug);
            if (tenant == null) return null;

            var client = await clientRepository.GetByPhoneAsync(tenant.Id, phone);
            if (client == null) return null;

            return new PublicClientDto(client.Id, client.Name, client.Phone ?? string.Empty);
        }

        public async Task<IEnumerable<PublicServiceDto>> GetServicesByTenantAsync(string tenantSlug)
        {
            var tenant = await tenantRepository.GetBySlugAsync(tenantSlug);
            if (tenant == null) return Enumerable.Empty<PublicServiceDto>();

            var services = await serviceRepository.GetPublicActiveByTenantAsync(tenant.Id);

            var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-3));
            var todayDow = (int)today.DayOfWeek;

            var promotions = await _servicePromotionRepository
                .Query(p =>
                    p.TenantId == tenant.Id &&
                    p.IsActive &&
                    p.DaysOfWeek.Contains(todayDow) &&
                    (p.ValidFrom == null || p.ValidFrom <= today) &&
                    (p.ValidUntil == null || p.ValidUntil >= today))
                .IgnoreQueryFilters()
                .ToListAsync();

            return services.Select(s =>
            {
                var promo = promotions.FirstOrDefault(p => p.ServiceId == s.Id);
                return new PublicServiceDto(s.Id, s.Name, s.Price, s.DurationMinutes,
                    promo?.PromotionalPrice, promo != null);
            });
        }

        public async Task<IEnumerable<PublicEmployeeDto>> GetEmployeesByServiceAsync(string tenantSlug, Guid serviceId)
        {
            var tenant = await tenantRepository.GetBySlugAsync(tenantSlug);
            if (tenant == null) return Enumerable.Empty<PublicEmployeeDto>();

            var employees = await employeeRepository.GetPublicEmployeesByServiceAsync(tenant.Id, serviceId);

            return employees.Select(e => new PublicEmployeeDto(e.Id, e.Name, e.PhotoUrl));
        }

        public async Task<PublicBookingResponseDto> CreateBookingAsync(PublicBookingCreateDto dto)
        {
            var tenant = await tenantRepository.GetBySlugAsync(dto.TenantSlug);
            if (tenant == null) return new PublicBookingResponseDto(false, "Estabelecimento não encontrado.", null);

            var service = await serviceRepository.GetPublicByIdAsync(tenant.Id, dto.ServiceId);

            if (service == null) return new PublicBookingResponseDto(false, "Serviço não encontrado.", null);

            // Resolve promotional price if applicable today
            var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-3));
            var todayDow = (int)today.DayOfWeek;
            var activePromo = await _servicePromotionRepository
                .Query(p =>
                    p.TenantId == tenant.Id &&
                    p.ServiceId == service.Id &&
                    p.IsActive &&
                    p.DaysOfWeek.Contains(todayDow) &&
                    (p.ValidFrom == null || p.ValidFrom <= today) &&
                    (p.ValidUntil == null || p.ValidUntil >= today))
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync();
            var resolvedPrice = activePromo?.PromotionalPrice ?? service.Price;

            var client = await clientRepository.GetByPhoneAsync(tenant.Id, dto.ClientPhone);
            if (client == null)
            {
                client = new Client
                {
                    TenantId = tenant.Id,
                    Name = dto.ClientName,
                    Phone = dto.ClientPhone,
                    CreatedAt = DateTimeOffset.UtcNow
                };
                await clientRepository.AddAsync(client);
                await unitOfWork.CommitAsync();
            }

            var appointment = new Appointment
            {
                TenantId = tenant.Id,
                ClientId = client.Id,
                ServiceId = dto.ServiceId,
                EmployeeId = dto.EmployeeId,
                ScheduledDateTime = dto.ScheduledDateTime.ToUniversalTime(),
                DurationMinutes = service.DurationMinutes,
                Amount = resolvedPrice,
                Status = AppointmentStatus.Pending,
                CreatedAt = DateTimeOffset.UtcNow,
                Description = dto.Description,
                Notes = dto.Notes,
                ReminderMinutes = dto.ReminderMinutes,
            };

            await appointmentRepository.AddAsync(appointment);
            await unitOfWork.CommitAsync();

            // Notify tenant owners about the new booking
            try
            {
                var ownerTenants = await _userTenantRepository.GetAllAsync(
                    ut => ut.TenantId == tenant.Id);

                var ownerIds = ownerTenants.Select(ut => ut.UserId).ToList();

                if (ownerIds.Count > 0)
                {
                    var localTime = appointment.ScheduledDateTime.ToOffset(TimeSpan.FromHours(-3));
                    var dateStr = localTime.ToString("dd/MM/yyyy");
                    var timeStr = localTime.ToString("HH:mm");

                    await _expoPushNotificationService.SendToUsersAsync(
                        ownerIds,
                        "Novo Agendamento!",
                        $"{client.Name} agendou {service.Name} para {dateStr} às {timeStr}",
                        new { appointmentId = appointment.Id },
                        tenant.Id,
                        "new_appointment",
                        appointment.Id);
                }
            }
            catch (Exception)
            {
                // Do not fail the booking if push notifications fail
            }

            return new PublicBookingResponseDto(true, "Agendamento realizado com sucesso!", appointment.Id);
        }

        public async Task<IEnumerable<DTOs.CRM.AvailabilitySlotDto>> GetAvailableSlotsAsync(string tenantSlug, DateTime date, Guid? serviceId = null, Guid? employeeId = null)
        {
            var tenant = await tenantRepository.GetBySlugAsync(tenantSlug);
            if (tenant == null) return [];

            // Resolve service duration for conflict window calculation
            int serviceDurationMinutes = 30;
            if (serviceId.HasValue && serviceId.Value != Guid.Empty)
            {
                var service = await serviceRepository.GetPublicByIdAsync(tenant.Id, serviceId.Value);
                if (service != null)
                    serviceDurationMinutes = service.DurationMinutes;
            }

            var nowBrasilia = DateTimeOffset.UtcNow.ToOffset(TimeSpan.FromHours(-3));

            // Fetch configured business hours for this tenant and day
            var dayOfWeek = (int)date.DayOfWeek;
            var allHours = await businessHoursRepository.GetByTenantAsync(tenant.Id);
            var dayHours = allHours.FirstOrDefault(h => h.DayOfWeek == dayOfWeek);

            // If day is configured and marked as closed, return no slots
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

            var appointments = await query.ToListAsync();

            var blocks = await _timeSlotBlockRepository
                .Query(b => b.TenantId == tenant.Id && b.StartDateTime < dayEndUtc && b.EndDateTime > dayStartUtc)
                .IgnoreQueryFilters()
                .ToListAsync();

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
                    .CountAsync();
            }
            else
            {
                activeEmployeesCount = await employeeRepository.Query(e => e.TenantId == tenant.Id && e.IsActive)
                    .IgnoreQueryFilters()
                    .CountAsync();
            }

            if (activeEmployeesCount <= 0 && (!employeeId.HasValue || employeeId.Value == Guid.Empty))
                activeEmployeesCount = 1;

            var slots = new List<DTOs.CRM.AvailabilitySlotDto>();

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

                    if (slotEnd > endUtc)
                    {
                        slots.Add(new DTOs.CRM.AvailabilitySlotDto(current, next, false));
                        current = next;
                        continue;
                    }

                    var overlappingBlock = blocks.FirstOrDefault(b => b.StartDateTime < next && b.EndDateTime > current);
                    if (overlappingBlock != null)
                    {
                        slots.Add(new DTOs.CRM.AvailabilitySlotDto(current, next, false, true, overlappingBlock.Reason));
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

                    slots.Add(new DTOs.CRM.AvailabilitySlotDto(current, next, !isBusy));
                    current = next;
                }
            }

            return slots;
        }

        public async Task<PublicReceiptDto?> GetAppointmentReceiptAsync(Guid id)
        {
            var appointment = await appointmentRepository.Query(a => a.Id == id)
                .Include(a => a.Client)
                .Include(a => a.Service)
                .Include(a => a.Employee)
                .Include(a => a.Tenant)
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync();

            if (appointment == null) return null;

            var tenantDto = await GetTenantBySlugAsync(appointment.Tenant.Slug);
            if (tenantDto == null) return null;

            // Agenda do dia para o cliente ver o contexto (mostra slots ocupados/livres)
            var dayAgenda = await GetAvailableSlotsAsync(
                appointment.Tenant.Slug, 
                appointment.ScheduledDateTime.Date, 
                appointment.ServiceId, 
                appointment.EmployeeId);

            var existingRating = await _clientRatingRepository
                .Query(r => r.AppointmentId == appointment.Id)
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync();

            var canRate = appointment.Status == AppointmentStatus.Completed && existingRating == null;

            return new PublicReceiptDto(
                appointment.Id,
                appointment.Client.Name,
                appointment.Service?.Name ?? "Serviço",
                appointment.Employee?.Name,
                appointment.ScheduledDateTime,
                appointment.DurationMinutes,
                appointment.Amount,
                appointment.Status.ToString(),
                tenantDto,
                dayAgenda,
                existingRating?.Stars,
                canRate
            );
        }
    }
}

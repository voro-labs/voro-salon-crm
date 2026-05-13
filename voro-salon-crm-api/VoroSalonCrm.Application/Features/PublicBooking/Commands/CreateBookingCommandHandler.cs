using MediatR;
using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using AppointmentServiceEntity = VoroSalonCrm.Domain.Entities.AppointmentService;

namespace VoroSalonCrm.Application.Features.PublicBooking.Commands;

public class CreateBookingCommandHandler(
    ITenantRepository tenantRepository,
    IServiceRepository serviceRepository,
    IServicePromotionRepository servicePromotionRepository,
    IClientRepository clientRepository,
    IAppointmentRepository appointmentRepository,
    IUnitOfWork unitOfWork,
    IUserTenantRepository userTenantRepository,
    IExpoPushNotificationService expoPushNotificationService
) : IRequestHandler<CreateBookingCommand, PublicBookingResponseDto>
{
    public async Task<PublicBookingResponseDto> Handle(CreateBookingCommand request, CancellationToken cancellationToken)
    {
        var dto = request.Dto;

        var tenant = await tenantRepository.GetBySlugAsync(dto.TenantSlug);
        if (tenant == null) return new PublicBookingResponseDto(false, "Estabelecimento não encontrado.", null);

        var serviceIds = dto.ResolvedServiceIds();

        // Load all requested services (pode ser vazio quando múltiplos serviços vêm na description)
        var services = new List<Service>();
        foreach (var sid in serviceIds)
        {
            var svc = await serviceRepository.GetPublicByIdAsync(tenant.Id, sid);
            if (svc == null)
                return new PublicBookingResponseDto(false, $"Serviço não encontrado: {sid}.", null);
            services.Add(svc);
        }

        // Resolve promotional prices and sum totals
        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-3));
        var todayDow = (int)today.DayOfWeek;
        decimal totalAmount = 0;
        int totalDuration = 0;

        if (services.Count > 0)
        {
            foreach (var svc in services)
            {
                var activePromo = await servicePromotionRepository
                    .Query(p =>
                        p.TenantId == tenant.Id &&
                        p.ServiceId == svc.Id &&
                        p.IsActive &&
                        p.DaysOfWeek.Contains(todayDow) &&
                        (p.ValidFrom == null || p.ValidFrom <= today) &&
                        (p.ValidUntil == null || p.ValidUntil >= today))
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(cancellationToken);

                totalAmount += activePromo?.PromotionalPrice ?? svc.Price;
                totalDuration += svc.DurationMinutes;
            }
        }
        else
        {
            // Múltiplos serviços sem IDs: usa os valores informados pelo frontend
            totalAmount = dto.TotalAmount ?? 0;
            totalDuration = dto.TotalDurationMinutes ?? 0;
        }

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
            await unitOfWork.CommitAsync(cancellationToken);
        }

        // --- Idempotency check: return existing appointment if a duplicate arrives within 30 seconds ---
        var scheduledUtc = dto.ScheduledDateTime.ToUniversalTime();
        var deduplicationWindow = DateTimeOffset.UtcNow.AddSeconds(-30);
        var existingAppointment = await appointmentRepository
            .Query(a =>
                a.TenantId == tenant.Id &&
                a.ClientId == client.Id &&
                a.EmployeeId == dto.EmployeeId &&
                a.ScheduledDateTime == scheduledUtc &&
                a.CreatedAt >= deduplicationWindow)
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(cancellationToken);

        if (existingAppointment != null)
            return new PublicBookingResponseDto(true, "Agendamento realizado com sucesso!", existingAppointment.Id);

        // ServiceId = primeiro serviço quando houver, null quando múltiplos (nomes vêm na Description)
        var primaryService = services.Count > 0 ? services[0] : null;

        var appointment = new Appointment
        {
            TenantId = tenant.Id,
            ClientId = client.Id,
            ServiceId = primaryService?.Id,
            EmployeeId = dto.EmployeeId,
            ScheduledDateTime = dto.ScheduledDateTime.ToUniversalTime(),
            DurationMinutes = totalDuration,
            Amount = totalAmount,
            Status = AppointmentStatus.Pending,
            CreatedAt = DateTimeOffset.UtcNow,
            Description = dto.Description,
            Notes = dto.Notes,
            ReminderMinutes = dto.ReminderMinutes,
            Source = dto.Source,
        };

        await appointmentRepository.AddAsync(appointment);
        await unitOfWork.CommitAsync(cancellationToken);

        // Insert AppointmentServices join records
        foreach (var svc in services)
        {
            var appointmentService = new AppointmentServiceEntity
            {
                AppointmentId = appointment.Id,
                ServiceId = svc.Id,
            };
            await appointmentRepository.AddAppointmentServiceAsync(appointmentService);
        }
        await unitOfWork.CommitAsync(cancellationToken);

        // Notify tenant owners about the new booking
        try
        {
            var ownerTenants = await userTenantRepository.GetAllAsync(
                ut => ut.TenantId == tenant.Id);

            var ownerIds = ownerTenants.Select(ut => ut.UserId).ToList();

            if (ownerIds.Count > 0)
            {
                var localTime = appointment.ScheduledDateTime.ToOffset(TimeSpan.FromHours(-3));
                var dateStr = localTime.ToString("dd/MM/yyyy");
                var timeStr = localTime.ToString("HH:mm");

                var servicesSummary = services.Count > 0
                    ? (services.Count == 1 ? services[0].Name : string.Join(", ", services.Select(s => s.Name)))
                    : (dto.Description ?? "Múltiplos serviços");

                await expoPushNotificationService.SendToUsersAsync(
                    ownerIds,
                    "Novo Agendamento!",
                    $"{client.Name} agendou {servicesSummary} para {dateStr} às {timeStr}",
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
}

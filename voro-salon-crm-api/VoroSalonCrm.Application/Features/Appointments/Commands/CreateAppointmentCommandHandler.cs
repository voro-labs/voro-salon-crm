using MediatR;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Cache;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Features.Appointments.Commands;

public class CreateAppointmentCommandHandler(
    IAppointmentRepository appointmentRepository,
    IUnitOfWork            unitOfWork,
    ICurrentUserService    currentUserService,
    ICacheService          cacheService)
    : IRequestHandler<CreateAppointmentCommand, AppointmentDto>
{
    public async Task<AppointmentDto> Handle(CreateAppointmentCommand request, CancellationToken cancellationToken)
    {
        var tenantId = currentUserService.TenantId;
        if (tenantId == Guid.Empty)
            throw new UnauthorizedAccessException("Tenant invalid or not found in context.");

        var dto = request.Dto;
        var appointment = new Appointment
        {
            Id                = Guid.NewGuid(),
            TenantId          = tenantId,
            ClientId          = dto.ClientId,
            ServiceId         = dto.ServiceId,
            ScheduledDateTime = dto.ScheduledDateTime,
            DurationMinutes   = dto.DurationMinutes,
            Status            = dto.Status ?? AppointmentStatus.Confirmed,
            Description       = dto.Description,
            Amount            = dto.Amount,
            Notes             = dto.Notes,
            IsEncaixe         = dto.IsEncaixe,
            Source            = dto.Source,
            CreatedAt         = DateTimeOffset.UtcNow
        };

        if (dto.ServiceIds?.Count > 0)
        {
            foreach (var serviceId in dto.ServiceIds)
                appointment.Services.Add(new Domain.Entities.AppointmentService
                {
                    AppointmentId = appointment.Id,
                    ServiceId     = serviceId
                });

            if (dto.ServiceIds.Count == 1 && !dto.ServiceId.HasValue)
                appointment.ServiceId = dto.ServiceIds[0];
        }

        await appointmentRepository.AddAsync(appointment);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        await cacheService.RemoveAsync($"dashboard:tenant:{tenantId}", cancellationToken);

        var full = await appointmentRepository.GetByIdAsync(
            a => a.Id == appointment.Id && !a.IsDeleted, asNoTracking: true);

        return full is null
            ? throw new Exception("Error retrieving created appointment.")
            : MapToDto(full);
    }

    private static AppointmentDto MapToDto(Appointment a)
    {
        var services = a.Services.Count > 0
            ? a.Services.Select(s => new AppointmentServiceDto(
                s.ServiceId, s.Service?.Name ?? "", s.Service?.Price ?? 0, s.Service?.DurationMinutes ?? 0)).ToList()
            : null;

        return new AppointmentDto(
            a.Id, a.ClientId, a.Client?.Name ?? "Unknown", a.Client?.Phone,
            a.ServiceId, a.Service?.Name, a.ScheduledDateTime, a.DurationMinutes, a.Status,
            a.Description, a.Amount, a.Notes, a.CreatedAt,
            a.IsEncaixe, a.ClientMembershipId,
            a.Membership?.Plan?.Name, a.Membership?.RemainingSessions,
            a.EmployeeId, a.Employee?.Name, a.Source, services);
    }
}

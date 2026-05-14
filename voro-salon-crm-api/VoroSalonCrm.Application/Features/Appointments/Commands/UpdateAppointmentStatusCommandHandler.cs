using MediatR;
using VoroSalonCrm.Application.Features.Appointments.Notifications;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Cache;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Features.Appointments.Commands;

public class UpdateAppointmentStatusCommandHandler(
    IAppointmentRepository appointmentRepository,
    IUnitOfWork            unitOfWork,
    ICacheService          cacheService,
    IMediator              mediator,
    IServiceRecordService  serviceRecordService)
    : IRequestHandler<UpdateAppointmentStatusCommand, bool>
{
    public async Task<bool> Handle(UpdateAppointmentStatusCommand request, CancellationToken cancellationToken)
    {
        var appointment = await appointmentRepository.GetByIdAsync(
            a => a.Id == request.AppointmentId && !a.IsDeleted, asNoTracking: false);

        if (appointment is null)
            return false;

        var oldStatus = appointment.Status;
        appointment.Status    = request.Status;
        appointment.UpdatedAt = DateTimeOffset.UtcNow;

        appointmentRepository.Update(appointment);

        await unitOfWork.SaveChangesAsync(cancellationToken);
        await cacheService.RemoveAsync($"dashboard:tenant:{appointment.TenantId}", cancellationToken);

        if (oldStatus != AppointmentStatus.Completed && request.Status == AppointmentStatus.Completed)
        {
            // Só gera lançamento financeiro automático para agendamentos de hoje em diante.
            // Agendamentos com data passada marcados como concluídos são entradas retroativas
            // e não devem gerar lançamento automático para evitar duplicidade.
            var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-3));
            var appointmentDate = DateOnly.FromDateTime(appointment.ScheduledDateTime.UtcDateTime.AddHours(-3));

            if (appointmentDate >= today)
            {
                await mediator.Publish(new AppointmentCompletedNotification(
                    AppointmentId : appointment.Id,
                    TenantId      : appointment.TenantId,
                    ClientId      : appointment.ClientId,
                    ServiceId     : appointment.ServiceId,
                    EmployeeId    : appointment.EmployeeId,
                    Amount        : appointment.Amount,
                    ScheduledAt   : appointment.ScheduledDateTime,
                    ServiceName   : appointment.Service?.Name,
                    ClientName    : appointment.Client?.Name,
                    Description   : appointment.Description), cancellationToken);
            }
        }
        else if (oldStatus == AppointmentStatus.Completed &&
            (request.Status == AppointmentStatus.Pending || request.Status == AppointmentStatus.Cancelled))
        {
            await serviceRecordService.DeleteByAppointmentIdAsync(appointment.Id);
        }

        return true;
    }
}

using MediatR;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.Services.Interfaces;

namespace VoroSalonCrm.Application.Features.Appointments.Notifications;

public class AppointmentHistoryHandler(IServiceRecordService serviceRecordService)
    : INotificationHandler<AppointmentCompletedNotification>
{
    public async Task Handle(AppointmentCompletedNotification notification, CancellationToken cancellationToken)
    {
        var alreadyExists = await serviceRecordService.ExistsByAppointmentIdAsync(notification.AppointmentId);
        if (alreadyExists)
            return;

        await serviceRecordService.CreateAsync(new CreateServiceRecordDto(
            ClientId:      notification.ClientId,
            ServiceId:     notification.ServiceId,
            AppointmentId: notification.AppointmentId,
            ServiceDate:   notification.ScheduledAt,
            Description:   notification.ServiceName ?? notification.Description ?? "Serviço",
            Amount:        notification.Amount,
            Notes:         $"Agendamento ID: {notification.AppointmentId}"));
    }
}

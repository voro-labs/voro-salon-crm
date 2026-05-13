using MediatR;

namespace VoroSalonCrm.Application.Features.Appointments.Notifications;

public record AppointmentCompletedNotification(
    Guid           AppointmentId,
    Guid           TenantId,
    Guid           ClientId,
    Guid?          ServiceId,
    Guid?          EmployeeId,
    decimal        Amount,
    DateTimeOffset ScheduledAt,
    string?        ServiceName,
    string?        ClientName = null,
    string?        Description = null) : INotification;

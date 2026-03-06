using System.ComponentModel.DataAnnotations;
using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Application.DTOs.CRM
{
    public record CreateAppointmentDto(
        [Required] Guid ClientId,
        Guid? ServiceId,
        [Required] DateTimeOffset ScheduledDateTime,
        int DurationMinutes,
        string? Description,
        decimal Amount,
        string? Notes
    );

    public record UpdateAppointmentDto(
        Guid? ClientId,
        Guid? ServiceId,
        DateTimeOffset? ScheduledDateTime,
        int? DurationMinutes,
        AppointmentStatus? Status,
        string? Description,
        decimal? Amount,
        string? Notes
    );

    public record AppointmentDto(
        Guid Id,
        Guid ClientId,
        string ClientName,
        Guid? ServiceId,
        string? ServiceName,
        DateTimeOffset ScheduledDateTime,
        int DurationMinutes,
        AppointmentStatus Status,
        string? Description,
        decimal Amount,
        string? Notes,
        DateTimeOffset CreatedAt
    );
}

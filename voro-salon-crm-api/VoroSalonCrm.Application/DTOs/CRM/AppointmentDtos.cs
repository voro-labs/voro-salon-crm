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
        string? Notes,
        bool IsEncaixe = false
    );

    public record UpdateAppointmentDto(
        Guid? ClientId,
        Guid? ServiceId,
        DateTimeOffset? ScheduledDateTime,
        int? DurationMinutes,
        AppointmentStatus? Status,
        string? Description,
        decimal? Amount,
        string? Notes,
        bool? IsEncaixe = null
    );

    public record AppointmentDto(
        Guid Id,
        Guid ClientId,
        string ClientName,
        string? ClientPhone,
        Guid? ServiceId,
        string? ServiceName,
        DateTimeOffset ScheduledDateTime,
        int DurationMinutes,
        AppointmentStatus Status,
        string? Description,
        decimal Amount,
        string? Notes,
        DateTimeOffset CreatedAt,
        bool IsEncaixe = false
    );

    public record AvailabilitySlotDto(
        DateTimeOffset StartTime,
        DateTimeOffset EndTime,
        bool IsAvailable,
        bool IsBlocked = false,
        string? BlockReason = null
    );
}

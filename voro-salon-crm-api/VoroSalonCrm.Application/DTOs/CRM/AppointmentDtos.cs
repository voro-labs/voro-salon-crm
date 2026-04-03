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

    public record UpdateAppointmentDto
    {
        public Guid? ClientId { get; init; }
        public Guid? ServiceId { get; init; }
        public Guid? EmployeeId { get; init; }
        public DateTimeOffset? ScheduledDateTime { get; init; }
        public int? DurationMinutes { get; init; }
        public AppointmentStatus? Status { get; init; }
        public string? Description { get; init; }
        public decimal? Amount { get; init; }
        public string? Notes { get; init; }
        public bool? IsEncaixe { get; init; }
    }

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
        bool IsEncaixe = false,
        Guid? ClientMembershipId = null,
        string? MembershipPlanName = null,
        int? MembershipRemainingSessions = null,
        Guid? EmployeeId = null,
        string? EmployeeName = null
    );

    public record AvailabilitySlotDto(
        DateTimeOffset StartTime,
        DateTimeOffset EndTime,
        bool IsAvailable,
        bool IsBlocked = false,
        string? BlockReason = null
    );
}

using System.ComponentModel.DataAnnotations;

namespace VoroSalonCrm.Application.DTOs.CRM
{
    public record CreateTimeSlotBlockDto(
        [Required] DateTimeOffset StartDateTime,
        [Required] DateTimeOffset EndDateTime,
        string? Reason,
        string? ClientMessage
    );

    public record TimeSlotBlockDto(
        Guid Id,
        DateTimeOffset StartDateTime,
        DateTimeOffset EndDateTime,
        string? Reason,
        string? ClientMessage,
        DateTimeOffset CreatedAt
    );
}

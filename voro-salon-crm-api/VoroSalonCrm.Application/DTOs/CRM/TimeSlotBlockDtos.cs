using System.ComponentModel.DataAnnotations;

namespace VoroSalonCrm.Application.DTOs.CRM
{
    public record CreateTimeSlotBlockDto(
        [Required] DateTimeOffset StartDateTime,
        [Required] DateTimeOffset EndDateTime,
        string? Reason,
        string? ClientMessage,
        Guid? EmployeeId = null
    );

    public record TimeSlotBlockDto(
        Guid Id,
        DateTimeOffset StartDateTime,
        DateTimeOffset EndDateTime,
        string? Reason,
        string? ClientMessage,
        DateTimeOffset CreatedAt,
        Guid? EmployeeId = null,
        string? EmployeeName = null,
        int NotifiedClientsCount = 0
    );
}

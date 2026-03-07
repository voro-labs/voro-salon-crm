using System.ComponentModel.DataAnnotations;

namespace VoroSalonCrm.Application.DTOs.CRM
{
    public record CreateServiceRecordDto(
        [Required] Guid ClientId,
        Guid? ServiceId,
        Guid? AppointmentId,
        DateTimeOffset? ServiceDate,
        [Required] string Description,
        [Required] decimal Amount,
        string? Notes
    );

    public record UpdateServiceRecordDto(
        Guid? ServiceId,
        DateTimeOffset? ServiceDate,
        string? Description,
        decimal? Amount,
        string? Notes
    );

    public record ServiceRecordDto(
        Guid Id,
        Guid ClientId,
        Guid? ServiceId,
        string? ServiceName,
        Guid? AppointmentId,
        DateTimeOffset ServiceDate,
        string Description,
        decimal Amount,
        string? Notes,
        DateTimeOffset CreatedAt
    );
}

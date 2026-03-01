using System.ComponentModel.DataAnnotations;

namespace VoroSalonCrm.Application.DTOs.CRM
{
    public record CreateServiceRecordDto(
        [Required] Guid ClientId,
        DateTimeOffset? ServiceDate,
        [Required] string Description,
        [Required] decimal Amount,
        string? Notes
    );

    public record UpdateServiceRecordDto(
        DateTimeOffset? ServiceDate,
        string? Description,
        decimal? Amount,
        string? Notes
    );

    public record ServiceRecordDto(
        Guid Id,
        Guid ClientId,
        DateTimeOffset ServiceDate,
        string Description,
        decimal Amount,
        string? Notes,
        DateTimeOffset CreatedAt
    );
}

using System.ComponentModel.DataAnnotations;

namespace VoroSalonCrm.Application.DTOs.CRM
{
    public record CreateServiceDto(
        [Required] string Name,
        string? Description,
        [Required] decimal Price,
        int DurationMinutes = 30
    );

    public record UpdateServiceDto(
        string? Name,
        string? Description,
        decimal? Price,
        int? DurationMinutes
    );

    public record ServiceDto(
        Guid Id,
        string Name,
        string? Description,
        decimal Price,
        int DurationMinutes,
        DateTimeOffset CreatedAt
    );
}

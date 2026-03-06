using System.ComponentModel.DataAnnotations;

namespace VoroSalonCrm.Application.DTOs.CRM
{
    public record CreateServiceDto(
        [Required] string Name,
        string? Description,
        [Required] decimal Price
    );

    public record UpdateServiceDto(
        string? Name,
        string? Description,
        decimal? Price
    );

    public record ServiceDto(
        Guid Id,
        string Name,
        string? Description,
        decimal Price,
        DateTimeOffset CreatedAt
    );
}

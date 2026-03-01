using System.ComponentModel.DataAnnotations;

namespace VoroSalonCrm.Application.DTOs.CRM
{
    public record CreateClientDto(
        [Required][StringLength(200)] string Name,
        [StringLength(50)] string? Phone,
        string? Notes
    );

    public record UpdateClientDto(
        [StringLength(200)] string? Name,
        [StringLength(50)] string? Phone,
        string? Notes
    );

    public record ClientDto(
        Guid Id,
        string Name,
        string? Phone,
        string? Notes,
        DateTimeOffset CreatedAt
    );
}

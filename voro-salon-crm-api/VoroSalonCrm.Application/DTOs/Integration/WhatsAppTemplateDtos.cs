using System.ComponentModel.DataAnnotations;

namespace VoroSalonCrm.Application.DTOs.Integration
{
    public record WhatsAppTemplateDto(
        Guid Id,
        Guid TenantId,
        string Name,
        string Label,
        int ParamsCount,
        string[]? ParamLabels,
        bool IsActive,
        DateTimeOffset CreatedAt
    );

    public record CreateWhatsAppTemplateDto(
        [Required][StringLength(200)] string Name,
        [Required][StringLength(200)] string Label,
        int ParamsCount,
        string[]? ParamLabels,
        bool IsActive = true
    );

    public record UpdateWhatsAppTemplateDto(
        [StringLength(200)] string? Name,
        [StringLength(200)] string? Label,
        int? ParamsCount,
        string[]? ParamLabels,
        bool? IsActive
    );
}

using System.ComponentModel.DataAnnotations;

namespace VoroSalonCrm.Application.DTOs.Integration
{
    public record EvolutionTemplateDto(
        Guid Id,
        string Name,
        string Label,
        string Body,
        int ParamsCount,
        string[]? ParamLabels,
        bool IsActive,
        DateTimeOffset CreatedAt
    );

    public record CreateEvolutionTemplateDto(
        [Required][StringLength(200)] string Name,
        [Required][StringLength(200)] string Label,
        [Required] string Body,
        int ParamsCount,
        string[]? ParamLabels,
        bool IsActive = true
    );

    public record UpdateEvolutionTemplateDto(
        [StringLength(200)] string? Name,
        [StringLength(200)] string? Label,
        string? Body,
        int? ParamsCount,
        string[]? ParamLabels,
        bool? IsActive
    );

    public record EvolutionSendDto(
        [Required] string InstanceId,
        [Required] string To,
        [Required] Guid TemplateId,
        string[] Params
    );
}

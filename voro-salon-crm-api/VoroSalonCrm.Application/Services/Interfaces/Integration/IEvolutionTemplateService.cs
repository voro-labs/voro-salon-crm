using VoroSalonCrm.Application.DTOs.Integration;

namespace VoroSalonCrm.Application.Services.Interfaces.Integration
{
    public interface IEvolutionTemplateService
    {
        Task<IEnumerable<EvolutionTemplateDto>> GetAllAsync();
        Task<EvolutionTemplateDto?> GetByIdAsync(Guid id);
        Task<EvolutionTemplateDto> CreateAsync(CreateEvolutionTemplateDto dto);
        Task<EvolutionTemplateDto> UpdateAsync(Guid id, UpdateEvolutionTemplateDto dto);
        Task<bool> DeleteAsync(Guid id);
        /// <summary>Substitui {{1}}, {{2}}, ... pelo valor correspondente em parameters.</summary>
        Task<string> RenderAsync(Guid id, string[] parameters);
    }
}

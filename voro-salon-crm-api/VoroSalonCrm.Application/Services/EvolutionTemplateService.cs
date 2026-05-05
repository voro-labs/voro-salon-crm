using System.Text.Json;
using System.Text.RegularExpressions;
using VoroSalonCrm.Application.DTOs.Integration;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class EvolutionTemplateService(
        IEvolutionTemplateRepository repository,
        IUnitOfWork unitOfWork) : IEvolutionTemplateService
    {
        private static readonly Regex UnreplacedPlaceholderRegex = new(@"\{\{\d+\}\}", RegexOptions.Compiled);
        private static EvolutionTemplateDto ToDto(EvolutionTemplate t) => new(
            t.Id, t.Name, t.Label, t.Body, t.ParamsCount,
            t.ParamLabels != null ? JsonSerializer.Deserialize<string[]>(t.ParamLabels) : null,
            t.Keywords   != null ? JsonSerializer.Deserialize<string[]>(t.Keywords)   : null,
            t.IsActive, t.CreatedAt);

        public async Task<IEnumerable<EvolutionTemplateDto>> GetAllAsync()
        {
            var templates = await repository.GetAllAsync();
            return templates.Select(ToDto);
        }

        public async Task<EvolutionTemplateDto?> GetByIdAsync(Guid id)
        {
            var template = await repository.GetByIdAsync(true, id);
            return template == null ? null : ToDto(template);
        }

        public async Task<EvolutionTemplateDto> CreateAsync(CreateEvolutionTemplateDto dto)
        {
            var template = new EvolutionTemplate
            {
                Id = Guid.NewGuid(),
                Name = dto.Name,
                Label = dto.Label,
                Body = dto.Body,
                ParamsCount = dto.ParamsCount,
                ParamLabels = dto.ParamLabels != null ? JsonSerializer.Serialize(dto.ParamLabels) : null,
                Keywords = dto.Keywords != null ? JsonSerializer.Serialize(dto.Keywords) : null,
                IsActive = dto.IsActive,
                CreatedAt = DateTimeOffset.UtcNow
            };
            await repository.AddAsync(template);
            await unitOfWork.SaveChangesAsync();
            return ToDto(template);
        }

        public async Task<EvolutionTemplateDto> UpdateAsync(Guid id, UpdateEvolutionTemplateDto dto)
        {
            var template = await repository.GetByIdAsync(false, id)
                ?? throw new KeyNotFoundException($"Template '{id}' not found.");

            if (dto.Name is not null) template.Name = dto.Name;
            if (dto.Label is not null) template.Label = dto.Label;
            if (dto.Body is not null) template.Body = dto.Body;
            if (dto.ParamsCount.HasValue) template.ParamsCount = dto.ParamsCount.Value;
            if (dto.ParamLabels is not null) template.ParamLabels = JsonSerializer.Serialize(dto.ParamLabels);
            if (dto.Keywords is not null) template.Keywords = JsonSerializer.Serialize(dto.Keywords);
            if (dto.IsActive.HasValue) template.IsActive = dto.IsActive.Value;
            template.UpdatedAt = DateTimeOffset.UtcNow;

            repository.Update(template);
            await unitOfWork.SaveChangesAsync();
            return ToDto(template);
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var template = await repository.GetByIdAsync(false, id);
            if (template == null) return false;

            repository.Delete(template);
            await unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task<string> RenderAsync(Guid id, string[] parameters)
        {
            var template = await repository.GetByIdAsync(true, id)
                ?? throw new KeyNotFoundException($"Template '{id}' not found.");

            var body = template.Body;
            for (int i = 0; i < parameters.Length; i++)
                body = body.Replace($"{{{{{i + 1}}}}}", parameters[i]);

            // Remove placeholders não substituídos (ex: {{1}}, {{2}}) que sobram quando params = []
            body = UnreplacedPlaceholderRegex.Replace(body, string.Empty);

            return body;
        }
    }
}

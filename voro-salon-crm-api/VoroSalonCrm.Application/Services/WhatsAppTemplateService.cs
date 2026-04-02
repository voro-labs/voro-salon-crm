using System.Text.Json;
using VoroSalonCrm.Application.DTOs.Integration;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class WhatsAppTemplateService(
        IWhatsAppTemplateRepository templateRepository,
        ICurrentUserService currentUserService,
        IUnitOfWork unitOfWork) : IWhatsAppTemplateService
    {
        private static WhatsAppTemplateDto ToDto(WhatsAppTemplate t) => new(
            t.Id,  t.TenantId, t.Name, t.Label, t.ParamsCount,
            t.ParamLabelsJson != null ? JsonSerializer.Deserialize<string[]>(t.ParamLabelsJson) : null,
            t.IsActive, t.CreatedAt);

        public async Task<IEnumerable<WhatsAppTemplateDto>> GetMyTemplatesAsync()
        {
            var tenantId = currentUserService.TenantId;
            var templates = await templateRepository.GetAllAsync(t => t.TenantId == tenantId || t.TenantId == Guid.Empty);
            return templates.Select(ToDto);
        }

        public async Task<WhatsAppTemplateDto> CreateAsync(CreateWhatsAppTemplateDto dto)
        {
            var tenantId = currentUserService.TenantId;
            var template = new WhatsAppTemplate
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Name = dto.Name,
                Label = dto.Label,
                ParamsCount = dto.ParamsCount,
                ParamLabelsJson = dto.ParamLabels != null ? JsonSerializer.Serialize(dto.ParamLabels) : null,
                IsActive = dto.IsActive,
                CreatedAt = DateTimeOffset.UtcNow,
            };
            await templateRepository.AddAsync(template);
            await unitOfWork.SaveChangesAsync();
            return ToDto(template);
        }

        public async Task<WhatsAppTemplateDto> UpdateAsync(Guid id, UpdateWhatsAppTemplateDto dto)
        {
            var tenantId = currentUserService.TenantId;
            var template = await templateRepository.GetByIdAsync(false, id)
                ?? throw new KeyNotFoundException($"Template '{id}' not found.");

            if (template.TenantId != tenantId)
                throw new UnauthorizedAccessException("Access denied.");

            if (dto.Name is not null) template.Name = dto.Name;
            if (dto.Label is not null) template.Label = dto.Label;
            if (dto.ParamsCount.HasValue) template.ParamsCount = dto.ParamsCount.Value;
            if (dto.ParamLabels is not null) template.ParamLabelsJson = JsonSerializer.Serialize(dto.ParamLabels);
            if (dto.IsActive.HasValue) template.IsActive = dto.IsActive.Value;
            template.UpdatedAt = DateTimeOffset.UtcNow;

            templateRepository.Update(template);
            await unitOfWork.SaveChangesAsync();
            return ToDto(template);
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var tenantId = currentUserService.TenantId;
            var template = await templateRepository.GetByIdAsync(false, id);
            if (template is null || template.TenantId != tenantId) return false;

            templateRepository.Delete(template);
            await unitOfWork.SaveChangesAsync();
            return true;
        }
    }
}

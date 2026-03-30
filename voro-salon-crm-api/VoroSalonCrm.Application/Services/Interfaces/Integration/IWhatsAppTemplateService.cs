using VoroSalonCrm.Application.DTOs.Integration;

namespace VoroSalonCrm.Application.Services.Interfaces.Integration
{
    public interface IWhatsAppTemplateService
    {
        Task<IEnumerable<WhatsAppTemplateDto>> GetMyTemplatesAsync();
        Task<WhatsAppTemplateDto> CreateAsync(CreateWhatsAppTemplateDto dto);
        Task<WhatsAppTemplateDto> UpdateAsync(Guid id, UpdateWhatsAppTemplateDto dto);
        Task<bool> DeleteAsync(Guid id);
    }
}

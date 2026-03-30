using VoroSalonCrm.Application.DTOs.Integration;

namespace VoroSalonCrm.Application.Services.Interfaces.Integration
{
    public interface IWhatsAppMessageService
    {
        Task SaveInboundAsync(Guid tenantId, string from, string to, string body, string? whatsAppMessageId = null);
        Task SaveOutboundAsync(Guid tenantId, string from, string to, string body, string? whatsAppMessageId = null);
        Task<IEnumerable<WhatsAppMessageDto>> GetByTenantAsync(Guid tenantId, int page = 1, int pageSize = 50);
        Task<IEnumerable<WhatsAppMessageDto>> GetByPhoneAsync(Guid tenantId, string phone, int page = 1, int pageSize = 100);
        Task<IEnumerable<WhatsAppConversationDto>> GetConversationsAsync(Guid tenantId);
    }
}

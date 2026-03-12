using VoroSalonCrm.Application.DTOs.Integration;

namespace VoroSalonCrm.Application.Services.Interfaces.Integration
{
    public interface IWhatsappService
    {
        Task<bool> SendTemplateMessageAsync(WhatsappTemplateMessageDto message, string? phoneIdOverride = null, CancellationToken ct = default);
        Task<bool> SendTextMessageAsync(string to, string text, string? phoneIdOverride = null, CancellationToken ct = default);
        Task<bool> SendInteractiveMessageAsync(string to, object interactive, string? phoneIdOverride = null, CancellationToken ct = default);
    }
}

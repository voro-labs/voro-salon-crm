using VoroSalonCrm.Application.DTOs.Integration;

namespace VoroSalonCrm.Application.Services.Interfaces.Integration
{
    public interface IWhatsappService
    {
        Task<bool> SendTemplateMessageAsync(WhatsappTemplateMessageDto message, CancellationToken ct = default);
        Task<bool> SendTextMessageAsync(string to, string text, CancellationToken ct = default);
        Task<bool> SendInteractiveMessageAsync(string to, object interactive, CancellationToken ct = default);
    }
}

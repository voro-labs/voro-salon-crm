using VoroSalonCrm.Application.DTOs.Integration;

namespace VoroSalonCrm.Application.Services.Interfaces.Integration
{
    public interface IWhatsappService
    {
        Task<bool> SendTemplateMessageAsync(WhatsappTemplateMessageDto message, CancellationToken ct = default);
    }
}

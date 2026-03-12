using VoroSalonCrm.Application.DTOs.Integration;

namespace VoroSalonCrm.Application.Services.Interfaces.Integration
{
    public interface IWhatsappChatService
    {
        Task HandleMessageAsync(WhatsappMessageDto message, string contactName, string phoneNumberId, CancellationToken ct = default);
    }
}

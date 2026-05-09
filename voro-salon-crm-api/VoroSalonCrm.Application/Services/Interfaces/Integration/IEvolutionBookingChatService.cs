using VoroSalonCrm.Domain.Entities;

namespace VoroSalonCrm.Application.Services.Interfaces.Integration
{
    public interface IEvolutionBookingChatService
    {
        /// <summary>
        /// Processa uma mensagem inbound do canal Evolution.
        /// Mantém sessão stateful em IMemoryCache e responde via texto numerado.
        /// Sempre define msg.ProcessedByBotAt antes de retornar (inclusive em erro).
        /// </summary>
        Task HandleMessageAsync(WhatsAppMessage msg, CancellationToken ct = default);
    }
}

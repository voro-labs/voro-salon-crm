using VoroSalonCrm.Domain.Entities;

namespace VoroSalonCrm.Application.Services.Interfaces.Integration
{
    public interface IEvolutionResponseService
    {
        /// <summary>
        /// Processa uma mensagem inbound: tenta keyword-match, cai para IA se não houver match,
        /// envia a resposta e define msg.ProcessedByBotAt = UtcNow.
        /// Não lança exceções — erros são logados internamente.
        /// </summary>
        Task ProcessAsync(WhatsAppMessage msg, CancellationToken ct = default);
    }
}

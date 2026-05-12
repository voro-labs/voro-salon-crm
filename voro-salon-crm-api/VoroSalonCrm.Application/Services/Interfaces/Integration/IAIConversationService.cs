using VoroSalonCrm.Domain.Entities;

namespace VoroSalonCrm.Application.Services.Interfaces.Integration
{
    public interface IAIConversationService
    {
        Task<string> RespondAsync(Guid tenantId, string tenantName, string phoneNumber, string userMessage);
        /// <summary>Igual a RespondAsync, mas usa o systemPrompt fornecido pelo chamador em vez do padrão.</summary>
        Task<string> RespondWithContextAsync(Guid tenantId, string phoneNumber, string systemPrompt, string userMessage);
        Task<List<AIConversationMessage>> GetHistoryAsync(Guid tenantId, string phoneNumber);
        Task ClearHistoryAsync(Guid tenantId, string phoneNumber);
    }
}

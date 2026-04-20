using VoroSalonCrm.Domain.Entities;

namespace VoroSalonCrm.Application.Services.Interfaces.Integration
{
    public interface IAIConversationService
    {
        Task<string> RespondAsync(Guid tenantId, string tenantName, string phoneNumber, string userMessage);
        Task<List<AIConversationMessage>> GetHistoryAsync(Guid tenantId, string phoneNumber);
        Task ClearHistoryAsync(Guid tenantId, string phoneNumber);
    }
}

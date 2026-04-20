using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories.Base;

namespace VoroSalonCrm.Domain.Interfaces.Repositories
{
    public interface IAIConversationRepository : IRepositoryBase<AIConversationMessage>
    {
        Task<List<AIConversationMessage>> GetRecentAsync(Guid tenantId, string phoneNumber, int count = 10);
        Task ClearHistoryAsync(Guid tenantId, string phoneNumber);
    }
}

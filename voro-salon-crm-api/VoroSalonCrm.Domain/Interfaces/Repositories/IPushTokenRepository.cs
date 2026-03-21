using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories.Base;

namespace VoroSalonCrm.Domain.Interfaces.Repositories
{
    public interface IPushTokenRepository : IRepositoryBase<PushToken>
    {
        Task<IEnumerable<PushToken>> GetActiveByUserIdAsync(Guid userId);
    }
}

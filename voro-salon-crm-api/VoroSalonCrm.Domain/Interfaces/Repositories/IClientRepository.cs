using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories.Base;

namespace VoroSalonCrm.Domain.Interfaces.Repositories
{
    public interface IClientRepository : IRepositoryBase<Client>
    {
        Task<Client?> GetByPhoneAsync(Guid tenantId, string phone);
    }
}

using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories.Base;

namespace VoroSalonCrm.Domain.Interfaces.Repositories
{
    public interface IServiceRepository : IRepositoryBase<Service>
    {
        Task<IEnumerable<Service>> GetPublicActiveByTenantAsync(Guid tenantId);
        Task<Service?> GetPublicByIdAsync(Guid tenantId, Guid serviceId);
    }
}

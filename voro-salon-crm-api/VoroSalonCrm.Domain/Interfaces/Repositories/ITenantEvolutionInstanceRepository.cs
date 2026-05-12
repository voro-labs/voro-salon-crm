using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories.Base;

namespace VoroSalonCrm.Domain.Interfaces.Repositories
{
    public interface ITenantEvolutionInstanceRepository : IRepositoryBase<TenantEvolutionInstance>
    {
        Task<TenantEvolutionInstance?> GetByTenantIdAsync(Guid tenantId);
        Task<TenantEvolutionInstance?> GetByInstanceIdAsync(string instanceId);
        Task<int> CountByTenantIdAsync(Guid tenantId);
    }
}

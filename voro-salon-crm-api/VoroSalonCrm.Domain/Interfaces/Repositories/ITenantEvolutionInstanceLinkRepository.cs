using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories.Base;

namespace VoroSalonCrm.Domain.Interfaces.Repositories
{
    public interface ITenantEvolutionInstanceLinkRepository : IRepositoryBase<TenantEvolutionInstanceLink>
    {
        Task<TenantEvolutionInstanceLink?> GetByTenantIdAsync(Guid tenantId);
        Task<IEnumerable<TenantEvolutionInstanceLink>> GetByInstanceIdAsync(Guid instanceId);
    }
}

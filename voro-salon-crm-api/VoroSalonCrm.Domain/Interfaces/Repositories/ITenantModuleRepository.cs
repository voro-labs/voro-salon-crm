using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories.Base;

namespace VoroSalonCrm.Domain.Interfaces.Repositories
{
    public interface ITenantModuleRepository : IRepositoryBase<TenantModule>
    {
        Task<IEnumerable<TenantModule>> GetModulesByTenantIdAsync(Guid tenantId);
        Task<TenantModule?> GetModuleAsync(Guid tenantId, AppModule module);
    }
}

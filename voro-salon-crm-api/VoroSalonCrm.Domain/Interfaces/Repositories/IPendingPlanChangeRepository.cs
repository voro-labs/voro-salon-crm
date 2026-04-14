using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories.Base;

namespace VoroSalonCrm.Domain.Interfaces.Repositories
{
    public interface IPendingPlanChangeRepository : IRepositoryBase<PendingPlanChange>
    {
        Task<PendingPlanChange?> GetByTenantIdAsync(Guid tenantId);
    }
}

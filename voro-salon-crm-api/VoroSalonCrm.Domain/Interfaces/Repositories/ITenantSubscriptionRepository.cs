using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories.Base;

namespace VoroSalonCrm.Domain.Interfaces.Repositories
{
    public interface ITenantSubscriptionRepository : IRepositoryBase<TenantSubscription>
    {
        Task<TenantSubscription?> GetActiveByTenantIdAsync(Guid tenantId);
        Task<TenantSubscription?> GetByMercadoPagoIdAsync(string mercadoPagoSubscriptionId);
        Task<IEnumerable<TenantSubscription>> GetAllWithPlanAsync(int page, int pageSize);
        Task<TenantSubscription?> GetByIdWithPlanAsync(Guid id);
        Task<TenantSubscription?> GetByTenantIdWithPlanAsync(Guid tenantId);
    }
}

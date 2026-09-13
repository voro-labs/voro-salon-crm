using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories.Base;
using VoroSalonCrm.Domain.Projections;

namespace VoroSalonCrm.Domain.Interfaces.Repositories
{
    public interface ITenantSubscriptionRepository : IRepositoryBase<TenantSubscription>
    {
        Task<TenantSubscription?> GetActiveByTenantIdAsync(Guid tenantId);
        Task<TenantSubscription?> GetLatestByTenantIdAsync(Guid tenantId);
        Task<TenantSubscription?> GetByMercadoPagoIdAsync(string mercadoPagoSubscriptionId);
        Task<TenantSubscription?> GetByPixPaymentIdAsync(string pixPaymentId);
        Task<TenantSubscription?> GetByExternalReferenceAsync(string externalReference);
        Task<IEnumerable<TenantSubscription>> GetAllWithPlanAsync(int page, int pageSize);
        Task<TenantSubscription?> GetByIdWithPlanAsync(Guid id);
        Task<TenantSubscription?> GetByTenantIdWithPlanAsync(Guid tenantId);

        /// <summary>
        /// Só o estado de acesso da assinatura vigente, sem carregar a entidade nem o plano.
        /// Devolve <c>null</c> quando o tenant não tem assinatura.
        /// </summary>
        Task<SubscriptionAccessSnapshot?> GetAccessSnapshotByTenantIdAsync(Guid tenantId, CancellationToken ct = default);
    }
}

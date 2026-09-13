using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Domain.Projections;
using VoroSalonCrm.Infrastructure.Factories;
using VoroSalonCrm.Infrastructure.Repositories.Base;

namespace VoroSalonCrm.Infrastructure.Repositories
{
    public class TenantSubscriptionRepository(JasmimDbContext context, IUnitOfWork unitOfWork)
        : RepositoryBase<TenantSubscription>(context, unitOfWork), ITenantSubscriptionRepository
    {
        private readonly JasmimDbContext _context = context;

        /// <summary>
        /// Assinatura vigente do tenant: a mais recente que não foi cancelada e que não é um
        /// checkout pendente já vencido.
        /// <para>
        /// O descarte do checkout vencido é feito aqui, pela data, e não pelo estado da linha.
        /// Um checkout cria uma assinatura <c>Inactive</c> com <c>CreatedAt</c> de agora, que
        /// passa a ser a mais recente e portanto ofusca o Trial/Active anterior até alguém
        /// cancelá-la. Depender do <c>ExpiredCheckoutCleanupJob</c> para isso amarrava o plano
        /// que o usuário enxerga à frequência de um job de faxina (issue #129).
        /// </para>
        /// </summary>
        public async Task<TenantSubscription?> GetActiveByTenantIdAsync(Guid tenantId)
        {
            var now = DateTimeOffset.UtcNow;

            return await _context.TenantSubscriptions
                .Include(s => s.Plan)
                .Where(s => s.TenantId == tenantId && s.Status != SubscriptionStatus.Cancelled)
                .Where(s => !(s.Status == SubscriptionStatus.Inactive &&
                              s.CheckoutExpiresAt != null &&
                              s.CheckoutExpiresAt < now))
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync();
        }

        public async Task<TenantSubscription?> GetByPixPaymentIdAsync(string pixPaymentId)
        {
            return await _context.TenantSubscriptions
                .Include(s => s.Plan)
                .FirstOrDefaultAsync(s => s.MercadoPagoPixPaymentId == pixPaymentId);
        }

        public async Task<TenantSubscription?> GetLatestByTenantIdAsync(Guid tenantId)
        {
            return await _context.TenantSubscriptions
                .Include(s => s.Plan)
                .Where(s => s.TenantId == tenantId)
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync();
        }

        public async Task<TenantSubscription?> GetByMercadoPagoIdAsync(string mercadoPagoSubscriptionId)
        {
            return await _context.TenantSubscriptions
                .Include(s => s.Plan)
                .FirstOrDefaultAsync(s => s.MercadoPagoSubscriptionId == mercadoPagoSubscriptionId);
        }

        public async Task<TenantSubscription?> GetByExternalReferenceAsync(string externalReference)
        {
            return await _context.TenantSubscriptions
                .Include(s => s.Plan)
                .Where(s => s.MercadoPagoExternalReference == externalReference
                            && s.Status != SubscriptionStatus.Cancelled)
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync();
        }

        public async Task<IEnumerable<TenantSubscription>> GetAllWithPlanAsync(int page, int pageSize)
        {
            return await _context.TenantSubscriptions
                .AsNoTracking()
                .Include(s => s.Plan)
                .Include(s => s.Tenant)
                .OrderByDescending(s => s.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<TenantSubscription?> GetByIdWithPlanAsync(Guid id)
        {
            return await _context.TenantSubscriptions
                .Include(s => s.Plan)
                .Include(s => s.Tenant)
                .FirstOrDefaultAsync(s => s.Id == id);
        }

        /// <summary>
        /// Mesma regra de vigência do <see cref="GetActiveByTenantIdAsync"/>, com o plano
        /// carregado para exibição.
        /// </summary>
        public async Task<TenantSubscription?> GetByTenantIdWithPlanAsync(Guid tenantId)
        {
            var now = DateTimeOffset.UtcNow;

            return await _context.TenantSubscriptions
                .AsNoTracking()
                .Include(s => s.Plan)
                .Where(s => s.TenantId == tenantId && s.Status != SubscriptionStatus.Cancelled)
                .Where(s => !(s.Status == SubscriptionStatus.Inactive &&
                              s.CheckoutExpiresAt != null &&
                              s.CheckoutExpiresAt < now))
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync();
        }

        /// <summary>
        /// Mesma regra de vigência das leituras acima, projetada nas duas colunas que o portão
        /// de acesso consulta. Sem <c>Include</c> e sem entidade: a projeção já não é rastreada
        /// pelo ChangeTracker, o que importa porque esta consulta roda em toda requisição
        /// autenticada que não estiver em cache (issue #129).
        /// </summary>
        public async Task<SubscriptionAccessSnapshot?> GetAccessSnapshotByTenantIdAsync(
            Guid tenantId, CancellationToken ct = default)
        {
            var now = DateTimeOffset.UtcNow;

            return await _context.TenantSubscriptions
                .Where(s => s.TenantId == tenantId && s.Status != SubscriptionStatus.Cancelled)
                .Where(s => !(s.Status == SubscriptionStatus.Inactive &&
                              s.CheckoutExpiresAt != null &&
                              s.CheckoutExpiresAt < now))
                .OrderByDescending(s => s.CreatedAt)
                .Select(s => new SubscriptionAccessSnapshot
                {
                    Status = s.Status,
                    TrialEndsAt = s.TrialEndsAt
                })
                .FirstOrDefaultAsync(ct);
        }
    }
}

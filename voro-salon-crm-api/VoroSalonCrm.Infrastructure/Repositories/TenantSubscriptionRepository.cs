using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Infrastructure.Factories;
using VoroSalonCrm.Infrastructure.Repositories.Base;

namespace VoroSalonCrm.Infrastructure.Repositories
{
    public class TenantSubscriptionRepository(JasmimDbContext context, IUnitOfWork unitOfWork)
        : RepositoryBase<TenantSubscription>(context, unitOfWork), ITenantSubscriptionRepository
    {
        private readonly JasmimDbContext _context = context;

        public async Task<TenantSubscription?> GetActiveByTenantIdAsync(Guid tenantId)
        {
            return await _context.TenantSubscriptions
                .Include(s => s.Plan)
                .Where(s => s.TenantId == tenantId && s.Status != SubscriptionStatus.Cancelled)
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

        public async Task<TenantSubscription?> GetByTenantIdWithPlanAsync(Guid tenantId)
        {
            return await _context.TenantSubscriptions
                .AsNoTracking()
                .Include(s => s.Plan)
                .Where(s => s.TenantId == tenantId && s.Status != SubscriptionStatus.Cancelled)
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync();
        }
    }
}

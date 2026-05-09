using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Infrastructure.Factories;
using VoroSalonCrm.Infrastructure.Repositories.Base;

namespace VoroSalonCrm.Infrastructure.Repositories
{
    public class TenantEvolutionInstanceLinkRepository(JasmimDbContext context, IUnitOfWork unitOfWork)
        : RepositoryBase<TenantEvolutionInstanceLink>(context, unitOfWork), ITenantEvolutionInstanceLinkRepository
    {
        public Task<TenantEvolutionInstanceLink?> GetByTenantIdAsync(Guid tenantId)
            => _dbSet.FirstOrDefaultAsync(l => l.TenantId == tenantId);

        public async Task<IEnumerable<TenantEvolutionInstanceLink>> GetByInstanceIdAsync(Guid instanceId)
            => await _dbSet
                .Include(l => l.Tenant)
                .Where(l => l.InstanceId == instanceId)
                .ToListAsync();
    }
}

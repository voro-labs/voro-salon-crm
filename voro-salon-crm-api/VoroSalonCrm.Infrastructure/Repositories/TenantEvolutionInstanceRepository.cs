using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Infrastructure.Factories;
using VoroSalonCrm.Infrastructure.Repositories.Base;

namespace VoroSalonCrm.Infrastructure.Repositories
{
    public class TenantEvolutionInstanceRepository(JasmimDbContext context, IUnitOfWork unitOfWork)
        : RepositoryBase<TenantEvolutionInstance>(context, unitOfWork), ITenantEvolutionInstanceRepository
    {
        public Task<TenantEvolutionInstance?> GetByTenantIdAsync(Guid tenantId)
            => _dbSet.FirstOrDefaultAsync(i => i.TenantId == tenantId);

        public Task<TenantEvolutionInstance?> GetByInstanceIdAsync(string instanceId)
            => _dbSet.FirstOrDefaultAsync(i => i.InstanceId == instanceId);

        public Task<int> CountByTenantIdAsync(Guid tenantId)
            => _dbSet.CountAsync(i => i.TenantId == tenantId);
    }
}

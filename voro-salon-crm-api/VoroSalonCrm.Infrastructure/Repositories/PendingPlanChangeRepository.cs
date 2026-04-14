using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Infrastructure.Factories;
using VoroSalonCrm.Infrastructure.Repositories.Base;

namespace VoroSalonCrm.Infrastructure.Repositories
{
    public class PendingPlanChangeRepository(JasmimDbContext context, IUnitOfWork unitOfWork)
        : RepositoryBase<PendingPlanChange>(context, unitOfWork), IPendingPlanChangeRepository
    {
        private readonly JasmimDbContext _context = context;

        public async Task<PendingPlanChange?> GetByTenantIdAsync(Guid tenantId)
        {
            return await _context.PendingPlanChanges
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.TenantId == tenantId);
        }
    }
}

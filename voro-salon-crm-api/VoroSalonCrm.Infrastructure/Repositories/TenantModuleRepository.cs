using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Infrastructure.Factories;
using VoroSalonCrm.Infrastructure.Repositories.Base;

namespace VoroSalonCrm.Infrastructure.Repositories
{
    public class TenantModuleRepository(JasmimDbContext context, IUnitOfWork unitOfWork)
        : RepositoryBase<TenantModule>(context, unitOfWork), ITenantModuleRepository
    {
        private readonly JasmimDbContext _context = context;

        public async Task<IEnumerable<TenantModule>> GetModulesByTenantIdAsync(Guid tenantId)
        {
            return await _context.TenantModules
                .Where(tm => tm.TenantId == tenantId)
                .ToListAsync();
        }

        public async Task<TenantModule?> GetModuleAsync(Guid tenantId, AppModule module)
        {
            return await _context.TenantModules
                .FirstOrDefaultAsync(x => x.TenantId == tenantId && x.Module == module);
        }
    }
}

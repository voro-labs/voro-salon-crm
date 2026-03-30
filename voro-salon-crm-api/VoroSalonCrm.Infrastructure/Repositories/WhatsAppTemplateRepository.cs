using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Infrastructure.Factories;
using VoroSalonCrm.Infrastructure.Repositories.Base;

namespace VoroSalonCrm.Infrastructure.Repositories
{
    public class WhatsAppTemplateRepository(JasmimDbContext context, IUnitOfWork unitOfWork)
        : RepositoryBase<WhatsAppTemplate>(context, unitOfWork), IWhatsAppTemplateRepository
    {
        public async Task<IEnumerable<WhatsAppTemplate>> GetByTenantIdAsync(Guid tenantId)
        {
            return await _dbSet
                .AsNoTracking()
                .Where(t => t.TenantId == tenantId)
                .OrderBy(t => t.Label)
                .ToListAsync();
        }
    }
}

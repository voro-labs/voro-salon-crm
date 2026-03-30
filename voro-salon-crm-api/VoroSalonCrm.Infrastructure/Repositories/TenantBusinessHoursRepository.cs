using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Infrastructure.Factories;
using VoroSalonCrm.Infrastructure.Repositories.Base;

namespace VoroSalonCrm.Infrastructure.Repositories
{
    public class TenantBusinessHoursRepository(JasmimDbContext context, IUnitOfWork unitOfWork)
        : RepositoryBase<TenantBusinessHours>(context, unitOfWork), ITenantBusinessHoursRepository
    {
        public async Task<IEnumerable<TenantBusinessHours>> GetByTenantAsync(Guid tenantId)
        {
            return await context.TenantBusinessHours
                .Where(bh => bh.TenantId == tenantId)
                .OrderBy(bh => bh.DayOfWeek)
                .ToListAsync();
        }
    }
}

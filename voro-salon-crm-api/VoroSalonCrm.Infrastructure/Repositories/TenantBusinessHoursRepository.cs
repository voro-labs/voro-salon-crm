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
        public async Task<IEnumerable<TenantBusinessHours>> GetByTenantAsync(Guid tenantId, bool includeRanges = true)
        {
            var query = context.TenantBusinessHours.Where(bh => bh.TenantId == tenantId);

            if (includeRanges)
            {
                query = query.Include(bh => bh.Ranges);
            }

            return await query.OrderBy(bh => bh.DayOfWeek).ToListAsync();
        }

        public async Task DeleteRangesByBusinessHoursIdAsync(Guid businessHoursId)
        {
            await context.TenantBusinessHoursRanges
                .Where(r => r.BusinessHoursId == businessHoursId)
                .ExecuteDeleteAsync();
        }

        public async Task AddRangesAsync(IEnumerable<TenantBusinessHoursRange> ranges)
        {
            await context.TenantBusinessHoursRanges.AddRangeAsync(ranges);
        }
    }
}

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
                .Include(bh => bh.Ranges)
                .Where(bh => bh.TenantId == tenantId)
                .OrderBy(bh => bh.DayOfWeek)
                .ToListAsync();
        }

        public async Task DeleteRangesByBusinessHoursIdAsync(Guid businessHoursId)
        {
            // Desanexa do tracker quaisquer ranges já carregadas para evitar conflito de estado
            var tracked = context.ChangeTracker.Entries<TenantBusinessHoursRange>()
                .Where(e => e.Entity.BusinessHoursId == businessHoursId)
                .ToList();

            foreach (var entry in tracked)
                entry.State = Microsoft.EntityFrameworkCore.EntityState.Detached;

            // Deleta diretamente no banco (bypassa o tracker — sem Deleted entries no contexto)
            await context.TenantBusinessHoursRanges
                .Where(r => r.BusinessHoursId == businessHoursId)
                .ExecuteDeleteAsync();
        }
    }
}

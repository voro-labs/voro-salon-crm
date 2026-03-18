using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Infrastructure.Factories;
using VoroSalonCrm.Infrastructure.Repositories.Base;

namespace VoroSalonCrm.Infrastructure.Repositories
{
    public class SubscriptionPlanRepository(JasmimDbContext context, IUnitOfWork unitOfWork)
        : RepositoryBase<SubscriptionPlan>(context, unitOfWork), ISubscriptionPlanRepository
    {
        private readonly JasmimDbContext _context = context;

        public async Task<IEnumerable<SubscriptionPlan>> GetActivePlansAsync()
        {
            return await _context.SubscriptionPlans
                .AsNoTracking()
                .Where(p => p.IsActive)
                .OrderBy(p => p.SortOrder)
                .ToListAsync();
        }
    }
}

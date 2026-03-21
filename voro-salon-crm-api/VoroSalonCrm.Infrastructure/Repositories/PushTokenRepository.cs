using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Infrastructure.Factories;
using VoroSalonCrm.Infrastructure.Repositories.Base;

namespace VoroSalonCrm.Infrastructure.Repositories
{
    public class PushTokenRepository(JasmimDbContext context, IUnitOfWork unitOfWork)
        : RepositoryBase<PushToken>(context, unitOfWork), IPushTokenRepository
    {
        public async Task<IEnumerable<PushToken>> GetActiveByUserIdAsync(Guid userId)
        {
            return await _dbSet
                .AsNoTracking()
                .Where(pt => pt.UserId == userId && pt.IsActive)
                .ToListAsync();
        }
    }
}

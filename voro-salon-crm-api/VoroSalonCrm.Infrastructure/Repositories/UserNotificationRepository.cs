using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Infrastructure.Factories;
using VoroSalonCrm.Infrastructure.Repositories.Base;

namespace VoroSalonCrm.Infrastructure.Repositories
{
    public class UserNotificationRepository(JasmimDbContext context, IUnitOfWork unitOfWork)
        : RepositoryBase<UserNotification>(context, unitOfWork), IUserNotificationRepository
    {
        public async Task<IEnumerable<UserNotification>> GetByUserIdAsync(Guid userId, int page = 1, int pageSize = 20)
        {
            return await _dbSet
                .AsNoTracking()
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<int> GetUnreadCountAsync(Guid userId)
        {
            return await _dbSet
                .AsNoTracking()
                .CountAsync(n => n.UserId == userId && !n.IsRead);
        }

        public async Task MarkAllAsReadAsync(Guid userId)
        {
            await _dbSet
                .Where(n => n.UserId == userId && !n.IsRead)
                .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
        }

        public async Task DeleteByRelatedEntityIdAsync(Guid relatedEntityId)
        {
            await _dbSet
                .Where(n => n.RelatedEntityId == relatedEntityId)
                .ExecuteDeleteAsync();
        }

        public async Task DeleteManyAsync(IEnumerable<Guid> ids, Guid userId)
        {
            var idList = ids.ToList();
            await _dbSet
                .Where(n => idList.Contains(n.Id) && n.UserId == userId)
                .ExecuteDeleteAsync();
        }
    }
}

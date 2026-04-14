using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Infrastructure.Factories;
using VoroSalonCrm.Infrastructure.Repositories.Base;

namespace VoroSalonCrm.Infrastructure.Repositories
{
    public class AIConversationRepository(JasmimDbContext context, IUnitOfWork unitOfWork)
        : RepositoryBase<AIConversationMessage>(context, unitOfWork), IAIConversationRepository
    {
        public async Task<List<AIConversationMessage>> GetRecentAsync(
            Guid tenantId,
            string phoneNumber,
            int count = 10)
        {
            return await _dbSet
                .AsNoTracking()
                .Where(m => m.TenantId == tenantId && m.PhoneNumber == phoneNumber)
                .OrderByDescending(m => m.CreatedAt)
                .Take(count)
                .OrderBy(m => m.CreatedAt)
                .ToListAsync();
        }

        public async Task ClearHistoryAsync(Guid tenantId, string phoneNumber)
        {
            var messages = await _dbSet
                .Where(m => m.TenantId == tenantId && m.PhoneNumber == phoneNumber)
                .ToListAsync();

            if (messages.Count > 0)
            {
                _dbSet.RemoveRange(messages);
                await _unitOfWork.SaveChangesAsync();
            }
        }
    }
}

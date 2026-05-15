using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Infrastructure.Factories;
using VoroSalonCrm.Infrastructure.Repositories.Base;

namespace VoroSalonCrm.Infrastructure.Repositories
{
    public class SupportMessageRepository(JasmimDbContext context, IUnitOfWork unitOfWork)
        : RepositoryBase<SupportMessage>(context, unitOfWork), ISupportMessageRepository
    {
        public async Task<IEnumerable<SupportMessage>> GetByTicketIdAsync(Guid ticketId)
        {
            return await _dbSet
                .AsNoTracking()
                .Where(m => m.TicketId == ticketId)
                .OrderBy(m => m.CreatedAt)
                .ToListAsync();
        }
    }
}

using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Infrastructure.Factories;
using VoroSalonCrm.Infrastructure.Repositories.Base;

namespace VoroSalonCrm.Infrastructure.Repositories
{
    public class SupportTicketRepository(JasmimDbContext context, IUnitOfWork unitOfWork)
        : RepositoryBase<SupportTicket>(context, unitOfWork), ISupportTicketRepository
    {
        public async Task<IEnumerable<SupportTicket>> GetByTenantIdAsync(Guid tenantId)
        {
            return await _dbSet
                .AsNoTracking()
                .Include(t => t.Messages)
                .Where(t => t.TenantId == tenantId)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();
        }

        public async Task<SupportTicket?> GetWithMessagesAsync(Guid id)
        {
            return await _dbSet
                .Include(t => t.Messages)
                .FirstOrDefaultAsync(t => t.Id == id);
        }

        public async Task<IEnumerable<(SupportTicket Ticket, string TenantName)>> GetAllWithTenantNameAsync()
        {
            var rows = await _dbSet
                .AsNoTracking()
                .Include(t => t.Messages)
                .Join(
                    _context.Set<Tenant>().AsNoTracking(),
                    ticket => ticket.TenantId,
                    tenant => tenant.Id,
                    (ticket, tenant) => new { ticket, tenant.Name })
                .OrderByDescending(x => x.ticket.CreatedAt)
                .ToListAsync();

            return rows.Select(x => (x.ticket, x.Name));
        }
    }
}

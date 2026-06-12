using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories.Base;

namespace VoroSalonCrm.Domain.Interfaces.Repositories
{
    public interface ISupportTicketRepository : IRepositoryBase<SupportTicket>
    {
        Task<IEnumerable<SupportTicket>> GetByTenantIdAsync(Guid tenantId);
        Task<SupportTicket?> GetWithMessagesAsync(Guid id);
        Task<IEnumerable<(SupportTicket Ticket, string TenantName)>> GetAllWithTenantNameAsync();
    }
}

using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories.Base;

namespace VoroSalonCrm.Domain.Interfaces.Repositories
{
    public interface ISupportMessageRepository : IRepositoryBase<SupportMessage>
    {
        Task<IEnumerable<SupportMessage>> GetByTicketIdAsync(Guid ticketId);
    }
}

using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories.Base;

namespace VoroSalonCrm.Domain.Interfaces.Repositories
{
    public interface IUserNotificationRepository : IRepositoryBase<UserNotification>
    {
        Task<IEnumerable<UserNotification>> GetByUserIdAsync(Guid userId, int page = 1, int pageSize = 20);
        Task<int> GetUnreadCountAsync(Guid userId);
        Task MarkAllAsReadAsync(Guid userId);
    }
}

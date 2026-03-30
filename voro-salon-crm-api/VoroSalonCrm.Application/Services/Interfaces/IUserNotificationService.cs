using VoroSalonCrm.Application.DTOs.Notifications;

namespace VoroSalonCrm.Application.Services.Interfaces
{
    public interface IUserNotificationService
    {
        Task<IEnumerable<UserNotificationDto>> GetMyNotificationsAsync(int page = 1, int pageSize = 20);
        Task<int> GetUnreadCountAsync();
        Task MarkAsReadAsync(Guid notificationId);
        Task MarkAllAsReadAsync();
        Task DeleteByRelatedEntityIdAsync(Guid relatedEntityId);
        Task DeleteManyAsync(IEnumerable<Guid> ids);
    }
}

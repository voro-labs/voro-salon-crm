using VoroSalonCrm.Application.DTOs.Notifications;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class UserNotificationService(
        IUserNotificationRepository userNotificationRepository,
        ICurrentUserService currentUserService,
        IUnitOfWork unitOfWork) : IUserNotificationService
    {
        private readonly IUserNotificationRepository _userNotificationRepository = userNotificationRepository;
        private readonly ICurrentUserService _currentUserService = currentUserService;
        private readonly IUnitOfWork _unitOfWork = unitOfWork;

        public async Task<IEnumerable<UserNotificationDto>> GetMyNotificationsAsync(int page = 1, int pageSize = 20)
        {
            var userId = _currentUserService.UserId;
            var notifications = await _userNotificationRepository.GetByUserIdAsync(userId, page, pageSize);

            return notifications.Select(n => new UserNotificationDto(
                n.Id,
                n.Title,
                n.Body,
                n.Type,
                n.RelatedEntityId,
                n.IsRead,
                n.CreatedAt
            ));
        }

        public async Task<int> GetUnreadCountAsync()
        {
            var userId = _currentUserService.UserId;
            return await _userNotificationRepository.GetUnreadCountAsync(userId);
        }

        public async Task MarkAsReadAsync(Guid notificationId)
        {
            var userId = _currentUserService.UserId;
            var notification = await _userNotificationRepository.GetByIdAsync(notificationId);

            if (notification == null || notification.UserId != userId)
                throw new KeyNotFoundException("Notification not found.");

            notification.IsRead = true;
            _userNotificationRepository.Update(notification);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task MarkAllAsReadAsync()
        {
            var userId = _currentUserService.UserId;
            await _userNotificationRepository.MarkAllAsReadAsync(userId);
        }
    }
}

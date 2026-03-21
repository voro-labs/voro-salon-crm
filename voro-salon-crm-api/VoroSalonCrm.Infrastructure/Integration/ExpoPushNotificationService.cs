using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Infrastructure.Integration
{
    public sealed class ExpoPushNotificationService : IExpoPushNotificationService
    {
        private readonly IPushTokenRepository _pushTokenRepository;
        private readonly IUserNotificationRepository _userNotificationRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly HttpClient _http;
        private readonly ILogger<ExpoPushNotificationService> _logger;

        public ExpoPushNotificationService(
            IPushTokenRepository pushTokenRepository,
            IUserNotificationRepository userNotificationRepository,
            IUnitOfWork unitOfWork,
            IHttpClientFactory httpClientFactory,
            ILogger<ExpoPushNotificationService> logger)
        {
            _pushTokenRepository = pushTokenRepository;
            _userNotificationRepository = userNotificationRepository;
            _unitOfWork = unitOfWork;
            _http = httpClientFactory.CreateClient("expo-push");
            _logger = logger;
        }

        public async Task SendToUserAsync(Guid userId, string title, string body, object? data = null, Guid? tenantId = null, string? type = null, Guid? relatedEntityId = null)
        {
            await SendToUsersAsync([userId], title, body, data, tenantId, type, relatedEntityId);
        }

        public async Task SendToUsersAsync(IEnumerable<Guid> userIds, string title, string body, object? data = null, Guid? tenantId = null, string? type = null, Guid? relatedEntityId = null)
        {
            var userIdList = userIds.ToList();
            if (userIdList.Count == 0) return;

            var messages = new List<object>();
            var notifiedUserIds = new HashSet<Guid>();

            foreach (var userId in userIdList)
            {
                var tokens = await _pushTokenRepository.GetActiveByUserIdAsync(userId);

                foreach (var pushToken in tokens)
                {
                    messages.Add(new
                    {
                        to = pushToken.Token,
                        title,
                        body,
                        data = data ?? new { }
                    });
                }

                notifiedUserIds.Add(userId);
            }

            if (messages.Count > 0)
            {
                try
                {
                    var json = JsonSerializer.Serialize(messages);
                    var content = new StringContent(json, Encoding.UTF8, "application/json");
                    var response = await _http.PostAsync("/--/api/v2/push/send", content);
                    var responseBody = await response.Content.ReadAsStringAsync();

                    if (!response.IsSuccessStatusCode)
                    {
                        _logger.LogWarning("Expo push notification request failed ({StatusCode}): {Body}",
                            (int)response.StatusCode, responseBody);
                    }
                    else
                    {
                        _logger.LogDebug("Expo push notification sent to {Count} token(s). Response: {Body}",
                            messages.Count, responseBody);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error sending Expo push notifications.");
                }
            }

            // Save in-app UserNotification for each notified user
            foreach (var userId in notifiedUserIds)
            {
                var notification = new UserNotification
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    TenantId = tenantId ?? Guid.Empty,
                    Title = title,
                    Body = body,
                    Type = type ?? "push",
                    RelatedEntityId = relatedEntityId,
                    IsRead = false,
                    CreatedAt = DateTimeOffset.UtcNow
                };

                await _userNotificationRepository.AddAsync(notification);
            }

            if (notifiedUserIds.Count > 0)
            {
                try
                {
                    await _unitOfWork.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error saving UserNotification records after push send.");
                }
            }
        }
    }
}

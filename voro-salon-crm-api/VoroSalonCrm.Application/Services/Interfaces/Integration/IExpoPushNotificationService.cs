namespace VoroSalonCrm.Application.Services.Interfaces.Integration
{
    public interface IExpoPushNotificationService
    {
        Task SendToUserAsync(Guid userId, string title, string body, object? data = null, Guid? tenantId = null, string? type = null, Guid? relatedEntityId = null);
        Task SendToUsersAsync(IEnumerable<Guid> userIds, string title, string body, object? data = null, Guid? tenantId = null, string? type = null, Guid? relatedEntityId = null);
    }
}

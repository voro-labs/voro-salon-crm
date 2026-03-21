namespace VoroSalonCrm.Application.DTOs.Notifications
{
    public record UserNotificationDto(
        Guid Id,
        string Title,
        string Body,
        string Type,
        Guid? RelatedEntityId,
        bool IsRead,
        DateTimeOffset CreatedAt
    );
}

namespace VoroSalonCrm.Application.DTOs.Integration
{
    public record WhatsAppMessageDto(
        Guid Id,
        Guid TenantId,
        string Direction,
        string From,
        string To,
        string Body,
        string? WhatsAppMessageId,
        string Status,
        DateTimeOffset Timestamp
    );

    public record WhatsAppConversationDto(
        Guid Id,
        string PhoneNumber,
        string ContactName,
        string State,
        string LastMessageBody,
        DateTimeOffset LastMessageAt,
        Guid? AppointmentId
    );
}

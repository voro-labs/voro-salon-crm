using System.ComponentModel.DataAnnotations;
using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Application.DTOs.Support
{
    public record SupportTicketDto(
        Guid Id,
        Guid TenantId,
        string Title,
        SupportTicketCategory Category,
        bool IsUrgent,
        SupportTicketStatus Status,
        DateTimeOffset CreatedAt,
        int MessageCount
    );

    public record SupportMessageDto(
        Guid Id,
        Guid TicketId,
        string Body,
        string? AttachmentUrl,
        bool IsFromSupport,
        DateTimeOffset CreatedAt
    );

    public record CreateSupportTicketDto(
        [Required][StringLength(200)] string Title,
        [Required] string Category,
        bool IsUrgent
    );

    public record SendSupportMessageDto(
        [Required] Guid TicketId,
        [Required][StringLength(4000)] string Body,
        string? AttachmentUrl
    );
}

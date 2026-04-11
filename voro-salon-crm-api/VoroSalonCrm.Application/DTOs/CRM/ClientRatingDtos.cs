using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Application.DTOs.CRM
{
    public record ClientRatingDto(
        Guid Id,
        Guid AppointmentId,
        Guid ClientId,
        string ClientName,
        int Stars,
        string? Comment,
        RatingSource Source,
        DateTimeOffset CreatedAt
    );

    public record SubmitRatingDto(
        int Stars,
        string? Comment,
        RatingSource Source
    );

    public record SendRatingRequestResultDto(
        bool SentViaBot,
        bool RequiresManualSend,
        string? ClientPhone,
        string? ClientName,
        string? ServiceName
    );
}

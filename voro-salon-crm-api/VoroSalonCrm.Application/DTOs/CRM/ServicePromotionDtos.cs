namespace VoroSalonCrm.Application.DTOs.CRM
{
    public record ServicePromotionDto(
        Guid Id,
        Guid ServiceId,
        string ServiceName,
        decimal OriginalPrice,
        decimal PromotionalPrice,
        int[] DaysOfWeek,
        DateOnly? ValidFrom,
        DateOnly? ValidUntil,
        bool IsActive,
        DateTimeOffset CreatedAt
    );

    public record CreateServicePromotionDto(
        Guid ServiceId,
        decimal PromotionalPrice,
        int[] DaysOfWeek,
        DateOnly? ValidFrom = null,
        DateOnly? ValidUntil = null
    );

    public record UpdateServicePromotionDto(
        Guid Id,
        decimal PromotionalPrice,
        int[] DaysOfWeek,
        DateOnly? ValidFrom,
        DateOnly? ValidUntil,
        bool IsActive
    );
}

using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Application.DTOs.Subscription
{
    public record SubscriptionPlanDto(
        Guid Id,
        string Name,
        string Description,
        decimal MonthlyPrice,
        int MaxEmployees,
        int MaxClients,
        bool HasEmployees,
        bool HasAnamnesis,
        bool HasFinancial,
        bool HasReports,
        bool HasBooking,
        bool HasWhatsAppBot,
        int SortOrder,
        int DefaultTrialDays,
        decimal? PromoPrice,
        DateTimeOffset? PromoEndsAt
    );

    public record TenantSubscriptionDto(
        Guid Id,
        Guid? TenantId,
        SubscriptionPlanDto Plan,
        string Status,
        string PaymentSource,
        DateTimeOffset StartDate,
        DateTimeOffset? EndDate,
        DateTimeOffset? NextPaymentAt,
        DateTimeOffset? LastPaymentAt,
        string? ContactEmail,
        string? ContactName,
        string? SalonName,
        DateTimeOffset? TrialEndsAt,
        decimal? LockedPromoPrice
    );

    public record CreateCheckoutDto(
        Guid PlanId,
        string Email,
        string Name,
        string SalonName,
        Guid? TenantId,
        string? CouponCode = null,
        EstablishmentType? EstablishmentType = null,
        PaymentMethod CheckoutMethod = PaymentMethod.CreditCard
    );

    public record CheckoutResultDto(
        string? CheckoutUrl,
        string SubscriptionId,
        bool IsTrial = false,
        DateTimeOffset? TrialEndsAt = null,
        string? PixQrCode = null,
        string? PixQrCodeBase64 = null,
        DateTimeOffset? PixExpiresAt = null
    );

    public record GrantManualSubscriptionDto(
        Guid TenantId,
        Guid PlanId,
        DateTimeOffset StartDate,
        DateTimeOffset? EndDate,
        string? Notes
    );

    public record CouponValidationResultDto(
        string Code,
        int TrialDays,
        string? Description
    );

    public record CreateCouponDto(
        string Code,
        string? Description,
        int TrialDays,
        bool IsActive,
        int? MaxUses,
        DateTimeOffset? ExpiresAt
    );

    public record CouponDto(
        Guid Id,
        string Code,
        string? Description,
        int TrialDays,
        bool IsActive,
        int? MaxUses,
        int UsedCount,
        DateTimeOffset? ExpiresAt,
        DateTimeOffset CreatedAt
    );

    public record ExtendTrialDto(
        Guid TenantId,
        int AdditionalDays
    );
}

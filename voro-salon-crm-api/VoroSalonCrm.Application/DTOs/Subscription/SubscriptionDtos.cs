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
        bool HasAnamnesis,
        bool HasFinancial,
        bool HasReports,
        int SortOrder
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
        string? SalonName
    );

    public record CreateCheckoutDto(
        Guid PlanId,
        string Email,
        string Name,
        string SalonName,
        Guid? TenantId
    );

    public record CheckoutResultDto(string CheckoutUrl, string SubscriptionId);

    public record GrantManualSubscriptionDto(
        Guid TenantId,
        Guid PlanId,
        DateTimeOffset StartDate,
        DateTimeOffset? EndDate,
        string? Notes
    );
}

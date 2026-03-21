using VoroSalonCrm.Application.DTOs.Subscription;

namespace VoroSalonCrm.Application.Services.Interfaces
{
    public interface ISubscriptionService
    {
        Task<IEnumerable<SubscriptionPlanDto>> GetAllPlansAsync();
        Task<TenantSubscriptionDto?> GetByTenantIdAsync(Guid tenantId);
        Task<CheckoutResultDto> CreateCheckoutAsync(CreateCheckoutDto dto);
        Task GrantManualAsync(GrantManualSubscriptionDto dto, Guid grantedByUserId);
        Task CancelAsync(Guid subscriptionId);
        Task<IEnumerable<TenantSubscriptionDto>> GetAllAsync(int page, int pageSize);
        Task ProcessWebhookAsync(string eventType, string resourceId);

        Task<CouponValidationResultDto?> ValidateCouponAsync(string code);
        Task<CouponDto> CreateCouponAsync(CreateCouponDto dto);
        Task<IEnumerable<CouponDto>> GetCouponsAsync();
        Task ExtendTrialAsync(Guid tenantId, int additionalDays);
    }
}

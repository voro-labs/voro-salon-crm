using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSalonCrm.Application.DTOs.Subscription;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Shared.ViewModels;
using VoroSalonCrm.Shared.Extensions;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/[controller]")]
    [Tags("Subscription")]
    [ApiController]
    public class SubscriptionController(
        ISubscriptionService subscriptionService,
        ICurrentUserService currentUserService) : ControllerBase
    {
        [HttpGet("plans")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPlans()
        {
            try
            {
                var plans = await subscriptionService.GetAllPlansAsync();
                return ResponseViewModel<IEnumerable<SubscriptionPlanDto>>
                    .SuccessWithMessage("Plans retrieved.", plans)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetMySubscription()
        {
            try
            {
                var tenantId = currentUserService.TenantId;
                var sub = await subscriptionService.GetByTenantIdAsync(tenantId);

                return ResponseViewModel<TenantSubscriptionDto?>
                    .SuccessWithMessage("Subscription retrieved.", sub)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPost("checkout")]
        [AllowAnonymous]
        public async Task<IActionResult> CreateCheckout([FromBody] CreateCheckoutDto dto)
        {
            try
            {
                var result = await subscriptionService.CreateCheckoutAsync(dto);
                return ResponseViewModel<CheckoutResultDto>
                    .SuccessWithMessage("Checkout created.", result)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPost("confirm/{preapprovalId}")]
        [AllowAnonymous]
        public async Task<IActionResult> ConfirmSubscription(string preapprovalId)
        {
            try
            {
                await subscriptionService.ProcessWebhookAsync("subscription_preapproval", preapprovalId);
                return ResponseViewModel<object>
                    .SuccessWithMessage("Subscription processed.", null)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpGet("coupon/{code}")]
        [AllowAnonymous]
        public async Task<IActionResult> ValidateCoupon(string code)
        {
            try
            {
                var result = await subscriptionService.ValidateCouponAsync(code);
                if (result == null)
                    return ResponseViewModel<object>.Fail("Cupom inválido ou expirado.").ToActionResult();

                return ResponseViewModel<CouponValidationResultDto>
                    .SuccessWithMessage("Cupom válido.", result)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpGet("admin/coupons")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetCoupons()
        {
            try
            {
                var coupons = await subscriptionService.GetCouponsAsync();
                return ResponseViewModel<IEnumerable<CouponDto>>
                    .SuccessWithMessage("Coupons retrieved.", coupons)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPost("admin/coupons")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateCoupon([FromBody] CreateCouponDto dto)
        {
            try
            {
                var coupon = await subscriptionService.CreateCouponAsync(dto);
                return ResponseViewModel<CouponDto>
                    .SuccessWithMessage("Cupom criado.", coupon)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpGet("pix-status/{subscriptionId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPixStatus(Guid subscriptionId)
        {
            try
            {
                var status = await subscriptionService.GetCheckoutStatusAsync(subscriptionId);
                if (status == null)
                    return ResponseViewModel<object>.Fail("Assinatura não encontrada.").ToActionResult();

                return ResponseViewModel<object>
                    .SuccessWithMessage("Status retrieved.", new { status })
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPost("admin/extend-trial")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ExtendTrial([FromBody] ExtendTrialDto dto)
        {
            try
            {
                await subscriptionService.ExtendTrialAsync(dto.TenantId, dto.AdditionalDays);
                return ResponseViewModel<object>
                    .SuccessWithMessage("Trial estendido com sucesso.", null)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPost("change-plan")]
        [Authorize]
        public async Task<IActionResult> ChangePlan([FromBody] CreateCheckoutDto dto)
        {
            try
            {
                var tenantId = currentUserService.TenantId;
                var result = await subscriptionService.InitiatePlanChangeAsync(tenantId, dto);
                return ResponseViewModel<CheckoutResultDto>
                    .SuccessWithMessage("Plan change initiated.", result)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpDelete("pending-change")]
        [Authorize]
        public async Task<IActionResult> CancelPendingChange()
        {
            try
            {
                var tenantId = currentUserService.TenantId;
                await subscriptionService.CancelPendingPlanChangeAsync(tenantId);
                return ResponseViewModel<object>
                    .SuccessWithMessage("Pending plan change cancelled.", null)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpGet("plans/resolved-prices")]
        [Authorize]
        public async Task<IActionResult> GetResolvedPrices()
        {
            try
            {
                var tenantId = currentUserService.TenantId;
                var plans = await subscriptionService.GetAllPlansAsync();

                var resolvedPrices = new List<object>();
                foreach (var plan in plans)
                {
                    var displayPrice = await subscriptionService.ResolveDisplayPriceAsync(tenantId, plan.Id);
                    resolvedPrices.Add(new { planId = plan.Id, displayPrice });
                }

                return ResponseViewModel<IEnumerable<object>>
                    .SuccessWithMessage("Resolved prices retrieved.", resolvedPrices)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }
    }
}

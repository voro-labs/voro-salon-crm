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
    }
}

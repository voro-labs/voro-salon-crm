using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSalonCrm.Application.DTOs.Subscription;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Shared.Extensions;
using VoroSalonCrm.Shared.ViewModels;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/admin/subscription")]
    [Tags("Admin — Subscription")]
    [ApiController]
    [Authorize(Roles = "Owner")]
    public class AdminSubscriptionController(
        ISubscriptionService subscriptionService,
        ICurrentUserService currentUserService) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            try
            {
                var subs = await subscriptionService.GetAllAsync(page, pageSize);
                return ResponseViewModel<IEnumerable<TenantSubscriptionDto>>
                    .SuccessWithMessage("Subscriptions retrieved.", subs)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPost("grant")]
        public async Task<IActionResult> Grant([FromBody] GrantManualSubscriptionDto dto)
        {
            try
            {
                var userId = currentUserService.UserId;
                await subscriptionService.GrantManualAsync(dto, userId);
                return ResponseViewModel<object>
                    .SuccessWithMessage("Subscription granted.", null)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPatch("{id:guid}/cancel")]
        public async Task<IActionResult> Cancel(Guid id)
        {
            try
            {
                await subscriptionService.CancelAsync(id);
                return ResponseViewModel<object>
                    .SuccessWithMessage("Subscription cancelled.", null)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }
    }
}

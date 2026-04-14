using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Shared.Extensions;
using VoroSalonCrm.Shared.ViewModels;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/admin/ai-conversations")]
    [Tags("Admin — AI Conversations")]
    [ApiController]
    [Authorize(Roles = "Owner")]
    public class AdminAIConversationController(IAIConversationService aiConversationService) : ControllerBase
    {
        [HttpGet("{tenantId:guid}")]
        public async Task<IActionResult> GetHistory(
            [FromRoute] Guid tenantId,
            [FromQuery] string phoneNumber)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(phoneNumber))
                    return ResponseViewModel<object>
                        .Fail("phoneNumber query parameter is required.")
                        .ToActionResult();

                var history = await aiConversationService.GetHistoryAsync(tenantId, phoneNumber);
                return ResponseViewModel<object>
                    .SuccessWithMessage("History retrieved.", history)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPost("reset")]
        public async Task<IActionResult> ResetHistory([FromBody] ResetAIConversationRequest request)
        {
            try
            {
                await aiConversationService.ClearHistoryAsync(request.TenantId, request.PhoneNumber);
                return ResponseViewModel<object>
                    .SuccessWithMessage("Conversation history cleared.", null)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }
    }

    public record ResetAIConversationRequest(Guid TenantId, string PhoneNumber);
}

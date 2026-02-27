using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSwipeEntertainment.Application.DTOs;
using VoroSwipeEntertainment.Application.Services.Interfaces;
using VoroSwipeEntertainment.Shared.Extensions;
using VoroSwipeEntertainment.Shared.ViewModels;

namespace VoroSwipeEntertainment.API.Controllers
{
    [Route("api/v{version:version}/[controller]")]
    [Tags("Users")]
    [ApiController]
    [Authorize]
    public class UserController(ICurrentUserService currentUserService, IUserExtensionService userExtensionService) : ControllerBase
    {
        // ----------------------------------------------------
        // GET /api/user/data
        // ----------------------------------------------------
        [HttpGet("data")]
        public async Task<IActionResult> GetUserData()
        {
            try
            {
                var result = await userExtensionService.GetUserDataAsync(currentUserService.UserId);

                return ResponseViewModel<object>
                    .Success(result)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>
                    .Fail(ex.Message)
                    .ToActionResult();
            }
        }

        // ----------------------------------------------------
        // POST /api/user/sync
        // ----------------------------------------------------
        [HttpPost("sync")]
        public async Task<IActionResult> Sync([FromBody] UserSyncDto model)
        {
            try
            {
                await userExtensionService.SyncAsync(currentUserService.UserId, model);

                return ResponseViewModel<object>
                    .SuccessWithMessage("Sync realizado com sucesso.", new { })
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<string>
                    .Fail(ex.Message)
                    .ToActionResult();
            }
        }
    }
}
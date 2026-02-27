using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSwipeEntertainment.Application.Services.Interfaces;
using VoroSwipeEntertainment.Shared.Extensions;
using VoroSwipeEntertainment.Shared.ViewModels;

namespace VoroSwipeEntertainment.API.Controllers
{
    [Route("api/v{version:version}/[controller]")]
    [Tags("Contents")]
    [ApiController]
    [Authorize]
    public class ContentController(ICurrentUserService currentUserService, IContentService contentService) : ControllerBase
    {
        // ----------------------------------------------------
        // GET /api/content/trending
        // ----------------------------------------------------
        [HttpGet("trending")]
        public async Task<IActionResult> GetTrending([FromQuery] int page = 1)
        {
            try
            {
                var result = await contentService.GetTrendingAsync(page);

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
        // POST /api/content/recommended
        // ----------------------------------------------------
        [HttpGet("recommended")]
        public async Task<IActionResult> GetRecommended([FromQuery] int page = 1)
        {
            try
            {
                var result = await contentService.GetRecommendedAsync(currentUserService.UserId, page);

                return ResponseViewModel<object>
                    .Success(result)
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
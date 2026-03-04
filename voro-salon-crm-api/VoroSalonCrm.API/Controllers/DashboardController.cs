using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Shared.Extensions;
using VoroSalonCrm.Shared.ViewModels;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/[controller]")]
    [Tags("Dashboard")]
    [ApiController]
    [Authorize]
    public class DashboardController(IDashboardService dashboardService, ICurrentUserService currentUserService) : ControllerBase
    {
        [HttpGet("metrics")]
        public async Task<IActionResult> GetMetrics()
        {
            try
            {
                Console.WriteLine($"TenantId: {currentUserService.TenantId}");

                var metrics = await dashboardService.GetDashboardMetricsAsync();

                return ResponseViewModel<DashboardMetricsDto>
                    .SuccessWithMessage("Metrics retrieved.", metrics)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }
    }
}

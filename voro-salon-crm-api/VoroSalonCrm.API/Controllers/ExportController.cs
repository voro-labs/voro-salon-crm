using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSalonCrm.Application.Services.Interfaces;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/[controller]")]
    [Tags("Export")]
    [ApiController]
    [Authorize]
    public class ExportController(IExportService exportService) : ControllerBase
    {
        [HttpGet("clients")]
        public async Task<IActionResult> ExportClients()
        {
            try
            {
                var (bytes, filename) = await exportService.ExportClientsCsvAsync();
                return File(bytes, "text/csv; charset=utf-8", filename);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [HttpGet("services")]
        public async Task<IActionResult> ExportServices()
        {
            try
            {
                var (bytes, filename) = await exportService.ExportServiceRecordsCsvAsync();
                return File(bytes, "text/csv; charset=utf-8", filename);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }
    }
}

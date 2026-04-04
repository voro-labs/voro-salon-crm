using Microsoft.AspNetCore.Mvc;
using VoroSalonCrm.API.Filters;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Shared.Extensions;
using VoroSalonCrm.Shared.ViewModels;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/[controller]")]
    [Tags("Automation")]
    [ApiController]
    public class BirthdayGreetingController(IBirthdayGreetingService birthdayService) : ControllerBase
    {
        /// <summary>
        /// Dispara o envio de parabéns via WhatsApp para todos os clientes aniversariantes do dia.
        /// Protegido por API Key (header X-Api-Key). Destinado ao GitHub Actions.
        /// </summary>
        [HttpPost("trigger")]
        [ApiKeyAuthFilter]
        public async Task<IActionResult> Trigger(CancellationToken ct)
        {
            try
            {
                var count = await birthdayService.SendTodayGreetingsAsync(ct);
                return ResponseViewModel<object>
                    .SuccessWithMessage($"Parabéns enviados para {count} cliente(s).", null)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }
    }
}

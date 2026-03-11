using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using VoroSalonCrm.Shared.Utils;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/[controller]")]
    [Tags("WhatsApp Integration")]
    [ApiController]
    [AllowAnonymous]
    public class WhatsappController(IOptions<IntegrationUtil> integrationUtil, ILogger<WhatsappController> logger) : ControllerBase
    {
        private readonly IntegrationUtil _integrationUtil = integrationUtil.Value;
        private readonly ILogger<WhatsappController> _logger = logger;

        [HttpGet]
        public IActionResult VerifyWebhook(
            [FromQuery(Name = "hub.mode")] string? mode,
            [FromQuery(Name = "hub.challenge")] string? challenge,
            [FromQuery(Name = "hub.verify_token")] string? token)
        {
            var verifyToken = _integrationUtil.Whatsapp.VerifyToken;

            if (mode == "subscribe" && token == verifyToken)
            {
                _logger.LogInformation("WEBHOOK VERIFIED");

                return Content(challenge ?? string.Empty, "text/plain");
            }

            return StatusCode(403);
        }

        [HttpPost]
        public async Task<IActionResult> ReceiveWebhook()
        {
            var timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss");
            _logger.LogInformation("\n\nWebhook received {Timestamp}\n", timestamp);

            using var reader = new StreamReader(Request.Body);
            var body = await reader.ReadToEndAsync();

            _logger.LogInformation("{Body}", body);

            return Ok();
        }
    }
}

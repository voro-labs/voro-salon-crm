using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSalonCrm.Application.Services.Interfaces;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/webhooks")]
    [Tags("Webhooks")]
    [ApiController]
    public class SubscriptionWebhookController(ISubscriptionService subscriptionService) : ControllerBase
    {
        [HttpPost("mercadopago")]
        [AllowAnonymous]
        public async Task<IActionResult> MercadoPagoWebhook()
        {
            try
            {
                // Lê o body bruto
                using var reader = new StreamReader(Request.Body);
                var body = await reader.ReadToEndAsync();

                // Lê os query params enviados pelo MercadoPago
                var topic = Request.Query["topic"].ToString();
                var id    = Request.Query["id"].ToString();

                // MP também envia via body JSON em notificações v2
                if (string.IsNullOrEmpty(topic) || string.IsNullOrEmpty(id))
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(body);
                    var root = doc.RootElement;

                    if (root.TryGetProperty("type", out var typeEl))
                        topic = typeEl.GetString() ?? string.Empty;

                    if (root.TryGetProperty("data", out var dataEl) &&
                        dataEl.TryGetProperty("id", out var idEl))
                        id = idEl.GetString() ?? idEl.GetRawText().Trim('"');
                }

                if (!string.IsNullOrEmpty(topic) && !string.IsNullOrEmpty(id))
                    await subscriptionService.ProcessWebhookAsync(topic, id);
            }
            catch (Exception ex)
            {
                // Sempre retorna 200 — MP não deve retentar por erros internos
                Console.Error.WriteLine($"[Webhook] Error: {ex.Message}");
            }

            return Ok();
        }
    }
}

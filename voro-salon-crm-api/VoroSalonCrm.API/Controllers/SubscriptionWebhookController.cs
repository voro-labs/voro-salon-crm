using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSalonCrm.Application.Services.Interfaces;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/webhooks")]
    [Tags("Webhooks")]
    [ApiController]
    public class SubscriptionWebhookController(
        ISubscriptionService subscriptionService,
        ILogger<SubscriptionWebhookController> logger) : ControllerBase
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

                logger.LogInformation("[Webhook] Requisição recebida. Headers: {Headers} | QueryString: {Query} | Body: {Body}",
                    string.Join("; ", Request.Headers.Select(h => $"{h.Key}={h.Value}")),
                    Request.QueryString.Value,
                    body);

                // Lê os query params enviados pelo MercadoPago
                var topic = Request.Query["topic"].ToString();
                var id    = Request.Query["id"].ToString();

                logger.LogInformation("[Webhook] Query params — topic: '{Topic}' | id: '{Id}'", topic, id);

                // MP também envia via body JSON em notificações v2
                if (string.IsNullOrEmpty(topic) || string.IsNullOrEmpty(id))
                {
                    logger.LogInformation("[Webhook] Query params ausentes, tentando extrair do body JSON.");

                    using var doc = System.Text.Json.JsonDocument.Parse(body);
                    var root = doc.RootElement;

                    if (root.TryGetProperty("type", out var typeEl))
                    {
                        topic = typeEl.GetString() ?? string.Empty;
                        logger.LogInformation("[Webhook] 'type' extraído do body: '{Topic}'", topic);
                    }
                    else
                    {
                        logger.LogWarning("[Webhook] Campo 'type' não encontrado no body JSON.");
                    }

                    if (root.TryGetProperty("data", out var dataEl) &&
                        dataEl.TryGetProperty("id", out var idEl))
                    {
                        id = idEl.GetString() ?? idEl.GetRawText().Trim('"');
                        logger.LogInformation("[Webhook] 'data.id' extraído do body: '{Id}'", id);
                    }
                    else
                    {
                        logger.LogWarning("[Webhook] Campo 'data.id' não encontrado no body JSON.");
                    }
                }

                if (!string.IsNullOrEmpty(topic) && !string.IsNullOrEmpty(id))
                {
                    logger.LogInformation("[Webhook] Processando evento — topic: '{Topic}' | id: '{Id}'", topic, id);
                    await subscriptionService.ProcessWebhookAsync(topic, id);
                    logger.LogInformation("[Webhook] Evento processado com sucesso — topic: '{Topic}' | id: '{Id}'", topic, id);
                }
                else
                {
                    logger.LogWarning("[Webhook] Evento ignorado — topic ou id vazios. topic: '{Topic}' | id: '{Id}'", topic, id);
                }
            }
            catch (Exception ex)
            {
                // Sempre retorna 200 — MP não deve retentar por erros internos
                logger.LogError(ex, "[Webhook] Erro não tratado ao processar webhook. Mensagem: {Message}", ex.Message);
            }

            return Ok();
        }
    }
}

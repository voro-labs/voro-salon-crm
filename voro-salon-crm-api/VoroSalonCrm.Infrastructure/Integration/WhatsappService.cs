using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using VoroSalonCrm.Application.DTOs.Integration;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Shared.Utils;

namespace VoroSalonCrm.Infrastructure.Integration
{
    public sealed class WhatsappService : IWhatsappService
    {
        private readonly IntegrationUtil _config;
        private readonly HttpClient _http;
        private readonly ILogger<WhatsappService> _logger;

        public WhatsappService(
            IOptions<IntegrationUtil> integrationUtil,
            IHttpClientFactory httpClientFactory,
            ILogger<WhatsappService> logger)
        {
            _config = integrationUtil.Value;
            _http = httpClientFactory.CreateClient("whatsapp");
            _logger = logger;
        }

        public async Task<bool> SendTemplateMessageAsync(WhatsappTemplateMessageDto message, CancellationToken ct = default)
        {
            var phoneId = _config.Whatsapp.PhoneId;
            var url = $"https://graph.facebook.com/v22.0/{phoneId}/messages";
            
            var payload = new 
            {
                messaging_product = "whatsapp",
                recipient_type = "individual",
                to = message.To,
                type = "template",
                template = new
                {
                    name = message.Template.Name,
                    language = new { code = message.Template.Language.Code },
                    components = message.Template.Components?.Select(c => new
                    {
                        type = c.Type,
                        parameters = c.Parameters.Select(p => new
                        {
                            type = p.Type,
                            parameter_name = p.ParameterName,
                            text = p.Text
                        })
                    })
                }
            };
            
            return await SendToWhatsappAsync(payload, ct);
        }

        public async Task<bool> SendTextMessageAsync(string to, string text, CancellationToken ct = default)
        {
            var payload = new
            {
                messaging_product = "whatsapp",
                recipient_type = "individual",
                to,
                type = "text",
                text = new { body = text }
            };

            return await SendToWhatsappAsync(payload, ct);
        }

        public async Task<bool> SendInteractiveMessageAsync(string to, object interactive, CancellationToken ct = default)
        {
            var payload = new
            {
                messaging_product = "whatsapp",
                recipient_type = "individual",
                to,
                type = "interactive",
                interactive
            };

            return await SendToWhatsappAsync(payload, ct);
        }

        private async Task<bool> SendToWhatsappAsync(object payload, CancellationToken ct)
        {
            var phoneId = _config.Whatsapp.PhoneId;
            var url = $"https://graph.facebook.com/v22.0/{phoneId}/messages";

            using var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _config.Whatsapp.Token);

            var jsonOptions = new JsonSerializerOptions 
            { 
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull 
            };
            var jsonContent = JsonSerializer.Serialize(payload, jsonOptions);
            
            request.Content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

            var response = await _http.SendAsync(request, ct);
            var responseBody = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("WhatsApp integration failed ({StatusCode}): {Body}", (int)response.StatusCode, responseBody);
                return false;
            }
            
            return true;
        }
    }
}

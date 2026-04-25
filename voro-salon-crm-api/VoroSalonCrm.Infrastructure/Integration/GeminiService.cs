using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using VoroSalonCrm.Application.Services.Interfaces.Integration;

namespace VoroSalonCrm.Infrastructure.Integration
{
    public sealed class GeminiService : IGeminiService
    {
        private readonly HttpClient _http;
        private readonly IConfiguration _configuration;
        private readonly ILogger<GeminiService> _logger;

        private const string FallbackMessage =
            "Desculpe, não consegui processar sua mensagem no momento. Por favor, tente novamente.";

        public GeminiService(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<GeminiService> logger)
        {
            _http = httpClientFactory.CreateClient("gemini");
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<string> GenerateResponseAsync(
            string systemPrompt,
            List<(string role, string content)> history,
            string userMessage)
        {
            var apiKey = _configuration["AISettings:ApiKey"];
            var model = _configuration["AISettings:Model"] ?? "gemini-3.1-flash-lite-preview";

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                _logger.LogWarning("AISettings:ApiKey is not configured. Returning fallback message.");
                return FallbackMessage;
            }

            try
            {
                var contents = new List<object>();

                // System instruction is added as the first "user" turn followed by an empty "model" turn
                // to honour the alternating user/model constraint of the Gemini API.
                contents.Add(new
                {
                    role = "user",
                    parts = new[] { new { text = systemPrompt } }
                });
                contents.Add(new
                {
                    role = "model",
                    parts = new[] { new { text = "Entendido. Vou seguir essas instruções." } }
                });

                foreach (var (role, content) in history)
                {
                    // Gemini uses "user" and "model" — map "assistant" → "model"
                    var geminiRole = role == "assistant" ? "model" : "user";
                    contents.Add(new
                    {
                        role = geminiRole,
                        parts = new[] { new { text = content } }
                    });
                }

                // Add the current user message
                contents.Add(new
                {
                    role = "user",
                    parts = new[] { new { text = userMessage } }
                });

                var requestBody = new { contents };

                var json = JsonSerializer.Serialize(requestBody, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });

                var url = $"v1beta/models/{model}:generateContent?key={apiKey}";
                using var request = new HttpRequestMessage(HttpMethod.Post, url);
                request.Content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _http.SendAsync(request);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Gemini API error ({StatusCode}): {Body}", (int)response.StatusCode, responseBody);
                    return FallbackMessage;
                }

                var jsonNode = JsonNode.Parse(responseBody);
                var text = jsonNode?["candidates"]?[0]?["content"]?["parts"]?[0]?["text"]?.GetValue<string>();

                if (string.IsNullOrWhiteSpace(text))
                {
                    _logger.LogWarning("Gemini returned an empty response. Body: {Body}", responseBody);
                    return FallbackMessage;
                }

                return text.Trim();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error calling Gemini API.");
                return FallbackMessage;
            }
        }
    }
}

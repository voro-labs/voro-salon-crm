using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using VoroSalonCrm.Application.Services.Interfaces.Integration;

namespace VoroSalonCrm.Infrastructure.Integration
{
    public sealed class WhisperService : IWhisperService
    {
        private readonly HttpClient _http;
        private readonly IConfiguration _configuration;
        private readonly ILogger<WhisperService> _logger;

        public WhisperService(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<WhisperService> logger)
        {
            _http = httpClientFactory.CreateClient("openai");
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<string> TranscribeAsync(Stream audioStream, string filename, string language = "pt")
        {
            var apiKey = _configuration["OpenAISettings:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                _logger.LogWarning("OpenAISettings:ApiKey is not configured.");
                return string.Empty;
            }

            using var content = new MultipartFormDataContent();

            var audioContent = new StreamContent(audioStream);
            var ext = Path.GetExtension(filename).ToLowerInvariant();
            var mimeType = ext switch
            {
                ".webm" => "audio/webm",
                ".mp4" or ".m4a" => "audio/mp4",
                ".mp3" => "audio/mpeg",
                ".wav" => "audio/wav",
                ".ogg" => "audio/ogg",
                _ => "audio/webm"
            };
            audioContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(mimeType);
            content.Add(audioContent, "file", filename);
            content.Add(new StringContent("whisper-1"), "model");
            content.Add(new StringContent(language), "language");
            content.Add(new StringContent("json"), "response_format");

            using var request = new HttpRequestMessage(HttpMethod.Post, "v1/audio/transcriptions");
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);
            request.Content = content;

            var response = await _http.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Whisper API error ({StatusCode}): {Body}", (int)response.StatusCode, body);
                return string.Empty;
            }

            var json = JsonDocument.Parse(body);
            return json.RootElement.TryGetProperty("text", out var textProp)
                ? textProp.GetString() ?? string.Empty
                : string.Empty;
        }
    }
}

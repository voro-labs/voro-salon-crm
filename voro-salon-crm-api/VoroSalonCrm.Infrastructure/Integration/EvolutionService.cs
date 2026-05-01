using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Shared.Utils;

namespace VoroSalonCrm.Infrastructure.Integration
{
    public sealed class EvolutionService : IEvolutionService
    {
        private readonly WhatsappUtil _config;
        private readonly HttpClient _http;
        private readonly ILogger<EvolutionService> _logger;
        private readonly ITenantEvolutionInstanceRepository _instanceRepository;

        private static readonly JsonSerializerOptions _jsonOptions = new()
        {
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };

        public EvolutionService(
            IOptions<IntegrationUtil> integrationUtil,
            IHttpClientFactory httpClientFactory,
            ILogger<EvolutionService> logger,
            ITenantEvolutionInstanceRepository instanceRepository)
        {
            _config = integrationUtil.Value.Whatsapp;
            _http = httpClientFactory.CreateClient("evolution-go");
            _logger = logger;
            _instanceRepository = instanceRepository;
        }

        public async Task<bool> SendTextAsync(string instanceId, string to, string text, CancellationToken ct = default)
        {
            var instance = await _instanceRepository.GetByInstanceIdAsync(instanceId);
            if (instance == null)
            {
                _logger.LogWarning("Instância Evolution Go não encontrada: {InstanceId}", instanceId);
                return false;
            }

            var payload = new { number = NormalizeNumber(to), text, delay = 500 };
            var url = $"{_config.EvolutionUrl.TrimEnd('/')}/send/text";

            using var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Headers.Add("apikey", instance.InstanceToken);
            request.Content = new StringContent(
                JsonSerializer.Serialize(payload, _jsonOptions),
                Encoding.UTF8,
                "application/json");

            var response = await _http.SendAsync(request, ct);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(ct);
                _logger.LogError("Evolution Go falhou ({StatusCode}) ao enviar para {To}: {Body}",
                    (int)response.StatusCode, to, body);
                return false;
            }

            return true;
        }

        private static string NormalizeNumber(string number)
            => new string(number.Where(char.IsDigit).ToArray());
    }
}

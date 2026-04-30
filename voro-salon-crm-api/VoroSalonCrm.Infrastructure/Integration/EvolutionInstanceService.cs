using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using VoroSalonCrm.Application.DTOs.Integration;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Shared.Utils;

namespace VoroSalonCrm.Infrastructure.Integration
{
    public sealed class EvolutionInstanceService : IEvolutionInstanceService
    {
        private const int MaxInstancesPerTenant = 1;

        private readonly IntegrationUtil _config;
        private readonly HttpClient _http;
        private readonly ITenantEvolutionInstanceRepository _instanceRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly ILogger<EvolutionInstanceService> _logger;

        private static readonly JsonSerializerOptions _json = new()
        {
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            PropertyNameCaseInsensitive = true
        };

        public EvolutionInstanceService(
            IOptions<IntegrationUtil> integrationUtil,
            IHttpClientFactory httpClientFactory,
            ITenantEvolutionInstanceRepository instanceRepository,
            IUnitOfWork unitOfWork,
            ILogger<EvolutionInstanceService> logger)
        {
            _config = integrationUtil.Value;
            _http = httpClientFactory.CreateClient("evolution-go");
            _instanceRepository = instanceRepository;
            _unitOfWork = unitOfWork;
            _logger = logger;
        }

        public async Task<EvolutionInstanceDto> CreateAsync(Guid tenantId, CancellationToken ct = default)
        {
            var count = await _instanceRepository.CountByTenantIdAsync(tenantId);
            if (count >= MaxInstancesPerTenant)
                throw new InvalidOperationException($"Limite de {MaxInstancesPerTenant} instância(s) por tenant atingido.");

            var instanceId = $"voro-{Guid.NewGuid().ToString("N")[..8]}";
            var instanceToken = Guid.NewGuid().ToString("N");

            // Criar no Evolution Go
            var createPayload = new { instanceId, name = instanceId, token = instanceToken };
            await AdminPostAsync($"/instance/create", createPayload, ct);

            // Salvar no banco
            var entity = new TenantEvolutionInstance
            {
                TenantId = tenantId,
                InstanceId = instanceId,
                InstanceToken = instanceToken,
                Status = EvolutionInstanceStatus.Disconnected
            };

            await _instanceRepository.AddAsync(entity);
            await _unitOfWork.SaveChangesAsync();

            return ToDto(entity);
        }

        public async Task<IEnumerable<EvolutionInstanceDto>> GetByTenantAsync(Guid tenantId, CancellationToken ct = default)
        {
            var instance = await _instanceRepository.GetByTenantIdAsync(tenantId);
            return instance == null
                ? Enumerable.Empty<EvolutionInstanceDto>()
                : new[] { ToDto(instance) };
        }

        public async Task<EvolutionInstanceStatusDto> GetStatusAsync(Guid tenantId, Guid instanceDbId, CancellationToken ct = default)
        {
            var instance = await GetOwnedOrThrowAsync(tenantId, instanceDbId);
            var json = await InstanceGetAsync(instance.InstanceToken, "/instance/status", ct);

            var state = json.TryGetProperty("state", out var s) ? s.GetString() ?? "close" : "close";
            var newStatus = state == "open" ? EvolutionInstanceStatus.Connected
                          : state == "connecting" ? EvolutionInstanceStatus.Connecting
                          : EvolutionInstanceStatus.Disconnected;

            if (instance.Status != newStatus)
            {
                instance.Status = newStatus;
                if (newStatus == EvolutionInstanceStatus.Connected && instance.ConnectedAt == null)
                    instance.ConnectedAt = DateTimeOffset.UtcNow;
                _instanceRepository.Update(instance);
                await _unitOfWork.SaveChangesAsync();
            }

            return new EvolutionInstanceStatusDto(state, instance.InstanceId);
        }

        public async Task<EvolutionInstanceQrDto> GetQrAsync(Guid tenantId, Guid instanceDbId, CancellationToken ct = default)
        {
            var instance = await GetOwnedOrThrowAsync(tenantId, instanceDbId);
            var json = await InstanceGetAsync(instance.InstanceToken, "/instance/qr", ct);

            string? qrCode = null;
            if (json.TryGetProperty("qr", out var qr))
                qrCode = qr.GetString();
            else if (json.TryGetProperty("base64", out var b64))
                qrCode = b64.GetString();

            return new EvolutionInstanceQrDto(qrCode);
        }

        public async Task<EvolutionInstancePairResultDto> PairAsync(Guid tenantId, Guid instanceDbId, string phone, CancellationToken ct = default)
        {
            var instance = await GetOwnedOrThrowAsync(tenantId, instanceDbId);
            var payload = new { phone };
            var json = await InstancePostAsync(instance.InstanceToken, "/instance/pair", payload, ct);

            var code = json.TryGetProperty("code", out var c) ? c.GetString()
                     : json.TryGetProperty("pairingCode", out var pc) ? pc.GetString()
                     : null;

            if (string.IsNullOrEmpty(code))
                throw new InvalidOperationException("Evolution Go não retornou pairing code.");

            instance.Status = EvolutionInstanceStatus.Connecting;
            _instanceRepository.Update(instance);
            await _unitOfWork.SaveChangesAsync();

            return new EvolutionInstancePairResultDto(code);
        }

        public async Task ConnectWebhookAsync(Guid tenantId, Guid instanceDbId, CancellationToken ct = default)
        {
            var instance = await GetOwnedOrThrowAsync(tenantId, instanceDbId);
            var webhookUrl = $"{_config.ApiPublicUrl.TrimEnd('/')}/api/whatsapp/evolution-webhook";

            var payload = new
            {
                subscribe = new[] { "ALL" },
                webhookUrl
            };

            await InstancePostAsync(instance.InstanceToken, "/instance/connect", payload, ct);
        }

        public async Task DisconnectAsync(Guid tenantId, Guid instanceDbId, CancellationToken ct = default)
        {
            var instance = await GetOwnedOrThrowAsync(tenantId, instanceDbId);
            await InstancePostAsync(instance.InstanceToken, "/instance/disconnect", new { }, ct);

            instance.Status = EvolutionInstanceStatus.Disconnected;
            instance.PhoneNumber = null;
            instance.ConnectedAt = null;
            _instanceRepository.Update(instance);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid tenantId, Guid instanceDbId, CancellationToken ct = default)
        {
            var instance = await GetOwnedOrThrowAsync(tenantId, instanceDbId);

            // Tentar deletar no Evolution Go (não falhar se instância não existir mais)
            try
            {
                var url = $"{_config.Whatsapp.EvolutionUrl.TrimEnd('/')}/instance/delete/{instance.InstanceId}";
                var request = new HttpRequestMessage(HttpMethod.Delete, url);
                request.Headers.Add("apikey", _config.Whatsapp.EvolutionAdminToken);
                await _http.SendAsync(request, ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Erro ao deletar instância {InstanceId} no Evolution Go.", instance.InstanceId);
            }

            _instanceRepository.Delete(instance);
            await _unitOfWork.SaveChangesAsync();
        }

        // ── Helpers ──────────────────────────────────────────────────────────

        private async Task<TenantEvolutionInstance> GetOwnedOrThrowAsync(Guid tenantId, Guid instanceDbId)
        {
            var instance = await _instanceRepository.GetByIdAsync(true, instanceDbId)
                ?? throw new KeyNotFoundException("Instância não encontrada.");

            if (instance.TenantId != tenantId)
                throw new UnauthorizedAccessException("Instância não pertence a este tenant.");

            return instance;
        }

        private async Task AdminPostAsync(string path, object payload, CancellationToken ct)
        {
            var url = $"{_config.Whatsapp.EvolutionUrl.TrimEnd('/')}{path}";
            using var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Headers.Add("apikey", _config.Whatsapp.EvolutionAdminToken);
            request.Content = new StringContent(JsonSerializer.Serialize(payload, _json), System.Text.Encoding.UTF8, "application/json");

            var response = await _http.SendAsync(request, ct);
            var body = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException($"Evolution Go falhou em {path}: {body}");
        }

        private async Task<JsonElement> InstancePostAsync(string token, string path, object payload, CancellationToken ct)
        {
            var url = $"{_config.Whatsapp.EvolutionUrl.TrimEnd('/')}{path}";
            using var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Headers.Add("apikey", token);
            request.Content = new StringContent(JsonSerializer.Serialize(payload, _json), System.Text.Encoding.UTF8, "application/json");

            var response = await _http.SendAsync(request, ct);
            var body = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Evolution Go {Path} retornou {Status}: {Body}", path, (int)response.StatusCode, body);
                throw new InvalidOperationException($"Evolution Go falhou em {path}: {body}");
            }

            try { return JsonDocument.Parse(body).RootElement; }
            catch { return JsonDocument.Parse("{}").RootElement; }
        }

        private async Task<JsonElement> InstanceGetAsync(string token, string path, CancellationToken ct)
        {
            var url = $"{_config.Whatsapp.EvolutionUrl.TrimEnd('/')}{path}";
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Add("apikey", token);

            var response = await _http.SendAsync(request, ct);
            var body = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException($"Evolution Go falhou em {path}: {body}");

            try { return JsonDocument.Parse(body).RootElement; }
            catch { return JsonDocument.Parse("{}").RootElement; }
        }

        private static EvolutionInstanceDto ToDto(TenantEvolutionInstance e) =>
            new(e.Id, e.InstanceId, e.Status, e.PhoneNumber, e.CreatedAt, e.ConnectedAt);
    }
}

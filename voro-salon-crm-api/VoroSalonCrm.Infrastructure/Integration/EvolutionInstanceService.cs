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
        private readonly ITenantEvolutionInstanceLinkRepository _linkRepository;
        private readonly IUserTenantRepository _userTenantRepository;
        private readonly ITenantRepository _tenantRepository;
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
            ITenantEvolutionInstanceLinkRepository linkRepository,
            IUserTenantRepository userTenantRepository,
            ITenantRepository tenantRepository,
            IUnitOfWork unitOfWork,
            ILogger<EvolutionInstanceService> logger)
        {
            _config = integrationUtil.Value;
            _http = httpClientFactory.CreateClient("evolution-go");
            _instanceRepository = instanceRepository;
            _linkRepository = linkRepository;
            _userTenantRepository = userTenantRepository;
            _tenantRepository = tenantRepository;
            _unitOfWork = unitOfWork;
            _logger = logger;
        }

        public async Task<EvolutionInstanceDto> CreateAsync(Guid tenantId, CancellationToken ct = default)
        {
            var count = await _instanceRepository.CountByTenantIdAsync(tenantId);
            if (count >= MaxInstancesPerTenant)
                throw new InvalidOperationException($"Limite de {MaxInstancesPerTenant} instância(s) por tenant atingido.");

            var instanceId = Guid.NewGuid().ToString();
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

            return ToDto(entity, isOwned: true, ownerTenantName: null);
        }

        public async Task<IEnumerable<EvolutionInstanceDto>> GetByTenantAsync(Guid tenantId, CancellationToken ct = default)
        {
            // Instância própria
            var own = await _instanceRepository.GetByTenantIdAsync(tenantId);
            if (own != null)
                return new[] { ToDto(own, isOwned: true, ownerTenantName: null) };

            // Instância vinculada
            var link = await _linkRepository.GetByTenantIdAsync(tenantId);
            if (link != null)
            {
                // link.Instance já foi carregado via Include no repositório
                var ownerTenant = await _tenantRepository.GetByIdAsync(true, link.Instance.TenantId);
                return new[] { ToDto(link.Instance, isOwned: false, ownerTenantName: ownerTenant?.Name) };
            }

            return Enumerable.Empty<EvolutionInstanceDto>();
        }

        public async Task<EvolutionInstanceStatusDto> GetStatusAsync(Guid tenantId, Guid instanceDbId, CancellationToken ct = default)
        {
            var (instance, _) = await ResolveOrThrowAsync(tenantId, instanceDbId);
            var json = await InstanceGetAsync(instance.InstanceToken, "/instance/status", ct);

            var dataEl = json.TryGetProperty("data", out var d) ? d : json;
            var connected = dataEl.TryGetProperty("Connected", out var c) && c.GetBoolean();
            var loggedIn = dataEl.TryGetProperty("LoggedIn", out var l) && l.GetBoolean();

            var state = loggedIn ? "open" : connected ? "connecting" : "close";
            var newStatus = loggedIn ? EvolutionInstanceStatus.Connected
                          : connected ? EvolutionInstanceStatus.Connecting
                          : EvolutionInstanceStatus.Disconnected;

            // Se a instância foi desconectada manualmente, não permitir que o Evolution Go
            // auto-reconecte e sobrescreva o status. O status só sai de Disconnected via
            // ação explícita do usuário (PairAsync / QR scan).
            if (instance.Status == EvolutionInstanceStatus.Disconnected &&
                newStatus != EvolutionInstanceStatus.Disconnected)
            {
                return new EvolutionInstanceStatusDto("close", instance.InstanceId);
            }

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
            var (instance, isOwned) = await ResolveOrThrowAsync(tenantId, instanceDbId);
            if (!isOwned) throw new UnauthorizedAccessException("Somente o tenant dono pode conectar via QR.");

            // Sinaliza que o usuário está tentando conectar, permitindo que o polling de status
            // detecte o sucesso da conexão mesmo que o DB esteja em Disconnected.
            if (instance.Status == EvolutionInstanceStatus.Disconnected)
            {
                instance.Status = EvolutionInstanceStatus.Connecting;
                _instanceRepository.Update(instance);
                await _unitOfWork.SaveChangesAsync();
            }

            var json = await InstanceGetAsync(instance.InstanceToken, "/instance/qr", ct);

            string? qrCode = null;
            var root = json.TryGetProperty("data", out var dataEl) ? dataEl : json;

            if (root.TryGetProperty("Qrcode", out var qrc)) qrCode = qrc.GetString();
            else if (root.TryGetProperty("qrcode", out var qrcLow)) qrCode = qrcLow.GetString();
            else if (root.TryGetProperty("qr", out var qr)) qrCode = qr.GetString();
            else if (root.TryGetProperty("base64", out var b64)) qrCode = b64.GetString();

            return new EvolutionInstanceQrDto(qrCode);
        }

        public async Task<EvolutionInstancePairResultDto> PairAsync(Guid tenantId, Guid instanceDbId, string phone, CancellationToken ct = default)
        {
            var (instance, isOwned) = await ResolveOrThrowAsync(tenantId, instanceDbId);
            if (!isOwned) throw new UnauthorizedAccessException("Somente o tenant dono pode parear via código.");

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
            var (instance, isOwned) = await ResolveOrThrowAsync(tenantId, instanceDbId);
            if (!isOwned) throw new UnauthorizedAccessException("Somente o tenant dono pode configurar webhook.");

            var webhookUrl = $"{_config.Whatsapp.ApiPublicUrl.TrimEnd('/')}/api/v1/whatsapp/evolution-webhook";

            var payload = new
            {
                subscribe = new[] { "ALL" },
                webhookUrl
            };

            await InstancePostAsync(instance.InstanceToken, "/instance/connect", payload, ct);
        }

        public async Task DisconnectAsync(Guid tenantId, Guid instanceDbId, CancellationToken ct = default)
        {
            var (instance, isOwned) = await ResolveOrThrowAsync(tenantId, instanceDbId);
            if (!isOwned) throw new UnauthorizedAccessException("Somente o tenant dono pode desconectar esta instância.");

            await InstancePostAsync(instance.InstanceToken, "/instance/disconnect", new { }, ct);

            instance.Status = EvolutionInstanceStatus.Disconnected;
            instance.PhoneNumber = null;
            instance.ConnectedAt = null;
            _instanceRepository.Update(instance);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid tenantId, Guid instanceDbId, CancellationToken ct = default)
        {
            var (instance, isOwned) = await ResolveOrThrowAsync(tenantId, instanceDbId);
            if (!isOwned) throw new UnauthorizedAccessException("Somente o tenant dono pode excluir esta instância.");

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

        public async Task<IEnumerable<EvolutionAvailableInstanceDto>> GetAvailableToLinkAsync(
            Guid currentTenantId, Guid userId, CancellationToken ct = default)
        {
            // Se já tem instância própria ou link, retorna vazio
            var hasOwn = await _instanceRepository.CountByTenantIdAsync(currentTenantId) > 0;
            if (hasOwn) return Enumerable.Empty<EvolutionAvailableInstanceDto>();

            var existingLink = await _linkRepository.GetByTenantIdAsync(currentTenantId);
            if (existingLink != null) return Enumerable.Empty<EvolutionAvailableInstanceDto>();

            // Todos os tenants que o usuário acessa, exceto o atual
            var userTenants = await _userTenantRepository.GetAllAsync(
                ut => ut.UserId == userId, asNoTracking: true);
            var otherTenantIds = userTenants
                .Select(ut => ut.TenantId)
                .Where(id => id != currentTenantId)
                .ToList();

            var result = new List<EvolutionAvailableInstanceDto>();
            foreach (var tid in otherTenantIds)
            {
                var instance = await _instanceRepository.GetByTenantIdAsync(tid);
                if (instance == null) continue;

                var tenant = await _tenantRepository.GetByIdAsync(true, tid);
                result.Add(new EvolutionAvailableInstanceDto(
                    instance.Id,
                    tenant?.Name ?? tid.ToString(),
                    instance.PhoneNumber,
                    instance.Status));
            }
            return result;
        }

        public async Task LinkAsync(Guid tenantId, Guid instanceId, Guid userId, CancellationToken ct = default)
        {
            if (await _instanceRepository.CountByTenantIdAsync(tenantId) > 0)
                throw new InvalidOperationException("Este tenant já possui uma instância própria.");

            if (await _linkRepository.GetByTenantIdAsync(tenantId) != null)
                throw new InvalidOperationException("Este tenant já possui um vínculo ativo.");

            // instanceId aqui é o Guid do banco (Id da entidade), não o instanceId string do Evolution
            var instance = await _instanceRepository.GetByIdAsync(true, instanceId)
                ?? throw new KeyNotFoundException("Instância não encontrada.");

            if (instance.TenantId == tenantId)
                throw new InvalidOperationException("Não é possível vincular a própria instância.");

            // Verificar que o usuário tem acesso ao tenant dono
            var userTenants = await _userTenantRepository.GetAllAsync(
                ut => ut.UserId == userId && ut.TenantId == instance.TenantId, asNoTracking: true);
            if (!userTenants.Any())
                throw new UnauthorizedAccessException("Sem acesso ao tenant dono desta instância.");

            var link = new TenantEvolutionInstanceLink { TenantId = tenantId, InstanceId = instanceId };
            await _linkRepository.AddAsync(link);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task UnlinkAsync(Guid tenantId, CancellationToken ct = default)
        {
            var link = await _linkRepository.GetByTenantIdAsync(tenantId)
                ?? throw new KeyNotFoundException("Nenhum vínculo ativo para este tenant.");
            _linkRepository.Delete(link);
            await _unitOfWork.SaveChangesAsync();
        }

        // ── Helpers ──────────────────────────────────────────────────────────

        private async Task<(TenantEvolutionInstance instance, bool isOwned)> ResolveOrThrowAsync(Guid tenantId, Guid instanceDbId)
        {
            // Tenta instância própria
            var own = await _instanceRepository.GetByIdAsync(true, instanceDbId);
            if (own != null && own.TenantId == tenantId)
                return (own, true);

            // Tenta instância vinculada — link.Instance já carregado via Include
            var link = await _linkRepository.GetByTenantIdAsync(tenantId);
            if (link != null && link.InstanceId == instanceDbId)
                return (link.Instance, false);

            throw new KeyNotFoundException("Instância não encontrada ou não pertence a este tenant.");
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

        private static EvolutionInstanceDto ToDto(TenantEvolutionInstance e, bool isOwned, string? ownerTenantName) =>
            new(e.Id, e.InstanceId, e.Status, e.PhoneNumber, e.CreatedAt, e.ConnectedAt, isOwned, ownerTenantName);
    }
}

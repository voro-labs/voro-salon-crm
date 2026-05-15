using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using VoroSalonCrm.Application.DTOs.Integration;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Identity;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Shared.Utils;

namespace VoroSalonCrm.Infrastructure.Integration
{
    /// <summary>
    /// Implementação alternativa de IWhatsappService usando Evolution Go.
    /// Para voltar à API oficial Meta, alterar Provider para "meta" no config.
    /// </summary>
    public sealed class EvolutionWhatsappService : IWhatsappService
    {
        private readonly WhatsappUtil _config;
        private readonly HttpClient _http;
        private readonly ILogger<EvolutionWhatsappService> _logger;
        private readonly ICurrentUserService _currentUser;
        private readonly IWhatsAppMessageService _messageService;
        private readonly ITenantEvolutionInstanceRepository _instanceRepository;
        private readonly IWhatsAppTemplateRepository _templateRepository;

        private static readonly JsonSerializerOptions _jsonOptions = new()
        {
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };

        public EvolutionWhatsappService(
            IOptions<IntegrationUtil> integrationUtil,
            IHttpClientFactory httpClientFactory,
            ILogger<EvolutionWhatsappService> logger,
            ICurrentUserService currentUser,
            IWhatsAppMessageService messageService,
            ITenantEvolutionInstanceRepository instanceRepository,
            IWhatsAppTemplateRepository templateRepository)
        {
            _config = integrationUtil.Value.Whatsapp;
            _http = httpClientFactory.CreateClient("evolution-go");
            _logger = logger;
            _currentUser = currentUser;
            _messageService = messageService;
            _instanceRepository = instanceRepository;
            _templateRepository = templateRepository;
        }

        public async Task<bool> SendTextMessageAsync(
            string to,
            string text,
            string? phoneIdOverride = null,
            CancellationToken ct = default)
        {
            var (token, instanceId) = await GetTenantInstanceAsync(ct);
            if (token == null) return false;

            var payload = new { number = NormalizeNumber(to), text, delay = 500 };
            var success = await PostAsync("/send/text", payload, token, ct);

            if (success)
            {
                var tenantId = _currentUser.TenantId;
                if (tenantId != Guid.Empty)
                {
                    try { await _messageService.SaveOutboundAsync(tenantId, instanceId!, to, text); }
                    catch (Exception ex) { _logger.LogError(ex, "Erro ao salvar mensagem outbound Evolution Go."); }
                }
            }

            return success;
        }

        public async Task<bool> SendTemplateMessageAsync(
            WhatsappTemplateMessageDto message,
            string? phoneIdOverride = null,
            CancellationToken ct = default)
        {
            var bodyParams = message.Template.Components?
                .Where(c => c.Type == "body")
                .SelectMany(c => c.Parameters)
                .Where(p => !string.IsNullOrWhiteSpace(p.Text))
                .Select(p => p.Text!)
                .ToList() ?? new List<string>();

            string text;

            // Tenta buscar o corpo do template cadastrado para renderização correta
            var tenantId = _currentUser.TenantId;
            if (tenantId != Guid.Empty)
            {
                try
                {
                    var templates = await _templateRepository.GetAllAsync(t =>
                        (t.TenantId == tenantId || t.TenantId == Guid.Empty) &&
                        t.Name == message.Template.Name &&
                        t.Body != null);

                    var template = templates.FirstOrDefault();
                    if (template?.Body != null)
                    {
                        text = template.Body;
                        for (int i = 0; i < bodyParams.Count; i++)
                            text = text.Replace($"{{{{{i + 1}}}}}", bodyParams[i]);

                        return await SendTextMessageAsync(message.To, text, phoneIdOverride, ct);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Falha ao buscar corpo do template '{Name}'. Usando fallback.", message.Template.Name);
                }
            }

            // Fallback: lista de parâmetros separada por nova linha
            text = bodyParams.Count > 0
                ? string.Join("\n", bodyParams)
                : $"[{message.Template.Name}]";

            return await SendTextMessageAsync(message.To, text, phoneIdOverride, ct);
        }

        public async Task<bool> SendInteractiveMessageAsync(
            string to,
            object interactive,
            string? phoneIdOverride = null,
            CancellationToken ct = default)
        {
            var (token, _) = await GetTenantInstanceAsync(ct);
            if (token == null) return false;

            // Detecta tipo do interactive Meta e converte para Evolution Go.
            try
            {
                using var doc = JsonDocument.Parse(JsonSerializer.Serialize(interactive, _jsonOptions));
                var root = doc.RootElement;

                if (root.TryGetProperty("type", out var typeProp))
                {
                    var type = typeProp.GetString();

                    if (type == "button")
                        return await SendAsButtonsAsync(to, root, token, ct);

                    if (type == "list")
                        return await SendAsListAsync(to, root, token, ct);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Não foi possível converter mensagem interativa para Evolution Go. Enviando como texto.");
            }

            // Fallback: extrair texto do body e enviar como texto simples.
            var fallbackText = TryExtractBodyText(interactive);
            return await SendTextMessageAsync(to, fallbackText, phoneIdOverride, ct);
        }

        // ── Helpers privados ──────────────────────────────────────────────────

        private async Task<(string? token, string? instanceId)> GetTenantInstanceAsync(CancellationToken ct)
        {
            var tenantId = _currentUser.TenantId;
            if (tenantId == Guid.Empty) return (null, null);

            var instance = await _instanceRepository.GetByTenantIdAsync(tenantId);
            if (instance == null)
            {
                _logger.LogWarning("Tenant {TenantId} não possui instância Evolution Go configurada.", tenantId);
                return (null, null);
            }

            return (instance.InstanceToken, instance.InstanceId);
        }

        private async Task<bool> SendAsButtonsAsync(string to, JsonElement root, string token, CancellationToken ct)
        {
            var bodyText = root.TryGetProperty("body", out var b) && b.TryGetProperty("text", out var bt)
                ? bt.GetString() ?? string.Empty
                : string.Empty;

            var buttons = new List<object>();
            if (root.TryGetProperty("action", out var action) && action.TryGetProperty("buttons", out var btns))
            {
                foreach (var btn in btns.EnumerateArray())
                {
                    var displayText = btn.TryGetProperty("reply", out var r) && r.TryGetProperty("title", out var t)
                        ? t.GetString() : null;
                    var id = btn.TryGetProperty("reply", out var r2) && r2.TryGetProperty("id", out var i)
                        ? i.GetString() : null;

                    buttons.Add(new { type = "reply", displayText, id });
                }
            }

            var payload = new
            {
                number = NormalizeNumber(to),
                title = bodyText,
                description = bodyText,
                footer = string.Empty,
                buttons,
                delay = 500
            };

            return await PostAsync("/send/button", payload, token, ct);
        }

        private async Task<bool> SendAsListAsync(string to, JsonElement root, string token, CancellationToken ct)
        {
            var bodyText = root.TryGetProperty("body", out var b) && b.TryGetProperty("text", out var bt)
                ? bt.GetString() ?? string.Empty
                : string.Empty;
            var buttonText = root.TryGetProperty("action", out var act) && act.TryGetProperty("button", out var btn)
                ? btn.GetString() ?? "Ver opções"
                : "Ver opções";

            var sections = new List<object>();
            if (root.TryGetProperty("action", out var action) && action.TryGetProperty("sections", out var secs))
            {
                foreach (var sec in secs.EnumerateArray())
                {
                    var title = sec.TryGetProperty("title", out var t) ? t.GetString() ?? string.Empty : string.Empty;
                    var rows = new List<object>();

                    if (sec.TryGetProperty("rows", out var rowsEl))
                    {
                        foreach (var row in rowsEl.EnumerateArray())
                        {
                            rows.Add(new
                            {
                                title = row.TryGetProperty("title", out var rt) ? rt.GetString() : string.Empty,
                                description = row.TryGetProperty("description", out var rd) ? rd.GetString() : string.Empty,
                                rowId = row.TryGetProperty("id", out var ri) ? ri.GetString() : string.Empty
                            });
                        }
                    }

                    sections.Add(new { title, rows });
                }
            }

            var payload = new
            {
                number = NormalizeNumber(to),
                title = bodyText,
                description = bodyText,
                buttonText,
                footerText = string.Empty,
                sections,
                delay = 500
            };

            return await PostAsync("/send/list", payload, token, ct);
        }

        private async Task<bool> PostAsync(string path, object payload, string token, CancellationToken ct)
        {
            var url = $"{_config.EvolutionUrl.TrimEnd('/')}{path}";
            using var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Headers.Add("apikey", token);

            var json = JsonSerializer.Serialize(payload, _jsonOptions);
            request.Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

            var response = await _http.SendAsync(request, ct);
            var body = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Evolution Go falhou ({StatusCode}) em {Path}: {Body}", (int)response.StatusCode, path, body);
                return false;
            }

            return true;
        }

        private static string NormalizeNumber(string number)
            => new string(number.Where(char.IsDigit).ToArray());

        private static string TryExtractBodyText(object interactive)
        {
            try
            {
                var json = JsonSerializer.Serialize(interactive);
                using var doc = JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty("body", out var b) && b.TryGetProperty("text", out var t))
                    return t.GetString() ?? "[Mensagem interativa]";
            }
            catch { }
            return "[Mensagem interativa]";
        }
    }
}

using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using VoroSalonCrm.Application.DTOs.Integration;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Shared.Utils;

namespace VoroSalonCrm.Infrastructure.Integration;

public sealed class WhatsAppOnboardingService : IWhatsAppOnboardingService
{
    private readonly IntegrationUtil _config;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ITenantRepository _tenantRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<WhatsAppOnboardingService> _logger;

    public WhatsAppOnboardingService(
        IOptions<IntegrationUtil> integrationUtil,
        IHttpClientFactory httpClientFactory,
        ITenantRepository tenantRepository,
        IUnitOfWork unitOfWork,
        ILogger<WhatsAppOnboardingService> logger)
    {
        _config = integrationUtil.Value;
        _httpClientFactory = httpClientFactory;
        _tenantRepository = tenantRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task ExchangeCodeAsync(WhatsAppExchangeCodeDto dto, Guid tenantId)
    {
        var http = _httpClientFactory.CreateClient("whatsapp-graph");
        var appId = _config.Whatsapp.AppId;
        var appSecret = _config.Whatsapp.AppSecret;

        // Step 1: Exchange code for short-lived token
        var shortTokenUrl =
            $"/v22.0/oauth/access_token" +
            $"?client_id={Uri.EscapeDataString(appId)}" +
            $"&client_secret={Uri.EscapeDataString(appSecret)}" +
            $"&redirect_uri=https%3A%2F%2Ffacebook.com%2Fconnect%2Flogin_success.html" +
            $"&code={Uri.EscapeDataString(dto.Code)}";

        string shortToken;
        try
        {
            var shortResponse = await http.GetAsync(shortTokenUrl);
            var shortContent = await shortResponse.Content.ReadAsStringAsync();

            if (!shortResponse.IsSuccessStatusCode)
                throw new InvalidOperationException($"Falha ao obter token de curta duração: {shortContent}");

            var shortJson = JsonSerializer.Deserialize<JsonElement>(shortContent);
            shortToken = shortJson.GetProperty("access_token").GetString()
                         ?? throw new InvalidOperationException("access_token ausente na resposta do token de curta duração.");
        }
        catch (HttpRequestException ex)
        {
            throw new InvalidOperationException($"Erro de comunicação ao trocar o código por token: {ex.Message}", ex);
        }

        // Step 2: Exchange for long-lived token (60 days)
        var longTokenUrl =
            $"/v22.0/oauth/access_token" +
            $"?grant_type=fb_exchange_token" +
            $"&client_id={Uri.EscapeDataString(appId)}" +
            $"&client_secret={Uri.EscapeDataString(appSecret)}" +
            $"&fb_exchange_token={Uri.EscapeDataString(shortToken)}";

        string longToken;
        long expiresIn;
        try
        {
            var longResponse = await http.GetAsync(longTokenUrl);
            var longContent = await longResponse.Content.ReadAsStringAsync();

            if (!longResponse.IsSuccessStatusCode)
                throw new InvalidOperationException($"Falha ao obter token de longa duração: {longContent}");

            var longJson = JsonSerializer.Deserialize<JsonElement>(longContent);
            longToken = longJson.GetProperty("access_token").GetString()
                        ?? throw new InvalidOperationException("access_token ausente na resposta do token de longa duração.");
            expiresIn = longJson.TryGetProperty("expires_in", out var expProp) ? expProp.GetInt64() : 5184000L; // default 60 days
        }
        catch (HttpRequestException ex)
        {
            throw new InvalidOperationException($"Erro de comunicação ao obter token de longa duração: {ex.Message}", ex);
        }

        // Step 3: Get phone numbers from WABA
        string phoneNumberId;
        string displayPhone;
        try
        {
            var phoneUrl = $"/v22.0/{Uri.EscapeDataString(dto.WabaId)}/phone_numbers?access_token={Uri.EscapeDataString(longToken)}";
            var phoneResponse = await http.GetAsync(phoneUrl);
            var phoneContent = await phoneResponse.Content.ReadAsStringAsync();

            if (!phoneResponse.IsSuccessStatusCode)
                throw new InvalidOperationException($"Falha ao obter números de telefone do WABA: {phoneContent}");

            var phoneJson = JsonSerializer.Deserialize<JsonElement>(phoneContent);
            var data = phoneJson.GetProperty("data");

            if (data.GetArrayLength() == 0)
                throw new InvalidOperationException("Nenhum número de telefone encontrado no WABA informado.");

            var first = data[0];
            phoneNumberId = first.GetProperty("id").GetString()
                            ?? throw new InvalidOperationException("id do número de telefone ausente na resposta.");
            displayPhone = first.GetProperty("display_phone_number").GetString()
                           ?? throw new InvalidOperationException("display_phone_number ausente na resposta.");
        }
        catch (HttpRequestException ex)
        {
            throw new InvalidOperationException($"Erro de comunicação ao buscar números de telefone do WABA: {ex.Message}", ex);
        }

        // Step 4: Subscribe app to WABA using MasterAccessToken
        try
        {
            var subscribeUrl = $"/v22.0/{Uri.EscapeDataString(dto.WabaId)}/subscribed_apps";
            var subscribeRequest = new HttpRequestMessage(HttpMethod.Post, subscribeUrl);
            subscribeRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _config.Whatsapp.MasterAccessToken);
            var subscribeResponse = await http.SendAsync(subscribeRequest);

            if (!subscribeResponse.IsSuccessStatusCode)
            {
                var subscribeContent = await subscribeResponse.Content.ReadAsStringAsync();
                _logger.LogWarning("Falha ao inscrever app no WABA {WabaId}: {Content}", dto.WabaId, subscribeContent);
            }
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Erro de comunicação ao inscrever app no WABA {WabaId}.", dto.WabaId);
        }

        // Step 5: Load tenant and update fields
        var tenant = await _tenantRepository.GetByIdAsync(false, tenantId)
                     ?? throw new InvalidOperationException("Tenant não encontrado.");

        tenant.WhatsappBusinessAccountId = dto.WabaId;
        tenant.WhatsappPhoneNumberId = phoneNumberId;
        tenant.WhatsAppDisplayPhone = displayPhone;
        tenant.WhatsAppAccessToken = longToken;
        tenant.WhatsAppConnected = true;
        tenant.WhatsAppTokenExpiresAt = DateTimeOffset.UtcNow.AddSeconds(expiresIn);

        // Step 6: Save
        await _unitOfWork.SaveChangesAsync();
    }

    public async Task DisconnectAsync(Guid tenantId)
    {
        var tenant = await _tenantRepository.GetByIdAsync(false, tenantId)
                     ?? throw new InvalidOperationException("Tenant não encontrado.");

        // Fire-and-forget unsubscribe — do not throw if it fails
        if (!string.IsNullOrEmpty(tenant.WhatsappBusinessAccountId) &&
            !string.IsNullOrEmpty(_config.Whatsapp.MasterAccessToken))
        {
            try
            {
                var http = _httpClientFactory.CreateClient("whatsapp-graph");
                var deleteUrl =
                    $"/v22.0/{Uri.EscapeDataString(tenant.WhatsappBusinessAccountId)}/subscribed_apps" +
                    $"?access_token={Uri.EscapeDataString(_config.Whatsapp.MasterAccessToken)}";
                await http.DeleteAsync(deleteUrl);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Erro ao cancelar inscrição do app no WABA durante desconexão do tenant {TenantId}.", tenantId);
            }
        }

        tenant.WhatsAppAccessToken = null;
        tenant.WhatsAppDisplayPhone = null;
        tenant.WhatsAppConnected = false;
        tenant.WhatsAppTokenExpiresAt = null;
        tenant.WhatsappPhoneNumberId = null;
        tenant.WhatsappBusinessAccountId = null;

        await _unitOfWork.SaveChangesAsync();
    }

    public async Task<WhatsAppOnboardingStatusDto> GetStatusAsync(Guid tenantId)
    {
        var tenant = await _tenantRepository.GetByIdAsync(true, tenantId)
                     ?? throw new InvalidOperationException("Tenant não encontrado.");

        return new WhatsAppOnboardingStatusDto(
            tenant.WhatsAppConnected,
            tenant.WhatsAppDisplayPhone,
            tenant.WhatsappBusinessAccountId,
            tenant.WhatsAppTokenExpiresAt
        );
    }

    public WhatsAppOnboardingConfigDto GetConfig() =>
        new(_config.Whatsapp.AppId, _config.Whatsapp.ConfigId);
}

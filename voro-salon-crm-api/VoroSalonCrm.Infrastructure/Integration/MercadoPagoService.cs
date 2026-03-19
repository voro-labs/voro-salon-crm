using System.Net.Http.Headers;
using System.Text.Json;
using MercadoPago.Client;
using MercadoPago.Client.Preference;
using Microsoft.Extensions.Configuration;
using VoroSalonCrm.Application.Services.Interfaces.Integration;

namespace VoroSalonCrm.Infrastructure.Integration
{
    public class MercadoPagoService(IHttpClientFactory httpClientFactory, IConfiguration configuration)
        : IMercadoPagoService
    {
        private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };

        private string AccessToken => configuration["MercadoPagoSettings:AccessToken"] ?? string.Empty;

        private RequestOptions GetRequestOptions() => new() { AccessToken = AccessToken };

        public async Task<MpPreferenceResult> CreatePreferenceAsync(MpCreatePreferenceDto dto)
        {
            var client = new PreferenceClient();

            var request = new PreferenceRequest
            {
                Items =
                [
                    new PreferenceItemRequest
                    {
                        Title = dto.Reason,
                        Quantity = 1,
                        UnitPrice = dto.TransactionAmount,
                        CurrencyId = "BRL"
                    }
                ],
                Payer = new PreferencePayerRequest
                {
                    Email = dto.PayerEmail
                },
                BackUrls = new PreferenceBackUrlsRequest
                {
                    Success = dto.BackUrlSuccess,
                    Failure = dto.BackUrlFailure,
                    Pending = dto.BackUrlPending
                },
                AutoReturn = "approved",
                ExternalReference = dto.ExternalReference,
                NotificationUrl = dto.NotificationUrl
            };

            var preference = await client.CreateAsync(request, GetRequestOptions());

            return new MpPreferenceResult(
                Id: preference.Id,
                InitPoint: preference.InitPoint
            );
        }

        public async Task<MpPaymentDetails?> GetPaymentAsync(long paymentId)
        {
            var httpClient = httpClientFactory.CreateClient("mercadopago");
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", AccessToken);

            var response = await httpClient.GetAsync($"https://api.mercadopago.com/v1/payments/{paymentId}");
            if (!response.IsSuccessStatusCode) return null;

            var body = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;

            string? externalRef = null;
            if (root.TryGetProperty("external_reference", out var extRef) && extRef.ValueKind != JsonValueKind.Null)
                externalRef = extRef.GetString();

            string? payerId = null;
            if (root.TryGetProperty("payer", out var payer) && payer.TryGetProperty("id", out var pid))
                payerId = pid.GetRawText().Trim('"');

            var status = root.TryGetProperty("status", out var st) ? st.GetString() ?? string.Empty : string.Empty;

            return new MpPaymentDetails(
                Id: paymentId.ToString(),
                Status: status,
                ExternalReference: externalRef,
                PayerId: payerId
            );
        }
    }
}

using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using VoroSalonCrm.Application.Services.Interfaces.Integration;

namespace VoroSalonCrm.Infrastructure.Integration
{
    public class MercadoPagoService(IHttpClientFactory httpClientFactory, IConfiguration configuration)
        : IMercadoPagoService
    {
        private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };

        private HttpClient CreateClient()
        {
            var client = httpClientFactory.CreateClient("mercadopago");
            var token = configuration["MercadoPagoSettings:AccessToken"] ?? string.Empty;
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            return client;
        }

        public async Task<MpPreapprovalResult> CreatePreapprovalAsync(MpCreatePreapprovalDto dto)
        {
            var client = CreateClient();

            var payload = new
            {
                reason = dto.Reason,
                external_reference = dto.ExternalReference,
                payer_email = dto.PayerEmail,
                auto_recurring = new
                {
                    frequency = 1,
                    frequency_type = "months",
                    transaction_amount = dto.TransactionAmount,
                    currency_id = "BRL"
                },
                back_url = dto.BackUrl,
                status = "pending"
            };

            var json = JsonSerializer.Serialize(payload, JsonOpts);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await client.PostAsync("https://api.mercadopago.com/preapproval", content);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException($"MercadoPago error: {body}");

            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;

            return new MpPreapprovalResult(
                Id: root.GetProperty("id").GetString() ?? string.Empty,
                InitPoint: root.GetProperty("init_point").GetString() ?? string.Empty,
                Status: root.GetProperty("status").GetString() ?? string.Empty
            );
        }

        public async Task<MpPreapprovalDetails?> GetPreapprovalAsync(string preapprovalId)
        {
            var client = CreateClient();
            var response = await client.GetAsync($"https://api.mercadopago.com/preapproval/{preapprovalId}");

            if (!response.IsSuccessStatusCode) return null;

            var body = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;

            DateTimeOffset? nextPayment = null;
            if (root.TryGetProperty("next_payment_date", out var npd) && npd.ValueKind != JsonValueKind.Null)
                nextPayment = npd.GetDateTimeOffset();

            string? payerId = null;
            if (root.TryGetProperty("payer_id", out var pid))
                payerId = pid.GetRawText().Trim('"');

            return new MpPreapprovalDetails(
                Id: root.GetProperty("id").GetString() ?? string.Empty,
                Status: root.GetProperty("status").GetString() ?? string.Empty,
                PayerId: payerId,
                NextPaymentDate: nextPayment
            );
        }
    }
}

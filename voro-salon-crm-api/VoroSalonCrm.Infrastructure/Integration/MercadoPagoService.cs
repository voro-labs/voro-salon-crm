using MercadoPago.Client;
using MercadoPago.Client.Preapproval;
using Microsoft.Extensions.Configuration;
using VoroSalonCrm.Application.Services.Interfaces.Integration;

namespace VoroSalonCrm.Infrastructure.Integration
{
    public class MercadoPagoService(IConfiguration configuration) : IMercadoPagoService
    {
        private RequestOptions GetRequestOptions() => new()
        {
            AccessToken = configuration["MercadoPagoSettings:AccessToken"] ?? string.Empty
        };

        public async Task<MpPreapprovalResult> CreatePreapprovalAsync(MpCreatePreapprovalDto dto)
        {
            var client = new PreapprovalClient();

            var request = new PreapprovalCreateRequest
            {
                Reason = dto.Reason,
                ExternalReference = dto.ExternalReference,
                PayerEmail = dto.PayerEmail,
                AutoRecurring = new PreApprovalAutoRecurringCreateRequest
                {
                    Frequency = 1,
                    FrequencyType = "months",
                    TransactionAmount = dto.TransactionAmount,
                    CurrencyId = "BRL"
                },
                BackUrl = dto.BackUrl,
                Status = "pending"
            };

            var result = await client.CreateAsync(request, GetRequestOptions());

            return new MpPreapprovalResult(
                Id: result.Id,
                InitPoint: result.InitPoint,
                Status: result.Status
            );
        }

        public async Task<MpPreapprovalDetails?> GetPreapprovalAsync(string preapprovalId)
        {
            var client = new PreapprovalClient();
            var preapproval = await client.GetAsync(preapprovalId, GetRequestOptions());

            if (preapproval is null) return null;

            return new MpPreapprovalDetails(
                Id: preapproval.Id,
                Status: preapproval.Status,
                PayerId: preapproval.PayerId?.ToString(),
                NextPaymentDate: null // not exposed in SDK; managed by MP internally
            );
        }
    }
}

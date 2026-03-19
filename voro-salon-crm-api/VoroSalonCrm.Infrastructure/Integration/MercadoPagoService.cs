using MercadoPago.Client;
using MercadoPago.Client.Preapproval;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using VoroSalonCrm.Application.Services.Interfaces.Integration;

namespace VoroSalonCrm.Infrastructure.Integration
{
    public class MercadoPagoService(
        IConfiguration configuration,
        ILogger<MercadoPagoService> logger) : IMercadoPagoService
    {
        private RequestOptions GetRequestOptions() => new()
        {
            AccessToken = configuration["MercadoPagoSettings:AccessToken"] ?? string.Empty
        };

        public async Task<MpPreapprovalResult> CreatePreapprovalAsync(MpCreatePreapprovalDto dto)
        {
            logger.LogInformation("[MP] CreatePreapproval — Email: {Email} | Reason: {Reason} | Amount: {Amount} | ExternalRef: {Ref}",
                dto.PayerEmail, dto.Reason, dto.TransactionAmount, dto.ExternalReference);

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

            try
            {
                var result = await client.CreateAsync(request, GetRequestOptions());
                logger.LogInformation("[MP] CreatePreapproval OK — Id: {Id} | Status: {Status} | InitPoint: {InitPoint}",
                    result.Id, result.Status, result.InitPoint);

                return new MpPreapprovalResult(
                    Id: result.Id,
                    InitPoint: result.InitPoint,
                    Status: result.Status
                );
            }
            catch (MercadoPago.Error.MercadoPagoApiException ex)
            {
                logger.LogError(ex, "[MP] CreatePreapproval falhou — StatusCode: {StatusCode} | Message: {Message}",
                    ex.StatusCode, ex.Message);
                throw;
            }
        }

        public async Task<MpPreapprovalDetails?> GetPreapprovalAsync(string preapprovalId)
        {
            logger.LogInformation("[MP] GetPreapproval — Id: {Id}", preapprovalId);

            var client = new PreapprovalClient();

            MercadoPago.Resource.PreApproval.Preapproval? preapproval;

            try
            {
                preapproval = await client.GetAsync(preapprovalId, GetRequestOptions());
            }
            catch (MercadoPago.Error.MercadoPagoApiException ex)
            {
                logger.LogWarning("[MP] GetPreapproval retornou erro da API — Id: {Id} | StatusCode: {StatusCode} | Message: {Message}",
                    preapprovalId, ex.StatusCode, ex.Message);
                return null;
            }

            if (preapproval is null)
            {
                logger.LogWarning("[MP] GetPreapproval retornou null para Id: {Id}", preapprovalId);
                return null;
            }

            logger.LogInformation("[MP] GetPreapproval OK — Id: {Id} | Status: {Status} | PayerId: {PayerId}",
                preapproval.Id, preapproval.Status, preapproval.PayerId);

            return new MpPreapprovalDetails(
                Id: preapproval.Id,
                Status: preapproval.Status,
                PayerId: preapproval.PayerId?.ToString(),
                NextPaymentDate: null // not exposed in SDK; managed by MP internally
            );
        }
    }
}

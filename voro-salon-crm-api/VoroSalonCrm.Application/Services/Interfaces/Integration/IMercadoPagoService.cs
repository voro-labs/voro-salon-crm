namespace VoroSalonCrm.Application.Services.Interfaces.Integration
{
    public record MpCreatePreapprovalDto(
        string PayerEmail,
        string Reason,
        decimal TransactionAmount,
        string ExternalReference,
        string BackUrl
    );

    public record MpPreapprovalResult(string Id, string InitPoint, string Status);

    public record MpPreapprovalDetails(string Id, string Status, string? PayerId, DateTimeOffset? NextPaymentDate);

    public interface IMercadoPagoService
    {
        Task<MpPreapprovalResult> CreatePreapprovalAsync(MpCreatePreapprovalDto dto);
        Task<MpPreapprovalDetails?> GetPreapprovalAsync(string preapprovalId);
    }
}

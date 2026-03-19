namespace VoroSalonCrm.Application.Services.Interfaces.Integration
{
    public record MpCreatePreferenceDto(
        string PayerEmail,
        string Reason,
        decimal TransactionAmount,
        string ExternalReference,
        string BackUrlSuccess,
        string BackUrlFailure,
        string BackUrlPending,
        string NotificationUrl
    );

    public record MpPreferenceResult(string Id, string InitPoint);

    public record MpPaymentDetails(string Id, string Status, string? ExternalReference, string? PayerId);

    public interface IMercadoPagoService
    {
        Task<MpPreferenceResult> CreatePreferenceAsync(MpCreatePreferenceDto dto);
        Task<MpPaymentDetails?> GetPaymentAsync(long paymentId);
    }
}

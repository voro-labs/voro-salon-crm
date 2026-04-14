namespace VoroSalonCrm.Application.Services.Interfaces.Integration
{
    // ── Preapproval (cartão recorrente) ────────────────────────────────────────
    public record MpCreatePreapprovalDto(
        string PayerEmail,
        string Reason,
        decimal TransactionAmount,
        string ExternalReference,
        string BackUrl
    );

    public record MpPreapprovalResult(string Id, string InitPoint, string Status);

    public record MpPreapprovalDetails(string Id, string Status, string? PayerId, DateTimeOffset? NextPaymentDate);

    // ── Pix (pagamento avulso por ciclo) ───────────────────────────────────────
    public record MpCreatePixPaymentDto(
        string PayerEmail,
        string Description,
        decimal Amount,
        string ExternalReference,
        string? NotificationUrl = null
    );

    public record MpPixPaymentResult(
        string PaymentId,
        string QrCode,
        string QrCodeBase64,
        DateTimeOffset ExpiresAt
    );

    public record MpPixPaymentDetails(
        string Id,
        string Status   // "pending" | "approved" | "rejected" | "cancelled"
    );

    public interface IMercadoPagoService
    {
        Task<MpPreapprovalResult> CreatePreapprovalAsync(MpCreatePreapprovalDto dto);
        Task<MpPreapprovalDetails?> GetPreapprovalAsync(string preapprovalId);
        Task<MpPixPaymentResult> CreatePixPaymentAsync(MpCreatePixPaymentDto dto);
        Task<MpPixPaymentDetails?> GetPixPaymentAsync(string paymentId);
    }
}

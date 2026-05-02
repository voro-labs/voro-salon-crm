using VoroSalonCrm.Domain.Interfaces.Entities;

namespace VoroSalonCrm.Domain.Entities
{
    public class WhatsAppMessage : ITenantEntity
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Tenant Tenant { get; set; } = null!;

        /// <summary>"inbound" para mensagens recebidas, "outbound" para enviadas.</summary>
        public string Direction { get; set; } = "inbound";

        public string From { get; set; } = string.Empty;
        public string To { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;

        /// <summary>ID da mensagem retornado pela API do WhatsApp (útil para rastrear status).</summary>
        public string? WhatsAppMessageId { get; set; }

        /// <summary>received | sent | delivered | read | failed</summary>
        public string Status { get; set; } = "received";

        public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;

        /// <summary>Preenchido após processamento pelo bot (mesmo em caso de erro).
        /// Null = pendente de processamento automático.</summary>
        public DateTimeOffset? ProcessedByBotAt { get; set; }
    }
}

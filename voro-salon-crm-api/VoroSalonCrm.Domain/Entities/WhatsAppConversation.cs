using VoroSalonCrm.Domain.Interfaces.Entities;

namespace VoroSalonCrm.Domain.Entities
{
    /// <summary>Rastreia o estado atual de uma conversa de agendamento via WhatsApp.</summary>
    public class WhatsAppConversation : ITenantEntity
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Tenant Tenant { get; set; } = null!;

        /// <summary>Número do contato (remetente inbound).</summary>
        public string PhoneNumber { get; set; } = string.Empty;

        /// <summary>Nome retornado pelo perfil do WhatsApp.</summary>
        public string ContactName { get; set; } = "Cliente";

        /// <summary>Estado atual do fluxo de agendamento (START, AWAITING_SERVICE, COMPLETED, etc.).</summary>
        public string State { get; set; } = "START";

        /// <summary>Corpo da última mensagem trocada.</summary>
        public string LastMessageBody { get; set; } = string.Empty;

        /// <summary>Agendamento criado via este fluxo (null enquanto não confirmado).</summary>
        public Guid? AppointmentId { get; set; }
        public Appointment? Appointment { get; set; }

        public DateTimeOffset LastMessageAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? UpdatedAt { get; set; }
    }
}

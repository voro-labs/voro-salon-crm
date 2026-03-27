using VoroSalonCrm.Domain.Interfaces.Entities;

namespace VoroSalonCrm.Domain.Entities
{
    public class TimeSlotBlock : ITenantEntity
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Tenant Tenant { get; set; } = null!;

        public DateTimeOffset StartDateTime { get; set; }
        public DateTimeOffset EndDateTime { get; set; }

        /// <summary>Motivo interno visível apenas pelo proprietário.</summary>
        public string? Reason { get; set; }

        /// <summary>Mensagem exibida aos clientes na tela de agendamento online.</summary>
        public string? ClientMessage { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}

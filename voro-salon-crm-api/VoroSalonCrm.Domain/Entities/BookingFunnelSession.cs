namespace VoroSalonCrm.Domain.Entities
{
    /// <summary>Rastreia o progresso de uma sessão no funil de agendamento público (Website ou App).</summary>
    public class BookingFunnelSession
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Tenant Tenant { get; set; } = null!;

        /// <summary>Identificador único da sessão do visitante (gerado no front-end).</summary>
        public string SessionId { get; set; } = string.Empty;

        /// <summary>Etapa atual do funil (ex: AWAITING_SERVICE, AWAITING_EMPLOYEE, AWAITING_DATE, COMPLETED).</summary>
        public string FunnelState { get; set; } = "AWAITING_SERVICE";

        /// <summary>Canal de origem: 2=App, 3=Website.</summary>
        public int Source { get; set; } = 3;

        public string? ContactName { get; set; }
        public string? PhoneNumber { get; set; }

        /// <summary>Agendamento criado ao final do funil (null enquanto não confirmado).</summary>
        public Guid? AppointmentId { get; set; }
        public Appointment? Appointment { get; set; }

        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset UpdatedAt { get; set; }
    }
}

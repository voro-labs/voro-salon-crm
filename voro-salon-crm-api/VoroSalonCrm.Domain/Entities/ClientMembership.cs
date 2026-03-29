using VoroSalonCrm.Domain.Interfaces.Entities;

namespace VoroSalonCrm.Domain.Entities
{
    public enum ClientMembershipStatus
    {
        Active = 0,
        Expired = 1,
        Cancelled = 2,
    }

    /// <summary>Assinatura de um cliente a um plano de fidelidade.</summary>
    public class ClientMembership : ITenantEntity
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Tenant Tenant { get; set; } = null!;

        public Guid ClientId { get; set; }
        public Client Client { get; set; } = null!;

        public Guid PlanId { get; set; }
        public ClientMembershipPlan Plan { get; set; } = null!;

        public DateTimeOffset StartDate { get; set; }
        public DateTimeOffset EndDate { get; set; }

        /// <summary>Sessões restantes. Null se o plano for ilimitado.</summary>
        public int? RemainingSessions { get; set; }

        public ClientMembershipStatus Status { get; set; } = ClientMembershipStatus.Active;

        public string? Notes { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? UpdatedAt { get; set; }

        /// <summary>Última vez que o aviso de vencimento próximo foi enviado.</summary>
        public DateTimeOffset? LastExpirationNoticeSentAt { get; set; }
    }
}

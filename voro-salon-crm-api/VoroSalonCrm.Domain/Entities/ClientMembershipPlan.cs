using VoroSalonCrm.Domain.Interfaces.Entities;

namespace VoroSalonCrm.Domain.Entities
{
    /// <summary>Plano de assinatura/fidelidade criado pelo estabelecimento para seus clientes.</summary>
    public class ClientMembershipPlan : ITenantEntity
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Tenant Tenant { get; set; } = null!;

        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }

        /// <summary>Preço do plano (cobrança pelo estabelecimento).</summary>
        public decimal Price { get; set; }

        /// <summary>Número de sessões/atendimentos incluídos no plano. Null = ilimitado.</summary>
        public int? Sessions { get; set; }

        /// <summary>Duração do plano em dias (ex: 30 = mensal, 90 = trimestral).</summary>
        public int DurationDays { get; set; } = 30;

        public bool IsActive { get; set; } = true;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

        public ICollection<ClientMembership> Memberships { get; set; } = [];
    }
}

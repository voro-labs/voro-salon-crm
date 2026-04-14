using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Domain.Entities
{
    public class TenantSubscription
    {
        public Guid Id { get; set; }
        public Guid? TenantId { get; set; }
        public Guid PlanId { get; set; }

        public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Inactive;
        public PaymentSource PaymentSource { get; set; }

        public DateTimeOffset StartDate { get; set; }
        public DateTimeOffset? EndDate { get; set; }
        public DateTimeOffset? TrialEndsAt { get; set; }

        // Checkout pendente — expira em 10 min se não concluído
        public DateTimeOffset? CheckoutExpiresAt { get; set; }

        // MercadoPago
        public string? MercadoPagoSubscriptionId { get; set; }
        public string? MercadoPagoPayerId { get; set; }
        public string? MercadoPagoExternalReference { get; set; }  // email ou tenantId
        public DateTimeOffset? LastPaymentAt { get; set; }
        public DateTimeOffset? NextPaymentAt { get; set; }

        // Preço promocional bloqueado no momento da assinatura.
        // Mantido enquanto a assinatura estiver ativa. Perdido se o tenant
        // não renovar dentro de 7 dias após o último pagamento.
        public decimal? LockedPromoPrice { get; set; }

        // Concessão manual
        public Guid? GrantedByUserId { get; set; }
        public string? Notes { get; set; }

        // Dados do contratante (quando vem do SaaS sem conta criada ainda)
        public string? ContactEmail { get; set; }
        public string? ContactName { get; set; }
        public string? SalonName { get; set; }
        public EstablishmentType EstablishmentType { get; set; } = EstablishmentType.Salon;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? UpdatedAt { get; set; }

        // Navigation
        public Tenant? Tenant { get; set; }
        public SubscriptionPlan? Plan { get; set; }
    }
}

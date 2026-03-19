using Microsoft.Extensions.Configuration;
using VoroSalonCrm.Application.DTOs.Subscription;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;

namespace VoroSalonCrm.Application.Services
{
    public class SubscriptionService(
        ISubscriptionPlanRepository planRepository,
        ITenantSubscriptionRepository subscriptionRepository,
        IMercadoPagoService mercadoPagoService,
        IConfiguration configuration) : ISubscriptionService
    {
        private string UrlBase =>
            configuration
                .GetSection("CorsSettings")
                .GetSection("AllowedOrigins")
                .Get<string[]>()?[0] ?? "{UrlBase}";

        public async Task<IEnumerable<SubscriptionPlanDto>> GetAllPlansAsync()
        {
            var plans = await planRepository.GetActivePlansAsync();
            return plans.Select(MapPlan);
        }

        public async Task<TenantSubscriptionDto?> GetByTenantIdAsync(Guid tenantId)
        {
            var sub = await subscriptionRepository.GetByTenantIdWithPlanAsync(tenantId);
            return sub is null ? null : MapSubscription(sub);
        }

        public async Task<CheckoutResultDto> CreateCheckoutAsync(CreateCheckoutDto dto)
        {
            var plan = await planRepository.GetByIdAsync(dto.PlanId)
                ?? throw new InvalidOperationException("Plano não encontrado.");

            var feedbackUrl = $"{UrlBase}/prices/feedback";
            var notificationUrl = configuration["MercadoPagoSettings:NotificationUrl"] ?? string.Empty;

            var externalRef = dto.TenantId.HasValue
                ? dto.TenantId.Value.ToString()
                : dto.Email;

            var result = await mercadoPagoService.CreatePreferenceAsync(new MpCreatePreferenceDto(
                PayerEmail: dto.Email,
                Reason: $"Voro Salon CRM — Plano {plan.Name}",
                TransactionAmount: plan.MonthlyPrice,
                ExternalReference: externalRef,
                BackUrlSuccess: feedbackUrl,
                BackUrlFailure: feedbackUrl,
                BackUrlPending: feedbackUrl,
                NotificationUrl: notificationUrl
            ));

            var subscription = new TenantSubscription
            {
                Id = Guid.NewGuid(),
                TenantId = dto.TenantId,
                PlanId = dto.PlanId,
                Status = SubscriptionStatus.Inactive,
                PaymentSource = PaymentSource.MercadoPago,
                StartDate = DateTimeOffset.UtcNow,
                MercadoPagoSubscriptionId = result.Id,
                MercadoPagoExternalReference = externalRef,
                ContactEmail = dto.Email,
                ContactName = dto.Name,
                SalonName = dto.SalonName,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await subscriptionRepository.AddAsync(subscription);
            await subscriptionRepository.SaveChangesAsync();

            return new CheckoutResultDto(result.InitPoint, result.Id);
        }

        public async Task GrantManualAsync(GrantManualSubscriptionDto dto, Guid grantedByUserId)
        {
            var plan = await planRepository.GetByIdAsync(dto.PlanId)
                ?? throw new InvalidOperationException("Plano não encontrado.");

            var subscription = new TenantSubscription
            {
                Id = Guid.NewGuid(),
                TenantId = dto.TenantId,
                PlanId = dto.PlanId,
                Status = SubscriptionStatus.Active,
                PaymentSource = PaymentSource.Manual,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                GrantedByUserId = grantedByUserId,
                Notes = dto.Notes,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await subscriptionRepository.AddAsync(subscription);
            await subscriptionRepository.SaveChangesAsync();
        }

        public async Task CancelAsync(Guid subscriptionId)
        {
            var sub = await subscriptionRepository.GetByIdAsync(subscriptionId)
                ?? throw new InvalidOperationException("Assinatura não encontrada.");

            sub.Status = SubscriptionStatus.Cancelled;
            sub.UpdatedAt = DateTimeOffset.UtcNow;

            subscriptionRepository.Update(sub);
            await subscriptionRepository.SaveChangesAsync();
        }

        public async Task<IEnumerable<TenantSubscriptionDto>> GetAllAsync(int page, int pageSize)
        {
            var subs = await subscriptionRepository.GetAllWithPlanAsync(page, pageSize);
            return subs.Select(MapSubscription);
        }

        public async Task ProcessWebhookAsync(string eventType, string resourceId)
        {
            if (eventType != "payment") return;

            if (!long.TryParse(resourceId, out var paymentId)) return;

            var details = await mercadoPagoService.GetPaymentAsync(paymentId);
            if (details is null || string.IsNullOrEmpty(details.ExternalReference)) return;

            var sub = await subscriptionRepository.GetByExternalReferenceAsync(details.ExternalReference);
            if (sub is null) return;

            sub.Status = details.Status switch
            {
                "approved"    => SubscriptionStatus.Active,
                "rejected"    => SubscriptionStatus.Inactive,
                "cancelled"   => SubscriptionStatus.Cancelled,
                _             => sub.Status
            };

            sub.MercadoPagoPayerId = details.PayerId;

            if (details.Status == "approved")
                sub.LastPaymentAt = DateTimeOffset.UtcNow;

            sub.UpdatedAt = DateTimeOffset.UtcNow;

            subscriptionRepository.Update(sub);
            await subscriptionRepository.SaveChangesAsync();
        }

        // ── Mappers ────────────────────────────────────────────────────────────

        private static SubscriptionPlanDto MapPlan(SubscriptionPlan p) => new(
            p.Id, p.Name, p.Description, p.MonthlyPrice,
            p.MaxEmployees, p.MaxClients, p.HasAnamnesis, p.HasFinancial, p.HasReports, p.SortOrder
        );

        private static TenantSubscriptionDto MapSubscription(TenantSubscription s) => new(
            s.Id, s.TenantId, MapPlan(s.Plan!),
            s.Status.ToString(), s.PaymentSource.ToString(),
            s.StartDate, s.EndDate, s.NextPaymentAt, s.LastPaymentAt,
            s.ContactEmail, s.ContactName, s.SalonName
        );
    }
}

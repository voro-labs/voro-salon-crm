using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using VoroSalonCrm.Application.DTOs.Subscription;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using Microsoft.Extensions.Logging;

namespace VoroSalonCrm.Application.Services
{
    public class SubscriptionService(
        ISubscriptionPlanRepository planRepository,
        ITenantSubscriptionRepository subscriptionRepository,
        ISubscriptionCouponRepository couponRepository,
        ITenantModuleRepository moduleRepository,
        IMercadoPagoService mercadoPagoService,
        IConfiguration configuration, IHostEnvironment env,
        IAuthService authService,
        IUnitOfWork unitOfWork,
        ILogger<SubscriptionService> logger) : ISubscriptionService
    {
        private string UrlBase => env.IsDevelopment() ?
            $"{configuration
                .GetSection("CorsSettings")
                .GetSection("AllowedOrigins")
                .Get<string[]>()?[4]}" :
            $"{configuration
                .GetSection("CorsSettings")
                .GetSection("AllowedOrigins")
                .Get<string[]>()?[0]}";

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
            var plan = await planRepository.GetByIdAsync(false, dto.PlanId)
                ?? throw new InvalidOperationException("Plano não encontrado.");

            // Pix: pagamento imediato, sem trial
            if (dto.CheckoutMethod == PaymentMethod.Pix)
                return await CreatePixCheckoutAsync(dto, plan);

            // Cartão: lógica de trial para novos assinantes
            int trialDays = plan.DefaultTrialDays;
            SubscriptionCoupon? coupon = null;

            // Tenant existente faz checkout direto sem trial
            if (!dto.TenantId.HasValue)
            {
                if (!string.IsNullOrWhiteSpace(dto.CouponCode))
                {
                    coupon = await couponRepository.GetByCodeAsync(dto.CouponCode);
                    if (coupon == null)
                        throw new InvalidOperationException("Cupom não encontrado ou inativo.");
                    if (coupon.ExpiresAt.HasValue && coupon.ExpiresAt < DateTimeOffset.UtcNow)
                        throw new InvalidOperationException("Cupom expirado.");
                    if (coupon.MaxUses.HasValue && coupon.UsedCount >= coupon.MaxUses.Value)
                        throw new InvalidOperationException("Cupom já atingiu o limite de usos.");

                    trialDays = coupon.TrialDays;
                }

                if (trialDays > 0)
                    return await CreateTrialSubscriptionAsync(dto, plan, coupon, trialDays);
            }

            return await CreateMercadoPagoCheckoutAsync(dto, plan);
        }

        private async Task<CheckoutResultDto> CreateTrialSubscriptionAsync(
            CreateCheckoutDto dto, SubscriptionPlan plan, SubscriptionCoupon? coupon, int trialDays)
        {
            Guid tenantId;

            if (dto.TenantId.HasValue)
            {
                tenantId = dto.TenantId.Value;
            }
            else
            {
                try
                {
                    tenantId = await authService.ProvisionAccountFromSubscriptionAsync(
                        dto.Email, dto.Name, dto.SalonName, dto.EstablishmentType);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Falha ao provisionar conta trial para {Email}.", dto.Email);
                    throw;
                }
            }

            var trialEndsAt = DateTimeOffset.UtcNow.AddDays(trialDays);

            var subscription = new TenantSubscription
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                PlanId = dto.PlanId,
                Status = SubscriptionStatus.Trial,
                PaymentSource = PaymentSource.MercadoPago,
                StartDate = DateTimeOffset.UtcNow,
                TrialEndsAt = trialEndsAt,
                ContactEmail = dto.Email,
                ContactName = dto.Name,
                SalonName = dto.SalonName,
                EstablishmentType = dto.EstablishmentType ?? EstablishmentType.Salon,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await subscriptionRepository.AddAsync(subscription);

            if (coupon != null)
            {
                var trackedCoupon = await couponRepository.GetByIdAsync(false, coupon.Id);
                if (trackedCoupon != null)
                {
                    trackedCoupon.UsedCount++;
                    couponRepository.Update(trackedCoupon);
                }
            }

            await InitializePlanModulesAsync(tenantId, plan);
            await subscriptionRepository.SaveChangesAsync();

            return new CheckoutResultDto(null, subscription.Id.ToString(), true, trialEndsAt);
        }

        private async Task<CheckoutResultDto> CreatePixCheckoutAsync(CreateCheckoutDto dto, SubscriptionPlan plan)
        {
            var externalRef = dto.TenantId.HasValue
                ? dto.TenantId.Value.ToString()
                : dto.Email;

            var (transactionAmount, lockedPromoPrice) = await ResolveEffectivePriceAsync(dto, plan);

            var notificationUrl = configuration["MercadoPagoSettings:NotificationUrl"];

            var pixResult = await mercadoPagoService.CreatePixPaymentAsync(new MpCreatePixPaymentDto(
                PayerEmail: env.IsDevelopment()
                    ? configuration["MercadoPagoSettings:TestPayerEmail"] ?? dto.Email
                    : dto.Email,
                Description: $"Voro Salon CRM — Plano {plan.Name}",
                Amount: transactionAmount,
                ExternalReference: externalRef,
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
                CheckoutExpiresAt = pixResult.ExpiresAt,
                MercadoPagoPixPaymentId = pixResult.PaymentId,
                MercadoPagoExternalReference = externalRef,
                ContactEmail = dto.Email,
                ContactName = dto.Name,
                SalonName = dto.SalonName,
                EstablishmentType = dto.EstablishmentType ?? EstablishmentType.Salon,
                LockedPromoPrice = lockedPromoPrice,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await subscriptionRepository.AddAsync(subscription);
            await subscriptionRepository.SaveChangesAsync();

            return new CheckoutResultDto(
                CheckoutUrl: null,
                SubscriptionId: subscription.Id.ToString(),
                PixQrCode: pixResult.QrCode,
                PixQrCodeBase64: pixResult.QrCodeBase64,
                PixExpiresAt: pixResult.ExpiresAt
            );
        }

        private async Task<CheckoutResultDto> CreateMercadoPagoCheckoutAsync(CreateCheckoutDto dto, SubscriptionPlan plan)
        {
            var backUrl = $"{UrlBase}/prices/feedback";

            var email = env.IsDevelopment()
                ? configuration["MercadoPagoSettings:TestPayerEmail"] ?? dto.Email
                : dto.Email;

            var externalRef = dto.TenantId.HasValue
                ? dto.TenantId.Value.ToString()
                : email;

            // Determina o preço efetivo: promo do plano (se vigente) ou grace period de 7 dias
            var (transactionAmount, lockedPromoPrice) = await ResolveEffectivePriceAsync(dto, plan);

            var result = await mercadoPagoService.CreatePreapprovalAsync(new MpCreatePreapprovalDto(
                PayerEmail: email,
                Reason: $"Voro Salon CRM — Plano {plan.Name}",
                TransactionAmount: transactionAmount,
                ExternalReference: externalRef,
                BackUrl: backUrl
            ));

            var subscription = new TenantSubscription
            {
                Id = Guid.NewGuid(),
                TenantId = dto.TenantId,
                PlanId = dto.PlanId,
                Status = SubscriptionStatus.Inactive,
                PaymentSource = PaymentSource.MercadoPago,
                StartDate = DateTimeOffset.UtcNow,
                CheckoutExpiresAt = DateTimeOffset.UtcNow.AddMinutes(10),
                MercadoPagoSubscriptionId = result.Id,
                MercadoPagoExternalReference = externalRef,
                ContactEmail = dto.Email,
                ContactName = dto.Name,
                SalonName = dto.SalonName,
                EstablishmentType = dto.EstablishmentType ?? EstablishmentType.Salon,
                LockedPromoPrice = lockedPromoPrice,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await subscriptionRepository.AddAsync(subscription);
            await subscriptionRepository.SaveChangesAsync();

            return new CheckoutResultDto(result.InitPoint, subscription.Id.ToString());
        }

        public async Task GrantManualAsync(GrantManualSubscriptionDto dto, Guid grantedByUserId)
        {
            _ = await planRepository.GetByIdAsync(false, dto.PlanId)
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
            var sub = await subscriptionRepository.GetByIdAsync(false, subscriptionId)
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
            if (eventType == "payment")
            {
                await ProcessPixPaymentWebhookAsync(resourceId);
                return;
            }

            if (eventType != "subscription_preapproval") return;

            var details = await mercadoPagoService.GetPreapprovalAsync(resourceId);
            if (details is null) return;

            var sub = await subscriptionRepository.GetByMercadoPagoIdAsync(resourceId);
            if (sub is null) return;

            sub.Status = details.Status switch
            {
                "authorized" => SubscriptionStatus.Active,
                "paused"     => SubscriptionStatus.Inactive,
                "cancelled"  => SubscriptionStatus.Cancelled,
                _            => sub.Status
            };

            sub.MercadoPagoPayerId = details.PayerId;
            sub.NextPaymentAt = details.NextPaymentDate;

            if (details.Status == "authorized")
                sub.LastPaymentAt = DateTimeOffset.UtcNow;

            sub.UpdatedAt = DateTimeOffset.UtcNow;

            subscriptionRepository.Update(sub);
            await subscriptionRepository.SaveChangesAsync();

            // Provisionar conta automaticamente no primeiro pagamento confirmado
            if (details.Status == "authorized" && sub.TenantId == null && !string.IsNullOrWhiteSpace(sub.ContactEmail))
            {
                try
                {
                    var tenantId = await authService.ProvisionAccountFromSubscriptionAsync(
                        sub.ContactEmail,
                        sub.ContactName ?? sub.ContactEmail,
                        sub.SalonName ?? sub.ContactEmail,
                        sub.EstablishmentType);

                    sub.TenantId = tenantId;
                    sub.UpdatedAt = DateTimeOffset.UtcNow;
                    subscriptionRepository.Update(sub);

                    var plan = await planRepository.GetByIdAsync(false, sub.PlanId);
                    if (plan != null)
                        await InitializePlanModulesAsync(tenantId, plan);

                    await subscriptionRepository.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Falha ao provisionar conta para {Email} após pagamento.", sub.ContactEmail);
                    unitOfWork.ClearTracker();
                }
            }
        }

        private async Task ProcessPixPaymentWebhookAsync(string paymentId)
        {
            var payment = await mercadoPagoService.GetPixPaymentAsync(paymentId);
            if (payment is null) return;

            var sub = await subscriptionRepository.GetByPixPaymentIdAsync(paymentId);
            if (sub is null) return;

            logger.LogInformation("[Webhook-Pix] PaymentId: {Id} | Status: {Status} | SubscriptionId: {SubId}",
                paymentId, payment.Status, sub.Id);

            switch (payment.Status)
            {
                case "approved":
                    sub.Status = SubscriptionStatus.Active;
                    sub.LastPaymentAt = DateTimeOffset.UtcNow;
                    sub.NextPaymentAt = DateTimeOffset.UtcNow.AddDays(30);
                    break;
                case "rejected":
                case "cancelled":
                    sub.Status = SubscriptionStatus.PastDue;
                    break;
            }

            sub.UpdatedAt = DateTimeOffset.UtcNow;
            subscriptionRepository.Update(sub);
            await subscriptionRepository.SaveChangesAsync();

            // Provisionar conta se ainda não foi criada (novo assinante via Pix)
            if (payment.Status == "approved" && sub.TenantId == null && !string.IsNullOrWhiteSpace(sub.ContactEmail))
            {
                try
                {
                    var tenantId = await authService.ProvisionAccountFromSubscriptionAsync(
                        sub.ContactEmail,
                        sub.ContactName ?? sub.ContactEmail,
                        sub.SalonName ?? sub.ContactEmail,
                        sub.EstablishmentType);

                    sub.TenantId = tenantId;
                    sub.UpdatedAt = DateTimeOffset.UtcNow;
                    subscriptionRepository.Update(sub);

                    var plan = await planRepository.GetByIdAsync(false, sub.PlanId);
                    if (plan != null)
                        await InitializePlanModulesAsync(tenantId, plan);

                    await subscriptionRepository.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "[Webhook-Pix] Falha ao provisionar conta para {Email}.", sub.ContactEmail);
                    unitOfWork.ClearTracker();
                }
            }
        }

        public async Task<string?> GetCheckoutStatusAsync(Guid subscriptionId)
        {
            var sub = await subscriptionRepository.GetByIdAsync(false, subscriptionId);
            return sub?.Status.ToString();
        }

        public async Task<CouponValidationResultDto?> ValidateCouponAsync(string code)
        {
            var coupon = await couponRepository.GetByCodeAsync(code);
            if (coupon == null || !coupon.IsActive) return null;
            if (coupon.ExpiresAt.HasValue && coupon.ExpiresAt < DateTimeOffset.UtcNow) return null;
            if (coupon.MaxUses.HasValue && coupon.UsedCount >= coupon.MaxUses.Value) return null;

            return new CouponValidationResultDto(coupon.Code, coupon.TrialDays, coupon.Description);
        }

        public async Task<CouponDto> CreateCouponAsync(CreateCouponDto dto)
        {
            var coupon = new SubscriptionCoupon
            {
                Id = Guid.NewGuid(),
                Code = dto.Code.ToUpper().Trim(),
                Description = dto.Description,
                TrialDays = dto.TrialDays,
                IsActive = dto.IsActive,
                MaxUses = dto.MaxUses,
                ExpiresAt = dto.ExpiresAt,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await couponRepository.AddAsync(coupon);
            await couponRepository.SaveChangesAsync();

            return MapCoupon(coupon);
        }

        public async Task<IEnumerable<CouponDto>> GetCouponsAsync()
        {
            var coupons = await couponRepository.GetAllAsync();
            return coupons.OrderByDescending(c => c.CreatedAt).Select(MapCoupon);
        }

        public async Task ExtendTrialAsync(Guid tenantId, int additionalDays)
        {
            var sub = await subscriptionRepository.GetActiveByTenantIdAsync(tenantId)
                ?? throw new InvalidOperationException("Assinatura não encontrada para este tenant.");

            var baseDate = sub.TrialEndsAt.HasValue && sub.TrialEndsAt > DateTimeOffset.UtcNow
                ? sub.TrialEndsAt.Value
                : DateTimeOffset.UtcNow;

            sub.TrialEndsAt = baseDate.AddDays(additionalDays);
            sub.Status = SubscriptionStatus.Trial;
            sub.UpdatedAt = DateTimeOffset.UtcNow;

            subscriptionRepository.Update(sub);
            await subscriptionRepository.SaveChangesAsync();
        }

        // ── Module Initialization ──────────────────────────────────────────────

        private async Task InitializePlanModulesAsync(Guid tenantId, SubscriptionPlan plan)
        {
            var modules = new[]
            {
                (AppModule.Clients,     true),
                (AppModule.Scheduling,  true),
                (AppModule.Services,    true),
                (AppModule.Settings,    true),
                (AppModule.Employees,   plan.HasEmployees),
                (AppModule.Financial,   plan.HasFinancial),
                (AppModule.Reports,     plan.HasReports),
                (AppModule.Booking,     plan.HasBooking),
                (AppModule.WhatsAppBot, plan.HasWhatsAppBot),
            };

            foreach (var (module, isEnabled) in modules)
            {
                await moduleRepository.AddAsync(new TenantModule
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    Module = module,
                    IsEnabled = isEnabled,
                    CreatedAt = DateTimeOffset.UtcNow
                });
            }
        }

        // ── Promo pricing ──────────────────────────────────────────────────────

        /// <summary>
        /// Retorna (preçoEfetivo, preçoPromoBloqueado) para o checkout.
        ///
        /// Regras:
        ///   1. Se o plano tem promo vigente → usa PromoPrice e bloqueia.
        ///   2. Se o plano não tem promo MAS o tenant tinha promo bloqueada na última
        ///      assinatura E pagou há menos de 7 dias → honra o preço bloqueado (grace period).
        ///   3. Caso contrário → preço cheio, sem bloqueio.
        /// </summary>
        private async Task<(decimal transactionAmount, decimal? lockedPromoPrice)> ResolveEffectivePriceAsync(
            CreateCheckoutDto dto, SubscriptionPlan plan)
        {
            bool isPlanPromoActive = plan.PromoPrice.HasValue &&
                (!plan.PromoEndsAt.HasValue || plan.PromoEndsAt.Value > DateTimeOffset.UtcNow);

            if (isPlanPromoActive)
                return (plan.PromoPrice!.Value, plan.PromoPrice);

            // Sem promo ativa no plano — verifica grace period do tenant
            if (dto.TenantId.HasValue)
            {
                var latest = await subscriptionRepository.GetLatestByTenantIdAsync(dto.TenantId.Value);

                if (latest?.LockedPromoPrice.HasValue == true &&
                    latest.LastPaymentAt.HasValue &&
                    latest.LastPaymentAt.Value.AddDays(7) >= DateTimeOffset.UtcNow)
                {
                    return (latest.LockedPromoPrice.Value, latest.LockedPromoPrice);
                }
            }

            return (plan.MonthlyPrice, null);
        }

        // ── Mappers ────────────────────────────────────────────────────────────

        private static SubscriptionPlanDto MapPlan(SubscriptionPlan p) => new(
            p.Id, p.Name, p.Description, p.MonthlyPrice,
            p.MaxEmployees, p.MaxClients,
            p.HasEmployees, p.HasAnamnesis, p.HasFinancial, p.HasReports, p.HasBooking, p.HasWhatsAppBot,
            p.SortOrder, p.DefaultTrialDays,
            p.PromoPrice, p.PromoEndsAt
        );

        private static TenantSubscriptionDto MapSubscription(TenantSubscription s) => new(
            s.Id, s.TenantId, MapPlan(s.Plan!),
            s.Status.ToString(), s.PaymentSource.ToString(),
            s.StartDate, s.EndDate, s.NextPaymentAt, s.LastPaymentAt,
            s.ContactEmail, s.ContactName, s.SalonName, s.TrialEndsAt,
            s.LockedPromoPrice
        );

        private static CouponDto MapCoupon(SubscriptionCoupon c) => new(
            c.Id, c.Code, c.Description, c.TrialDays, c.IsActive, c.MaxUses, c.UsedCount, c.ExpiresAt, c.CreatedAt
        );
    }
}

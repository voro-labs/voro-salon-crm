using FluentAssertions;
using MediatR;
using Moq;
using VoroSalonCrm.Application.DTOs.Subscription;
using VoroSalonCrm.Application.Features.Subscription.Commands;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Tests.Integration.Subscription;

public class SubscriptionServiceTests
{
    [Fact]
    public async Task GetAllPlans_ReturnsActivePlans()
    {
        var ctx = new SubscriptionServiceContext();
        var plans = new List<SubscriptionPlan>
        {
            new() { Id = Guid.NewGuid(), Name = "Básico",  MonthlyPrice = 99m,  IsActive = true, DefaultTrialDays = 7  },
            new() { Id = Guid.NewGuid(), Name = "Pro",     MonthlyPrice = 199m, IsActive = true, DefaultTrialDays = 14 }
        };
        ctx.PlanRepo.Setup(r => r.GetActivePlansAsync()).ReturnsAsync(plans);
        var svc = ctx.Build();

        var result = await svc.GetAllPlansAsync();

        result.Should().HaveCount(2);
        result.Should().Contain(p => p.Name == "Básico");
    }

    [Fact]
    public async Task GetByTenantId_ReturnsNull_WhenNoSubscription()
    {
        var ctx      = new SubscriptionServiceContext();
        var tenantId = Guid.NewGuid();
        ctx.SubscriptionRepo
            .Setup(r => r.GetByTenantIdWithPlanAsync(tenantId))
            .ReturnsAsync((TenantSubscription?)null);
        var svc = ctx.Build();

        var result = await svc.GetByTenantIdAsync(tenantId);

        result.Should().BeNull();
    }

    [Fact]
    public async Task CreateCheckout_Throws_WhenPlanNotFound()
    {
        var ctx = new SubscriptionServiceContext();
        ctx.PlanRepo
            .Setup(r => r.GetByIdAsync(false, It.IsAny<Guid>()))
            .ReturnsAsync((SubscriptionPlan?)null);
        var svc = ctx.Build();

        // TenantId = null → new subscriber path; EstablishmentType = null uses default
        var dto = new CreateCheckoutDto(
            Guid.NewGuid(),
            "test@voro.com",
            "Test",
            "Salão",
            null,
            null,
            null,
            PaymentMethod.CreditCard);

        var act = () => svc.CreateCheckoutAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Plano não encontrado*");
    }

    [Fact]
    public async Task CreateCheckout_Throws_WhenCouponNotFound()
    {
        var ctx  = new SubscriptionServiceContext();
        var plan = new SubscriptionPlan { Id = Guid.NewGuid(), Name = "Pro", MonthlyPrice = 199m, DefaultTrialDays = 14 };
        ctx.PlanRepo.Setup(r => r.GetByIdAsync(false, plan.Id)).ReturnsAsync(plan);
        ctx.CouponRepo.Setup(r => r.GetByCodeAsync("INVALID")).ReturnsAsync((SubscriptionCoupon?)null);
        var svc = ctx.Build();

        // TenantId = null → new subscriber path where coupon is validated
        var dto = new CreateCheckoutDto(
            plan.Id,
            "test@voro.com",
            "Test",
            "Salão",
            null,
            "INVALID",
            null,
            PaymentMethod.CreditCard);

        var act = () => svc.CreateCheckoutAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Cupom não encontrado*");
    }

    [Fact]
    public async Task CreateCheckout_Throws_WhenCouponExpired()
    {
        var ctx    = new SubscriptionServiceContext();
        var planId = Guid.NewGuid();
        var plan   = new SubscriptionPlan { Id = planId, Name = "Pro", MonthlyPrice = 199m, DefaultTrialDays = 14 };
        var coupon = new SubscriptionCoupon
        {
            Code      = "EXPIRED",
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(-1),
            IsActive  = true
        };
        ctx.PlanRepo.Setup(r => r.GetByIdAsync(false, planId)).ReturnsAsync(plan);
        ctx.CouponRepo.Setup(r => r.GetByCodeAsync("EXPIRED")).ReturnsAsync(coupon);
        var svc = ctx.Build();

        // TenantId = null → new subscriber path where coupon expiry is checked
        var dto = new CreateCheckoutDto(
            planId,
            "test@voro.com",
            "Test",
            "Salão",
            null,
            "EXPIRED",
            null,
            PaymentMethod.CreditCard);

        var act = () => svc.CreateCheckoutAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Cupom expirado*");
    }

    [Fact]
    public async Task Cancel_Throws_WhenSubscriptionNotFound()
    {
        var ctx = new SubscriptionServiceContext();
        var id  = Guid.NewGuid();

        // CancelAsync now delegates to IMediator — the handler throws when subscription
        // is not found. Set up the mediator mock to propagate that behaviour.
        ctx.Mediator
            .Setup(m => m.Send(It.IsAny<CancelSubscriptionCommand>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Assinatura não encontrada."));

        var svc = ctx.Build();

        var act = () => svc.CancelAsync(id);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }
}

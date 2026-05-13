using FluentAssertions;
using Moq;
using VoroSalonCrm.Application.DTOs.Subscription;
using VoroSalonCrm.Application.Features.Subscription.Commands;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;

namespace VoroSalonCrm.Tests.Integration.Subscription.Commands;

public class GrantManualSubscriptionCommandHandlerTests
{
    private readonly Mock<ISubscriptionPlanRepository>   _planRepo         = new();
    private readonly Mock<ITenantSubscriptionRepository> _subscriptionRepo = new();

    private GrantManualSubscriptionCommandHandler Build() => new(
        _planRepo.Object,
        _subscriptionRepo.Object);

    [Fact]
    public async Task Handle_WhenPlanNotFound_ThrowsInvalidOperation()
    {
        _planRepo
            .Setup(r => r.GetByIdAsync(It.IsAny<bool>(), It.IsAny<object[]>()))
            .ReturnsAsync((SubscriptionPlan?)null);

        var dto = new GrantManualSubscriptionDto(
            TenantId:  Guid.NewGuid(),
            PlanId:    Guid.NewGuid(),
            StartDate: DateTimeOffset.UtcNow,
            EndDate:   null,
            Notes:     null);

        var act = () => Build().Handle(
            new GrantManualSubscriptionCommand(dto, Guid.NewGuid()),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Plano*");
    }

    [Fact]
    public async Task Handle_WhenValidPlan_CreatesSubscriptionWithCorrectData()
    {
        var plan = new SubscriptionPlan { Id = Guid.NewGuid(), Name = "Pro" };
        _planRepo
            .Setup(r => r.GetByIdAsync(It.IsAny<bool>(), It.IsAny<object[]>()))
            .ReturnsAsync(plan);

        _subscriptionRepo
            .Setup(r => r.SaveChangesAsync())
            .ReturnsAsync(0);

        TenantSubscription? captured = null;
        _subscriptionRepo
            .Setup(r => r.AddAsync(It.IsAny<TenantSubscription>()))
            .Callback<TenantSubscription>(s => captured = s)
            .Returns(Task.CompletedTask);

        var grantedBy = Guid.NewGuid();
        var dto = new GrantManualSubscriptionDto(
            TenantId:  Guid.NewGuid(),
            PlanId:    plan.Id,
            StartDate: DateTimeOffset.UtcNow,
            EndDate:   null,
            Notes:     "Test grant");

        await Build().Handle(
            new GrantManualSubscriptionCommand(dto, grantedBy),
            CancellationToken.None);

        captured.Should().NotBeNull();
        captured!.PlanId.Should().Be(plan.Id);
        captured.TenantId.Should().Be(dto.TenantId);
        captured.GrantedByUserId.Should().Be(grantedBy);
        captured.Notes.Should().Be("Test grant");
        captured.Status.Should().Be(SubscriptionStatus.Active);
        captured.PaymentSource.Should().Be(PaymentSource.Manual);
    }
}

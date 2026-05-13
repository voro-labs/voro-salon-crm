using FluentAssertions;
using Moq;
using VoroSalonCrm.Application.Features.Subscription.Commands;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;

namespace VoroSalonCrm.Tests.Integration.Subscription.Commands;

public class CancelSubscriptionCommandHandlerTests
{
    private readonly Mock<ITenantSubscriptionRepository> _subscriptionRepo = new();

    private CancelSubscriptionCommandHandler Build() => new(_subscriptionRepo.Object);

    [Fact]
    public async Task Handle_WhenSubscriptionNotFound_ThrowsInvalidOperation()
    {
        _subscriptionRepo
            .Setup(r => r.GetByIdAsync(It.IsAny<bool>(), It.IsAny<object[]>()))
            .ReturnsAsync((TenantSubscription?)null);

        var act = () => Build().Handle(
            new CancelSubscriptionCommand(Guid.NewGuid()),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Assinatura*");
    }

    [Fact]
    public async Task Handle_WhenSubscriptionFound_SetsStatusToCancelledAndSaves()
    {
        var sub = new TenantSubscription
        {
            Id     = Guid.NewGuid(),
            Status = SubscriptionStatus.Active
        };

        _subscriptionRepo
            .Setup(r => r.GetByIdAsync(It.IsAny<bool>(), It.IsAny<object[]>()))
            .ReturnsAsync(sub);

        _subscriptionRepo
            .Setup(r => r.SaveChangesAsync())
            .ReturnsAsync(0);

        await Build().Handle(
            new CancelSubscriptionCommand(sub.Id),
            CancellationToken.None);

        sub.Status.Should().Be(SubscriptionStatus.Cancelled);
        _subscriptionRepo.Verify(r => r.Update(sub), Times.Once);
        _subscriptionRepo.Verify(r => r.SaveChangesAsync(), Times.Once);
    }
}

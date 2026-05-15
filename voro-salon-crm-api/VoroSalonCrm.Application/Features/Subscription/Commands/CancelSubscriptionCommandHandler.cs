using MediatR;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;

namespace VoroSalonCrm.Application.Features.Subscription.Commands;

public class CancelSubscriptionCommandHandler(ITenantSubscriptionRepository subscriptionRepository)
    : IRequestHandler<CancelSubscriptionCommand>
{
    public async Task Handle(CancelSubscriptionCommand request, CancellationToken cancellationToken)
    {
        var sub = await subscriptionRepository.GetByIdAsync(false, request.SubscriptionId)
            ?? throw new InvalidOperationException("Assinatura não encontrada.");

        sub.Status    = SubscriptionStatus.Cancelled;
        sub.UpdatedAt = DateTimeOffset.UtcNow;

        subscriptionRepository.Update(sub);
        await subscriptionRepository.SaveChangesAsync();
    }
}

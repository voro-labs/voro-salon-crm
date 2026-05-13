using MediatR;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;

namespace VoroSalonCrm.Application.Features.Subscription.Commands;

public class GrantManualSubscriptionCommandHandler(
    ISubscriptionPlanRepository planRepository,
    ITenantSubscriptionRepository subscriptionRepository)
    : IRequestHandler<GrantManualSubscriptionCommand>
{
    public async Task Handle(GrantManualSubscriptionCommand request, CancellationToken cancellationToken)
    {
        var dto = request.Dto;

        _ = await planRepository.GetByIdAsync(false, dto.PlanId)
            ?? throw new InvalidOperationException("Plano não encontrado.");

        var subscription = new TenantSubscription
        {
            Id              = Guid.NewGuid(),
            TenantId        = dto.TenantId,
            PlanId          = dto.PlanId,
            Status          = SubscriptionStatus.Active,
            PaymentSource   = PaymentSource.Manual,
            StartDate       = dto.StartDate,
            EndDate         = dto.EndDate,
            GrantedByUserId = request.GrantedByUserId,
            Notes           = dto.Notes,
            CreatedAt       = DateTimeOffset.UtcNow
        };

        await subscriptionRepository.AddAsync(subscription);
        await subscriptionRepository.SaveChangesAsync();
    }
}

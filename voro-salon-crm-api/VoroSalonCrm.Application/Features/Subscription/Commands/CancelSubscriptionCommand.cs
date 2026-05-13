using MediatR;

namespace VoroSalonCrm.Application.Features.Subscription.Commands;

public record CancelSubscriptionCommand(Guid SubscriptionId) : IRequest;

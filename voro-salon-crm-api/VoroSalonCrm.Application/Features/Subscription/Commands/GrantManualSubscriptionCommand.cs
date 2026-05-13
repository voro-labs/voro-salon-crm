using MediatR;
using VoroSalonCrm.Application.DTOs.Subscription;

namespace VoroSalonCrm.Application.Features.Subscription.Commands;

public record GrantManualSubscriptionCommand(GrantManualSubscriptionDto Dto, Guid GrantedByUserId) : IRequest;

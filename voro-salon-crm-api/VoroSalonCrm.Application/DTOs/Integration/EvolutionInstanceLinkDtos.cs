using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Application.DTOs.Integration
{
    public record EvolutionAvailableInstanceDto(
        Guid InstanceId,
        string TenantName,
        string? PhoneNumber,
        EvolutionInstanceStatus Status
    );

    public record EvolutionLinkRequestDto(
        Guid InstanceId
    );
}

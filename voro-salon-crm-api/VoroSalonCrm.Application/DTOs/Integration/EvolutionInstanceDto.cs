using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Application.DTOs.Integration
{
    public record EvolutionInstanceDto(
        Guid Id,
        string InstanceId,
        EvolutionInstanceStatus Status,
        string? PhoneNumber,
        DateTimeOffset CreatedAt,
        DateTimeOffset? ConnectedAt
    );

    public record EvolutionInstanceStatusDto(
        string State,
        string InstanceId
    );

    public record EvolutionInstanceQrDto(
        string? QrCode
    );

    public record EvolutionInstancePairRequestDto(
        string Phone
    );

    public record EvolutionInstancePairResultDto(
        string PairingCode
    );
}

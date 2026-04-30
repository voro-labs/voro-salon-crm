using VoroSalonCrm.Application.DTOs.Integration;

namespace VoroSalonCrm.Application.Services.Interfaces.Integration
{
    public interface IEvolutionInstanceService
    {
        Task<EvolutionInstanceDto> CreateAsync(Guid tenantId, CancellationToken ct = default);
        Task<IEnumerable<EvolutionInstanceDto>> GetByTenantAsync(Guid tenantId, CancellationToken ct = default);
        Task<EvolutionInstanceStatusDto> GetStatusAsync(Guid tenantId, Guid instanceDbId, CancellationToken ct = default);
        Task<EvolutionInstanceQrDto> GetQrAsync(Guid tenantId, Guid instanceDbId, CancellationToken ct = default);
        Task<EvolutionInstancePairResultDto> PairAsync(Guid tenantId, Guid instanceDbId, string phone, CancellationToken ct = default);
        Task ConnectWebhookAsync(Guid tenantId, Guid instanceDbId, CancellationToken ct = default);
        Task DisconnectAsync(Guid tenantId, Guid instanceDbId, CancellationToken ct = default);
        Task DeleteAsync(Guid tenantId, Guid instanceDbId, CancellationToken ct = default);
    }
}

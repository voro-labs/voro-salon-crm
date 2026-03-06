using VoroSalonCrm.Application.DTOs.Tenant;
using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Application.Services.Interfaces
{
    public interface ITenantModuleService
    {
        Task<IEnumerable<TenantModuleDto>> GetMyModulesAsync();
        Task UpdateModuleAsync(AppModule module, UpdateTenantModuleDto dto);
        Task<bool> IsModuleEnabledAsync(Guid tenantId, AppModule module);
    }
}

using VoroSalonCrm.Application.DTOs.Tenant;
using VoroSalonCrm.Application.Services.Interfaces.Base;
using VoroSalonCrm.Domain.Entities;

namespace VoroSalonCrm.Application.Services.Interfaces
{
    public interface ITenantService : IServiceBase<Tenant>
    {
        Task<Tenant?> GetByIdAsync(Guid id);
        Task<Tenant?> GetBySlugAsync(string slug);
        Task<IEnumerable<Tenant>> GetAllAsync();
        Task<Tenant> CreateAsync(CreateTenantDto dto);
        Task<Tenant> UpdateAsync(Guid id, UpdateTenantDto dto);
        Task<bool> DeleteAsync(Guid id);
    }
}

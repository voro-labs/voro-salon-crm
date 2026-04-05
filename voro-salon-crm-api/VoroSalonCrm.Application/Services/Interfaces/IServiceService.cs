using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.Services.Interfaces.Base;
using VoroSalonCrm.Domain.Entities;

namespace VoroSalonCrm.Application.Services.Interfaces
{
    public interface IServiceService
    {
        Task<ServiceDto> CreateAsync(CreateServiceDto dto);
        Task<ServiceDto?> GetByIdAsync(Guid id);
        Task<IEnumerable<ServiceDto>> GetAllAsync();
        Task<PagedResult<ServiceDto>> GetPagedAsync(int page, int pageSize, string? search, string? orderBy = "name", string? sortDirection = "asc");
        Task<ServiceDto> UpdateAsync(Guid id, UpdateServiceDto dto);
        Task<bool> DeleteAsync(Guid id);
    }
}

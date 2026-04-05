using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Application.DTOs.CRM;

namespace VoroSalonCrm.Application.Services.Interfaces
{
    public interface IClientService
    {
        Task<ClientDto> CreateAsync(CreateClientDto dto);
        Task<ClientDto?> GetByIdAsync(Guid id);
        Task<IEnumerable<ClientDto>> GetAllAsync();
        Task<PagedResult<ClientDto>> GetPagedAsync(int page, int pageSize, string? search);
        Task<ClientDto> UpdateAsync(Guid id, UpdateClientDto dto);
        Task<bool> DeleteAsync(Guid id);
    }
}

using VoroSalonCrm.Application.DTOs.CRM;

namespace VoroSalonCrm.Application.Services.Interfaces
{
    public interface IClientService
    {
        Task<ClientDto> CreateAsync(CreateClientDto dto);
        Task<ClientDto?> GetByIdAsync(Guid id);
        Task<IEnumerable<ClientDto>> GetAllAsync();
        Task<ClientDto> UpdateAsync(Guid id, UpdateClientDto dto);
        Task<bool> DeleteAsync(Guid id);
    }
}

using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Application.Services.Interfaces.Base;
using VoroSalonCrm.Domain.Entities;

namespace VoroSalonCrm.Application.Services.Interfaces
{
    public interface IUserExtensionService : IServiceBase<UserExtension>
    {
        Task<IEnumerable<UserExtensionDto>> GetAllAsync();
        Task<UserExtensionDto?> GetByIdAsync(Guid id);
        Task<UserExtensionDto> CreateAsync(UserExtensionDto model);
        Task<UserExtensionDto> UpdateAsync(Guid id, UserExtensionDto model);
        Task DeleteAsync(Guid id);
    }
}

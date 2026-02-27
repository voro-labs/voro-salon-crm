using VoroSwipeEntertainment.Application.DTOs;
using VoroSwipeEntertainment.Application.Services.Interfaces.Base;
using VoroSwipeEntertainment.Domain.Entities;

namespace VoroSwipeEntertainment.Application.Services.Interfaces
{
    public interface IUserExtensionService : IServiceBase<UserExtension>
    {
        Task<UserDataResponseDto> GetUserDataAsync(Guid userId);
        Task SyncAsync(Guid userId, UserSyncDto model);

        Task<IEnumerable<UserExtensionDto>> GetAllAsync();
        Task<UserExtensionDto?> GetByIdAsync(Guid id);
        Task<UserExtensionDto> CreateAsync(UserExtensionDto model);
        Task<UserExtensionDto> UpdateAsync(Guid id, UserExtensionDto model);
        Task DeleteAsync(Guid id);
    }
}

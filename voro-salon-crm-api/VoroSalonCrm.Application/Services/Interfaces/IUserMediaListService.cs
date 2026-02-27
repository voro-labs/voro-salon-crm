using VoroSwipeEntertainment.Application.DTOs;
using VoroSwipeEntertainment.Application.Services.Interfaces.Base;
using VoroSwipeEntertainment.Domain.Entities;

namespace VoroSwipeEntertainment.Application.Services.Interfaces
{
    public interface IUserMediaListService : IServiceBase<UserMediaList>
    {
        Task<IEnumerable<UserMediaListDto>> GetAllAsync();
        Task<UserMediaListDto?> GetByIdAsync(Guid id);
        Task<UserMediaListDto> CreateAsync(UserMediaListDto model);
        Task<UserMediaListDto> UpdateAsync(Guid id, UserMediaListDto model);
        Task DeleteAsync(Guid id);
    }

}

using VoroSwipeEntertainment.Application.DTOs;
using VoroSwipeEntertainment.Application.Services.Interfaces.Base;
using VoroSwipeEntertainment.Domain.Entities;

namespace VoroSwipeEntertainment.Application.Services.Interfaces
{
    public interface IUserMediaInteractionService : IServiceBase<UserMediaInteraction>
    {
        Task<IEnumerable<UserMediaInteractionDto>> GetAllAsync();
        Task<UserMediaInteractionDto?> GetByIdAsync(Guid id);
        Task<UserMediaInteractionDto> CreateAsync(UserMediaInteractionDto model);
        Task<UserMediaInteractionDto> UpdateAsync(Guid id, UserMediaInteractionDto model);
        Task DeleteAsync(Guid id);
    }

}

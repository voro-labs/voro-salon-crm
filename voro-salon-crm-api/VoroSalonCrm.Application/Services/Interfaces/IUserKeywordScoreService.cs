using VoroSwipeEntertainment.Application.DTOs;
using VoroSwipeEntertainment.Application.Services.Interfaces.Base;
using VoroSwipeEntertainment.Domain.Entities;

namespace VoroSwipeEntertainment.Application.Services.Interfaces
{
    public interface IUserKeywordScoreService : IServiceBase<UserKeywordScore>
    {
        Task<IEnumerable<UserKeywordScoreDto>> GetAllAsync();
        Task<UserKeywordScoreDto?> GetByIdAsync(Guid id);
        Task<UserKeywordScoreDto> CreateAsync(UserKeywordScoreDto model);
        Task<UserKeywordScoreDto> UpdateAsync(Guid id, UserKeywordScoreDto model);
        Task DeleteAsync(Guid id);
    }

}

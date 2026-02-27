using VoroSwipeEntertainment.Application.DTOs;
using VoroSwipeEntertainment.Application.Services.Interfaces.Base;
using VoroSwipeEntertainment.Domain.Entities;

namespace VoroSwipeEntertainment.Application.Services.Interfaces
{
    public interface IUserGenreScoreService : IServiceBase<UserGenreScore>
    {
        Task<IEnumerable<UserGenreScoreDto>> GetAllAsync();
        Task<UserGenreScoreDto?> GetByIdAsync(Guid id);
        Task<UserGenreScoreDto> CreateAsync(UserGenreScoreDto model);
        Task<UserGenreScoreDto> UpdateAsync(Guid id, UserGenreScoreDto model);
        Task DeleteAsync(Guid id);
    }

}

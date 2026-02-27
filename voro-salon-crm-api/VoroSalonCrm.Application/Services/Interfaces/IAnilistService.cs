using VoroSwipeEntertainment.Application.DTOs;

namespace VoroSwipeEntertainment.Application.Services.Interfaces
{
    public interface IAnilistService
    {
        Task<IEnumerable<MediaItemDto>> GetTrendingAnimeAsync(int page);
    }
}

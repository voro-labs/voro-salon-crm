using VoroSwipeEntertainment.Application.DTOs;

namespace VoroSwipeEntertainment.Application.Services.Interfaces
{
    public interface ITmdbService
    {
        Task<IEnumerable<MediaItemDto>> GetTrendingMoviesAsync(int page);
        Task<IEnumerable<MediaItemDto>> GetTrendingSeriesAsync(int page);
    }
}

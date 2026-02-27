using VoroSwipeEntertainment.Application.DTOs;

namespace VoroSwipeEntertainment.Application.Services.Interfaces
{
    public interface IGoogleBooksService
    {
        Task<IEnumerable<MediaItemDto>> GetTrendingBooksAsync(int page);
    }
}

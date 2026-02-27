using VoroSwipeEntertainment.Application.DTOs;

namespace VoroSwipeEntertainment.Application.Services.Interfaces
{
    public interface IContentService
    {
        Task<IEnumerable<MediaItemDto>> GetTrendingAsync(int page);
        Task<IEnumerable<MediaItemDto>> GetRecommendedAsync(Guid userId, int page);
    }
}

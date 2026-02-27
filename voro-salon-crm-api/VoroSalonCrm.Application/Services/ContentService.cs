using VoroSwipeEntertainment.Application.DTOs;
using VoroSwipeEntertainment.Application.Services.Interfaces;

namespace VoroSwipeEntertainment.Application.Services
{
    public class ContentService : IContentService
    {
        private readonly ITmdbService _tmdbService;
        private readonly IAnilistService _anilistService;
        private readonly IGoogleBooksService _googleBooksService;

        public ContentService(
            ITmdbService tmdbService,
            IAnilistService anilistService,
            IGoogleBooksService googleBooksService)
        {
            _tmdbService = tmdbService;
            _anilistService = anilistService;
            _googleBooksService = googleBooksService;
        }

        public async Task<IEnumerable<MediaItemDto>> GetTrendingAsync(int page)
        {
            var moviesTask = SafeFetchAsync(() => _tmdbService.GetTrendingMoviesAsync(page));
            var seriesTask = SafeFetchAsync(() => _tmdbService.GetTrendingSeriesAsync(page));
            var animeTask = SafeFetchAsync(() => _anilistService.GetTrendingAnimeAsync(page));
            var booksTask = SafeFetchAsync(() => _googleBooksService.GetTrendingBooksAsync(page));

            await Task.WhenAll(moviesTask, seriesTask, animeTask, booksTask);

            return moviesTask.Result
                .Concat(seriesTask.Result)
                .Concat(animeTask.Result)
                .Concat(booksTask.Result)
                .OrderBy(_ => Guid.NewGuid());
        }

        private static async Task<IEnumerable<MediaItemDto>> SafeFetchAsync(Func<Task<IEnumerable<MediaItemDto>>> fetchFunc)
        {
            try
            {
                return await fetchFunc();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching content: {ex.Message}");
                return [];
            }
        }

        public async Task<IEnumerable<MediaItemDto>> GetRecommendedAsync(Guid userId, int page)
        {
            await Task.Delay(100); // Simula processamento
            
            return [];
        }
    }
}

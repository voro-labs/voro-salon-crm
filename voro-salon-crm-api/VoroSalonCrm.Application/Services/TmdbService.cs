using Microsoft.Extensions.Options;
using System.Text.Json;
using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Application.Responses;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Shared.Utils;
using VoroSalonCrm.Shared.Extensions;
using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Application.Services
{
    public class TmdbService : ITmdbService
    {
        private static readonly Dictionary<int, string> GENRE_MAP = new()
        {
            { 28, "Action" },
            { 12, "Adventure" },
            { 16, "Animation" },
            { 35, "Comedy" },
            { 80, "Crime" },
            { 99, "Documentary" },
            { 18, "Drama" },
            { 10751, "Family" },
            { 14, "Fantasy" },
            { 36, "History" },
            { 27, "Horror" },
            { 10402, "Music" },
            { 9648, "Mystery" },
            { 10749, "Romance" },
            { 878, "Science Fiction" },
            { 10770, "TV Movie" },
            { 53, "Thriller" },
            { 10752, "War" },
            { 37, "Western" },

            // TV-only genres
            { 10759, "Action & Adventure" },
            { 10762, "Kids" },
            { 10763, "News" },
            { 10764, "Reality" },
            { 10765, "Sci-Fi & Fantasy" },
            { 10766, "Soap" },
            { 10767, "Talk" },
            { 10768, "War & Politics" }
        };

        private readonly HttpClient _httpClient;
        private readonly IntegrationUtil _integrationUtil;

        public TmdbService(HttpClient httpClient, IOptions<IntegrationUtil> integrationUtil)
        {
            _httpClient = httpClient;
            _integrationUtil = integrationUtil.Value;
        }

        public async Task<IEnumerable<MediaItemDto>> GetTrendingMoviesAsync(int page)
        {
            var url = $"{_integrationUtil.TmdbApiUrl}/trending/movie/week?api_key={_integrationUtil.TmdbApiKey}&language=en-US&page={page}";

            var response = await _httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode)
                return [];

            var json = await response.Content.ReadAsStringAsync();

            var result = JsonSerializer.Deserialize<TmdbResponse<TmdbMovieResult>>(
                json,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            return result?.Results?
                .Where(x => !string.IsNullOrEmpty(x.Poster_Path))
                .Select(MapMovie)
                .ToList() ?? [];
        }

        public async Task<IEnumerable<MediaItemDto>> GetTrendingSeriesAsync(int page)
        {
            var url = $"{_integrationUtil.TmdbApiUrl}/trending/tv/week?api_key={_integrationUtil.TmdbApiKey}&language=en-US&page={page}";

            var response = await _httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode)
                return [];

            var json = await response.Content.ReadAsStringAsync();

            var result = JsonSerializer.Deserialize<TmdbResponse<TmdbSeriesResult>>(
                json,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            return result?.Results?
                .Where(x => !string.IsNullOrEmpty(x.Poster_Path))
                .Select(MapSeries)
                .ToList() ?? [];
        }

        private MediaItemDto MapMovie(TmdbMovieResult item)
        {
            var slug = $"movie-{item.Id}-{item.Title?.ToSlug()}";
            var year = 0;
            if (!string.IsNullOrWhiteSpace(item.Release_Date) && 
                DateTime.TryParse(item.Release_Date, out var date))
            {
                year = date.Year;
            }

            return new MediaItemDto
            {
                Id = GuidUtils.GenerateGuidFromSlug(slug),
                Slug = slug,
                Title = $"{item.Title}",
                Year = year,
                Era = EraHelper.GetEraFromYear(year),
                Genres = [.. item.Genre_Ids.Select(i => new MediaGenreDto { Genre = new () { Name = GENRE_MAP[i].ToLower() } })],
                Description = item.Overview,
                CoverUrl = $"https://image.tmdb.org/t/p/w500{item.Poster_Path}",
                Type = ContentTypeEnum.Movie
            };
        }

        private MediaItemDto MapSeries(TmdbSeriesResult item)
        {
            var slug = $"series-{item.Id}-{item.Name?.ToSlug()}";
            var year = 0;
            if (!string.IsNullOrWhiteSpace(item.First_Air_Date) && 
                DateTime.TryParse(item.First_Air_Date, out var date))
            {
                year = date.Year;
            }

            return new MediaItemDto
            {
                Id = GuidUtils.GenerateGuidFromSlug(slug),
                Slug = slug,
                Title = $"{item.Name}",
                Year = year,
                Era = EraHelper.GetEraFromYear(year),
                Genres = [.. item.Genre_Ids.Select(i => new MediaGenreDto { Genre = new () { Name = GENRE_MAP[i].ToLower() } })],
                Description = item.Overview,
                CoverUrl = $"https://image.tmdb.org/t/p/w500{item.Poster_Path}",
                Type = ContentTypeEnum.Series
            };
        }
    }
}

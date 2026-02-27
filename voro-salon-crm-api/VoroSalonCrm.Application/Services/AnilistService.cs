using Microsoft.AspNetCore.Http.Metadata;
using System.Text;
using System.Text.Json;
using VoroSwipeEntertainment.Application.DTOs;
using VoroSwipeEntertainment.Application.Responses;
using VoroSwipeEntertainment.Application.Services.Interfaces;
using VoroSwipeEntertainment.Domain.Enums;
using VoroSwipeEntertainment.Shared.Extensions;
using VoroSwipeEntertainment.Shared.Utils;

namespace VoroSwipeEntertainment.Application.Services
{
    public class AnilistService : IAnilistService
    {
        private readonly HttpClient _httpClient;

        public AnilistService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public async Task<IEnumerable<MediaItemDto>> GetTrendingAnimeAsync(int page)
        {
            var query = $@"
                query {{
                  Page(page: {page}, perPage: 20) {{
                    media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {{
                      id
                      title {{ english romaji }}
                      genres
                      description
                      seasonYear
                      coverImage {{ large }}
                      averageScore
                    }}
                  }}
                }}";

            var body = JsonSerializer.Serialize(new { query });

            var response = await _httpClient.PostAsync(
                "https://graphql.anilist.co",
                new StringContent(body, Encoding.UTF8, "application/json")
            );

            if (!response.IsSuccessStatusCode)
                return [];

            var json = await response.Content.ReadAsStringAsync();

            var result = JsonSerializer.Deserialize<AnilistResponse>(
                json,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            );

            if (result?.Data?.Page?.Media == null)
                return [];

            return result.Data.Page.Media
                .Where(x => !string.IsNullOrWhiteSpace(x.CoverImage.Large))
                .Select(MapAnime)
                .ToList();
        }

        private MediaItemDto MapAnime(AnilistMedia item)
        {
            var year = item.SeasonYear ?? DateTime.UtcNow.Year;
            var slug = $"anime-{item.Id}-{item.Title.English?.ToSlug() ?? item.Title.Romaji?.ToSlug()}";

            return new MediaItemDto
            {
                Id = GuidUtils.GenerateGuidFromSlug(slug),
                Slug = slug,
                Year = year,
                Era = EraHelper.GetEraFromYear(year),
                Title = item.Title.English ?? item.Title.Romaji ?? "Unknown",
                Genres = [.. item.Genres.Select(i => new MediaGenreDto { Genre = new () { Name = i.ToLower() } })],
                Description = $"{item.Description}",
                CoverUrl = item.CoverImage.Large,
                Type = ContentTypeEnum.Anime
            };
        }
    }
}

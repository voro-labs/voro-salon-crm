using Microsoft.Extensions.Options;
using System.Text.Json;
using VoroSwipeEntertainment.Application.DTOs;
using VoroSwipeEntertainment.Application.Responses;
using VoroSwipeEntertainment.Application.Services.Interfaces;
using VoroSwipeEntertainment.Shared.Utils;
using VoroSwipeEntertainment.Shared.Extensions;
using VoroSwipeEntertainment.Domain.Enums;

namespace VoroSwipeEntertainment.Application.Services
{
    public class GoogleBooksService : IGoogleBooksService
    {
        private readonly HttpClient _httpClient;
        private readonly IntegrationUtil _integrationUtil;

        public GoogleBooksService(HttpClient httpClient, IOptions<IntegrationUtil> integrationUtil)
        {
            _httpClient = httpClient;
            _integrationUtil = integrationUtil.Value;
        }

        public async Task<IEnumerable<MediaItemDto>> GetTrendingBooksAsync(int page)
        {
            var startIndex = (page - 1) * 20;

            var apiKeyPart = string.IsNullOrWhiteSpace(_integrationUtil.GoogleBooksApiKey)
                ? ""
                : $"&key={_integrationUtil.GoogleBooksApiKey}";

            var url =
                $"{_integrationUtil.GoogleBooksApiUrl}/volumes?q=subject:fiction&orderBy=newest&maxResults=20&startIndex={startIndex}{apiKeyPart}";

            var response = await _httpClient.GetAsync(url);

            // Retry sem API key se 400
            if (!response.IsSuccessStatusCode &&
                response.StatusCode == System.Net.HttpStatusCode.BadRequest &&
                !string.IsNullOrWhiteSpace(_integrationUtil.GoogleBooksApiKey))
            {
                var fallbackUrl =
                    $"https://www.googleapis.com/books/v1/volumes?q=subject:fiction&orderBy=newest&maxResults=20&startIndex={startIndex}";

                response = await _httpClient.GetAsync(fallbackUrl);
            }

            if (!response.IsSuccessStatusCode)
                return [];

            var json = await response.Content.ReadAsStringAsync();

            var result = JsonSerializer.Deserialize<GoogleBooksResponse>(
                json,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (result?.Items == null)
                return [];

            return result.Items
                .Where(x => x.VolumeInfo.ImageLinks?.Thumbnail != null)
                .Select(MapBook)
                .ToList();
        }

        private MediaItemDto MapBook(GoogleBookResult item)
        {
            var published = item.VolumeInfo.PublishedDate;
            var year = DateTime.UtcNow.Year;

            if (!string.IsNullOrWhiteSpace(published) &&
                int.TryParse(published.Split('-')[0], out var parsedYear))
            {
                year = parsedYear;
            }

            var slug = $"book-{item.Id}-{item.VolumeInfo.Title?.ToSlug()}";

            return new MediaItemDto
            {
                Id = GuidUtils.GenerateGuidFromSlug(slug),
                Slug = slug,
                Title = $"{item.VolumeInfo.Title}",
                Year = year,
                Era = EraHelper.GetEraFromYear(year),
                Genres = [.. item.VolumeInfo.Categories?.Select(i => new MediaGenreDto { Genre = new () { Name = i.ToLower() } }) ?? []],
                Description = $"{item.VolumeInfo.Description}",
                CoverUrl = $"{item.VolumeInfo.ImageLinks?.Thumbnail}".Replace("http:", "https:"),
                Type = ContentTypeEnum.Book
            };
        }
    }
}

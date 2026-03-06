using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Options;
using VoroSalonCrm.Application.Services.Interfaces.Blob;
using VoroSalonCrm.Shared.Extensions;
using VoroSalonCrm.Shared.Utils;

namespace VoroSalonCrm.Infrastructure.Blob
{
    public sealed class BlobService : IBlobService
    {
        private readonly BlobUtil _config;
        private readonly HttpClient _http;

        public BlobService(
            IOptions<BlobUtil> blobUtil,
            IHttpClientFactory httpClientFactory)
        {
            _config = blobUtil.Value;
            _http = httpClientFactory.CreateClient("vercel-blob");
        }

        public async Task<string> UploadAsync(
            string blobName,
            Stream stream,
            string contentType,
            CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(blobName))
                throw new ArgumentException("Blob name cannot be empty");

            var encodedName = Uri.EscapeDataString(blobName);
            var url = $"https://blob.vercel-storage.com/{encodedName}";

            using var request = new HttpRequestMessage(HttpMethod.Put, url);

            request.Headers.Authorization =
                new AuthenticationHeaderValue("Bearer", _config.Token);

            request.Headers.Add("x-vercel-blob-access", "public");

            request.Content = new StreamContent(stream);
            request.Content.Headers.ContentType =
                new MediaTypeHeaderValue(contentType);

            using var response = await _http.SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                ct);

            var body = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                throw new HttpRequestException(
                    $"Blob upload failed ({(int)response.StatusCode}) {body}");
            }

            var result = JsonSerializer.Deserialize<VercelBlobResponse>(
                body,
                new JsonSerializerOptions().AsDefault()
            );

            return result?.Url
                ?? throw new InvalidOperationException("Blob response missing URL");
        }

        private sealed record VercelBlobResponse(string Url);
    }
}

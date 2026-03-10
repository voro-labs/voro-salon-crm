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
            string fileName,
            Stream stream,
            string contentType,
            CancellationToken ct = default)
        {
            var url = $"https://blob.vercel-storage.com/{_config.BlobName}/{fileName}";

            using var request = new HttpRequestMessage(HttpMethod.Put, url);

            request.Headers.Authorization =
                new AuthenticationHeaderValue("Bearer", _config.Token);

            request.Headers.Add("x-vercel-blob-access", "private");

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

        public async Task<string?> GetSignedUrlAsync(string blobUrl, CancellationToken ct = default)
        {
            // Vercel Blob "head" endpoint — returns metadata including a signed downloadUrl
            var url = blobUrl;

            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _config.Token);

            using var response = await _http.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode) return null;

            var bytes = await response.Content.ReadAsByteArrayAsync(ct);

            var base64 = Convert.ToBase64String(bytes);

            return $"data:image/png;base64,{base64}";
        }

        private sealed record VercelBlobResponse(string Url);
    }
}

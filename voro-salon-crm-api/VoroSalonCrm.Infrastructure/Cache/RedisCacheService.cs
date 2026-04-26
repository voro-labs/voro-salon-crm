using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using VoroSalonCrm.Domain.Interfaces.Cache;

namespace VoroSalonCrm.Infrastructure.Cache
{
    public class RedisCacheService(IDistributedCache cache) : ICacheService
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true
        };

        public async Task<T?> GetAsync<T>(string key, CancellationToken ct = default)
        {
            var data = await cache.GetStringAsync(key, ct);
            if (data is null) return default;
            return JsonSerializer.Deserialize<T>(data, JsonOptions);
        }

        public async Task SetAsync<T>(string key, T value, TimeSpan? expiration = null, CancellationToken ct = default)
        {
            var options = new DistributedCacheEntryOptions();
            if (expiration.HasValue)
                options.AbsoluteExpirationRelativeToNow = expiration;

            var json = JsonSerializer.Serialize(value, JsonOptions);
            await cache.SetStringAsync(key, json, options, ct);
        }

        public async Task RemoveAsync(string key, CancellationToken ct = default)
        {
            await cache.RemoveAsync(key, ct);
        }

        public async Task<bool> ExistsAsync(string key, CancellationToken ct = default)
        {
            var data = await cache.GetStringAsync(key, ct);
            return data is not null;
        }

        public async Task<string?> GetRawAsync(string key, CancellationToken ct = default)
        {
            return await cache.GetStringAsync(key, ct);
        }

        public async Task SetRawAsync(string key, string value, TimeSpan? expiration = null, CancellationToken ct = default)
        {
            var options = new DistributedCacheEntryOptions();
            if (expiration.HasValue)
                options.AbsoluteExpirationRelativeToNow = expiration;

            await cache.SetStringAsync(key, value, options, ct);
        }
    }
}

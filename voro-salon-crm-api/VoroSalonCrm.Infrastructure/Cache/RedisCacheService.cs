using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using VoroSalonCrm.Domain.Interfaces.Cache;

namespace VoroSalonCrm.Infrastructure.Cache
{
    public class RedisCacheService(IDistributedCache cache, ILogger<RedisCacheService> logger) : ICacheService
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true
        };

        public async Task<T?> GetAsync<T>(string key, CancellationToken ct = default)
        {
            try
            {
                var data = await cache.GetStringAsync(key, ct);
                if (data is null) return default;
                return JsonSerializer.Deserialize<T>(data, JsonOptions);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Redis GET failed for key {Key}", key);
                return default;
            }
        }

        public async Task SetAsync<T>(string key, T value, TimeSpan? expiration = null, CancellationToken ct = default)
        {
            try
            {
                var options = new DistributedCacheEntryOptions();
                if (expiration.HasValue)
                    options.AbsoluteExpirationRelativeToNow = expiration;

                var json = JsonSerializer.Serialize(value, JsonOptions);
                await cache.SetStringAsync(key, json, options, ct);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Redis SET failed for key {Key}", key);
            }
        }

        public async Task RemoveAsync(string key, CancellationToken ct = default)
        {
            try
            {
                await cache.RemoveAsync(key, ct);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Redis REMOVE failed for key {Key}", key);
            }
        }

        public async Task<bool> ExistsAsync(string key, CancellationToken ct = default)
        {
            try
            {
                var data = await cache.GetStringAsync(key, ct);
                return data is not null;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Redis EXISTS failed for key {Key}", key);
                return false;
            }
        }

        public async Task<string?> GetRawAsync(string key, CancellationToken ct = default)
        {
            try
            {
                return await cache.GetStringAsync(key, ct);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Redis GET_RAW failed for key {Key}", key);
                return null;
            }
        }

        public async Task SetRawAsync(string key, string value, TimeSpan? expiration = null, CancellationToken ct = default)
        {
            try
            {
                var options = new DistributedCacheEntryOptions();
                if (expiration.HasValue)
                    options.AbsoluteExpirationRelativeToNow = expiration;

                await cache.SetStringAsync(key, value, options, ct);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Redis SET_RAW failed for key {Key}", key);
            }
        }
    }
}

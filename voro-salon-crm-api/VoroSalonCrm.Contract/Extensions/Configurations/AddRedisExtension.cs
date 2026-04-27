using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using VoroSalonCrm.Domain.Interfaces.Cache;
using VoroSalonCrm.Infrastructure.Cache;

namespace VoroSalonCrm.Contract.Extensions.Configurations
{
    public static class AddRedisExtension
    {
        public static IServiceCollection AddRedisCache(this IServiceCollection services, IConfiguration configuration)
        {
            var redisConnectionString = configuration.GetValue<string>("Redis:ConnectionString");

            if (string.IsNullOrEmpty(redisConnectionString))
            {
                services.AddDistributedMemoryCache();
            }
            else
            {
                services.AddStackExchangeRedisCache(options =>
                {
                    options.Configuration = NormalizeConnectionString(redisConnectionString);
                    options.InstanceName = "jasmim:";
                });
            }

            services.AddSingleton<ICacheService, RedisCacheService>();

            return services;
        }

        private static string NormalizeConnectionString(string connectionString)
        {
            if (!connectionString.StartsWith("redis://", StringComparison.OrdinalIgnoreCase) &&
                !connectionString.StartsWith("rediss://", StringComparison.OrdinalIgnoreCase))
                return connectionString;

            var uri = new Uri(connectionString);
            var host = uri.Host;
            var port = uri.Port > 0 ? uri.Port : 6379;
            var password = uri.UserInfo?.Contains(':') == true
                ? uri.UserInfo.Split(':', 2)[1]
                : uri.UserInfo;
            var useSsl = connectionString.StartsWith("rediss://", StringComparison.OrdinalIgnoreCase);

            var parts = new List<string> { $"{host}:{port}" };
            if (!string.IsNullOrEmpty(password))
                parts.Add($"password={password}");
            if (useSsl)
                parts.Add("ssl=true");
            parts.Add("abortConnect=false");
            parts.Add("connectTimeout=10000");

            return string.Join(",", parts);
        }
    }
}

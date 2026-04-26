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
                // Fallback para cache em memória se Redis não estiver configurado
                services.AddDistributedMemoryCache();
            }
            else
            {
                services.AddStackExchangeRedisCache(options =>
                {
                    options.Configuration = redisConnectionString;
                    options.InstanceName = "jasmim:";
                });
            }

            services.AddSingleton<ICacheService, RedisCacheService>();

            return services;
        }
    }
}

using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Http;

namespace VoroSalonCrm.Contract.Extensions.Configurations
{
    public static class AddRateLimitExtension
    {
        public static IServiceCollection AddRateLimitingConf(this IServiceCollection services)
        {
            services.AddRateLimiter(options =>
            {
                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

                options.AddPolicy("LoginPolicy", httpContext =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? httpContext.Request.Headers.Host.ToString(),
                        factory: partition => new FixedWindowRateLimiterOptions
                        {
                            AutoReplenishment = true,
                            PermitLimit = 5,
                            QueueLimit = 0,
                            Window = TimeSpan.FromMinutes(1)
                        }));
            });

            return services;
        }
    }
}

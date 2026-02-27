using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace VoroSwipeEntertainment.Contract.Extensions.Configurations
{
    public static class AddCorsExtension
    {
        public static IServiceCollection AddCustomCors(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddCors(options =>
            {
                var corsSettings = configuration.GetSection("CorsSettings");
                string[] allowedOrigins = corsSettings.GetSection("AllowedOrigins").Get<string[]>() ?? [];

                options.AddPolicy("JasmimCors", policyBuilder =>
                    policyBuilder
                        .SetIsOriginAllowed(origin =>
                            allowedOrigins.Contains(origin) ||
                            origin.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase))
                        .AllowAnyHeader()
                        .AllowAnyMethod());
            });

            return services;
        }
    }
}

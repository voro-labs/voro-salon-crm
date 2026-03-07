using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using VoroSalonCrm.Infrastructure.Factories;
using VoroSalonCrm.Shared.Utils;

namespace VoroSalonCrm.Contract.Extensions.Configurations
{
    public static class AddDatabaseExtension
    {
        public static IServiceCollection AddDatabase(this IServiceCollection services, IConfiguration configuration, IHostEnvironment env)
        {
            var config = configuration.Get<ConfigUtil>();

            var connectionString = $"{config?.ConnectionDB}";

            if (string.IsNullOrEmpty(connectionString))
            {
                connectionString = env.IsDevelopment()
                    ? config?.ConnectionString?.Development
                    : config?.ConnectionString?.Production;
            }

            // Force to use development connection string
            // connectionString = config?.ConnectionString?.Development;

            // Force to use production connection string
            // connectionString = config?.ConnectionString?.Production;

            services.AddDbContext<JasmimDbContext>(options =>
                options.UseNpgsql(connectionString));

            return services;
        }
    }
}

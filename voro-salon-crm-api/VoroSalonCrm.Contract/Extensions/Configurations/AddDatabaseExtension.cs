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

            var connectionString = env.IsDevelopment()
                ? config?.ConnectionDB?.Dev
                : config?.ConnectionDB?.Prod;

            services.AddDbContext<JasmimDbContext>(options =>
                options.UseNpgsql(connectionString));

            return services;
        }
    }
}

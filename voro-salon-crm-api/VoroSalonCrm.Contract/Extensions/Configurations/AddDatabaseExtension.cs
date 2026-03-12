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

            var connectionString = "";

            var baseConnectionString = "Server={0};Port={1};Database={2};Username={3};Password={4}";

            if (env.IsDevelopment())
            {
                connectionString = string.Format(baseConnectionString, config?.ConnectionString?.Development?.Server, config?.ConnectionString?.Development?.Port, config?.ConnectionString?.Development?.Database, config?.ConnectionString?.Development?.UserId, config?.ConnectionString?.Development?.Password);
            }
            else
            {
                connectionString = string.Format(baseConnectionString, config?.ConnectionString?.Production?.Server, config?.ConnectionString?.Production?.Port, config?.ConnectionString?.Production?.Database, config?.ConnectionString?.Production?.UserId, config?.ConnectionString?.Production?.Password);
            }

            // FORCE DEV
            // connectionString = string.Format(baseConnectionString, config?.ConnectionString?.Development?.Server, config?.ConnectionString?.Development?.Port, config?.ConnectionString?.Development?.Database, config?.ConnectionString?.Development?.UserId, config?.ConnectionString?.Development?.Password);

            // FORCE PROD
            // connectionString = string.Format(baseConnectionString, config?.ConnectionString?.Production?.Server, config?.ConnectionString?.Production?.Port, config?.ConnectionString?.Production?.Database, config?.ConnectionString?.Production?.UserId, config?.ConnectionString?.Production?.Password);

            services.AddDbContext<JasmimDbContext>(options =>
                options.UseNpgsql(connectionString));

            return services;
        }
    }
}

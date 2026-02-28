using Microsoft.AspNetCore.Identity;
using VoroSalonCrm.Infrastructure.Factories;
using VoroSalonCrm.Domain.Entities.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace VoroSalonCrm.Contract.Extensions.Configurations
{
    public static class AddIdentityExtension
    {
        public static IServiceCollection AddCustomIdentity(this IServiceCollection services)
        {
            services.AddIdentity<User, Role>()
                .AddEntityFrameworkStores<JasmimDbContext>()
                .AddDefaultTokenProviders();

            return services;
        }
    }
}

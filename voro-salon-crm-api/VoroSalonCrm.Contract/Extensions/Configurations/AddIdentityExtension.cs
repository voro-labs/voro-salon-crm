using Microsoft.AspNetCore.Identity;
using VoroSwipeEntertainment.Infrastructure.Factories;
using VoroSwipeEntertainment.Domain.Entities.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace VoroSwipeEntertainment.Contract.Extensions.Configurations
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

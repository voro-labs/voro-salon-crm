using Microsoft.AspNetCore.Builder;
using VoroSwipeEntertainment.Infrastructure.Seeds;
using VoroSwipeEntertainment.Infrastructure.Factories;
using Microsoft.Extensions.DependencyInjection;

namespace VoroSwipeEntertainment.Contract.Extensions.Configurations
{
    public static class AddSeedExtension
    {
        public static async Task<IApplicationBuilder> UseSeedAsync(this IApplicationBuilder app)
        {
            using (var scope = app.ApplicationServices.CreateScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<JasmimDbContext>();
                
                var dataSeeder = scope.ServiceProvider.GetRequiredService<IDataSeeder>();
                
                await dataSeeder.SeedAsync(context);
            }

            return app;
        }
    }
}

using VoroSwipeEntertainment.Infrastructure.Factories;

namespace VoroSwipeEntertainment.Infrastructure.Seeds
{
    public interface IDataSeeder
    {
        Task SeedAsync(JasmimDbContext context);
    }
}
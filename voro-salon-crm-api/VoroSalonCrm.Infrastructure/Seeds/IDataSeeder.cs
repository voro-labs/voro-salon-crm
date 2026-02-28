using VoroSalonCrm.Infrastructure.Factories;

namespace VoroSalonCrm.Infrastructure.Seeds
{
    public interface IDataSeeder
    {
        Task SeedAsync(JasmimDbContext context);
    }
}
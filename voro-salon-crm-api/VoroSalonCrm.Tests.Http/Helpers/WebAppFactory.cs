using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Moq;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Infrastructure.Factories;
using VoroSalonCrm.Infrastructure.Seeds;

namespace VoroSalonCrm.Tests.Http.Helpers;

/// <summary>
/// WebApplicationFactory configurada para testes HTTP.
/// Substitui serviços externos por mocks e usa InMemory database.
/// </summary>
public class WebAppFactory : WebApplicationFactory<Program>
{
    public Mock<IWhatsappService>             WhatsappService { get; } = new();
    public Mock<IExpoPushNotificationService> PushService     { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        // Injetar configurações em memória para que AddJwtAuthentication encontre
        // JwtKey e CookieSettings sem depender de appsettings.Testing.json no content root da API
        builder.ConfigureAppConfiguration(config =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JwtKey"]                   = AuthHelper.TestKey,
                ["CookieSettings:Issuer"]    = AuthHelper.TestIssuer,
                ["CookieSettings:Audience"]  = AuthHelper.TestAud,
                ["CookieSettings:ExpireHours"] = "1",
            });
        });

        builder.ConfigureTestServices(services =>
        {
            // Substituir serviços externos por mocks
            services.AddSingleton(WhatsappService.Object);
            services.AddSingleton(PushService.Object);

            // Substituir ICurrentUserService por mock para evitar dependência de HttpContext
            var mockCurrentUser = new Mock<ICurrentUserService>();
            mockCurrentUser.Setup(u => u.UserId).Returns(Guid.Empty);
            mockCurrentUser.Setup(u => u.TenantId).Returns(Guid.Empty);
            mockCurrentUser.Setup(u => u.Email).Returns("test@test.com");
            mockCurrentUser.Setup(u => u.IsAuthenticated).Returns(false);
            services.RemoveAll<ICurrentUserService>();
            services.AddScoped<ICurrentUserService>(_ => mockCurrentUser.Object);

            // Substituir IDataSeeder por no-op para evitar chamada de MigrateAsync
            // (InMemory provider não suporta migrations relacionais)
            var mockSeeder = new Mock<IDataSeeder>();
            mockSeeder.Setup(s => s.SeedAsync(It.IsAny<JasmimDbContext>()))
                      .Returns(Task.CompletedTask);
            services.RemoveAll<IDataSeeder>();
            services.AddScoped<IDataSeeder>(_ => mockSeeder.Object);

            // Remover todos os IHostedService registrados pela aplicação.
            // Os background services resolvem JasmimDbContext em scopes próprios e
            // conflitam com o provider InMemory quando o Npgsql ainda está presente
            // nos serviços internos do EF Core.
            var hostedServiceDescriptors = services
                .Where(d => d.ServiceType == typeof(IHostedService))
                .ToList();
            foreach (var d in hostedServiceDescriptors)
                services.Remove(d);

            // Remover os descriptors de DbContext/Options do Npgsql e registrar InMemory
            var dbDescriptors = services
                .Where(d => d.ServiceType == typeof(DbContextOptions<JasmimDbContext>)
                         || d.ServiceType == typeof(DbContextOptions)
                         || d.ServiceType == typeof(JasmimDbContext))
                .ToList();
            foreach (var d in dbDescriptors)
                services.Remove(d);

            // InMemory com nome único por instância de factory para isolamento entre suítes
            var dbName = "TestDb_" + Guid.NewGuid();
            services.AddDbContext<JasmimDbContext>(opts =>
            {
                opts.UseInMemoryDatabase(dbName);
                opts.EnableSensitiveDataLogging();
            });
        });
    }
}

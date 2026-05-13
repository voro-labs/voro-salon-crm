using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Infrastructure.Factories;

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

            // Substituir banco de dados por InMemory
            services.RemoveAll<DbContextOptions<JasmimDbContext>>();
            services.RemoveAll<JasmimDbContext>();

            services.AddDbContext<JasmimDbContext>((sp, opts) =>
            {
                opts.UseInMemoryDatabase("TestDb_" + Guid.NewGuid());
                opts.EnableSensitiveDataLogging();
            });
        });
    }
}

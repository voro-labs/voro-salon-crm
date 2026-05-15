using MediatR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Moq;
using VoroSalonCrm.Application.Services;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Tests.Integration.Subscription;

internal sealed class SubscriptionServiceContext
{
    public Mock<ISubscriptionPlanRepository>     PlanRepo            { get; } = new();
    public Mock<ITenantSubscriptionRepository>   SubscriptionRepo    { get; } = new();
    public Mock<ISubscriptionCouponRepository>   CouponRepo          { get; } = new();
    public Mock<ITenantModuleRepository>         ModuleRepo          { get; } = new();
    public Mock<IPendingPlanChangeRepository>    PendingChangeRepo   { get; } = new();
    public Mock<IMercadoPagoService>             MercadoPago         { get; } = new();
    public IConfiguration                        Configuration       { get; }
    public Mock<IHostEnvironment>                HostEnv             { get; } = new();
    public Mock<IAuthService>                    AuthService         { get; } = new();
    public Mock<IUnitOfWork>                     UnitOfWork          { get; } = new();
    public Mock<ILogger<SubscriptionService>>    Logger              { get; } = new();
    public Mock<IMediator>                       Mediator            { get; } = new();

    public SubscriptionServiceContext()
    {
        UnitOfWork
            .Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);

        // IHostEnvironment.IsDevelopment() is an extension method — only EnvironmentName can be mocked.
        // We set Production so UrlBase accesses AllowedOrigins[0] (not [4] which is the dev index).
        HostEnv.Setup(e => e.EnvironmentName).Returns(Environments.Production);

        // Use a real ConfigurationBuilder because IConfiguration extension methods (Get<T>)
        // cannot be mocked with Moq. AllowedOrigins[0] is used by UrlBase in Production mode.
        Configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["CorsSettings:AllowedOrigins:0"] = "https://test.voro.com"
            })
            .Build();
    }

    public SubscriptionService Build() => new(
        PlanRepo.Object,
        SubscriptionRepo.Object,
        CouponRepo.Object,
        ModuleRepo.Object,
        PendingChangeRepo.Object,
        MercadoPago.Object,
        Configuration,
        HostEnv.Object,
        AuthService.Object,
        UnitOfWork.Object,
        Logger.Object,
        Mediator.Object);
}

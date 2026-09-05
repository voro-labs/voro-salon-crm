using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Moq;
using System.Security.Claims;
using VoroSalonCrm.API.Middlewares;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Cache;
using VoroSalonCrm.Domain.Interfaces.Repositories;

namespace VoroSalonCrm.Tests.Integration.Infrastructure;

public class SubscriptionAccessMiddlewareTests
{
    private static readonly Guid TenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");

    private readonly Mock<ICurrentUserService> _currentUser = new();
    private readonly Mock<ITenantSubscriptionRepository> _subscriptions = new();
    private readonly Mock<ICacheService> _cache = new();

    public SubscriptionAccessMiddlewareTests()
    {
        _currentUser.SetupGet(c => c.TenantId).Returns(TenantId);
        _cache.Setup(c => c.ExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _cache.Setup(c => c.SetAsync(It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<TimeSpan?>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
    }

    private static DefaultHttpContext BuildContext(
        bool authenticated = true,
        string path = "/api/v1/appointments",
        params string[] roles)
    {
        var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()) };
        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

        var context = new DefaultHttpContext
        {
            User = authenticated
                ? new ClaimsPrincipal(new ClaimsIdentity(claims, authenticationType: "Bearer"))
                : new ClaimsPrincipal(new ClaimsIdentity()),
        };
        context.Request.Path = path;
        context.Response.Body = new MemoryStream();
        return context;
    }

    private (SubscriptionAccessMiddleware middleware, Func<bool> nextCalled) BuildMiddleware()
    {
        var called = false;
        var middleware = new SubscriptionAccessMiddleware(_ =>
        {
            called = true;
            return Task.CompletedTask;
        });
        return (middleware, () => called);
    }

    private Task Invoke(SubscriptionAccessMiddleware middleware, HttpContext context) =>
        middleware.InvokeAsync(context, _currentUser.Object, _subscriptions.Object, _cache.Object);

    private static TenantSubscription Subscription(SubscriptionStatus status, DateTimeOffset? trialEndsAt) => new()
    {
        Id = Guid.NewGuid(),
        TenantId = TenantId,
        Status = status,
        TrialEndsAt = trialEndsAt,
    };

    [Fact]
    public async Task InvokeAsync_WhenTrialExpired_Returns402AndStopsThePipeline()
    {
        _subscriptions.Setup(r => r.GetActiveByTenantIdAsync(TenantId))
            .ReturnsAsync(Subscription(SubscriptionStatus.Trial, DateTimeOffset.UtcNow.AddDays(-1)));

        var (middleware, nextCalled) = BuildMiddleware();
        var context = BuildContext();

        await Invoke(middleware, context);

        context.Response.StatusCode.Should().Be(402);
        nextCalled().Should().BeFalse();

        context.Response.Body.Position = 0;
        var body = await new StreamReader(context.Response.Body).ReadToEndAsync();
        body.Should().Contain("Período de trial encerrado");
    }

    [Fact]
    public async Task InvokeAsync_WhenTrialExpired_DoesNotCacheTheBlock()
    {
        _subscriptions.Setup(r => r.GetActiveByTenantIdAsync(TenantId))
            .ReturnsAsync(Subscription(SubscriptionStatus.Trial, DateTimeOffset.UtcNow.AddDays(-1)));

        var (middleware, _) = BuildMiddleware();

        await Invoke(middleware, BuildContext());

        // assinar precisa liberar o acesso na requisição seguinte, sem esperar TTL
        _cache.Verify(c => c.SetAsync(It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<TimeSpan?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task InvokeAsync_WhenTrialStillRunning_CallsNextAndCachesTheVerdict()
    {
        _subscriptions.Setup(r => r.GetActiveByTenantIdAsync(TenantId))
            .ReturnsAsync(Subscription(SubscriptionStatus.Trial, DateTimeOffset.UtcNow.AddDays(3)));

        var (middleware, nextCalled) = BuildMiddleware();
        var context = BuildContext();

        await Invoke(middleware, context);

        nextCalled().Should().BeTrue();
        context.Response.StatusCode.Should().Be(200);
        _cache.Verify(c => c.SetAsync(
            SubscriptionAccessMiddleware.CacheKey(TenantId),
            true,
            It.IsAny<TimeSpan?>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task InvokeAsync_WhenSubscriptionIsActive_CallsNext()
    {
        _subscriptions.Setup(r => r.GetActiveByTenantIdAsync(TenantId))
            .ReturnsAsync(Subscription(SubscriptionStatus.Active, trialEndsAt: null));

        var (middleware, nextCalled) = BuildMiddleware();

        await Invoke(middleware, BuildContext());

        nextCalled().Should().BeTrue();
    }

    [Fact]
    public async Task InvokeAsync_WhenTenantHasNoSubscription_CallsNext()
    {
        _subscriptions.Setup(r => r.GetActiveByTenantIdAsync(TenantId))
            .ReturnsAsync((TenantSubscription?)null);

        var (middleware, nextCalled) = BuildMiddleware();

        await Invoke(middleware, BuildContext());

        nextCalled().Should().BeTrue();
    }

    [Fact]
    public async Task InvokeAsync_WhenVerdictIsCached_SkipsTheDatabase()
    {
        _cache.Setup(c => c.ExistsAsync(SubscriptionAccessMiddleware.CacheKey(TenantId), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var (middleware, nextCalled) = BuildMiddleware();

        await Invoke(middleware, BuildContext());

        nextCalled().Should().BeTrue();
        _subscriptions.Verify(r => r.GetActiveByTenantIdAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task InvokeAsync_WhenRequestIsAnonymous_SkipsEverything()
    {
        var (middleware, nextCalled) = BuildMiddleware();

        await Invoke(middleware, BuildContext(authenticated: false));

        nextCalled().Should().BeTrue();
        _subscriptions.Verify(r => r.GetActiveByTenantIdAsync(It.IsAny<Guid>()), Times.Never);
        _cache.Verify(c => c.ExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData("/api/v1/subscription/plans")]
    [InlineData("/api/v1/auth/refresh")]
    [InlineData("/health")]
    public async Task InvokeAsync_WhenPathIsBypassed_SkipsTheCheck(string path)
    {
        _subscriptions.Setup(r => r.GetActiveByTenantIdAsync(TenantId))
            .ReturnsAsync(Subscription(SubscriptionStatus.Trial, DateTimeOffset.UtcNow.AddDays(-1)));

        var (middleware, nextCalled) = BuildMiddleware();
        var context = BuildContext(path: path);

        await Invoke(middleware, context);

        nextCalled().Should().BeTrue();
        context.Response.StatusCode.Should().Be(200);
        _subscriptions.Verify(r => r.GetActiveByTenantIdAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task InvokeAsync_WhenUserIsOnlyAnEmployee_SkipsTheCheckEvenWithAnExpiredTrial()
    {
        _subscriptions.Setup(r => r.GetActiveByTenantIdAsync(TenantId))
            .ReturnsAsync(Subscription(SubscriptionStatus.Trial, DateTimeOffset.UtcNow.AddDays(-1)));

        var (middleware, nextCalled) = BuildMiddleware();
        var context = BuildContext(roles: "SalonEmployee");

        await Invoke(middleware, context);

        // o paywall do cliente isenta funcionario; o 402 e para quem pode assinar
        nextCalled().Should().BeTrue();
        context.Response.StatusCode.Should().Be(200);
        _subscriptions.Verify(r => r.GetActiveByTenantIdAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task InvokeAsync_WhenUserIsEmployeeAndOwner_StillBlocksTheExpiredTrial()
    {
        _subscriptions.Setup(r => r.GetActiveByTenantIdAsync(TenantId))
            .ReturnsAsync(Subscription(SubscriptionStatus.Trial, DateTimeOffset.UtcNow.AddDays(-1)));

        var (middleware, nextCalled) = BuildMiddleware();
        var context = BuildContext(roles: ["SalonEmployee", "SalonOwner"]);

        await Invoke(middleware, context);

        nextCalled().Should().BeFalse();
        context.Response.StatusCode.Should().Be(402);
    }

    [Fact]
    public async Task InvokeAsync_WhenTokenHasNoTenant_SkipsTheCheck()
    {
        _currentUser.SetupGet(c => c.TenantId).Returns(Guid.Empty);

        var (middleware, nextCalled) = BuildMiddleware();

        await Invoke(middleware, BuildContext());

        nextCalled().Should().BeTrue();
        _subscriptions.Verify(r => r.GetActiveByTenantIdAsync(It.IsAny<Guid>()), Times.Never);
    }
}

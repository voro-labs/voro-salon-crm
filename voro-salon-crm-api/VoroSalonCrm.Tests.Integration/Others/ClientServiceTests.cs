using FluentAssertions;
using Moq;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.Services;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Cache;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Tests.Integration.Helpers;

namespace VoroSalonCrm.Tests.Integration.Others;

public class ClientServiceTests
{
    private readonly Mock<IClientRepository>            _clientRepo          = new();
    private readonly Mock<IUnitOfWork>                  _unitOfWork          = new();
    private readonly Mock<ICurrentUserService>          _currentUser         = new();
    private readonly Mock<ITenantSubscriptionRepository> _subscriptionRepo   = new();
    private readonly Mock<IUserNotificationService>     _userNotification    = new();
    private readonly Mock<IWhatsAppMessageService>      _whatsAppMessage     = new();
    private readonly Mock<ICacheService>                _cacheService        = new();

    private ClientService Build() => new(
        _clientRepo.Object,
        _unitOfWork.Object,
        _currentUser.Object,
        _subscriptionRepo.Object,
        _userNotification.Object,
        _whatsAppMessage.Object,
        _cacheService.Object);

    [Fact]
    public async Task Create_Throws_WhenTenantIdIsEmpty()
    {
        // Arrange
        _currentUser.Setup(u => u.TenantId).Returns(Guid.Empty);
        var svc = Build();

        var dto = new CreateClientDto("Test Client", null, null, null);

        // Act
        var act = () => svc.CreateAsync(dto);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Create_Throws_WhenPlanClientLimitReached()
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        _currentUser.Setup(u => u.TenantId).Returns(tenantId);

        var subscription = new TenantSubscription
        {
            Plan = new SubscriptionPlan { MaxClients = 5 }
        };
        _subscriptionRepo
            .Setup(r => r.GetByTenantIdWithPlanAsync(tenantId))
            .ReturnsAsync(subscription);

        // 5 existing clients — at the limit
        var existingClients = Enumerable.Range(0, 5)
            .Select(_ => new Client { Id = Guid.NewGuid(), TenantId = tenantId })
            .ToList();

        var queryable = new TestAsyncEnumerable<Client>(existingClients);
        _clientRepo
            .Setup(r => r.Query(It.IsAny<System.Linq.Expressions.Expression<Func<Client, bool>>>(), It.IsAny<bool>()))
            .Returns(queryable);

        var svc = Build();
        var dto = new CreateClientDto("Test Client", null, null, null);

        // Act
        var act = () => svc.CreateAsync(dto);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Limite de*");
    }

    [Fact]
    public async Task GetById_ReturnsNull_WhenClientNotFound()
    {
        // Arrange
        _clientRepo
            .Setup(r => r.GetByIdAsync(It.IsAny<bool>(), It.IsAny<object[]>()))
            .ReturnsAsync((Client?)null);

        var svc = Build();

        // Act
        var result = await svc.GetByIdAsync(Guid.NewGuid());

        // Assert
        result.Should().BeNull();
    }

    // ── GetPagedAsync (issue #116) ──────────────────────────────────────

    private void SetupClientQueryable(IEnumerable<Client> clients)
        => _clientRepo
            .Setup(r => r.Query(It.IsAny<System.Linq.Expressions.Expression<Func<Client, bool>>>(), It.IsAny<bool>()))
            .Returns(new TestAsyncEnumerable<Client>(clients));

    private static Client MakeClient(string name, string? email = null, string? phone = null) => new()
    {
        Id = Guid.NewGuid(),
        Name = name,
        Email = email,
        Phone = phone
    };

    [Fact]
    public async Task GetPaged_ReturnsOnlyTheRequestedPage()
    {
        // Arrange
        SetupClientQueryable(Enumerable.Range(0, 25)
            .Select(i => MakeClient($"Cliente {i:00}"))
            .ToList());

        var svc = Build();

        // Act
        var result = await svc.GetPagedAsync(page: 3, pageSize: 10, search: null);

        // Assert
        result.Items.Should().HaveCount(5);
        result.TotalCount.Should().Be(25);
        result.Items.First().Name.Should().Be("Cliente 20");
    }

    [Fact]
    public async Task GetPaged_Search_IsCaseInsensitive_AcrossNameEmailAndPhone()
    {
        // Arrange
        SetupClientQueryable(
        [
            MakeClient("Ana Paula"),
            MakeClient("Bruno", email: "BRUNO@salao.com"),
            MakeClient("Carla", phone: "11 98888-0000"),
            MakeClient("Daniel", email: "daniel@outro.com", phone: "11 97777-0000")
        ]);

        var svc = Build();

        // Act
        var byName = await svc.GetPagedAsync(1, 10, "ANA");
        var byEmail = await svc.GetPagedAsync(1, 10, "bruno@salao");
        var byPhone = await svc.GetPagedAsync(1, 10, "98888");

        // Assert
        byName.Items.Should().ContainSingle().Which.Name.Should().Be("Ana Paula");
        byEmail.Items.Should().ContainSingle().Which.Name.Should().Be("Bruno");
        byPhone.Items.Should().ContainSingle().Which.Name.Should().Be("Carla");
    }

    [Fact]
    public async Task GetPaged_DoesNotLoadTheWholeTenantListFromCache()
    {
        // A listagem paginada costumava chamar GetAllAsync, que traz a lista inteira do tenant
        // do cache para descartar quase tudo em memória. Agora o recorte é do banco, e o cache
        // só atende quem realmente precisa da lista completa (issue #116).
        // Arrange
        SetupClientQueryable(Enumerable.Range(0, 50).Select(i => MakeClient($"Cliente {i:00}")).ToList());
        var svc = Build();

        // Act
        await svc.GetPagedAsync(page: 1, pageSize: 10, search: null);

        // Assert
        _cacheService.Verify(
            c => c.GetAsync<List<ClientDto>>(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}

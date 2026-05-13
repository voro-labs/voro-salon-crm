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
}

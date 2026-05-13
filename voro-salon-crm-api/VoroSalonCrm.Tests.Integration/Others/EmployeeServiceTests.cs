using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Moq;
using VoroSalonCrm.Application.Services;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Blob;
using VoroSalonCrm.Application.Services.Interfaces.Identity;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Cache;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Tests.Integration.Others;

public class EmployeeServiceTests
{
    private readonly Mock<IEmployeeRepository>              _employeeRepo        = new();
    private readonly Mock<ICurrentUserService>              _currentUser         = new();
    private readonly Mock<IUnitOfWork>                      _unitOfWork          = new();
    private readonly Mock<IBlobService>                     _blobService         = new();
    private readonly Mock<ITenantSubscriptionRepository>    _subscriptionRepo    = new();
    private readonly Mock<ITransactionRepository>           _transactionRepo     = new();
    private readonly Mock<IUserService>                     _userService         = new();
    private readonly Mock<IUserTenantRepository>            _userTenantRepo      = new();
    private readonly Mock<INotificationService>             _notificationService = new();
    private readonly Mock<ITenantRepository>                _tenantRepo          = new();
    private readonly IConfiguration                         _configuration       = new ConfigurationBuilder().Build();
    private readonly Mock<ICacheService>                    _cacheService        = new();

    private VoroSalonCrm.Application.Services.EmployeeService Build() => new(
        _employeeRepo.Object,
        _currentUser.Object,
        _unitOfWork.Object,
        _blobService.Object,
        _subscriptionRepo.Object,
        _transactionRepo.Object,
        _userService.Object,
        _userTenantRepo.Object,
        _notificationService.Object,
        _tenantRepo.Object,
        _configuration,
        _cacheService.Object);

    [Fact]
    public async Task GetById_ReturnsNull_WhenEmployeeNotFound()
    {
        // Arrange
        _employeeRepo
            .Setup(r => r.GetByIdWithSpecialtiesAsync(It.IsAny<Guid>()))
            .ReturnsAsync((Employee?)null);

        var svc = Build();

        // Act
        var result = await svc.GetByIdAsync(Guid.NewGuid());

        // Assert
        result.Should().BeNull();
    }
}

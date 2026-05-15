using FluentAssertions;
using Moq;
using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Application.Features.Auth.Commands;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Identity;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Entities.Identity;

namespace VoroSalonCrm.Tests.Integration.Auth.Commands;

public class SignInCommandHandlerTests
{
    private readonly Mock<IUserService>         _userService         = new();
    private readonly Mock<INotificationService> _notificationService = new();

    private SignInCommandHandler Build() => new(_userService.Object, _notificationService.Object);

    [Fact]
    public async Task Handle_WhenCredentialsInvalid_ThrowsUnauthorized()
    {
        _userService
            .Setup(u => u.GetByEmailAndPassword(It.IsAny<string>(), It.IsAny<string>()))
            .ThrowsAsync(new UnauthorizedAccessException("Credenciais inválidas."));

        var act = () => Build().Handle(
            new SignInCommand(new SignInDto { Email = "test@test.com", Password = "wrong" }),
            CancellationToken.None);

        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Credenciais inválidas.");
    }

    [Fact]
    public async Task Handle_WhenTwoFactorEnabled_Returns2FaPendingToken()
    {
        var user = new User
        {
            Id               = Guid.NewGuid(),
            Email            = "user@test.com",
            EmailConfirmed   = true,
            TwoFactorEnabled = true,
            UserTenants      = []
        };

        _userService
            .Setup(u => u.GetByEmailAndPassword("user@test.com", "pass"))
            .ReturnsAsync((user, new List<string>()));

        _userService
            .Setup(u => u.GenerateTwoFactorCodeAsync(user.Id))
            .ReturnsAsync(("123456", "pending-token-abc"));

        _notificationService
            .Setup(n => n.SendTwoFactorCodeAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Tenant?>()))
            .Returns(Task.CompletedTask);

        var result = await Build().Handle(
            new SignInCommand(new SignInDto { Email = "user@test.com", Password = "pass" }),
            CancellationToken.None);

        result.Should().NotBeNull();
        result!.RequiresTwoFactor.Should().BeTrue();
        result.TwoFactorPendingToken.Should().Be("pending-token-abc");
        result.Token.Should().BeNullOrEmpty();
    }

    [Fact]
    public async Task Handle_WhenTwoFactorDisabled_ReturnsNull()
    {
        var user = new User
        {
            Id               = Guid.NewGuid(),
            Email            = "user@test.com",
            TwoFactorEnabled = false,
            UserTenants      = []
        };

        _userService
            .Setup(u => u.GetByEmailAndPassword(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync((user, new List<string>()));

        var result = await Build().Handle(
            new SignInCommand(new SignInDto { Email = "user@test.com", Password = "pass" }),
            CancellationToken.None);

        result.Should().BeNull();
    }

    [Fact]
    public async Task Handle_WhenEstablishmentTypeMismatch_ThrowsUnauthorized()
    {
        var tenant = new Tenant { Id = Guid.NewGuid(), EstablishmentType = Domain.Enums.EstablishmentType.Salon };
        var user = new User
        {
            Id               = Guid.NewGuid(),
            Email            = "user@test.com",
            EmailConfirmed   = true,
            TwoFactorEnabled = true,
            UserTenants      = [new UserTenant { IsDefault = true, Tenant = tenant }]
        };

        _userService
            .Setup(u => u.GetByEmailAndPassword(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync((user, new List<string>()));

        _userService
            .Setup(u => u.GenerateTwoFactorCodeAsync(user.Id))
            .ReturnsAsync(("code", "token"));

        var act = () => Build().Handle(
            new SignInCommand(new SignInDto { Email = "user@test.com", Password = "pass", EstablishmentType = 99 }),
            CancellationToken.None);

        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*endereço de acesso*");
    }
}

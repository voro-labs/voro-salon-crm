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
        result.TwoFactorResponse.Should().NotBeNull();
        result.TwoFactorResponse!.RequiresTwoFactor.Should().BeTrue();
        result.TwoFactorResponse.TwoFactorPendingToken.Should().Be("pending-token-abc");
        result.TwoFactorResponse.Token.Should().BeNullOrEmpty();

        // Fluxo de 2FA não devolve usuário — o JWT só é gerado após a verificação do código
        result.User.Should().BeNull();
    }

    [Fact]
    public async Task Handle_WhenTwoFactorDisabled_ReturnsAuthenticatedUserWithoutRehashing()
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
            .ReturnsAsync((user, new List<string> { "SalonOwner" }));

        var result = await Build().Handle(
            new SignInCommand(new SignInDto { Email = "user@test.com", Password = "pass" }),
            CancellationToken.None);

        // Sem 2FA o handler devolve o usuário já autenticado, para o AuthService gerar o
        // JWT sem refazer a verificação de senha.
        result.Should().NotBeNull();
        result.TwoFactorResponse.Should().BeNull();
        result.User.Should().BeSameAs(user);
        result.Roles.Should().ContainSingle().Which.Should().Be("SalonOwner");

        // Regressão da issue #120: a senha é verificada exatamente uma vez por login.
        _userService.Verify(
            u => u.GetByEmailAndPassword(It.IsAny<string>(), It.IsAny<string>()),
            Times.Once);
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

    [Fact]
    public async Task Handle_WhenAnotherTenantMatchesEstablishmentType_AllowsSignIn()
    {
        // Conta com salão (padrão) + barbearia entrando pelo domínio da barbearia
        var salon  = new Tenant { Id = Guid.NewGuid(), EstablishmentType = Domain.Enums.EstablishmentType.Salon };
        var barber = new Tenant { Id = Guid.NewGuid(), EstablishmentType = Domain.Enums.EstablishmentType.Barber };
        var user = new User
        {
            Id               = Guid.NewGuid(),
            Email            = "user@test.com",
            EmailConfirmed   = true,
            TwoFactorEnabled = true,
            UserTenants      =
            [
                new UserTenant { TenantId = salon.Id,  IsDefault = true, Tenant = salon },
                new UserTenant { TenantId = barber.Id, Tenant = barber }
            ]
        };

        _userService
            .Setup(u => u.GetByEmailAndPassword(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync((user, new List<string>()));

        _userService
            .Setup(u => u.GenerateTwoFactorCodeAsync(user.Id))
            .ReturnsAsync(("123456", "pending-token"));

        var result = await Build().Handle(
            new SignInCommand(new SignInDto
            {
                Email             = "user@test.com",
                Password          = "pass",
                EstablishmentType = (int)Domain.Enums.EstablishmentType.Barber
            }),
            CancellationToken.None);

        result.TwoFactorResponse!.TwoFactorPendingToken.Should().Be("pending-token");

        // O e-mail do 2FA usa a marca do estabelecimento do domínio acessado
        _notificationService.Verify(
            n => n.SendTwoFactorCodeAsync(user.Email!, It.IsAny<string>(), "123456", barber),
            Times.Once);
    }

    [Fact]
    public async Task Handle_WhenTwoFactorDisabledAndEstablishmentTypeMismatch_ThrowsUnauthorized()
    {
        var salon = new Tenant { Id = Guid.NewGuid(), EstablishmentType = Domain.Enums.EstablishmentType.Salon };
        var user = new User
        {
            Id               = Guid.NewGuid(),
            Email            = "user@test.com",
            EmailConfirmed   = true,
            TwoFactorEnabled = false,
            UserTenants      = [new UserTenant { TenantId = salon.Id, IsDefault = true, Tenant = salon }]
        };

        _userService
            .Setup(u => u.GetByEmailAndPassword(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync((user, new List<string>()));

        var act = () => Build().Handle(
            new SignInCommand(new SignInDto
            {
                Email             = "user@test.com",
                Password          = "pass",
                EstablishmentType = (int)Domain.Enums.EstablishmentType.Barber
            }),
            CancellationToken.None);

        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*endereço de acesso*");
    }
}

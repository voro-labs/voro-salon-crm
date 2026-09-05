// voro-salon-crm-api/VoroSalonCrm.Tests.Integration/Auth/AuthServiceTests.cs
using FluentAssertions;
using Moq;
using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Application.DTOs.Auth;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Entities.Identity;
using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Tests.Integration.Auth;

public class AuthServiceTests
{
    // ── SignInAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task SignIn_ReturnsTwoFactorPending_WhenUserHas2FAEnabledAndEmailConfirmed()
    {
        // Arrange
        var ctx = new AuthServiceContext();
        var user = new User
        {
            Id               = Guid.NewGuid(),
            Email            = "test@voro.com",
            EmailConfirmed   = true,
            TwoFactorEnabled = true,
            FirstName        = "Test",
            LastName         = "User"
        };

        ctx.UserService
            .Setup(s => s.GetByEmailAndPassword("test@voro.com", "senha123"))
            .ReturnsAsync((user, (IList<string>?)new List<string> { "salonOwner" }));

        ctx.UserService
            .Setup(s => s.GenerateTwoFactorCodeAsync(user.Id))
            .ReturnsAsync(("123456", "pending-token-abc"));

        var svc = ctx.Build();

        // Act
        var result = await svc.SignInAsync(new SignInDto
        {
            Email    = "test@voro.com",
            Password = "senha123"
        });

        // Assert
        result.RequiresTwoFactor.Should().BeTrue();
        result.TwoFactorEnabled.Should().BeTrue();
        result.TwoFactorPendingToken.Should().Be("pending-token-abc");
        result.Token.Should().BeNullOrEmpty();
    }

    [Fact]
    public async Task SignIn_Throws_WhenUserHas2FAEnabledAndEmailNotConfirmed()
    {
        // Arrange
        var ctx = new AuthServiceContext();
        var user = new User
        {
            Id               = Guid.NewGuid(),
            Email            = "test@voro.com",
            EmailConfirmed   = false,
            TwoFactorEnabled = true
        };

        ctx.UserService
            .Setup(s => s.GetByEmailAndPassword("test@voro.com", "senha123"))
            .ReturnsAsync((user, (IList<string>?)new List<string>()));

        ctx.UserService
            .Setup(s => s.GenerateTwoFactorCodeAsync(user.Id))
            .ReturnsAsync(("123456", "pending-token"));

        var svc = ctx.Build();

        // Act
        var act = () => svc.SignInAsync(new SignInDto { Email = "test@voro.com", Password = "senha123" });

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*confirmar*");
    }

    [Fact]
    public async Task SignIn_Throws_WhenEstablishmentTypeMismatch()
    {
        // Arrange
        var ctx = new AuthServiceContext();
        var tenant = new Tenant
        {
            Id                = Guid.NewGuid(),
            EstablishmentType = EstablishmentType.Barber
        };
        var user = new User
        {
            Id               = Guid.NewGuid(),
            Email            = "test@voro.com",
            EmailConfirmed   = true,
            TwoFactorEnabled = true,
            UserTenants      = new List<UserTenant>
            {
                new() { IsDefault = true, Tenant = tenant }
            }
        };

        ctx.UserService
            .Setup(s => s.GetByEmailAndPassword("test@voro.com", "senha123"))
            .ReturnsAsync((user, (IList<string>?)new List<string>()));

        ctx.UserService
            .Setup(s => s.GenerateTwoFactorCodeAsync(user.Id))
            .ReturnsAsync(("123456", "pending-token"));

        var svc = ctx.Build();

        // Act — tenta logar no domínio Salon (0) mas o tenant é Barber (1)
        var act = () => svc.SignInAsync(new SignInDto
        {
            Email             = "test@voro.com",
            Password          = "senha123",
            EstablishmentType = (int)EstablishmentType.Salon
        });

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*Credenciais inválidas*");
    }

    [Fact]
    public async Task SignIn_Succeeds_WhenAccountHasAnEstablishmentOfTheDomainType()
    {
        // Arrange — conta com salão (padrão) e barbearia, entrando pelo domínio da barbearia
        var ctx    = new AuthServiceContext();
        var salon  = new Tenant { Id = Guid.NewGuid(), EstablishmentType = EstablishmentType.Salon };
        var barber = new Tenant { Id = Guid.NewGuid(), EstablishmentType = EstablishmentType.Barber };
        var user = new User
        {
            Id               = Guid.NewGuid(),
            Email            = "test@voro.com",
            EmailConfirmed   = true,
            TwoFactorEnabled = true,
            UserTenants      =
            [
                new UserTenant { TenantId = salon.Id,  IsDefault = true, Tenant = salon },
                new UserTenant { TenantId = barber.Id, Tenant = barber }
            ]
        };

        ctx.UserService
            .Setup(s => s.GetByEmailAndPassword("test@voro.com", "senha123"))
            .ReturnsAsync((user, (IList<string>?)new List<string>()));

        ctx.UserService
            .Setup(s => s.GenerateTwoFactorCodeAsync(user.Id))
            .ReturnsAsync(("123456", "pending-token"));

        var svc = ctx.Build();

        // Act
        var result = await svc.SignInAsync(new SignInDto
        {
            Email             = "test@voro.com",
            Password          = "senha123",
            EstablishmentType = (int)EstablishmentType.Barber
        });

        // Assert
        result.RequiresTwoFactor.Should().BeTrue();
        result.TwoFactorPendingToken.Should().Be("pending-token");
    }

    // ── VerifyTwoFactorAsync ──────────────────────────────────────────────────

    [Fact]
    public async Task VerifyTwoFactor_Throws_WhenAccountHasNoEstablishmentOfTheDomainType()
    {
        // Arrange
        var ctx   = new AuthServiceContext();
        var salon = new Tenant { Id = Guid.NewGuid(), EstablishmentType = EstablishmentType.Salon };
        var user = new User
        {
            Id             = Guid.NewGuid(),
            Email          = "test@voro.com",
            EmailConfirmed = true,
            UserTenants    = [new UserTenant { TenantId = salon.Id, IsDefault = true, Tenant = salon }]
        };

        ctx.UserService
            .Setup(s => s.VerifyTwoFactorAsync("pending-token", "123456"))
            .ReturnsAsync((user, (IList<string>)new List<string>()));

        var svc = ctx.Build();

        // Act — código correto, mas o domínio não corresponde a nenhum estabelecimento
        var act = () => svc.VerifyTwoFactorAsync(new VerifyTwoFactorDto
        {
            PendingToken      = "pending-token",
            Code              = "123456",
            EstablishmentType = (int)EstablishmentType.Barber
        });

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*endereço de acesso*");
    }

    // ── SwitchTenantAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task SwitchTenant_Throws_WhenTargetEstablishmentIsFromAnotherDomain()
    {
        // Arrange — sessão aberta no domínio da barbearia tentando ir para o salão
        var ctx    = new AuthServiceContext();
        var salon  = new Tenant { Id = Guid.NewGuid(), EstablishmentType = EstablishmentType.Salon };
        var barber = new Tenant { Id = Guid.NewGuid(), EstablishmentType = EstablishmentType.Barber };
        var user = new User
        {
            Id          = Guid.NewGuid(),
            Email       = "test@voro.com",
            UserTenants =
            [
                new UserTenant { TenantId = salon.Id,  IsDefault = true, Tenant = salon },
                new UserTenant { TenantId = barber.Id, Tenant = barber }
            ]
        };

        ctx.CurrentUser.Setup(c => c.UserId).Returns(user.Id);
        ctx.UserService.Setup(s => s.GetByIdAsync(user.Id)).ReturnsAsync(user);

        var svc = ctx.Build();

        // Act
        var act = () => svc.SwitchTenantAsync(salon.Id, (int)EstablishmentType.Barber);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*endereço de acesso*");
    }

    [Fact]
    public async Task SwitchTenant_Throws_WhenUserDoesNotBelongToTenant()
    {
        var ctx  = new AuthServiceContext();
        var user = new User { Id = Guid.NewGuid(), Email = "test@voro.com", UserTenants = [] };

        ctx.CurrentUser.Setup(c => c.UserId).Returns(user.Id);
        ctx.UserService.Setup(s => s.GetByIdAsync(user.Id)).ReturnsAsync(user);

        var svc = ctx.Build();

        var act = () => svc.SwitchTenantAsync(Guid.NewGuid());

        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*não tem acesso*");
    }

    // ── Delegation tests ──────────────────────────────────────────────────────

    [Fact]
    public async Task ChangePassword_DelegatesToUserService()
    {
        // Arrange
        var ctx    = new AuthServiceContext();
        var userId = Guid.NewGuid();
        var newPwd = "N0vaS3nha!";

        ctx.UserService
            .Setup(s => s.ChangePasswordAsync(userId, newPwd))
            .Returns(Task.CompletedTask);

        var svc = ctx.Build();

        // Act
        await svc.ChangePasswordAsync(userId, newPwd);

        // Assert
        ctx.UserService.Verify(s => s.ChangePasswordAsync(userId, newPwd), Times.Once);
    }

    [Fact]
    public async Task ResetPassword_DelegatesToUserService()
    {
        // Arrange
        var ctx = new AuthServiceContext();
        var dto = new ResetPasswordDto
        {
            Email       = "test@voro.com",
            Token       = "reset-token",
            NewPassword = "N0vaSenha!"
        };

        ctx.UserService
            .Setup(s => s.ResetPasswordAsync(dto))
            .ReturnsAsync(true);

        var svc = ctx.Build();

        // Act
        var result = await svc.ResetPasswordAsync(dto);

        // Assert
        result.Should().BeTrue();
        ctx.UserService.Verify(s => s.ResetPasswordAsync(dto), Times.Once);
    }

    [Fact]
    public async Task AcceptTerms_DelegatesToUserService()
    {
        // Arrange
        var ctx    = new AuthServiceContext();
        var userId = Guid.NewGuid();
        ctx.UserService.Setup(s => s.AcceptTermsAsync(userId)).Returns(Task.CompletedTask);
        var svc = ctx.Build();

        // Act
        await svc.AcceptTermsAsync(userId);

        // Assert
        ctx.UserService.Verify(s => s.AcceptTermsAsync(userId), Times.Once);
    }
}

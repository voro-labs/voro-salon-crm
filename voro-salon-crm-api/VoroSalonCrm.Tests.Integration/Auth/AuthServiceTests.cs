// voro-salon-crm-api/VoroSalonCrm.Tests.Integration/Auth/AuthServiceTests.cs
using FluentAssertions;
using Moq;
using VoroSalonCrm.Application.DTOs;
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

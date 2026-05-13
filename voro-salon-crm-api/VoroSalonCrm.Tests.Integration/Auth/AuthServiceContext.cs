// voro-salon-crm-api/VoroSalonCrm.Tests.Integration/Auth/AuthServiceContext.cs
using AutoMapper;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Moq;
using VoroSalonCrm.Application.Features.Auth.Commands;
using VoroSalonCrm.Application.Services;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Identity;
using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Entities.Identity;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Shared.Utils;
using Microsoft.Extensions.Configuration;

namespace VoroSalonCrm.Tests.Integration.Auth;

/// <summary>
/// Mounts all AuthService dependencies with neutral defaults.
/// Each test creates a fresh context and overrides only what the scenario needs.
/// </summary>
internal sealed class AuthServiceContext
{
    public Mock<IOptions<CookieUtil>>              CookieUtil        { get; } = new();
    public Mock<IConfiguration>                    Configuration     { get; } = new();
    public Mock<IMapper>                           Mapper            { get; } = new();
    public Mock<INotificationService>              Notifications     { get; } = new();
    public Mock<IUserService>                      UserService       { get; } = new();
    public Mock<ICurrentUserService>               CurrentUser       { get; } = new();
    public Mock<IUserExtensionRepository>          UserExtensionRepo { get; } = new();
    public Mock<IUnitOfWork>                       UnitOfWork        { get; } = new();
    public Mock<ITenantRepository>                 TenantRepo        { get; } = new();
    public Mock<IUserTenantRepository>             UserTenantRepo    { get; } = new();
    public Mock<UserManager<User>>                 UserManager       { get; }
    public Mock<IDemoResetService>                 DemoResetService  { get; } = new();
    public Mock<ITenantBusinessHoursRepository>    BusinessHoursRepo { get; } = new();
    public Mock<IMediator>                         Mediator          { get; } = new();

    public AuthServiceContext()
    {
        var store = new Mock<IUserStore<User>>();
        UserManager = new Mock<UserManager<User>>(
            store.Object, null!, null!, null!, null!, null!, null!, null!, null!);

        CookieUtil
            .Setup(c => c.Value)
            .Returns(new CookieUtil
            {
                ExpireHours = "8",
                Audience    = "test-audience",
                Issuer      = "test-issuer"
            });

        UnitOfWork
            .Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);

        Notifications
            .Setup(n => n.SendTwoFactorCodeAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Tenant?>()))
            .Returns(Task.CompletedTask);

        Notifications
            .Setup(n => n.SendWelcomeAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Tenant?>()))
            .Returns(Task.CompletedTask);

        // Wire mediator to delegate to the real handlers using the mocked services
        Mediator
            .Setup(m => m.Send(It.IsAny<SignInCommand>(), It.IsAny<CancellationToken>()))
            .Returns<SignInCommand, CancellationToken>((cmd, ct) =>
                new SignInCommandHandler(UserService.Object, Notifications.Object).Handle(cmd, ct));

        Notifications
            .Setup(n => n.SendResetLinkAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Tenant?>(), It.IsAny<string?>()))
            .Returns(Task.CompletedTask);

        Mediator
            .Setup(m => m.Send(It.IsAny<ForgotPasswordCommand>(), It.IsAny<CancellationToken>()))
            .Returns<ForgotPasswordCommand, CancellationToken>((cmd, ct) =>
                new ForgotPasswordCommandHandler(UserService.Object, Notifications.Object)
                    .Handle(cmd, ct).ContinueWith(_ => Unit.Value, ct));

        Mediator
            .Setup(m => m.Send(It.IsAny<ResetPasswordCommand>(), It.IsAny<CancellationToken>()))
            .Returns<ResetPasswordCommand, CancellationToken>((cmd, ct) =>
                new ResetPasswordCommandHandler(UserService.Object).Handle(cmd, ct));
    }

    public AuthService Build() => new(
        CookieUtil.Object,
        Configuration.Object,
        Mapper.Object,
        Notifications.Object,
        UserService.Object,
        CurrentUser.Object,
        UserExtensionRepo.Object,
        UnitOfWork.Object,
        TenantRepo.Object,
        UserTenantRepo.Object,
        UserManager.Object,
        DemoResetService.Object,
        BusinessHoursRepo.Object,
        Mediator.Object);
}

using System.Text;
using MediatR;
using Microsoft.AspNetCore.WebUtilities;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Identity;

namespace VoroSalonCrm.Application.Features.Auth.Commands;

public class ForgotPasswordCommandHandler(
    IUserService         userService,
    INotificationService notificationService)
    : IRequestHandler<ForgotPasswordCommand>
{
    public async Task Handle(ForgotPasswordCommand request, CancellationToken cancellationToken)
    {
        var dto = request.Dto;
        var (user, token) = await userService.GenerateForgotPasswordAsync(dto);

        var userName = !string.IsNullOrEmpty(user.FirstName)
            ? $"{user.FirstName} {user.LastName}"
            : $"{user.UserName}";

        var primaryTenant = user.UserTenants?.FirstOrDefault(ut => ut.IsDefault)?.Tenant
                         ?? user.UserTenants?.FirstOrDefault()?.Tenant;

        await notificationService.SendResetLinkAsync(
            $"{user.Email}",
            userName,
            WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token)),
            primaryTenant,
            dto.RedirectUri);
    }
}

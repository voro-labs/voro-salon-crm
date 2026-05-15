using MediatR;
using VoroSalonCrm.Application.Constants;
using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Identity;

namespace VoroSalonCrm.Application.Features.Auth.Commands;

public class SignInCommandHandler(
    IUserService         userService,
    INotificationService notificationService)
    : IRequestHandler<SignInCommand, AuthDto?>
{
    public async Task<AuthDto?> Handle(SignInCommand request, CancellationToken cancellationToken)
    {
        var dto = request.Dto;
        var (user, _) = await userService.GetByEmailAndPassword(dto.Email, dto.Password);

        if (!user.TwoFactorEnabled)
            return null; // Signal to facade: use direct JWT generation

        var (code, pendingToken) = await userService.GenerateTwoFactorCodeAsync(user.Id);

        var userName = !string.IsNullOrEmpty(user.FirstName)
            ? $"{user.FirstName} {user.LastName}".Trim()
            : user.UserName ?? string.Empty;

        var primaryTenant = user.UserTenants?.FirstOrDefault(ut => ut.IsDefault)?.Tenant
                         ?? user.UserTenants?.FirstOrDefault()?.Tenant;

        if (dto.EstablishmentType.HasValue && primaryTenant != null &&
            (int)primaryTenant.EstablishmentType != dto.EstablishmentType.Value)
            throw new UnauthorizedAccessException("Credenciais inválidas para este endereço de acesso.");

        if (user.EmailConfirmed && !ReviewerConstants.IsReviewer(user.Email))
            await notificationService.SendTwoFactorCodeAsync(user.Email!, userName, code, primaryTenant);
        else if (!user.EmailConfirmed)
            throw new UnauthorizedAccessException(
                "É necessário confirmar seu e-mail para fazer login. Verifique sua caixa de entrada.");

        return new AuthDto
        {
            TwoFactorEnabled = true,
            RequiresTwoFactor = true,
            TwoFactorPendingToken = pendingToken
        };
    }
}

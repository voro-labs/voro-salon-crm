using MediatR;
using VoroSalonCrm.Application.Constants;
using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Identity;

namespace VoroSalonCrm.Application.Features.Auth.Commands;

public class SignInCommandHandler(
    IUserService         userService,
    INotificationService notificationService)
    : IRequestHandler<SignInCommand, SignInResult>
{
    public async Task<SignInResult> Handle(SignInCommand request, CancellationToken cancellationToken)
    {
        var dto = request.Dto;
        var (user, roles) = await userService.GetByEmailAndPassword(dto.Email, dto.Password);

        // O domínio de acesso libera a conta se ela tiver ao menos um estabelecimento
        // daquele tipo — antes só o estabelecimento padrão era considerado, o que barrava
        // quem tem, por exemplo, um salão e uma barbearia na mesma conta.
        if (!EstablishmentAccessPolicy.HasAccessTo(user, dto.EstablishmentType))
            throw new UnauthorizedAccessException("Credenciais inválidas para este endereço de acesso.");

        // 2FA desligado: devolve o usuário já autenticado para o chamador gerar o JWT.
        // Antes retornava null e o AuthService refazia GetByEmailAndPassword, rodando o
        // PBKDF2 do Identity duas vezes por login (issue #120).
        if (!user.TwoFactorEnabled)
            return SignInResult.Authenticated(user, roles);

        var (code, pendingToken) = await userService.GenerateTwoFactorCodeAsync(user.Id);

        var userName = !string.IsNullOrEmpty(user.FirstName)
            ? $"{user.FirstName} {user.LastName}".Trim()
            : user.UserName ?? string.Empty;

        // Marca do e-mail: o estabelecimento do domínio acessado, não o padrão da conta.
        var primaryTenant = EstablishmentAccessPolicy.ResolveTenant(user, dto.EstablishmentType);

        if (user.EmailConfirmed && !ReviewerConstants.IsReviewer(user.Email))
            await notificationService.SendTwoFactorCodeAsync(user.Email!, userName, code, primaryTenant);
        else if (!user.EmailConfirmed)
            throw new UnauthorizedAccessException(
                "É necessário confirmar seu e-mail para fazer login. Verifique sua caixa de entrada.");

        return SignInResult.RequiresTwoFactor(new AuthDto
        {
            TwoFactorEnabled      = true,
            RequiresTwoFactor     = true,
            TwoFactorPendingToken = pendingToken
        });
    }
}

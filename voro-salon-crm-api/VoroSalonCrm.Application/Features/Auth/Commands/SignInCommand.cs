using MediatR;
using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Domain.Entities.Identity;

namespace VoroSalonCrm.Application.Features.Auth.Commands;

public record SignInCommand(SignInDto Dto) : IRequest<SignInResult>;

/// <summary>
/// Resultado do sign-in.
/// <para>
/// Quando o 2FA está habilitado, <see cref="TwoFactorResponse"/> traz o pending token e
/// os demais campos ficam nulos. Quando está desabilitado, o handler já autenticou o
/// usuário e devolve <see cref="User"/> + <see cref="Roles"/> para que o chamador gere o
/// JWT <b>sem repetir a verificação de senha</b> (ver issue #120).
/// </para>
/// </summary>
public record SignInResult(AuthDto? TwoFactorResponse, User? User, IList<string>? Roles)
{
    /// <summary>2FA habilitado: o fluxo para aqui aguardando o código.</summary>
    public static SignInResult RequiresTwoFactor(AuthDto response) => new(response, null, null);

    /// <summary>2FA desabilitado: credenciais já validadas, pronto para gerar o JWT.</summary>
    public static SignInResult Authenticated(User user, IList<string>? roles) => new(null, user, roles);
}

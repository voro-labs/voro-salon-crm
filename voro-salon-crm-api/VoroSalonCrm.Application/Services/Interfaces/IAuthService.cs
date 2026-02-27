using VoroSwipeEntertainment.Application.DTOs;
using VoroSwipeEntertainment.Domain.Entities.Identity;

namespace VoroSwipeEntertainment.Application.Services.Interfaces
{
    public interface IAuthService
    {
        // Autenticação
        Task<AuthDto> SignInAsync(SignInDto signInDto);

        // Registro de usuário
        Task<AuthDto> SignUpAsync(SignUpDto signUpDto, List<string> roles);

        // Confirmação de e-mail
        Task ConfirmEmailAsync(string email);
        Task<bool> ConfirmEmailAsync(AuthDto authDto, string email);

        // Recuperação de senha
        Task ForgotPasswordAsync(ForgotPasswordDto forgotPasswordDto);
        Task<bool> ResetPasswordAsync(ResetPasswordDto resetPasswordDto);
    }
}

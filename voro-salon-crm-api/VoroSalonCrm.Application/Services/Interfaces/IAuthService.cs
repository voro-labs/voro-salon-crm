using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Application.DTOs.Auth;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Entities.Identity;

namespace VoroSalonCrm.Application.Services.Interfaces
{
    public interface IAuthService
    {
        // Autenticação
        Task<AuthDto> SignInAsync(SignInDto signInDto);
        Task<AuthDto> RefreshTokenAsync(DTOs.Auth.RefreshTokenDto model);

        // Registro de usuário
        Task<AuthDto> SignUpAsync(SignUpDto signUpDto, List<string> roles);

        // Confirmação de e-mail
        Task ConfirmEmailAsync(string email);
        Task<bool> ConfirmEmailAsync(AuthDto authDto, string email);

        // Recuperação de senha
        Task ForgotPasswordAsync(ForgotPasswordDto forgotPasswordDto);
        Task<bool> ResetPasswordAsync(ResetPasswordDto resetPasswordDto);

        // Two-Factor Authentication
        Task<AuthDto> VerifyTwoFactorAsync(VerifyTwoFactorDto dto);

        // Troca de Tenant
        Task<AuthDto> SwitchTenantAsync(Guid tenantId);

        // Pós-login obrigatórios
        Task ChangePasswordAsync(Guid userId, string newPassword);
        Task AcceptTermsAsync(Guid userId);
        Task CompleteProfileAsync(Guid userId, CompleteProfileDto dto);

        // Provisionamento automático via pagamento
        Task<Guid> ProvisionAccountFromSubscriptionAsync(string email, string contactName, string salonName);
    }
}

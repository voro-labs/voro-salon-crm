using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Application.DTOs.Auth;
using VoroSalonCrm.Application.DTOs.Identity;
using VoroSalonCrm.Application.Services.Interfaces.Base;
using VoroSalonCrm.Domain.Entities.Identity;

namespace VoroSalonCrm.Application.Services.Interfaces.Identity
{
    public interface IUserService : IServiceBase<User>
    {
        Task<(User user, IList<string>? rolesNames)> GetByEmailAndPassword(string email, string password);
        Task<User> CreateAsync(UserDto dto, string password, ICollection<string> roles);
        Task<User> UpdateAsync(Guid id, UserDto dto);
        Task<(User user, string token)> GenerateConfirmEmailAsync(string email);
        Task<bool> ConfirmEmailAsync(AuthDto authViewModel, string email);
        Task<(User user, string token)> GenerateForgotPasswordAsync(ForgotPasswordDto forgotPasswordDto);
        Task<bool> ResetPasswordAsync(ResetPasswordDto resetPasswordDto);
        Task<IList<string>> GetRolesAsync(User user);
        Task<User?> GetByIdAsync(Guid id);
        Task<(string code, string pendingToken)> GenerateTwoFactorCodeAsync(Guid userId);
        Task<(User user, IList<string> roles)> VerifyTwoFactorAsync(string pendingToken, string code);
        Task<string> GenerateEnable2FACodeAsync(Guid userId);
        Task EnableTwoFactorAsync(Guid userId, string code);
        Task DisableTwoFactorAsync(Guid userId);
        Task ChangePasswordAsync(Guid userId, string newPassword);
        Task AcceptTermsAsync(Guid userId);
        Task<User?> FindByEmailAsync(string email);
        Task CompleteProfileAsync(Guid userId, CompleteProfileDto dto);
    }
}

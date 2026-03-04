using AutoMapper;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Application.DTOs.Identity;
using VoroSalonCrm.Application.Services.Base;
using VoroSalonCrm.Application.Services.Interfaces.Identity;
using VoroSalonCrm.Domain.Entities.Identity;
using VoroSalonCrm.Domain.Interfaces.Repositories.Identity;

namespace VoroSalonCrm.Application.Services.Identity
{
    public class UserService(IUserRepository userRepository, RoleManager<Role> roleManager,
        SignInManager<User> signInManager, UserManager<User> userManager, IMapper mapper) : ServiceBase<User>(userRepository), IUserService
    {
        public async Task<(User user, IList<string>? rolesNames)> GetByEmailAndPassword(string email, string password)
        {
            var user = await FindUserByEmailAsync(email);

            if (user == null)
                throw new UnauthorizedAccessException("Usuário ou senha inválidos.");

            var result = await signInManager.CheckPasswordSignInAsync(user, password, false);

            if (!result.Succeeded)
                throw new UnauthorizedAccessException("Usuário ou senha inválidos.");

            var rolesNames = await userManager.GetRolesAsync(user);

            return (user, rolesNames);
        }

        public async Task<User> CreateAsync(UserDto dto, string password, ICollection<string> roles)
        {
            var user = mapper.Map<User>(dto);

            user.CreatedAt = DateTimeOffset.UtcNow;
            user.IsActive = true;

            return await AddAsync(user, password, roles);
        }

        public async Task<User> UpdateAsync(Guid id, UserDto dto)
        {
            var existingUser = await base.GetByIdAsync(id)
                ?? throw new KeyNotFoundException("User não encontrado");

            mapper.Map(dto, existingUser);

            await UpdateAsync(existingUser);

            return existingUser;
        }

        private async Task<User> AddAsync(User user, string password, ICollection<string> roles)
        {
            var result = await userManager.CreateAsync(user, password);

            if (!result.Succeeded)
            {
                var exceptions = result.Errors
                    .Select(e => new Exception(e.Description))
                    .ToList();

                throw new AggregateException("Erro ao criar usuário", exceptions);
            }

            await userManager.CreateSecurityTokenAsync(user);

            foreach (var role in roles)
            {
                var roleEntity = await roleManager.FindByIdAsync(role.ToString());

                if (roleEntity == null)
                    continue;

                if (!await userManager.IsInRoleAsync(user, $"{roleEntity.Name}"))
                {
                    await userManager.AddToRoleAsync(user, $"{roleEntity.Name}");
                }
            }

            return user;
        }

        private async Task<User> UpdateAsync(User user)
        {
            var result = await userManager.UpdateAsync(user);

            if (!result.Succeeded)
            {
                var exceptions = result.Errors
                    .Select(e => new Exception(e.Description))
                    .ToList();

                throw new AggregateException("Erro ao atualizar usuário", exceptions);
            }

            return user;
        }

        public async Task<(User user, string token)> GenerateConfirmEmailAsync(string email)
        {
            var user = await FindUserByEmailAsync(email)
                ?? throw new KeyNotFoundException("Usuário não encontrado.");

            if (user!.EmailConfirmed)
                return (user, "");

            var token = await userManager.GenerateEmailConfirmationTokenAsync(user);

            await userManager.ConfirmEmailAsync(user, token);

            return (user, token);
        }

        public async Task<bool> ConfirmEmailAsync(AuthDto authViewModel, string email)
        {
            var user = await FindUserByEmailAsync(email)
                ?? throw new KeyNotFoundException("Usuário não encontrado.");

            var decodedTokenBytes = Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlDecode(authViewModel.Token!);
            var decodedToken = System.Text.Encoding.UTF8.GetString(decodedTokenBytes);

            var result = await userManager.ConfirmEmailAsync(user, decodedToken);

            return result.Succeeded;
        }

        public async Task<(User user, string token)> GenerateForgotPasswordAsync(ForgotPasswordDto forgotPasswordDto)
        {
            var user = await FindUserByEmailAsync(forgotPasswordDto.Email)
                ?? throw new KeyNotFoundException("Usuário não encontrado.");

            var token = await userManager.GeneratePasswordResetTokenAsync(user);

            return (user, token);
        }

        public async Task<bool> ResetPasswordAsync(ResetPasswordDto resetPasswordDto)
        {
            var user = await FindUserByEmailAsync(resetPasswordDto.Email)
            ?? throw new KeyNotFoundException("Usuário não encontrado.");

            var decodedTokenBytes = Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlDecode(resetPasswordDto.Token);
            var decodedToken = System.Text.Encoding.UTF8.GetString(decodedTokenBytes);

            var result = await userManager.ResetPasswordAsync(user, decodedToken, resetPasswordDto.NewPassword);

            return result.Succeeded;
        }

        private async Task<User?> FindUserByEmailAsync(string email)
        {
            if (string.IsNullOrWhiteSpace(email)) return null;
            var normalizedEmail = userManager.NormalizeEmail(email);
            return await userManager.Users
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail && !u.IsDeleted);
        }
    }
}

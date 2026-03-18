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
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
                throw new UnauthorizedAccessException("E-mail e senha são obrigatórios.");

            var user = await FindUserByEmailAsync(email);

            if (user == null)
                throw new UnauthorizedAccessException("Nenhuma conta encontrada com este e-mail.");

            if (!user.IsActive)
                throw new UnauthorizedAccessException("Sua conta está desativada. Entre em contato com o suporte.");

            if (await userManager.IsLockedOutAsync(user))
            {
                var lockoutEnd = await userManager.GetLockoutEndDateAsync(user);
                var remaining = lockoutEnd.HasValue
                    ? (int)Math.Ceiling((lockoutEnd.Value - DateTimeOffset.UtcNow).TotalMinutes)
                    : 0;
                var minuteText = remaining > 1 ? $"{remaining} minutos" : "1 minuto";
                throw new UnauthorizedAccessException($"Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em {minuteText}.");
            }

            var result = await signInManager.CheckPasswordSignInAsync(user, password, lockoutOnFailure: true);

            if (result.IsLockedOut)
                throw new UnauthorizedAccessException("Conta bloqueada após muitas tentativas incorretas. Aguarde alguns minutos e tente novamente.");

            if (result.IsNotAllowed)
                throw new UnauthorizedAccessException("Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.");

            if (!result.Succeeded)
            {
                var attemptsLeft = userManager.Options.Lockout.MaxFailedAccessAttempts
                    - await userManager.GetAccessFailedCountAsync(user);

                var hint = attemptsLeft > 0
                    ? $" ({attemptsLeft} tentativa{(attemptsLeft == 1 ? "" : "s")} restante{(attemptsLeft == 1 ? "" : "s")} antes do bloqueio)"
                    : "";

                throw new UnauthorizedAccessException($"Senha incorreta.{hint}");
            }

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
                ?? throw new KeyNotFoundException("Nenhuma conta encontrada com este e-mail.");

            var decodedTokenBytes = Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlDecode(resetPasswordDto.Token);
            var decodedToken = System.Text.Encoding.UTF8.GetString(decodedTokenBytes);

            var result = await userManager.ResetPasswordAsync(user, decodedToken, resetPasswordDto.NewPassword);

            if (!result.Succeeded)
            {
                var error = result.Errors.FirstOrDefault();
                var message = error?.Code switch
                {
                    "InvalidToken" => "O link de redefinição é inválido ou já expirou. Solicite um novo.",
                    "PasswordTooShort" => $"A senha deve ter pelo menos {userManager.Options.Password.RequiredLength} caracteres.",
                    "PasswordRequiresNonAlphanumeric" => "A senha deve conter pelo menos um caractere especial.",
                    "PasswordRequiresDigit" => "A senha deve conter pelo menos um número.",
                    "PasswordRequiresUpper" => "A senha deve conter pelo menos uma letra maiúscula.",
                    "PasswordRequiresLower" => "A senha deve conter pelo menos uma letra minúscula.",
                    _ => error?.Description ?? "Não foi possível redefinir a senha."
                };
                throw new InvalidOperationException(message);
            }

            return true;
        }

        private async Task<User?> FindUserByEmailAsync(string email)
        {
            if (string.IsNullOrWhiteSpace(email)) return null;
            var normalizedEmail = userManager.NormalizeEmail(email);
            return await userManager.Users
                .Include(u => u.UserTenants)
                    .ThenInclude(ut => ut.Tenant)
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail && !u.IsDeleted);
        }

        public async Task<User?> GetByIdAsync(Guid id)
        {
            return await userRepository.Query()
                .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                .Include(u => u.UserTenants)
                    .ThenInclude(ut => ut.Tenant)
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted);
        }

        public async Task<IList<string>> GetRolesAsync(User user)
        {
            return await userManager.GetRolesAsync(user);
        }
    }
}

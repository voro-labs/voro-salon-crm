using AutoMapper;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using VoroSalonCrm.Application.Constants;
using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Application.DTOs.Auth;
using VoroSalonCrm.Application.DTOs.Identity;
using VoroSalonCrm.Application.Services.Base;
using VoroSalonCrm.Application.Services.Interfaces.Identity;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Entities.Identity;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.Repositories.Identity;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services.Identity
{
    public class UserService(
        IUserRepository userRepository,
        RoleManager<Role> roleManager,
        SignInManager<User> signInManager,
        UserManager<User> userManager,
        IUserExtensionRepository userExtensionRepository,
        IPasswordHistoryRepository passwordHistoryRepository,
        IUnitOfWork unitOfWork,
        IConfiguration configuration,
        IMapper mapper) : ServiceBase<User>(userRepository), IUserService
    {
        private int PasswordExpirationDays =>
            configuration.GetValue<int>("PasswordPolicy:ExpirationDays", 90);

        private int PasswordHistoryCount =>
            configuration.GetValue<int>("PasswordPolicy:HistoryCount", 5);

        // ── Autenticação ─────────────────────────────────────────────────────

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

        // ── Two-Factor Authentication ─────────────────────────────────────────

        public async Task<(string code, string pendingToken)> GenerateTwoFactorCodeAsync(Guid userId)
        {
            var pendingToken = Guid.NewGuid().ToString("N");

            var ext = await userExtensionRepository.GetByIdAsync(false, userId);
            if (ext == null)
            {
                ext = new UserExtension { UserId = userId };
                await userExtensionRepository.AddAsync(ext);
            }

            var user = await userManager.FindByIdAsync(userId.ToString());
            var isReviewer = ReviewerConstants.IsReviewer(user?.Email);

            var code = isReviewer ? ReviewerConstants.TwoFactorCode : Random.Shared.Next(100000, 999999).ToString();

            ext.TwoFactorCode = code;
            ext.TwoFactorCodeExpiry = isReviewer ? DateTime.UtcNow.AddYears(10) : DateTime.UtcNow.AddMinutes(10);
            ext.TwoFactorPendingToken = pendingToken;
            userExtensionRepository.Update(ext);

            await unitOfWork.SaveChangesAsync();

            return (code, pendingToken);
        }

        public async Task<(User user, IList<string> roles)> VerifyTwoFactorAsync(string pendingToken, string code)
        {
            if (string.IsNullOrWhiteSpace(pendingToken) || string.IsNullOrWhiteSpace(code))
                throw new UnauthorizedAccessException("Token e código são obrigatórios.");

            var ext = await userExtensionRepository
                .Query(e => e.TwoFactorPendingToken == pendingToken, asNoTracking: false)
                .FirstOrDefaultAsync();

            if (ext == null)
                throw new UnauthorizedAccessException("Sessão de autenticação não encontrada ou expirada.");

            if (ext.TwoFactorCodeExpiry == null || DateTime.UtcNow > ext.TwoFactorCodeExpiry)
                throw new UnauthorizedAccessException("O código expirou. Faça login novamente para receber um novo código.");

            if (ext.TwoFactorCode != code)
                throw new UnauthorizedAccessException("Código inválido. Verifique o e-mail e tente novamente.");

            var user = await GetByIdAsync(ext.UserId)
                ?? throw new UnauthorizedAccessException("Usuário não encontrado.");

            var isReviewer = ReviewerConstants.IsReviewer(user.Email);

            if (isReviewer)
            {
                // Conta de revisão: preserva o código fixo, apenas limpa o pending token
                ext.TwoFactorPendingToken = null;
            }
            else
            {
                // Invalidar o código após uso bem-sucedido
                ext.TwoFactorCode = null;
                ext.TwoFactorCodeExpiry = null;
                ext.TwoFactorPendingToken = null;
            }

            userExtensionRepository.Update(ext);
            await unitOfWork.SaveChangesAsync();

            var roles = await userManager.GetRolesAsync(user);

            return (user, roles);
        }

        public async Task<string> GenerateEnable2FACodeAsync(Guid userId)
        {
            var user = await userManager.FindByIdAsync(userId.ToString());
            var isReviewer = ReviewerConstants.IsReviewer(user?.Email);
            
            var code = isReviewer ? ReviewerConstants.TwoFactorCode : Random.Shared.Next(100000, 999999).ToString();

            var ext = await userExtensionRepository.GetByIdAsync(false, userId);
            if (ext == null)
            {
                ext = new UserExtension { UserId = userId };
                await userExtensionRepository.AddAsync(ext);
            }

            ext.TwoFactorCode = code;
            ext.TwoFactorCodeExpiry = DateTime.UtcNow.AddMinutes(10);
            userExtensionRepository.Update(ext);
            await unitOfWork.SaveChangesAsync();

            return code;
        }

        public async Task EnableTwoFactorAsync(Guid userId, string code)
        {
            var ext = await userExtensionRepository.GetByIdAsync(false, userId)
                ?? throw new UnauthorizedAccessException("Sessão não encontrada.");

            if (ext.TwoFactorCodeExpiry == null || DateTime.UtcNow > ext.TwoFactorCodeExpiry)
                throw new UnauthorizedAccessException("O código expirou. Solicite um novo código.");

            if (ext.TwoFactorCode != code)
                throw new UnauthorizedAccessException("Código inválido. Verifique o e-mail e tente novamente.");

            var user = await userManager.FindByIdAsync(userId.ToString())
                ?? throw new UnauthorizedAccessException("Usuário não encontrado.");

            await userManager.SetTwoFactorEnabledAsync(user, true);

            ext.TwoFactorCode = null;
            ext.TwoFactorCodeExpiry = null;
            userExtensionRepository.Update(ext);
            await unitOfWork.SaveChangesAsync();
        }

        public async Task DisableTwoFactorAsync(Guid userId)
        {
            var user = await userManager.FindByIdAsync(userId.ToString())
                ?? throw new UnauthorizedAccessException("Usuário não encontrado.");

            await userManager.SetTwoFactorEnabledAsync(user, false);
        }

        // ── Criação de usuário ────────────────────────────────────────────────

        public async Task<User> CreateAsync(UserDto dto, string password, ICollection<string> roles)
        {
            var user = mapper.Map<User>(dto);
            user.CreatedAt = DateTimeOffset.UtcNow;
            user.IsActive = true;

            var created = await AddAsync(user, password, roles);

            // Registrar no histórico de senhas
            await AddToPasswordHistoryAsync(created.Id, created.PasswordHash ?? string.Empty);

            // Marcar data de criação de senha
            var ext = await userExtensionRepository.GetByIdAsync(false, created.Id);
            if (ext != null)
            {
                ext.PasswordChangedAt = DateTime.UtcNow;
                userExtensionRepository.Update(ext);
                await unitOfWork.SaveChangesAsync();
            }

            return created;
        }

        public async Task<User> UpdateAsync(Guid id, UserDto dto)
        {
            var existingUser = await base.GetByIdAsync(false, id)
                ?? throw new KeyNotFoundException("User não encontrado");

            mapper.Map(dto, existingUser);
            await UpdateAsync(existingUser);

            return existingUser;
        }

        // ── Confirmação de e-mail ─────────────────────────────────────────────

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

        // ── Recuperação de senha ──────────────────────────────────────────────

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

            if (ReviewerConstants.IsReviewer(user.Email))
                return true;

            // Verificar histórico de senhas antes de alterar
            await EnsurePasswordNotReusedAsync(user, resetPasswordDto.NewPassword);

            var decodedTokenBytes = Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlDecode(resetPasswordDto.Token);
            var decodedToken = System.Text.Encoding.UTF8.GetString(decodedTokenBytes);

            var result = await userManager.ResetPasswordAsync(user, decodedToken, resetPasswordDto.NewPassword);

            if (!result.Succeeded)
            {
                var error = result.Errors.FirstOrDefault();
                var message = error?.Code switch
                {
                    "InvalidToken"                    => "O link de redefinição é inválido ou já expirou. Solicite um novo.",
                    "PasswordTooShort"                => $"A senha deve ter pelo menos {userManager.Options.Password.RequiredLength} caracteres.",
                    "PasswordRequiresNonAlphanumeric" => "A senha deve conter pelo menos um caractere especial.",
                    "PasswordRequiresDigit"           => "A senha deve conter pelo menos um número.",
                    "PasswordRequiresUpper"           => "A senha deve conter pelo menos uma letra maiúscula.",
                    "PasswordRequiresLower"           => "A senha deve conter pelo menos uma letra minúscula.",
                    _                                 => error?.Description ?? "Não foi possível redefinir a senha."
                };
                throw new InvalidOperationException(message);
            }

            // user.PasswordHash já foi atualizado pelo ResetPasswordAsync em memória
            await AddToPasswordHistoryAsync(user.Id, user.PasswordHash ?? string.Empty);

            var ext = await userExtensionRepository.GetByIdAsync(false, user.Id);
            if (ext != null)
            {
                ext.PasswordChangedAt = DateTime.UtcNow;
                userExtensionRepository.Update(ext);
                await unitOfWork.SaveChangesAsync();
            }

            return true;
        }

        // ── Roles ─────────────────────────────────────────────────────────────

        public async Task<IList<string>> GetRolesAsync(User user)
        {
            return await userManager.GetRolesAsync(user);
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

        // ── Troca de senha autenticada ────────────────────────────────────────

        public async Task ChangePasswordAsync(Guid userId, string newPassword)
        {
            var userById = await GetByIdAsync(userId)
                ?? throw new KeyNotFoundException("Usuário não encontrado.");

            if (ReviewerConstants.IsReviewer(userById.Email))
                return;

            var user = await userManager.FindByEmailAsync($"{userById.Email}")
                ?? throw new KeyNotFoundException("Usuário não encontrado.");

            await EnsurePasswordNotReusedAsync(user, newPassword);

            var token = await userManager.GeneratePasswordResetTokenAsync(user);
            var result = await userManager.ResetPasswordAsync(user, token, newPassword);

            if (!result.Succeeded)
            {
                var error = result.Errors.FirstOrDefault();
                throw new InvalidOperationException(error?.Description ?? "Não foi possível alterar a senha.");
            }

            // ResetPasswordAsync atualiza user.PasswordHash no objeto em memória
            await AddToPasswordHistoryAsync(user.Id, user.PasswordHash ?? string.Empty);

            var ext = await userExtensionRepository.GetByIdAsync(false, userId);
            if (ext != null)
            {
                ext.PasswordChangedAt = DateTime.UtcNow;
                ext.MustChangePassword = false;
                userExtensionRepository.Update(ext);
                await unitOfWork.SaveChangesAsync();
            }
        }

        // ── Aceite de termos ──────────────────────────────────────────────────

        public async Task AcceptTermsAsync(Guid userId)
        {
            var ext = await userExtensionRepository.GetByIdAsync(false, userId);
            if (ext == null)
            {
                ext = new UserExtension { UserId = userId };
                await userExtensionRepository.AddAsync(ext);
            }

            ext.TermsAcceptedAt = DateTime.UtcNow;
            userExtensionRepository.Update(ext);
            await unitOfWork.SaveChangesAsync();
        }

        // ── Completar perfil ──────────────────────────────────────────────────

        public async Task<User?> FindByEmailAsync(string email)
            => await FindUserByEmailAsync(email);

        public async Task CompleteProfileAsync(Guid userId, CompleteProfileDto dto)
        {
            var userById = await GetByIdAsync(userId)
                ?? throw new KeyNotFoundException("Usuário não encontrado.");

            var user = await userManager.FindByEmailAsync($"{userById.Email}")
                ?? throw new KeyNotFoundException("Usuário não encontrado.");

            if (!string.IsNullOrWhiteSpace(dto.PhoneNumber))
                user.PhoneNumber = dto.PhoneNumber;

            if (!string.IsNullOrWhiteSpace(dto.CountryCode))
                user.CountryCode = dto.CountryCode;

            if (dto.BirthDate.HasValue)
                user.BirthDate = dto.BirthDate.Value.ToUniversalTime();

            await userManager.UpdateAsync(user);

            var ext = await userExtensionRepository.GetByIdAsync(false, userId);
            if (ext == null)
            {
                ext = new UserExtension { UserId = userId };
                await userExtensionRepository.AddAsync(ext);
            }

            ext.ProfileCompletedAt = DateTime.UtcNow;
            userExtensionRepository.Update(ext);
            await unitOfWork.SaveChangesAsync();
        }

        // ── Helpers privados ──────────────────────────────────────────────────

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

        private async Task AddToPasswordHistoryAsync(Guid userId, string passwordHash)
        {
            if (string.IsNullOrWhiteSpace(passwordHash)) return;

            await passwordHistoryRepository.AddAsync(new PasswordHistory
            {
                UserId = userId,
                PasswordHash = passwordHash,
                CreatedAt = DateTime.UtcNow
            });

            // Manter apenas os últimos N registros
            var history = await passwordHistoryRepository
                .Query(h => h.UserId == userId)
                .OrderByDescending(h => h.CreatedAt)
                .ToListAsync();

            if (history.Count > PasswordHistoryCount)
            {
                var toDelete = history.Skip(PasswordHistoryCount).ToList();
                passwordHistoryRepository.DeleteRange(toDelete);
            }

            await unitOfWork.SaveChangesAsync();
        }

        private async Task EnsurePasswordNotReusedAsync(User user, string newPassword)
        {
            var history = await passwordHistoryRepository
                .Query(h => h.UserId == user.Id)
                .OrderByDescending(h => h.CreatedAt)
                .Take(PasswordHistoryCount)
                .ToListAsync();

            var hasher = new PasswordHasher<User>();
            foreach (var entry in history)
            {
                var verifyResult = hasher.VerifyHashedPassword(user, entry.PasswordHash, newPassword);
                if (verifyResult != PasswordVerificationResult.Failed)
                    throw new InvalidOperationException(
                        $"Esta senha foi usada recentemente. Escolha uma senha diferente (últimas {PasswordHistoryCount} senhas não podem ser reutilizadas).");
            }
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
                if (roleEntity == null) continue;
                if (!await userManager.IsInRoleAsync(user, $"{roleEntity.Name}"))
                    await userManager.AddToRoleAsync(user, $"{roleEntity.Name}");
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
    }
}

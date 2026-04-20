using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using AutoMapper;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using VoroSalonCrm.Application.Constants;
using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Application.DTOs.Auth;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.DTOs.Identity;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Identity;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Entities.Identity;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Shared.Constants;
using VoroSalonCrm.Shared.Structs;
using VoroSalonCrm.Shared.Utils;

namespace VoroSalonCrm.Application.Services
{
    public class AuthService(IOptions<CookieUtil> cookieUtil, IConfiguration configuration,
        IMapper mapper, INotificationService notificationService, IUserService userService,
        ICurrentUserService currentUserService, Domain.Interfaces.Repositories.IUserExtensionRepository userExtensionRepository,
        Domain.Interfaces.UnitOfWork.IUnitOfWork unitOfWork,
        ITenantRepository tenantRepository, IUserTenantRepository userTenantRepository,
        UserManager<User> userManager, IDemoResetService demoResetService,
        ITenantBusinessHoursRepository tenantBusinessHoursRepository) : IAuthService
    {
        private readonly INotificationService _notificationService = notificationService;
        private readonly CookieUtil _cookieUtil = cookieUtil.Value;
        private readonly IUserService _userService = userService;
        private readonly ICurrentUserService _currentUser = currentUserService;
        private readonly Domain.Interfaces.Repositories.IUserExtensionRepository _userExtensionRepository = userExtensionRepository;
        private readonly Domain.Interfaces.UnitOfWork.IUnitOfWork _unitOfWork = unitOfWork;
        private readonly ITenantRepository _tenantRepository = tenantRepository;
        private readonly IUserTenantRepository _userTenantRepository = userTenantRepository;
        private readonly UserManager<User> _userManager = userManager;
        private readonly IDemoResetService _demoResetService = demoResetService;
        private readonly ITenantBusinessHoursRepository _businessHoursRepository = tenantBusinessHoursRepository;

        public async Task<AuthDto> SignInAsync(SignInDto signInDto)
        {
            var (user, rolesNames) = await _userService.GetByEmailAndPassword(signInDto.Email, signInDto.Password);

            if (user.TwoFactorEnabled)
            {
                // Gerar código 2FA
                var (code, pendingToken) = await _userService.GenerateTwoFactorCodeAsync(user.Id);

                var userName = !string.IsNullOrEmpty(user.FirstName)
                    ? $"{user.FirstName} {user.LastName}".Trim()
                    : user.UserName ?? string.Empty;

                var primaryTenant = user.UserTenants?.FirstOrDefault(ut => ut.IsDefault)?.Tenant
                                 ?? user.UserTenants?.FirstOrDefault()?.Tenant;

                // Validar tipo de estabelecimento antes de enviar o 2FA
                if (signInDto.EstablishmentType.HasValue && primaryTenant != null &&
                    (int)primaryTenant.EstablishmentType != signInDto.EstablishmentType.Value)
                {
                    throw new UnauthorizedAccessException(
                        "Credenciais inválidas para este endereço de acesso.");
                }

                // Enviar apenas para método de comunicação confirmado
                if (user.EmailConfirmed)
                {
                    var isReviewer = ReviewerConstants.IsReviewer(user.Email);
                    
                    if (!isReviewer)
                        await _notificationService.SendTwoFactorCodeAsync(user.Email!, userName, code, primaryTenant);
                }
                // Futuramente: else if (user.PhoneNumberConfirmed) → enviar via SMS
                else
                {
                    throw new UnauthorizedAccessException(
                        "É necessário confirmar seu e-mail para fazer login. Verifique sua caixa de entrada.");
                }

                return new AuthDto
                {
                    TwoFactorEnabled = true,
                    RequiresTwoFactor = true,
                    TwoFactorPendingToken = pendingToken
                };
            }

            // 2FA desabilitado: login direto
            return await GenerateAuthDtoAsync(user, rolesNames);
        }

        public async Task<AuthDto> VerifyTwoFactorAsync(VerifyTwoFactorDto dto)
        {
            var (user, roles) = await _userService.VerifyTwoFactorAsync(dto.PendingToken, dto.Code);

            var isReviewer = ReviewerConstants.IsReviewer(user.Email);
            if (isReviewer)
            {
                var ext = await _userExtensionRepository
                    .Query(e => e.UserId == user.Id)
                    .FirstOrDefaultAsync();

                var resetCooldownHours = 2;
                var shouldReset = ext?.LastDemoResetAt == null ||
                    (DateTime.UtcNow - ext.LastDemoResetAt.Value).TotalHours >= resetCooldownHours;

                if (shouldReset)
                {
                    await _demoResetService.ResetAsync();

                    if (ext != null)
                    {
                        ext.LastDemoResetAt = DateTime.UtcNow;
                        _userExtensionRepository.Update(ext);
                        await _unitOfWork.SaveChangesAsync();
                    }
                }
            }

            return await GenerateAuthDtoAsync(user, roles);
        }

        public async Task<AuthDto> SignUpAsync(SignUpDto signUpDto, List<string> roles)
        {
            var userDto = mapper.Map<UserDto>(signUpDto);

            var user = await _userService.CreateAsync(userDto, signUpDto.Password, roles);

            var userName = string.IsNullOrEmpty(user.UserName) ? $"{user.FirstName}.{user.LastName}".ToLower() : $"{user.UserName}";
            var primaryTenant = user.UserTenants?.FirstOrDefault(ut => ut.IsDefault)?.Tenant
                             ?? user.UserTenants?.FirstOrDefault()?.Tenant;

            await _notificationService.SendWelcomeAsync($"{user.Email}", userName, primaryTenant);

            return await GenerateAuthDtoAsync(user, roles);
        }

        public async Task ConfirmEmailAsync(string email)
        {
            var (user, token) = await _userService.GenerateConfirmEmailAsync(email);

            var userName = string.IsNullOrEmpty(user.UserName) ? $"{user.FirstName}.{user.LastName}".ToLower() : $"{user.UserName}";
            var primaryTenant = user.UserTenants?.FirstOrDefault(ut => ut.IsDefault)?.Tenant
                             ?? user.UserTenants?.FirstOrDefault()?.Tenant;

            await _notificationService.SendConfirmEmailAsync($"{user.Email}", userName, WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token)), primaryTenant);
        }

        public async Task<bool> ConfirmEmailAsync(AuthDto authViewModel, string email)
        {
            var confirmed = await _userService.ConfirmEmailAsync(authViewModel, email);

            return confirmed;
        }

        public async Task ForgotPasswordAsync(ForgotPasswordDto forgotPasswordDto)
        {
            var (user, token) = await _userService.GenerateForgotPasswordAsync(forgotPasswordDto);

            var userName = !string.IsNullOrEmpty(user.FirstName) ? $"{user.FirstName} {user.LastName}" : $"{user.UserName}";

            var primaryTenant = user.UserTenants?.FirstOrDefault(ut => ut.IsDefault)?.Tenant
                             ?? user.UserTenants?.FirstOrDefault()?.Tenant;

            await _notificationService.SendResetLinkAsync($"{user.Email}", userName, WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token)), primaryTenant, forgotPasswordDto.RedirectUri);
        }

        public async Task<bool> ResetPasswordAsync(ResetPasswordDto resetPasswordDto)
        {
            var reseted = await _userService.ResetPasswordAsync(resetPasswordDto);

            return reseted;
        }

        public async Task ChangePasswordAsync(Guid userId, string newPassword)
            => await _userService.ChangePasswordAsync(userId, newPassword);

        public async Task AcceptTermsAsync(Guid userId)
            => await _userService.AcceptTermsAsync(userId);

        public async Task CompleteProfileAsync(Guid userId, CompleteProfileDto dto)
        {
            await _userService.CompleteProfileAsync(userId, dto);

            if (!string.IsNullOrWhiteSpace(dto.PhoneNumber))
            {
                var user = await _userService.GetByIdAsync(userId);
                var tenantId = user?.UserTenants?.FirstOrDefault(ut => ut.IsDefault)?.TenantId
                            ?? user?.UserTenants?.FirstOrDefault()?.TenantId;

                if (tenantId.HasValue)
                {
                    var tenant = await _tenantRepository.GetByIdAsync(false, tenantId.Value);
                    if (tenant != null)
                    {
                        tenant.ContactPhone = dto.PhoneNumber;
                        _tenantRepository.Update(tenant);
                        await _unitOfWork.SaveChangesAsync();
                    }
                }
            }
        }

        public async Task<Guid> ProvisionAccountFromSubscriptionAsync(string email, string contactName, string salonName, Domain.Enums.EstablishmentType? establishmentType = null)
        {
            // Separar nome
            var nameParts = (contactName ?? email).Trim().Split(' ', 2);
            var firstName = nameParts[0];
            var lastName = nameParts.Length > 1 ? nameParts[1] : string.Empty;

            // Gerar slug único para o tenant
            var slug = await GenerateUniqueSlugAsync(salonName ?? firstName);

            // Criar Tenant
            var tenant = new Tenant
            {
                Id = Guid.NewGuid(),
                Name = salonName ?? $"Salão de {firstName}",
                Slug = slug,
                ContactEmail = email,
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow,
                EstablishmentType = establishmentType ?? Domain.Enums.EstablishmentType.Salon,
            };
            await _tenantRepository.AddAsync(tenant);

            // Gerar senha temporária
            var tempPassword = GenerateTempPassword();

            // Verificar se usuário já existe
            var existingUser = await _userService.FindByEmailAsync(email);

            if (existingUser == null)
            {
                var userDto = new UserDto
                {
                    Email = email,
                    UserName = slug,
                    FirstName = firstName,
                    LastName = lastName,
                    IsActive = true
                };
                
                var user = await _userService.CreateAsync(userDto, tempPassword, [RoleConstant.SalonOwner]);

                // Confirmar e-mail automaticamente
                var confirmToken = await _userManager.GenerateEmailConfirmationTokenAsync(user);
                await _userManager.ConfirmEmailAsync(user, confirmToken);

                // Vincular usuário ao tenant
                await _userTenantRepository.AddAsync(new UserTenant
                {
                    UserId = user.Id,
                    TenantId = tenant.Id,
                    IsDefault = true,
                    CreatedAt = DateTimeOffset.UtcNow
                });

                // Configurar extensão: MustChangePassword + IsAutoProvisioned
                var ext = await _userExtensionRepository.GetByIdAsync(false, user.Id);
                if (ext == null)
                {
                    await _userExtensionRepository.AddAsync(new UserExtension
                    {
                        UserId = user.Id,
                        MustChangePassword = true,
                        IsAutoProvisioned = true,
                        PasswordChangedAt = DateTime.UtcNow,
                    });
                }
                else
                {
                    ext.MustChangePassword = true;
                    ext.IsAutoProvisioned = true;
                    ext.PasswordChangedAt = DateTime.UtcNow;
                    _userExtensionRepository.Update(ext);
                }
            }
            else
            {
                // Usuário existe: vincular ao novo tenant se ainda não estiver
                var alreadyLinked = existingUser.UserTenants?.Any(ut => ut.TenantId == tenant.Id) == true;
                if (!alreadyLinked)
                {
                    await _userTenantRepository.AddAsync(new UserTenant
                    {
                        UserId = existingUser.Id,
                        TenantId = tenant.Id,
                        IsDefault = false,
                        CreatedAt = DateTimeOffset.UtcNow
                    });
                }
            }

            await _unitOfWork.SaveChangesAsync();

            // Seed horários de funcionamento padrão (seg–sex 08:00–12:00 e 13:00–18:00)
            await SeedDefaultBusinessHoursAsync(tenant.Id);

            // Enviar e-mail com a senha temporária
            var loginUrl = $"{configuration.GetSection("CorsSettings").GetSection("AllowedOrigins").Get<string[]>()?[0]}/sign-in";
            try
            {
                await _notificationService.SendAccountCreatedAsync(email, firstName, tempPassword, loginUrl, tenant);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WARN] Falha ao enviar e-mail de conta criada para {email}: {ex.Message}");
            }

            return tenant.Id;
        }

        // ── Helpers de provisionamento ────────────────────────────────────────

        private async Task SeedDefaultBusinessHoursAsync(Guid tenantId)
        {
            // Seg–Sex: aberto (08:00–12:00 e 13:00–18:00) | Sáb–Dom: fechado
            for (int dow = 0; dow <= 6; dow++)
            {
                var isOpen = dow >= 1 && dow <= 5;
                var hours = new TenantBusinessHours
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    DayOfWeek = dow,
                    IsOpen = isOpen,
                };
                await _businessHoursRepository.AddAsync(hours);
                await _unitOfWork.SaveChangesAsync();

                if (isOpen)
                {
                    await _businessHoursRepository.AddRangesAsync(
                    [
                        new TenantBusinessHoursRange { Id = Guid.NewGuid(), BusinessHoursId = hours.Id, OpenTime = "08:00", CloseTime = "12:00", SortOrder = 0 },
                        new TenantBusinessHoursRange { Id = Guid.NewGuid(), BusinessHoursId = hours.Id, OpenTime = "13:00", CloseTime = "18:00", SortOrder = 1 },
                    ]);
                    await _unitOfWork.SaveChangesAsync();
                }
            }
        }

        private static string GenerateTempPassword()
        {
            const string upper   = "ABCDEFGHJKMNPQRSTUVWXYZ";
            const string lower   = "abcdefghjkmnpqrstuvwxyz";
            const string digits  = "23456789";
            const string special = "!@#$";
            const string all     = upper + lower + digits + special;

            using var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
            char Pick(string src)
            {
                var buf = new byte[4];
                rng.GetBytes(buf);
                return src[(int)(BitConverter.ToUInt32(buf, 0) % (uint)src.Length)];
            }

            // Garante pelo menos um de cada categoria exigida pelo Identity
            var password = new[]
            {
                Pick(upper), Pick(lower), Pick(digits), Pick(special),
                Pick(all), Pick(all), Pick(all), Pick(all), Pick(all), Pick(all), Pick(all), Pick(all),
            };

            // Fisher-Yates shuffle
            for (int i = password.Length - 1; i > 0; i--)
            {
                var buf = new byte[4];
                rng.GetBytes(buf);
                int j = (int)(BitConverter.ToUInt32(buf, 0) % (uint)(i + 1));
                (password[i], password[j]) = (password[j], password[i]);
            }

            return new string(password);
        }

        private static string RemoveDiacritics(string text)
        {
            var normalized = text.Normalize(System.Text.NormalizationForm.FormD);
            var sb = new System.Text.StringBuilder();
            foreach (var c in normalized)
            {
                if (System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c) != System.Globalization.UnicodeCategory.NonSpacingMark)
                    sb.Append(c);
            }
            return sb.ToString().Normalize(System.Text.NormalizationForm.FormC);
        }

        private async Task<string> GenerateUniqueSlugAsync(string name)
        {
            var baseSlug = Regex.Replace(RemoveDiacritics(name).ToLowerInvariant().Trim(), @"[^a-z0-9]+", "-").Trim('-');
            baseSlug = string.IsNullOrEmpty(baseSlug) ? "salon" : baseSlug;

            var slug = baseSlug;
            var counter = 1;
            while (await _tenantRepository.GetBySlugAsync(slug) != null)
            {
                slug = $"{baseSlug}-{counter++}";
            }

            return slug;
        }

        public async Task RequestEnable2FAAsync(Guid userId)
        {
            var user = await _userService.GetByIdAsync(userId)
                ?? throw new UnauthorizedAccessException("Usuário não encontrado.");

            if (!user.EmailConfirmed)
                throw new InvalidOperationException("É necessário confirmar seu e-mail para ativar o 2FA.");

            var code = await _userService.GenerateEnable2FACodeAsync(userId);

            var userName = !string.IsNullOrEmpty(user.FirstName)
                ? $"{user.FirstName} {user.LastName}".Trim()
                : user.UserName ?? string.Empty;

            var primaryTenant = user.UserTenants?.FirstOrDefault(ut => ut.IsDefault)?.Tenant
                             ?? user.UserTenants?.FirstOrDefault()?.Tenant;

            var isReviewer = ReviewerConstants.IsReviewer(user.Email);
            
            if (!isReviewer)
                await _notificationService.SendTwoFactorCodeAsync(user.Email!, userName, code, primaryTenant);
        }

        public async Task ConfirmEnable2FAAsync(Guid userId, string code)
        {
            await _userService.EnableTwoFactorAsync(userId, code);
        }

        public async Task Disable2FAAsync(Guid userId)
        {
            await _userService.DisableTwoFactorAsync(userId);
        }

        public async Task<AuthDto> SwitchTenantAsync(Guid tenantId)
        {
            var userId = _currentUser.UserId;
            Console.WriteLine($"[DEBUG] SwitchTenantAsync: UserId={userId}, TargetTenantId={tenantId}");

            var user = await _userService.GetByIdAsync(userId)
                ?? throw new UnauthorizedAccessException("Usuário não encontrado.");

            Console.WriteLine($"[DEBUG] User found: {user.Email}. UserTenants count: {user.UserTenants?.Count ?? 0}");

            if (user.UserTenants != null)
            {
                foreach (var ut in user.UserTenants)
                {
                    Console.WriteLine($"[DEBUG] User belongs to Tenant: {ut.TenantId}");
                }
            }

            // Verificar se o usuário pertence ao tenant
            var userTenant = user.UserTenants?.FirstOrDefault(ut => ut.TenantId == tenantId)
                ?? throw new UnauthorizedAccessException("Usuário não tem acesso a este salão.");

            var roles = await _userService.GetRolesAsync(user);

            return await GenerateAuthDtoAsync(user, roles, tenantId);
        }

        private static List<Claim> GenerateClaims(User user, IList<string>? rolesNames, Guid? targetTenantId = null)
        {
            var primaryTenantId = targetTenantId
                                ?? user.UserTenants?.FirstOrDefault(ut => ut.IsDefault)?.TenantId
                                ?? user.UserTenants?.FirstOrDefault()?.TenantId
                                ?? Guid.Empty;

            List<Claim> claims =
            [
                new Claim(ClaimTypes.NameIdentifier, $"{user.Id}"),
                new Claim(CustomClaimTypes.UserName, user.UserName!),
                new Claim(CustomClaimTypes.FirstName, user.FirstName!),
                new Claim(CustomClaimTypes.LastName, user.LastName!),
                new Claim(CustomClaimTypes.UserId, $"{user.Id}"),
                new Claim(CustomClaimTypes.Roles, string.Join(",", rolesNames ?? [])),
                new Claim(JwtRegisteredClaimNames.Email, user.Email!),
                new Claim(JwtRegisteredClaimNames.Jti, $"{Guid.NewGuid()}"),
                new Claim(JwtRegisteredClaimNames.UniqueName, user.UserName!),
                new Claim(JwtRegisteredClaimNames.Name, $"{user.FirstName!} {user.LastName!}"),
                new Claim(JwtRegisteredClaimNames.EmailVerified, $"{user.EmailConfirmed}"),
                new Claim("TenantId", $"{primaryTenantId}"),
                new Claim(CustomClaimTypes.TwoFactorEnabled, $"{user.TwoFactorEnabled}"),
            ];

            if (rolesNames != null && rolesNames!.Any())
            {
                foreach (var roleName in rolesNames)
                {
                    claims.Add(new Claim(ClaimTypes.Role, $"{roleName}"));
                }
            }

            return claims;
        }

        public async Task<AuthDto> RefreshTokenAsync(DTOs.Auth.RefreshTokenDto model)
        {
            User? user;
            Guid? currentTenantId = null;

            if (!string.IsNullOrWhiteSpace(model.Token))
            {
                // Caminho normal: extrai userId e tenantId do JWT expirado
                var principal = GetPrincipalFromExpiredToken(model.Token, configuration.Get<ConfigUtil>()?.JwtKey!);
                if (principal == null)
                    throw new UnauthorizedAccessException("Invalid access token or refresh token");

                var userIdClaim = principal.Claims.FirstOrDefault(c => c.Type == CustomClaimTypes.UserId)
                    ?? principal.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);

                if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out Guid userId))
                    throw new UnauthorizedAccessException("Invalid token claims.");

                var userExtension = await _userExtensionRepository.GetByIdAsync(false, userId);
                if (userExtension == null || userExtension.RefreshToken != model.RefreshToken || userExtension.RefreshTokenExpiryTime <= DateTime.UtcNow)
                    throw new UnauthorizedAccessException("Invalid refresh token.");

                user = await _userService.GetByIdAsync(userId);
                if (user == null)
                    throw new UnauthorizedAccessException("User not found.");

                // Preservar o tenant que o usuário estava usando no token expirado
                var tenantIdClaim = principal.Claims.FirstOrDefault(c => c.Type == "TenantId");
                if (tenantIdClaim != null && Guid.TryParse(tenantIdClaim.Value, out Guid tenantId))
                    currentTenantId = tenantId;
            }
            else
            {
                // Caminho alternativo: sem JWT, busca usuário pelo próprio refresh token
                if (string.IsNullOrWhiteSpace(model.RefreshToken))
                    throw new UnauthorizedAccessException("Refresh token é obrigatório.");

                var userExtension = await _userExtensionRepository
                    .Query(e => e.RefreshToken == model.RefreshToken)
                    .FirstOrDefaultAsync();

                if (userExtension == null || userExtension.RefreshTokenExpiryTime <= DateTime.UtcNow)
                    throw new UnauthorizedAccessException("Invalid refresh token.");

                user = await _userService.GetByIdAsync(userExtension.UserId);
                if (user == null)
                    throw new UnauthorizedAccessException("User not found.");
            }

            var roles = await _userService.GetRolesAsync(user);
            return await GenerateAuthDtoAsync(user, roles, currentTenantId);
        }

        private ClaimsPrincipal? GetPrincipalFromExpiredToken(string token, string key)
        {
            var tokenValidationParameters = new TokenValidationParameters
            {
                ValidateAudience = false,
                ValidateIssuer = false,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
                ValidateLifetime = false // We ignore expiration here
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var principal = tokenHandler.ValidateToken(token, tokenValidationParameters, out SecurityToken securityToken);
            var jwtSecurityToken = securityToken as JwtSecurityToken;

            if (jwtSecurityToken == null || !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
                throw new SecurityTokenException("Invalid token");

            return principal;
        }

        private async Task<AuthDto> GenerateAuthDtoAsync(User user, IList<string>? rolesNames, Guid? targetTenantId = null)
        {
            // Verificar flags pós-login (senha expirada, troca obrigatória, termos)
            var userExt = await _userExtensionRepository.GetByIdAsync(false, user.Id);

            // Se não foi passado um tenant específico (login normal), tenta usar o último conectado
            Guid? resolvedTenantId = targetTenantId;
            if (resolvedTenantId == null && userExt?.LastConnectedTenantId != null)
            {
                var lastTenant = userExt.LastConnectedTenantId.Value;
                var belongsToLastTenant = user.UserTenants?.Any(ut => ut.TenantId == lastTenant) == true;
                if (belongsToLastTenant)
                    resolvedTenantId = lastTenant;
            }

            var primaryTenantId = resolvedTenantId
                                ?? user.UserTenants?.FirstOrDefault(ut => ut.IsDefault)?.TenantId
                                ?? user.UserTenants?.FirstOrDefault()?.TenantId
                                ?? Guid.Empty;
            var requiresPasswordChange = false;
            var requiresTermsAcceptance = false;
            var requiresProfileCompletion = false;

            if (userExt != null)
            {
                requiresPasswordChange = userExt.MustChangePassword;

                if (!requiresPasswordChange)
                {
                    var expirationDays = configuration.GetValue<int>("PasswordPolicy:ExpirationDays", 90);
                    if (expirationDays > 0 && userExt.PasswordChangedAt.HasValue)
                    {
                        var expiredAt = userExt.PasswordChangedAt.Value.AddDays(expirationDays);
                        if (DateTime.UtcNow > expiredAt)
                            requiresPasswordChange = true;
                    }
                }

                requiresTermsAcceptance = !userExt.TermsAcceptedAt.HasValue;
                requiresProfileCompletion = userExt.IsAutoProvisioned && !userExt.ProfileCompletedAt.HasValue;
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration.Get<ConfigUtil>()?.JwtKey!));

            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var expiration = DateTime.UtcNow.AddMinutes(15);

            var token = new JwtSecurityToken(
                issuer: _cookieUtil.Issuer,
                audience: _cookieUtil.Audience,
                claims: GenerateClaims(user, rolesNames, primaryTenantId),
                expires: expiration,
                signingCredentials: credentials
            );

            var jwt = new JwtSecurityTokenHandler().WriteToken(token);

            var refreshToken = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(64));

            var userExtension = await _userExtensionRepository.GetByIdAsync(false, user.Id);
            if (userExtension == null)
            {
                userExtension = new UserExtension
                {
                    UserId = user.Id,
                    RefreshToken = refreshToken,
                    RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7),
                    LastConnectedTenantId = primaryTenantId != Guid.Empty ? primaryTenantId : null
                };
                await _userExtensionRepository.AddAsync(userExtension);
            }
            else
            {
                userExtension.RefreshToken = refreshToken;
                userExtension.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
                userExtension.LastConnectedTenantId = primaryTenantId != Guid.Empty ? primaryTenantId : null;
                _userExtensionRepository.Update(userExtension);
            }
            await _unitOfWork.SaveChangesAsync();

            var tenants = user.UserTenants?.Select(ut => new TenantDto
            {
                Id = ut.TenantId,
                Name = ut.Tenant?.Name ?? "Salon",
                Slug = ut.Tenant?.Slug ?? "",
                LogoUrl = ut.Tenant?.LogoUrl
            }).ToList() ?? [];

            return new AuthDto()
            {
                Expiration = expiration,
                UserId = $"{user.Id}",
                TenantId = $"{primaryTenantId}",
                Tenants = tenants,
                UserName = $"{user.UserName}".ToLower(),
                Email = $"{user.Email}".ToLower(),
                FirstName = $"{user.FirstName}".ToLower(),
                LastName = $"{user.LastName}".ToLower(),
                Token = jwt,
                RefreshToken = refreshToken,
                TwoFactorEnabled = user.TwoFactorEnabled,
                RequiresPasswordChange = requiresPasswordChange,
                RequiresTermsAcceptance = requiresTermsAcceptance,
                RequiresProfileCompletion = requiresProfileCompletion
            };
        }
    }
}

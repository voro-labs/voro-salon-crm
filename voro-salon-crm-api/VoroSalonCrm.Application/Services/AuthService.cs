using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AutoMapper;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.DTOs.Identity;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Identity;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Entities.Identity;
using VoroSalonCrm.Shared.Structs;
using VoroSalonCrm.Shared.Utils;

namespace VoroSalonCrm.Application.Services
{
    public class AuthService(IOptions<CookieUtil> cookieUtil, IConfiguration configuration,
        IMapper mapper, INotificationService notificationService, IUserService userService,
        ICurrentUserService currentUserService, Domain.Interfaces.Repositories.IUserExtensionRepository userExtensionRepository,
        Domain.Interfaces.UnitOfWork.IUnitOfWork unitOfWork) : IAuthService
    {
        private readonly INotificationService _notificationService = notificationService;
        private readonly CookieUtil _cookieUtil = cookieUtil.Value;
        private readonly IUserService _userService = userService;
        private readonly ICurrentUserService _currentUser = currentUserService;
        private readonly Domain.Interfaces.Repositories.IUserExtensionRepository _userExtensionRepository = userExtensionRepository;
        private readonly Domain.Interfaces.UnitOfWork.IUnitOfWork _unitOfWork = unitOfWork;

        public async Task<AuthDto> SignInAsync(SignInDto signInDto)
        {
            var (user, rolesNames) = await _userService.GetByEmailAndPassword(signInDto.Email, signInDto.Password);

            return await GenerateAuthDtoAsync(user, rolesNames);
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

            await _notificationService.SendConfirmEmailAsync($"{user.Email}", userName, Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlEncode(System.Text.Encoding.UTF8.GetBytes(token)), primaryTenant);
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

            await _notificationService.SendResetLinkAsync($"{user.Email}", userName, Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlEncode(System.Text.Encoding.UTF8.GetBytes(token)), primaryTenant, forgotPasswordDto.RedirectUri);
        }

        public async Task<bool> ResetPasswordAsync(ResetPasswordDto resetPasswordDto)
        {
            var reseted = await _userService.ResetPasswordAsync(resetPasswordDto);

            return reseted;
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
            var principal = GetPrincipalFromExpiredToken(model.Token, configuration.Get<ConfigUtil>()?.JwtKey!);
            if (principal == null)
                throw new UnauthorizedAccessException("Invalid access token or refresh token");

            var userIdClaim = principal.Claims.FirstOrDefault(c => c.Type == CustomClaimTypes.UserId) 
                ?? principal.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
                
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out Guid userId))
                throw new UnauthorizedAccessException("Invalid token claims.");

            var user = await _userService.GetByIdAsync(userId);
            if (user == null)
                throw new UnauthorizedAccessException("User not found.");

            var userExtension = await _userExtensionRepository.GetByIdAsync(userId);
            if (userExtension == null || userExtension.RefreshToken != model.RefreshToken || userExtension.RefreshTokenExpiryTime <= DateTime.UtcNow)
                throw new UnauthorizedAccessException("Invalid refresh token.");

            var roles = await _userService.GetRolesAsync(user);
            return await GenerateAuthDtoAsync(user, roles);
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
            var primaryTenantId = targetTenantId
                                ?? user.UserTenants?.FirstOrDefault(ut => ut.IsDefault)?.TenantId
                                ?? user.UserTenants?.FirstOrDefault()?.TenantId
                                ?? Guid.Empty;

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

            var userExtension = await _userExtensionRepository.GetByIdAsync(user.Id);
            if (userExtension == null)
            {
                userExtension = new UserExtension
                {
                    UserId = user.Id,
                    RefreshToken = refreshToken,
                    RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7)
                };
                await _userExtensionRepository.AddAsync(userExtension);
            }
            else
            {
                userExtension.RefreshToken = refreshToken;
                userExtension.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
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
                RefreshToken = refreshToken
            };
        }
    }
}

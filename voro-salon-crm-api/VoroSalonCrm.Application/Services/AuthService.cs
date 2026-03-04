using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Domain.Entities.Identity;
using VoroSalonCrm.Shared.Structs;
using VoroSalonCrm.Shared.Utils;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using VoroSalonCrm.Application.DTOs.Identity;
using AutoMapper;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Identity;

namespace VoroSalonCrm.Application.Services
{
    public class AuthService(IOptions<CookieUtil> cookieUtil, IConfiguration configuration,
        IMapper mapper, INotificationService notificationService, IUserService userService) : IAuthService
    {
        private readonly INotificationService _notificationService = notificationService;
        private readonly CookieUtil _cookieUtil = cookieUtil.Value;
        private readonly IUserService _userService = userService;

        public async Task<AuthDto> SignInAsync(SignInDto signInDto)
        {
            var (user, rolesNames) = await _userService.GetByEmailAndPassword(signInDto.Email, signInDto.Password);

            return GenerateAuthDto(user, rolesNames);
        }

        public async Task<AuthDto> SignUpAsync(SignUpDto signUpDto, List<string> roles)
        {
            var userDto = mapper.Map<UserDto>(signUpDto);
            
            var user = await _userService.CreateAsync(userDto, signUpDto.Password, roles);

            var userName = string.IsNullOrEmpty(user.UserName) ? $"{user.FirstName}.{user.LastName}".ToLower() : $"{user.UserName}";

            await _notificationService.SendWelcomeAsync($"{user.Email}", userName);

            return GenerateAuthDto(user, roles);
        }

        public async Task ConfirmEmailAsync(string email)
        {
            var (user, token) = await _userService.GenerateConfirmEmailAsync(email);

            var userName = string.IsNullOrEmpty(user.UserName) ? $"{user.FirstName}.{user.LastName}".ToLower() : $"{user.UserName}";

            await _notificationService.SendConfirmEmailAsync($"{user.Email}", userName, Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlEncode(System.Text.Encoding.UTF8.GetBytes(token)));
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

            await _notificationService.SendResetLinkAsync($"{user.Email}", userName, Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlEncode(System.Text.Encoding.UTF8.GetBytes(token)));
        }

        public async Task<bool> ResetPasswordAsync(ResetPasswordDto resetPasswordDto)
        {
            var reseted = await _userService.ResetPasswordAsync(resetPasswordDto);

            return reseted;
        } 

        private static List<Claim> GenerateClaims(User user, IList<string>? rolesNames)
        {
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
                new Claim("TenantId", $"{user.TenantId}"),
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

        private AuthDto GenerateAuthDto(User user, IList<string>? rolesNames)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration.Get<ConfigUtil>()?.JwtKey!));

            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var expiration = DateTime.UtcNow.AddHours(double.Parse(_cookieUtil.ExpireHours));

            var token = new JwtSecurityToken(
                issuer: _cookieUtil.Issuer,
                audience: _cookieUtil.Audience,
                claims: GenerateClaims(user, rolesNames),
                expires: expiration,
                signingCredentials: credentials
            );

            var jwt = new JwtSecurityTokenHandler().WriteToken(token);

            return new AuthDto()
            {
                Expiration = expiration,
                UserId = $"{user.Id}",
                TenantId = $"{user.TenantId}",
                UserName = $"{user.UserName}".ToLower(),
                Email = $"{user.Email}".ToLower(),
                FirstName = $"{user.FirstName}".ToLower(),
                LastName = $"{user.LastName}".ToLower(),
                Token = jwt
            };
        }
    }
}

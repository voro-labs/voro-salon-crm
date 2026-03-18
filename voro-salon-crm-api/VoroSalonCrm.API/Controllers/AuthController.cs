using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Application.DTOs.Auth;
using VoroSalonCrm.Application.DTOs.Tenant;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Identity;
using VoroSalonCrm.Shared.Constants;
using VoroSalonCrm.Shared.Extensions;
using VoroSalonCrm.Shared.ViewModels;
using Microsoft.AspNetCore.RateLimiting;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/[controller]")]
    [Tags("Identity")]
    [ApiController]
    public class AuthController(IAuthService authService) : ControllerBase
    {
        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetSession(
            [FromServices] ICurrentUserService currentUserService,
            [FromServices] IUserService userService,
            [FromServices] ITenantService tenantService)
        {
            try
            {
                var userId = currentUserService.UserId;
                var tenantId = currentUserService.TenantId;

                if (userId == Guid.Empty || tenantId == Guid.Empty)
                    return Unauthorized();

                var user = await userService.GetByIdAsync(userId);
                var tenant = await tenantService.GetByIdAsync(tenantId);

                if (user == null || tenant == null)
                    return Unauthorized();

                var roles = user.UserRoles?.Select(ur => ur.Role?.Name).ToList() ?? [];
                var primaryRole = roles.FirstOrDefault() ?? "user";

                var sessionUser = new SessionUserDto(
                    user.Id,
                    string.IsNullOrWhiteSpace(user.LastName) ? user.FirstName : $"{user.FirstName} {user.LastName}",
                    user.Email ?? string.Empty,
                    primaryRole
                );

                var sessionTenant = new TenantDto(
                    tenant.Id, tenant.Name, tenant.Slug, tenant.IsActive, tenant.CreatedAt,
                    tenant.LogoUrl, tenant.PrimaryColor, tenant.SecondaryColor, tenant.ContactPhone, tenant.ContactEmail, tenant.ThemeMode
                );

                var sessionDto = new SessionDto(sessionUser, sessionTenant);

                return ResponseViewModel<SessionDto>
                    .SuccessWithMessage("Session retrieved.", sessionDto)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPost("sign-in")]
        [AllowAnonymous]
        [EnableRateLimiting("LoginPolicy")]
        public async Task<IActionResult> SignIn([FromBody] SignInDto signInDto)
        {
            try
            {
                var authDto = await authService.SignInAsync(signInDto);

                return ResponseViewModel<AuthDto>
                    .SuccessWithMessage("Sign-in successful.", authDto)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<AuthDto>
                    .Fail(ex.Message)
                    .ToActionResult();
            }
        }

        [HttpPost("refresh-token")]
        [AllowAnonymous]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenDto refreshTokenDto)
        {
            try
            {
                var authDto = await authService.RefreshTokenAsync(refreshTokenDto);

                return ResponseViewModel<AuthDto>
                    .SuccessWithMessage("Token refreshed successfully.", authDto)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<AuthDto>
                    .Fail(ex.Message)
                    .ToActionResult();
            }
        }

        [HttpPost("sign-up")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> SignUp([FromBody] SignUpDto signUpDto)
        {
            try
            {
                var authDto = await authService.SignUpAsync(signUpDto, [RoleConstant.User]);

                return ResponseViewModel<AuthDto>
                    .SuccessWithMessage("Sign-up successful.", authDto)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>
                    .Fail(ex.Message)
                    .ToActionResult();
            }
        }

        [HttpPost("verify-2fa")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyTwoFactor([FromBody] VerifyTwoFactorDto dto)
        {
            try
            {
                var authDto = await authService.VerifyTwoFactorAsync(dto);

                return ResponseViewModel<AuthDto>
                    .SuccessWithMessage("Two-factor authentication successful.", authDto)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<AuthDto>
                    .Fail(ex.Message)
                    .ToActionResult();
            }
        }

        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto forgotPasswordDto)
        {
            try
            {
                await authService.ForgotPasswordAsync(forgotPasswordDto);

                return ResponseViewModel<object>
                    .SuccessWithMessage("Forgot-password successful.", null)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>
                    .Fail(ex.Message)
                    .ToActionResult();
            }
        }

        [HttpPost("reset-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto resetPasswordDto)
        {
            try
            {
                var reseted = await authService.ResetPasswordAsync(resetPasswordDto);

                if (!reseted)
                {
                    return ResponseViewModel<object>
                        .Fail("Invalid token.")
                        .ToActionResult();
                }

                return ResponseViewModel<object>
                    .SuccessWithMessage("Reset-password successful.", null)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>
                    .Fail(ex.Message)
                    .ToActionResult();
            }
        }

        [HttpPost("switch-tenant/{tenantId:guid}")]
        [Authorize]
        public async Task<IActionResult> SwitchTenant(Guid tenantId)
        {
            try
            {
                var authDto = await authService.SwitchTenantAsync(tenantId);

                return ResponseViewModel<AuthDto>
                    .SuccessWithMessage("Tenant switched successful.", authDto)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>
                    .Fail(ex.Message)
                    .ToActionResult();
            }
        }
    }
}

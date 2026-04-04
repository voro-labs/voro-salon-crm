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
                var primaryRole = roles.FirstOrDefault() ?? "salonClient";

                var sessionUser = new SessionUserDto(
                    user.Id,
                    string.IsNullOrWhiteSpace(user.LastName) ? user.FirstName : $"{user.FirstName} {user.LastName}",
                    user.Email ?? string.Empty,
                    primaryRole
                );

                var sessionTenant = new TenantDto(
                    tenant.Id, tenant.Name, tenant.Slug, tenant.IsActive, tenant.CreatedAt,
                    tenant.LogoUrl, tenant.PrimaryColor, tenant.SecondaryColor, tenant.ContactPhone, tenant.ContactEmail, tenant.ThemeMode, tenant.EstablishmentType,
                    tenant.WhatsappPhoneNumberId, tenant.WhatsappBusinessAccountId, tenant.UseWhatsappBooking, tenant.BirthdayWhatsappTemplateName
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
        [Authorize(Roles = "Owner")]
        public async Task<IActionResult> SignUp([FromBody] SignUpDto signUpDto)
        {
            try
            {
                var authDto = await authService.SignUpAsync(signUpDto, [RoleConstant.SalonOwner]);

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

        [HttpGet("reset-password-redirect")]
        [AllowAnonymous]
        public IActionResult ResetPasswordRedirect([FromQuery] string email, [FromQuery] string token)
        {
            var encodedEmail = Uri.EscapeDataString(email ?? string.Empty);
            var encodedToken = Uri.EscapeDataString(token ?? string.Empty);
            var deepLink = $"vorosaloncrm://(auth)/reset-password?email={encodedEmail}&token={encodedToken}";

            var html = @$"""
                <!DOCTYPE html>
                <html lang='pt-BR'>
                <head>
                  <meta charset='UTF-8' />
                  <meta name='viewport' content='width=device-width, initial-scale=1.0' />
                  <title>Redefinir Senha — Voro Salon</title>
                  <style>
                    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
                    body {{
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                      background: #fafafa;
                      min-height: 100vh;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      padding: 24px;
                    }}
                    .card {{
                      background: white;
                      border-radius: 24px;
                      padding: 40px 32px;
                      max-width: 400px;
                      width: 100%;
                      text-align: center;
                      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
                    }}
                    .icon {{
                      width: 72px;
                      height: 72px;
                      border-radius: 20px;
                      background: #8B4513;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      margin: 0 auto 20px;
                    }}
                    h1 {{ font-size: 22px; font-weight: 900; color: #18181b; margin-bottom: 8px; }}
                    p {{ font-size: 14px; color: #71717a; line-height: 1.6; margin-bottom: 28px; }}
                    .btn {{
                      display: inline-block;
                      background: #8B4513;
                      color: white;
                      font-size: 16px;
                      font-weight: 800;
                      padding: 16px 32px;
                      border-radius: 14px;
                      text-decoration: none;
                      width: 100%;
                    }}
                    .note {{ font-size: 12px; color: #a1a1aa; margin-top: 20px; }}
                  </style>
                </head>
                <body>
                  <div class='card'>
                    <div class='icon'>
                      <svg width='36' height='36' fill='none' viewBox='0 0 24 24'>
                        <path d='M12 2a5 5 0 0 1 5 5v2h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h1V7a5 5 0 0 1 5-5zm0 11a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm0-9a3 3 0 0 0-3 3v2h6V7a3 3 0 0 0-3-3z' fill='white'/>
                      </svg>
                    </div>
                    <h1>Redefinir Senha</h1>
                    <p>Clique no botão abaixo para abrir o app Voro Salon e redefinir sua senha.</p>
                    <a class='btn' href='{deepLink}'>Abrir no App</a>
                    <p class='note'>Este link expira em 10 minutos. Certifique-se de que o app está instalado.</p>
                  </div>
                  <script>window.location.href = '{deepLink}';</script>
                </body>
                </html>
                """;

            return Content(html, "text/html; charset=utf-8");
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

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword(
            [FromBody] ChangePasswordDto dto,
            [FromServices] ICurrentUserService currentUserService)
        {
            try
            {
                await authService.ChangePasswordAsync(currentUserService.UserId, dto.NewPassword);

                return ResponseViewModel<object>
                    .SuccessWithMessage("Senha alterada com sucesso.", null)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>
                    .Fail(ex.Message)
                    .ToActionResult();
            }
        }

        [HttpPost("accept-terms")]
        [Authorize]
        public async Task<IActionResult> AcceptTerms(
            [FromServices] ICurrentUserService currentUserService)
        {
            try
            {
                await authService.AcceptTermsAsync(currentUserService.UserId);

                return ResponseViewModel<object>
                    .SuccessWithMessage("Termos aceitos com sucesso.", null)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>
                    .Fail(ex.Message)
                    .ToActionResult();
            }
        }

        [HttpPost("complete-profile")]
        [Authorize]
        public async Task<IActionResult> CompleteProfile(
            [FromBody] CompleteProfileDto dto,
            [FromServices] ICurrentUserService currentUserService)
        {
            try
            {
                await authService.CompleteProfileAsync(currentUserService.UserId, dto);

                return ResponseViewModel<object>
                    .SuccessWithMessage("Perfil completado com sucesso.", null)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>
                    .Fail(ex.Message)
                    .ToActionResult();
            }
        }

        [HttpPost("2fa/enable/request")]
        [Authorize]
        public async Task<IActionResult> RequestEnable2FA(
            [FromServices] ICurrentUserService currentUserService)
        {
            try
            {
                await authService.RequestEnable2FAAsync(currentUserService.UserId);

                return ResponseViewModel<object>
                    .SuccessWithMessage("Código enviado para o seu e-mail.", null)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>
                    .Fail(ex.Message)
                    .ToActionResult();
            }
        }

        [HttpPost("2fa/enable/confirm")]
        [Authorize]
        public async Task<IActionResult> ConfirmEnable2FA(
            [FromBody] ConfirmEnable2FADto dto,
            [FromServices] ICurrentUserService currentUserService)
        {
            try
            {
                await authService.ConfirmEnable2FAAsync(currentUserService.UserId, dto.Code);

                return ResponseViewModel<object>
                    .SuccessWithMessage("Autenticação de dois fatores ativada com sucesso.", null)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>
                    .Fail(ex.Message)
                    .ToActionResult();
            }
        }

        [HttpPost("2fa/disable")]
        [Authorize]
        public async Task<IActionResult> Disable2FA(
            [FromServices] ICurrentUserService currentUserService)
        {
            try
            {
                await authService.Disable2FAAsync(currentUserService.UserId);

                return ResponseViewModel<object>
                    .SuccessWithMessage("Autenticação de dois fatores desativada.", null)
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

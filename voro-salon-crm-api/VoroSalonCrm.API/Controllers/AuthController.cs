using VoroSalonCrm.Shared.Extensions;
using VoroSalonCrm.Shared.ViewModels;
using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSalonCrm.Application.Services.Interfaces;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/[controller]")]
    [Tags("Identity")]
    [ApiController]
    public class AuthController(IAuthService authService) : ControllerBase
    {
        [HttpPost("sign-in")]
        [AllowAnonymous]
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

        [HttpPost("sign-up")]
        [AllowAnonymous]
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
    }
}

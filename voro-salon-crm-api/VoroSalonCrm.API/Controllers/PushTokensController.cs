using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSalonCrm.Application.DTOs.Notifications;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Shared.Extensions;
using VoroSalonCrm.Shared.ViewModels;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/push-tokens")]
    [Tags("Notifications")]
    [ApiController]
    [Authorize]
    public class PushTokensController(
        IPushTokenRepository pushTokenRepository,
        ICurrentUserService currentUserService,
        IUnitOfWork unitOfWork) : ControllerBase
    {
        [HttpPost]
        public async Task<IActionResult> Register([FromBody] RegisterPushTokenDto dto)
        {
            try
            {
                var userId = currentUserService.UserId;

                // Check if token already exists for this user
                var existing = await pushTokenRepository.GetByIdAsync(
                    pt => pt.Token == dto.Token && pt.UserId == userId);

                if (existing != null)
                {
                    if (!existing.IsActive)
                    {
                        existing.IsActive = true;
                        existing.UpdatedAt = DateTimeOffset.UtcNow;
                        pushTokenRepository.Update(existing);
                        await unitOfWork.SaveChangesAsync();
                    }

                    return ResponseViewModel<object>
                        .SuccessWithMessage("Push token registered.", null)
                        .ToActionResult();
                }

                // Check if same token exists for another user and deactivate it
                var tokenForOtherUser = await pushTokenRepository.GetByIdAsync(
                    pt => pt.Token == dto.Token && pt.UserId != userId);

                if (tokenForOtherUser != null)
                {
                    tokenForOtherUser.IsActive = false;
                    tokenForOtherUser.UpdatedAt = DateTimeOffset.UtcNow;
                    pushTokenRepository.Update(tokenForOtherUser);
                }

                var pushToken = new PushToken
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Token = dto.Token,
                    Platform = dto.Platform.ToLowerInvariant(),
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow
                };

                await pushTokenRepository.AddAsync(pushToken);
                await unitOfWork.SaveChangesAsync();

                return ResponseViewModel<object>
                    .SuccessWithMessage("Push token registered.", null)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpDelete("{token}")]
        public async Task<IActionResult> Remove([FromRoute] string token)
        {
            try
            {
                var userId = currentUserService.UserId;

                var pushToken = await pushTokenRepository.GetByIdAsync(
                    pt => pt.Token == token && pt.UserId == userId);

                if (pushToken == null)
                    return ResponseViewModel<object>.Fail("Push token not found.").ToActionResult();

                pushToken.IsActive = false;
                pushToken.UpdatedAt = DateTimeOffset.UtcNow;
                pushTokenRepository.Update(pushToken);
                await unitOfWork.SaveChangesAsync();

                return ResponseViewModel<object>
                    .SuccessWithMessage("Push token removed.", null)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }
    }
}

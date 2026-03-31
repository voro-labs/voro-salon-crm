using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSalonCrm.Application.DTOs.Notifications;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Shared.Extensions;
using VoroSalonCrm.Shared.ViewModels;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/notifications")]
    [Tags("Notifications")]
    [ApiController]
    [Authorize]
    public class UserNotificationsController(IUserNotificationService userNotificationService) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetMyNotifications([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            try
            {
                var notifications = await userNotificationService.GetMyNotificationsAsync(page, pageSize);
                return ResponseViewModel<IEnumerable<UserNotificationDto>>
                    .SuccessWithMessage("Notifications retrieved.", notifications)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            try
            {
                var count = await userNotificationService.GetUnreadCountAsync();
                return ResponseViewModel<object>
                    .SuccessWithMessage("Unread count retrieved.", new { count })
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPatch("{id:guid}/read")]
        public async Task<IActionResult> MarkAsRead([FromRoute] Guid id)
        {
            try
            {
                await userNotificationService.MarkAsReadAsync(id);
                return ResponseViewModel<object>
                    .SuccessWithMessage("Notification marked as read.", null)
                    .ToActionResult();
            }
            catch (KeyNotFoundException ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPatch("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            try
            {
                await userNotificationService.MarkAllAsReadAsync();
                return ResponseViewModel<object>
                    .SuccessWithMessage("All notifications marked as read.", null)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpDelete]
        public async Task<IActionResult> DeleteMany([FromBody] List<Guid> ids)
        {
            try
            {
                if (ids == null || ids.Count == 0)
                    return ResponseViewModel<object>.Fail("No IDs provided.").ToActionResult();

                await userNotificationService.DeleteManyAsync(ids);
                return ResponseViewModel<object>
                    .SuccessWithMessage("Notifications deleted.", null)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }
        [HttpDelete("delete-all")]
        public async Task<IActionResult> DeleteAll()
        {
            try
            {
                await userNotificationService.DeleteAllAsync();
                return ResponseViewModel<object>
                    .SuccessWithMessage("All notifications deleted.", null)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }
    }
}

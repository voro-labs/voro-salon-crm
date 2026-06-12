using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSalonCrm.Application.DTOs.Support;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Shared.Extensions;
using VoroSalonCrm.Shared.ViewModels;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/admin-support")]
    [Tags("Admin — Support")]
    [ApiController]
    [Authorize(Roles = "Owner")]
    public class AdminSupportController(ISupportService supportService) : ControllerBase
    {
        [HttpGet("tickets")]
        public async Task<IActionResult> GetTickets()
        {
            try
            {
                var tickets = await supportService.GetAllTicketsAsync();
                return ResponseViewModel<IEnumerable<SupportTicketDto>>
                    .Success(tickets)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpGet("tickets/{ticketId:guid}/messages")]
        public async Task<IActionResult> GetMessages([FromRoute] Guid ticketId)
        {
            try
            {
                var messages = await supportService.GetMessagesForOwnerAsync(ticketId);
                return ResponseViewModel<IEnumerable<SupportMessageDto>>
                    .Success(messages)
                    .ToActionResult();
            }
            catch (KeyNotFoundException ex)
            {
                return ResponseViewModel<object>
                    .Fail(ex.Message, null, StatusCodes.Status404NotFound)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPost("tickets/{ticketId:guid}/messages")]
        public async Task<IActionResult> Reply(
            [FromRoute] Guid ticketId,
            [FromBody] SendSupportMessageDto dto)
        {
            try
            {
                if (dto.TicketId != ticketId)
                    return ResponseViewModel<object>
                        .Fail("TicketId incompatível.", null, StatusCodes.Status400BadRequest)
                        .ToActionResult();

                var message = await supportService.ReplyAsSupportAsync(ticketId, dto);
                return ResponseViewModel<SupportMessageDto>
                    .SuccessWithMessage("Mensagem enviada com sucesso.", message)
                    .ToActionResult();
            }
            catch (KeyNotFoundException ex)
            {
                return ResponseViewModel<object>
                    .Fail(ex.Message, null, StatusCodes.Status404NotFound)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPatch("tickets/{ticketId:guid}/status")]
        public async Task<IActionResult> UpdateStatus(
            [FromRoute] Guid ticketId,
            [FromBody] UpdateSupportTicketStatusDto dto)
        {
            try
            {
                var ticket = await supportService.UpdateTicketStatusAsync(ticketId, dto.Status);
                return ResponseViewModel<SupportTicketDto>
                    .SuccessWithMessage("Status atualizado com sucesso.", ticket)
                    .ToActionResult();
            }
            catch (KeyNotFoundException ex)
            {
                return ResponseViewModel<object>
                    .Fail(ex.Message, null, StatusCodes.Status404NotFound)
                    .ToActionResult();
            }
            catch (ArgumentException ex)
            {
                return ResponseViewModel<object>
                    .Fail(ex.Message, null, StatusCodes.Status400BadRequest)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }
    }
}

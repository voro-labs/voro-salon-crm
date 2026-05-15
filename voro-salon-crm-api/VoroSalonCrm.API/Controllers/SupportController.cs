using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSalonCrm.Application.DTOs.Support;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Shared.Extensions;
using VoroSalonCrm.Shared.ViewModels;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/[controller]")]
    [Route("api/[controller]")]
    [Tags("Support")]
    [ApiController]
    [Authorize]
    public class SupportController(ISupportService supportService) : ControllerBase
    {
        [HttpPost("tickets")]
        public async Task<IActionResult> CreateTicket([FromBody] CreateSupportTicketDto dto)
        {
            try
            {
                var ticket = await supportService.CreateTicketAsync(dto);
                return ResponseViewModel<SupportTicketDto>
                    .SuccessWithMessage("Ticket criado com sucesso.", ticket)
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

        [HttpGet("tickets")]
        public async Task<IActionResult> GetTickets()
        {
            try
            {
                var tickets = await supportService.GetTicketsAsync();
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
                var messages = await supportService.GetMessagesAsync(ticketId);
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
            catch (UnauthorizedAccessException ex)
            {
                return ResponseViewModel<object>
                    .Fail(ex.Message, null, StatusCodes.Status403Forbidden)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPost("tickets/{ticketId:guid}/messages")]
        public async Task<IActionResult> SendMessage(
            [FromRoute] Guid ticketId,
            [FromBody] SendSupportMessageDto dto)
        {
            try
            {
                if (dto.TicketId != ticketId)
                    return ResponseViewModel<object>
                        .Fail("TicketId incompatível.", null, StatusCodes.Status400BadRequest)
                        .ToActionResult();

                var message = await supportService.SendMessageAsync(ticketId, dto);
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
            catch (UnauthorizedAccessException ex)
            {
                return ResponseViewModel<object>
                    .Fail(ex.Message, null, StatusCodes.Status403Forbidden)
                    .ToActionResult();
            }
            catch (InvalidOperationException ex)
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

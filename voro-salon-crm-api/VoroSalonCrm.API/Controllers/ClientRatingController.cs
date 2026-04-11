using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Shared.Extensions;
using VoroSalonCrm.Shared.ViewModels;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/[controller]")]
    [Tags("CRM")]
    [ApiController]
    public class ClientRatingController(IClientRatingService ratingService) : ControllerBase
    {
        /// <summary>
        /// Enviar avaliação para um agendamento (público — sem autenticação).
        /// </summary>
        [HttpPost("{appointmentId:guid}")]
        [AllowAnonymous]
        public async Task<IActionResult> Submit(Guid appointmentId, [FromBody] SubmitRatingDto dto)
        {
            try
            {
                var result = await ratingService.SubmitAsync(appointmentId, dto);
                return ResponseViewModel<ClientRatingDto>.SuccessWithMessage("Avaliação enviada. Obrigado!", result).ToActionResult();
            }
            catch (InvalidOperationException ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        /// <summary>
        /// Listar todas as avaliações do tenant (requer autenticação).
        /// </summary>
        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var result = await ratingService.GetAllAsync();
                return ResponseViewModel<IEnumerable<ClientRatingDto>>.SuccessWithMessage("Avaliações recuperadas.", result).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        /// <summary>
        /// Enviar manualmente a solicitação de avaliação via WhatsApp para um agendamento.
        /// </summary>
        [HttpPost("send-request/{appointmentId:guid}")]
        [Authorize]
        public async Task<IActionResult> SendRequest(Guid appointmentId)
        {
            try
            {
                var result = await ratingService.SendRatingRequestAsync(appointmentId);
                var message = result.SentViaBot ? "Solicitação de avaliação enviada via bot." : "Abra o WhatsApp para enviar a solicitação.";
                return ResponseViewModel<SendRatingRequestResultDto>.SuccessWithMessage(message, result).ToActionResult();
            }
            catch (KeyNotFoundException ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
            catch (InvalidOperationException ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        /// <summary>
        /// Buscar avaliação de um agendamento específico.
        /// </summary>
        [HttpGet("{appointmentId:guid}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetByAppointment(Guid appointmentId)
        {
            try
            {
                var result = await ratingService.GetByAppointmentAsync(appointmentId);
                if (result is null)
                    return ResponseViewModel<object>.Fail("Avaliação não encontrada.").ToActionResult();
                return ResponseViewModel<ClientRatingDto>.SuccessWithMessage("Avaliação recuperada.", result).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }
    }
}

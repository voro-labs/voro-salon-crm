using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSalonCrm.Application.DTOs.Anamnesis;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Shared.Extensions;
using VoroSalonCrm.Shared.ViewModels;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/[controller]")]
    [Tags("Anamnesis")]
    [ApiController]
    [Authorize]
    public class AnamnesisController(IAnamnesisService anamnesisService) : ControllerBase
    {
        private readonly IAnamnesisService _anamnesisService = anamnesisService;

        [HttpGet("questions")]
        public async Task<IActionResult> GetQuestions()
        {
            try
            {
                var questions = await _anamnesisService.GetQuestionsAsync();
                return ResponseViewModel<IEnumerable<AnamnesisQuestionDto>>
                    .SuccessWithMessage("Questions retrieved successfully.", questions)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateAnamnesisSheetDto dto)
        {
            try
            {
                var anamnesis = await _anamnesisService.CreateAnamnesisAsync(dto);
                return ResponseViewModel<AnamnesisSheetDto>
                    .SuccessWithMessage("Anamnesis created successfully.", anamnesis)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPost("with-client")]
        public async Task<IActionResult> CreateWithClient([FromBody] CreateClientWithAnamnesisDto dto)
        {
            try
            {
                var anamnesis = await _anamnesisService.CreateClientWithAnamnesisAsync(dto);
                return ResponseViewModel<AnamnesisSheetDto>
                    .SuccessWithMessage("Client and Anamnesis created successfully.", anamnesis)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpGet("client/{clientId:guid}")]
        public async Task<IActionResult> GetClientHistory([FromRoute] Guid clientId)
        {
            try
            {
                var history = await _anamnesisService.GetClientHistoryAsync(clientId);
                return ResponseViewModel<IEnumerable<AnamnesisSheetDto>>
                    .SuccessWithMessage("Client anamnesis history retrieved.", history)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById([FromRoute] Guid id)
        {
            try
            {
                var anamnesis = await _anamnesisService.GetByIdAsync(id);
                if (anamnesis == null)
                    return ResponseViewModel<object>.Fail("Anamnesis not found.").ToActionResult();

                return ResponseViewModel<AnamnesisSheetDto>
                    .SuccessWithMessage("Anamnesis retrieved.", anamnesis)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPost("questions")]
        public async Task<IActionResult> CreateQuestion([FromBody] CreateAnamnesisQuestionDto dto)
        {
            try
            {
                var question = await _anamnesisService.CreateQuestionAsync(dto);
                return ResponseViewModel<AnamnesisQuestionDto>
                    .SuccessWithMessage("Question created successfully.", question)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPost("questions/bulk")]
        public async Task<IActionResult> BulkCreateQuestions([FromBody] IEnumerable<CreateAnamnesisQuestionDto> dtos)
        {
            try
            {
                var questions = await _anamnesisService.BulkCreateQuestionsAsync(dtos);
                return ResponseViewModel<IEnumerable<AnamnesisQuestionDto>>
                    .SuccessWithMessage($"{questions.Count()} questions created successfully.", questions)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPut("questions/{id:guid}")]
        public async Task<IActionResult> UpdateQuestion([FromRoute] Guid id, [FromBody] UpdateAnamnesisQuestionDto dto)
        {
            try
            {
                if (id != dto.Id)
                    return ResponseViewModel<object>.Fail("ID mismatch.").ToActionResult();

                var question = await _anamnesisService.UpdateQuestionAsync(dto);
                return ResponseViewModel<AnamnesisQuestionDto>
                    .SuccessWithMessage("Question updated successfully.", question)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpDelete("questions/{id:guid}")]
        public async Task<IActionResult> DeleteQuestion([FromRoute] Guid id)
        {
            try
            {
                var success = await _anamnesisService.DeleteQuestionAsync(id);
                if (!success)
                    return ResponseViewModel<object>.Fail("Question not found.").ToActionResult();

                return ResponseViewModel<object>
                    .SuccessWithMessage("Question deleted successfully.", null)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        /// <summary>
        /// Gera (ou renova) um token de acesso público para assinatura de uma ficha de anamnese.
        /// O token tem validade de 72 horas.
        /// </summary>
        [HttpPost("{id:guid}/signing-token")]
        public async Task<IActionResult> GenerateSigningToken([FromRoute] Guid id)
        {
            try
            {
                var token = await _anamnesisService.GeneratePublicTokenAsync(id);
                return ResponseViewModel<object>
                    .SuccessWithMessage("Token gerado com sucesso.", new { token })
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        /// <summary>
        /// Cria uma ficha de anamnese em rascunho e envia o link de preenchimento para o cliente.
        /// </summary>
        [HttpPost("send-fill-request/{clientId:guid}")]
        public async Task<IActionResult> SendFillRequest([FromRoute] Guid clientId)
        {
            try
            {
                var result = await _anamnesisService.CreateFillRequestAsync(clientId);
                var message = result.SentViaBot ? "Link enviado via WhatsApp." : "Abra o WhatsApp para enviar o link.";
                return ResponseViewModel<SendFillRequestResultDto>.SuccessWithMessage(message, result).ToActionResult();
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
    }
}

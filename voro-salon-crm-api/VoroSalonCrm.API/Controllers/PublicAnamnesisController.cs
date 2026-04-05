using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSalonCrm.Application.DTOs.Anamnesis;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Shared.Extensions;
using VoroSalonCrm.Shared.ViewModels;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/public/anamnesis")]
    [Tags("Public")]
    [ApiController]
    [AllowAnonymous]
    public class PublicAnamnesisController(IAnamnesisService anamnesisService) : ControllerBase
    {
        /// <summary>
        /// Retorna a ficha de anamnese pelo token público para o cliente visualizar e assinar.
        /// </summary>
        [HttpGet("{token}")]
        public async Task<IActionResult> GetByToken([FromRoute] string token)
        {
            try
            {
                var sheet = await anamnesisService.GetSheetByPublicTokenAsync(token);
                if (sheet == null)
                    return ResponseViewModel<object>.Fail("Link inválido ou expirado.").ToActionResult();

                return ResponseViewModel<PublicAnamnesisSheetDto>
                    .SuccessWithMessage("Ficha encontrada.", sheet)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        /// <summary>
        /// Submete a assinatura digital do cliente para a ficha de anamnese.
        /// </summary>
        [HttpPost("{token}/sign")]
        public async Task<IActionResult> Sign([FromRoute] string token, [FromBody] SubmitPublicSignatureDto dto)
        {
            try
            {
                var success = await anamnesisService.SubmitPublicSignatureAsync(token, dto);
                if (!success)
                    return ResponseViewModel<object>.Fail("Link inválido ou expirado.").ToActionResult();

                return ResponseViewModel<object>
                    .SuccessWithMessage("Documento assinado com sucesso.", null)
                    .ToActionResult();
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
    }
}

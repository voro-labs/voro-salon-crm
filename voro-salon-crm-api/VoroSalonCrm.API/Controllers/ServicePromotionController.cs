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
    [Authorize]
    public class ServicePromotionController(IServicePromotionService promotionService) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var result = await promotionService.GetAllAsync();
                return ResponseViewModel<IEnumerable<ServicePromotionDto>>.SuccessWithMessage("Promoções recuperadas.", result).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            try
            {
                var result = await promotionService.GetByIdAsync(id);
                if (result is null)
                    return ResponseViewModel<object>.Fail("Promoção não encontrada.").ToActionResult();
                return ResponseViewModel<ServicePromotionDto>.SuccessWithMessage("Promoção recuperada.", result).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateServicePromotionDto dto)
        {
            try
            {
                var result = await promotionService.CreateAsync(dto);
                return ResponseViewModel<ServicePromotionDto>.SuccessWithMessage("Promoção criada.", result).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateServicePromotionDto dto)
        {
            try
            {
                var dtoWithId = dto with { Id = id };
                var result = await promotionService.UpdateAsync(dtoWithId);
                return ResponseViewModel<ServicePromotionDto>.SuccessWithMessage("Promoção atualizada.", result).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            try
            {
                var result = await promotionService.DeleteAsync(id);
                if (!result)
                    return ResponseViewModel<object>.Fail("Promoção não encontrada.").ToActionResult();
                return ResponseViewModel<object>.SuccessWithMessage("Promoção excluída.", null).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }
    }
}

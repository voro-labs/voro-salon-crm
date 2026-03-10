using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSalonCrm.Application.DTOs.CRM.Financial;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Shared.ViewModels;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/[controller]")]
    [Tags("Transactions")]
    [ApiController]
    [Authorize]
    public class TransactionCategoriesController(ITransactionCategoryService service) : ControllerBase
    {
        private readonly ITransactionCategoryService _service = service;

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] TransactionType? type, CancellationToken ct)
        {
            var categories = await _service.GetAllAsync(type, ct);
            return Ok(ResponseViewModel<IEnumerable<TransactionCategoryDto>>.Success(categories));
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
        {
            var category = await _service.GetByIdAsync(id, ct);
            if (category == null) return NotFound(ResponseViewModel<TransactionCategoryDto>.Fail("Categoria não encontrada."));
            return Ok(ResponseViewModel<TransactionCategoryDto>.Success(category));
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateTransactionCategoryDto dto, CancellationToken ct)
        {
            var category = await _service.CreateAsync(dto, ct);
            return CreatedAtAction(nameof(GetById), new { id = category.Id }, ResponseViewModel<TransactionCategoryDto>.SuccessWithMessage("Categoria criada com sucesso.", category));
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, UpdateTransactionCategoryDto dto, CancellationToken ct)
        {
            if (id != dto.Id) return BadRequest("ID mismatch");

            try
            {
                var category = await _service.UpdateAsync(dto, ct);
                return Ok(ResponseViewModel<TransactionCategoryDto>.SuccessWithMessage("Categoria atualizada com sucesso.", category));
            }
            catch (KeyNotFoundException)
            {
                return NotFound(ResponseViewModel<TransactionCategoryDto>.Fail("Categoria não encontrada."));
            }
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        {
            await _service.DeleteAsync(id, ct);
            return Ok(ResponseViewModel<object>.SuccessWithMessage("Categoria deletada com sucesso.", null));
        }
    }
}

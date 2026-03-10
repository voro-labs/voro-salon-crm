using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSalonCrm.Application.DTOs.CRM.Financial;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Shared.ViewModels;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/[controller]")]
    [Tags("Transactions")]
    [ApiController]
    [Authorize]
    public class TransactionsController(ITransactionService service) : ControllerBase
    {
        private readonly ITransactionService _service = service;

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] DateTimeOffset? startDate, 
            [FromQuery] DateTimeOffset? endDate, 
            CancellationToken ct)
        {
            var transactions = await _service.GetAllAsync(startDate, endDate, ct);
            return Ok(ResponseViewModel<IEnumerable<TransactionDto>>.Success(transactions));
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
        {
            var transaction = await _service.GetByIdAsync(id, ct);
            if (transaction == null) return NotFound(ResponseViewModel<TransactionDto>.Fail("Transação não encontrada"));
            return Ok(ResponseViewModel<TransactionDto>.Success(transaction));
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateTransactionDto dto, CancellationToken ct)
        {
            var transaction = await _service.CreateAsync(dto, ct);
            return CreatedAtAction(nameof(GetById), new { id = transaction.Id }, ResponseViewModel<TransactionDto>.SuccessWithMessage("Lançamento criado com sucesso.", transaction));
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, UpdateTransactionDto dto, CancellationToken ct)
        {
            if (id != dto.Id) return BadRequest("ID mismatch");

            try
            {
                var transaction = await _service.UpdateAsync(dto, ct);
                return Ok(ResponseViewModel<TransactionDto>.SuccessWithMessage("Lançamento atualizado com sucesso.", transaction));
            }
            catch (KeyNotFoundException)
            {
                return NotFound(ResponseViewModel<TransactionDto>.Fail("Transação não encontrada"));
            }
        }

        [HttpPost("{id:guid}/pay")]
        public async Task<IActionResult> Pay(Guid id, PayTransactionDto dto, CancellationToken ct)
        {
            if (id != dto.Id) return BadRequest("ID mismatch");

            try
            {
                var transaction = await _service.PayAsync(dto, ct);
                return Ok(ResponseViewModel<TransactionDto>.SuccessWithMessage("Pagamento registrado com sucesso.", transaction));
            }
            catch (KeyNotFoundException)
            {
                return NotFound(ResponseViewModel<TransactionDto>.Fail("Transação não encontrada"));
            }
        }

        [HttpPost("{id:guid}/cancel")]
        public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
        {
            try
            {
                var transaction = await _service.CancelAsync(id, ct);
                return Ok(ResponseViewModel<TransactionDto>.SuccessWithMessage("Lançamento cancelado com sucesso.", transaction));
            }
            catch (KeyNotFoundException)
            {
                return NotFound(ResponseViewModel<TransactionDto>.Fail("Transação não encontrada"));
            }
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        {
            await _service.DeleteAsync(id, ct);
            return Ok(ResponseViewModel<object>.SuccessWithMessage("Lançamento deletado com sucesso.", null));
        }
    }
}

using VoroSalonCrm.Application.DTOs.CRM.Financial;

namespace VoroSalonCrm.Application.Services.Interfaces
{
    public interface ITransactionService
    {
        Task<IEnumerable<TransactionDto>> GetAllAsync(
            DateTimeOffset? startDate = null, 
            DateTimeOffset? endDate = null, 
            CancellationToken ct = default);
            
        Task<TransactionDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
        Task<TransactionDto> CreateAsync(CreateTransactionDto dto, CancellationToken ct = default);
        Task<TransactionDto> UpdateAsync(UpdateTransactionDto dto, CancellationToken ct = default);
        
        // Pagamento/Baixa da transação
        Task<TransactionDto> PayAsync(PayTransactionDto dto, CancellationToken ct = default);
        
        // Cancelar transação
        Task<TransactionDto> CancelAsync(Guid id, CancellationToken ct = default);
        
        Task DeleteAsync(Guid id, CancellationToken ct = default);
    }
}

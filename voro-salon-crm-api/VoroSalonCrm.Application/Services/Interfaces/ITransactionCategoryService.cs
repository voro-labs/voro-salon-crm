using VoroSalonCrm.Application.DTOs.CRM.Financial;
using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Application.Services.Interfaces
{
    public interface ITransactionCategoryService
    {
        Task<IEnumerable<TransactionCategoryDto>> GetAllAsync(TransactionType? type = null, CancellationToken ct = default);
        Task<TransactionCategoryDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
        Task<TransactionCategoryDto> CreateAsync(CreateTransactionCategoryDto dto, CancellationToken ct = default);
        Task<TransactionCategoryDto> UpdateAsync(UpdateTransactionCategoryDto dto, CancellationToken ct = default);
        Task DeleteAsync(Guid id, CancellationToken ct = default);
    }
}

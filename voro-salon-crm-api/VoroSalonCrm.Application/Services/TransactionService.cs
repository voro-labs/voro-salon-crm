using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.DTOs.CRM.Financial;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class TransactionService(ITransactionRepository transactionRepository, ITransactionCategoryRepository categoryRepository, IUnitOfWork unitOfWork, ICurrentUserService currentUserService) : ITransactionService
    {
        private readonly ITransactionRepository _repository = transactionRepository;
        private readonly ITransactionCategoryRepository _categoryRepository = categoryRepository;
        private readonly IUnitOfWork _unitOfWork = unitOfWork;
        private readonly ICurrentUserService _currentUser = currentUserService;

        public async Task<IEnumerable<TransactionDto>> GetAllAsync(
            DateTimeOffset? startDate = null, 
            DateTimeOffset? endDate = null, 
            CancellationToken ct = default)
        {
            var transactions = await _repository.GetAllAsync(
                t => t.TenantId == _currentUser.TenantId && !t.IsDeleted && 
                     (!startDate.HasValue || t.DueDate >= startDate.Value) && 
                     (!endDate.HasValue || t.DueDate <= endDate.Value),
                true,
                q => q.Include(t => t.Category)
            );

            return transactions.OrderByDescending(t => t.DueDate).Select(t => MapToDto(t));
        }

        public async Task<TransactionDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
        {
            var transaction = await _repository.GetByIdAsync(
                t => t.Id == id && t.TenantId == _currentUser.TenantId && !t.IsDeleted,
                false,
                q => q.Include(t => t.Category)
            );

            if (transaction == null) return null;

            return MapToDto(transaction);
        }

        public async Task<TransactionDto> CreateAsync(CreateTransactionDto dto, CancellationToken ct = default)
        {
            var status = TransactionStatus.Pending;

            var transaction = new Transaction
            {
                Id = Guid.NewGuid(),
                TenantId = _currentUser.TenantId,
                CategoryId = dto.CategoryId,
                Description = dto.Description,
                Amount = dto.Amount,
                PaidAmount = 0,
                DueDate = dto.DueDate,
                Type = dto.Type,
                PaymentMethod = dto.PaymentMethod,
                Status = status,
                Notes = dto.Notes,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await _repository.AddAsync(transaction);
            await _unitOfWork.SaveChangesAsync();

            if (transaction.CategoryId.HasValue)
            {
                transaction.Category = await _categoryRepository.GetByIdAsync(
                    c => c.Id == transaction.CategoryId.Value && c.TenantId == _currentUser.TenantId && !c.IsDeleted
                );
            }

            return MapToDto(transaction);
        }

        public async Task<TransactionDto> UpdateAsync(UpdateTransactionDto dto, CancellationToken ct = default)
        {
            var transaction = await _repository.GetByIdAsync(
                t => t.Id == dto.Id && t.TenantId == _currentUser.TenantId && !t.IsDeleted,
                false,
                q => q.Include(t => t.Category)
            );

            if (transaction == null) throw new KeyNotFoundException("Transaction not found");

            transaction.CategoryId = dto.CategoryId;
            transaction.Description = dto.Description;
            transaction.Amount = dto.Amount;
            transaction.DueDate = dto.DueDate;
            transaction.Type = dto.Type;
            transaction.PaymentMethod = dto.PaymentMethod;
            transaction.Notes = dto.Notes;
            transaction.UpdatedAt = DateTimeOffset.UtcNow;

            transaction.Status = CalculateStatus(transaction);

            _repository.Update(transaction);
            await _unitOfWork.SaveChangesAsync();

            if (transaction.CategoryId.HasValue && transaction.Category == null)
            {
                transaction.Category = await _categoryRepository.GetByIdAsync(
                    c => c.Id == transaction.CategoryId.Value && c.TenantId == _currentUser.TenantId && !c.IsDeleted
                );
            }

            return MapToDto(transaction);
        }

        public async Task<TransactionDto> PayAsync(PayTransactionDto dto, CancellationToken ct = default)
        {
            var transaction = await _repository.GetByIdAsync(
                t => t.Id == dto.Id && t.TenantId == _currentUser.TenantId && !t.IsDeleted,
                false,
                q => q.Include(t => t.Category)
            );

            if (transaction == null) throw new KeyNotFoundException("Transaction not found");

            transaction.PaidAmount += dto.PaidAmount;
            transaction.PaymentDate = dto.PaymentDate;
            transaction.PaymentMethod = dto.PaymentMethod; 
            
            if (!string.IsNullOrEmpty(dto.Notes))
                transaction.Notes = (transaction.Notes + "\n" + dto.Notes).Trim();

            transaction.Status = CalculateStatus(transaction);
            transaction.UpdatedAt = DateTimeOffset.UtcNow;

            _repository.Update(transaction);
            await _unitOfWork.SaveChangesAsync();

            return MapToDto(transaction);
        }

        public async Task<TransactionDto> CancelAsync(Guid id, CancellationToken ct = default)
        {
            var transaction = await _repository.GetByIdAsync(
                t => t.Id == id && t.TenantId == _currentUser.TenantId && !t.IsDeleted,
                false,
                q => q.Include(t => t.Category)
            );

            if (transaction == null) throw new KeyNotFoundException("Transaction not found");

            transaction.Status = TransactionStatus.Cancelled;
            transaction.UpdatedAt = DateTimeOffset.UtcNow;

            _repository.Update(transaction);
            await _unitOfWork.SaveChangesAsync();

            return MapToDto(transaction);
        }

        public async Task DeleteAsync(Guid id, CancellationToken ct = default)
        {
            var transaction = await _repository.GetByIdAsync(
                t => t.Id == id && t.TenantId == _currentUser.TenantId && !t.IsDeleted
            );

            if (transaction == null) return;

            transaction.IsDeleted = true;
            transaction.DeletedAt = DateTimeOffset.UtcNow;

            _repository.Update(transaction);
            await _unitOfWork.SaveChangesAsync();
        }

        private TransactionStatus CalculateStatus(Transaction t)
        {
            if (t.Status == TransactionStatus.Cancelled) return TransactionStatus.Cancelled;

            if (t.PaidAmount >= t.Amount && t.Amount > 0) return TransactionStatus.Paid;
            if (t.PaidAmount > 0 && t.PaidAmount < t.Amount) return TransactionStatus.Partial;
            
            if (t.DueDate.Date < DateTimeOffset.UtcNow.Date) return TransactionStatus.Overdue;

            return TransactionStatus.Pending;
        }

        private TransactionDto MapToDto(Transaction t)
        {
            return new TransactionDto
            {
                Id = t.Id,
                CategoryId = t.CategoryId,
                Category = t.Category != null ? new TransactionCategoryDto
                {
                    Id = t.Category.Id,
                    Name = t.Category.Name,
                    Type = t.Category.Type,
                    IsActive = t.Category.IsActive,
                    CreatedAt = t.Category.CreatedAt
                } : null,
                Description = t.Description,
                Amount = t.Amount,
                PaidAmount = t.PaidAmount,
                DueDate = t.DueDate,
                PaymentDate = t.PaymentDate,
                Type = t.Type,
                PaymentMethod = t.PaymentMethod,
                Status = t.Status,
                Notes = t.Notes,
                CreatedAt = t.CreatedAt
            };
        }
        public async Task<BatchImportResultDto> BatchImportAsync(
            IEnumerable<BatchImportTransactionItemDto> items,
            CancellationToken ct = default)
        {
            var tenantId = _currentUser.TenantId;
            var result = new BatchImportResultDto();

            // Load recent transactions for dedup window (last 90 days + future)
            var since = DateTimeOffset.UtcNow.AddDays(-90);
            var existing = await _repository.GetAllAsync(
                t => t.TenantId == tenantId && !t.IsDeleted && t.DueDate >= since,
                asNoTracking: true);

            // Build dedup signatures from existing: "date|description|amount"
            var existingSigs = existing
                .Select(t => BuildSig(t.DueDate, t.Description, t.Amount))
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var toInsert = new List<Transaction>();

            foreach (var item in items)
            {
                // Prefer client-provided dedupKey, fallback to auto-sig
                var sig = !string.IsNullOrEmpty(item.DedupKey)
                    ? item.DedupKey
                    : BuildSig(item.DueDate, item.Description, item.Amount);

                if (existingSigs.Contains(sig))
                {
                    result.Skipped++;
                    continue;
                }

                existingSigs.Add(sig); // prevent intra-batch dupes

                var tx = new Transaction
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    CategoryId = item.CategoryId,
                    Description = item.Description,
                    Amount = item.Amount,
                    PaidAmount = item.Amount, // extrato = já liquidado
                    DueDate = item.DueDate,
                    PaymentDate = item.DueDate,
                    Type = item.Type,
                    PaymentMethod = item.PaymentMethod,
                    Status = TransactionStatus.Paid,
                    Notes = item.Notes ?? "Importado via extrato bancário",
                    CreatedAt = DateTimeOffset.UtcNow
                };

                toInsert.Add(tx);
            }

            if (toInsert.Count > 0)
            {
                await _repository.AddRangeAsync(toInsert);
                await _unitOfWork.SaveChangesAsync();
                result.Imported = toInsert.Count;
                result.Transactions = toInsert.Select(MapToDto).ToList();
            }

            return result;
        }

        private static string BuildSig(DateTimeOffset date, string description, decimal amount)
            => $"{date:yyyy-MM-dd}|{description.Trim().ToLowerInvariant()}|{amount:F2}";
    }
}

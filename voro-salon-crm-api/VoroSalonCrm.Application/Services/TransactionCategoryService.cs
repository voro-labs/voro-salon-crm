using VoroSalonCrm.Application.DTOs.CRM.Financial;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Cache;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class TransactionCategoryService(
        ITransactionCategoryRepository transactionCategoryRepository,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService,
        ICacheService cacheService) : ITransactionCategoryService
    {
        private readonly ITransactionCategoryRepository _repository = transactionCategoryRepository;
        private readonly IUnitOfWork _unitOfWork = unitOfWork;
        private readonly ICurrentUserService _currentUser = currentUserService;
        private readonly ICacheService _cacheService = cacheService;

        public async Task<IEnumerable<TransactionCategoryDto>> GetAllAsync(TransactionType? type = null, CancellationToken ct = default)
        {
            var tenantId = _currentUser.TenantId;
            var cacheKey = $"txcategories:tenant:{tenantId}";

            var cached = await _cacheService.GetAsync<List<TransactionCategoryDto>>(cacheKey, ct);
            if (cached is not null)
            {
                IEnumerable<TransactionCategoryDto> filtered = cached;
                if (type.HasValue)
                    filtered = cached.Where(c => c.Type == type.Value);
                return filtered;
            }

            var categories = await _repository.GetAllAsync(
                tc => tc.TenantId == tenantId && !tc.IsDeleted
            );

            var result = categories.OrderBy(tc => tc.Name).Select(tc => new TransactionCategoryDto
            {
                Id = tc.Id,
                Name = tc.Name,
                Type = tc.Type,
                IsActive = tc.IsActive,
                CreatedAt = tc.CreatedAt
            }).ToList();

            await _cacheService.SetAsync(cacheKey, result, TimeSpan.FromMinutes(15), ct);

            if (type.HasValue)
                return result.Where(c => c.Type == type.Value);
            return result;
        }

        public async Task<TransactionCategoryDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
        {
            var category = await _repository.GetByIdAsync(
                tc => tc.Id == id && tc.TenantId == _currentUser.TenantId && !tc.IsDeleted
            );

            if (category == null) return null;

            return new TransactionCategoryDto
            {
                Id = category.Id,
                Name = category.Name,
                Type = category.Type,
                IsActive = category.IsActive,
                CreatedAt = category.CreatedAt
            };
        }

        public async Task<TransactionCategoryDto> CreateAsync(CreateTransactionCategoryDto dto, CancellationToken ct = default)
        {
            var category = new TransactionCategory
            {
                Id = Guid.NewGuid(),
                TenantId = _currentUser.TenantId,
                Name = dto.Name,
                Type = dto.Type,
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await _repository.AddAsync(category);
            await _unitOfWork.SaveChangesAsync();

            await _cacheService.RemoveAsync($"txcategories:tenant:{_currentUser.TenantId}");

            return new TransactionCategoryDto
            {
                Id = category.Id,
                Name = category.Name,
                Type = category.Type,
                IsActive = category.IsActive,
                CreatedAt = category.CreatedAt
            };
        }

        public async Task<TransactionCategoryDto> UpdateAsync(UpdateTransactionCategoryDto dto, CancellationToken ct = default)
        {
            var category = await _repository.GetByIdAsync(
                tc => tc.Id == dto.Id && tc.TenantId == _currentUser.TenantId && !tc.IsDeleted, false
            );

            if (category == null) throw new KeyNotFoundException("Category not found");

            category.Name = dto.Name;
            category.Type = dto.Type;
            category.IsActive = dto.IsActive;
            category.UpdatedAt = DateTimeOffset.UtcNow;

            _repository.Update(category);
            await _unitOfWork.SaveChangesAsync();

            await _cacheService.RemoveAsync($"txcategories:tenant:{_currentUser.TenantId}");

            return new TransactionCategoryDto
            {
                Id = category.Id,
                Name = category.Name,
                Type = category.Type,
                IsActive = category.IsActive,
                CreatedAt = category.CreatedAt
            };
        }

        public async Task DeleteAsync(Guid id, CancellationToken ct = default)
        {
            var category = await _repository.GetByIdAsync(
                tc => tc.Id == id && tc.TenantId == _currentUser.TenantId && !tc.IsDeleted, false
            );

            if (category == null) return;

            category.IsDeleted = true;
            category.DeletedAt = DateTimeOffset.UtcNow;

            _repository.Update(category);
            await _unitOfWork.SaveChangesAsync();

            await _cacheService.RemoveAsync($"txcategories:tenant:{_currentUser.TenantId}");
        }
    }
}

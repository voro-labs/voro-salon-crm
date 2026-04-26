using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Cache;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class ServiceService(
        IServiceRepository serviceRepository,
        IServicePromotionRepository servicePromotionRepository,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService,
        ICacheService cacheService) : IServiceService
    {
        private readonly IServiceRepository _serviceRepository = serviceRepository;
        private readonly IServicePromotionRepository _servicePromotionRepository = servicePromotionRepository;
        private readonly IUnitOfWork _unitOfWork = unitOfWork;
        private readonly ICurrentUserService _currentUserService = currentUserService;
        private readonly ICacheService _cacheService = cacheService;

        public async Task<ServiceDto> CreateAsync(CreateServiceDto dto)
        {
            var tenantId = _currentUserService.TenantId;
            if (tenantId == Guid.Empty)
                throw new UnauthorizedAccessException("Tenant invalid or not found in context.");

            var service = new Service
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Name = dto.Name,
                Category = dto.Category,
                Description = dto.Description,
                Price = dto.Price,
                DurationMinutes = dto.DurationMinutes,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await _serviceRepository.AddAsync(service);
            await _unitOfWork.SaveChangesAsync();

            await _cacheService.RemoveAsync($"services:tenant:{tenantId}");

            return new ServiceDto(service.Id, service.Name, service.Description, service.Price, service.DurationMinutes, service.CreatedAt, service.Category);
        }

        public async Task<ServiceDto?> GetByIdAsync(Guid id)
        {
            var service = await _serviceRepository.GetByIdAsync(false, id);
            if (service == null) return null;

            return new ServiceDto(service.Id, service.Name, service.Description, service.Price, service.DurationMinutes, service.CreatedAt, service.Category);
        }

        public async Task<IEnumerable<ServiceDto>> GetAllAsync()
        {
            var tenantId = _currentUserService.TenantId;
            var cacheKey = $"services:tenant:{tenantId}";

            var cached = await _cacheService.GetAsync<List<ServiceDto>>(cacheKey);
            if (cached is not null) return cached;

            var services = await _serviceRepository.GetAllAsync();

            var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-3));
            var todayDow = (int)today.DayOfWeek;

            var promotions = await _servicePromotionRepository
                .Query(p =>
                    p.TenantId == tenantId &&
                    p.IsActive &&
                    p.DaysOfWeek.Contains(todayDow) &&
                    (p.ValidFrom == null || p.ValidFrom <= today) &&
                    (p.ValidUntil == null || p.ValidUntil >= today))
                .IgnoreQueryFilters()
                .ToListAsync();

            var result = services.Select(s =>
            {
                var promo = promotions.FirstOrDefault(p => p.ServiceId == s.Id);
                return new ServiceDto(s.Id, s.Name, s.Description, s.Price, s.DurationMinutes, s.CreatedAt,
                    s.Category, promo?.PromotionalPrice, promo != null);
            }).ToList();

            await _cacheService.SetAsync(cacheKey, result, TimeSpan.FromMinutes(10));
            return result;
        }

        public async Task<PagedResult<ServiceDto>> GetPagedAsync(int page, int pageSize, string? search, string? orderBy = "name", string? sortDirection = "asc")
        {
            var dtos = (await GetAllAsync()).ToList();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLowerInvariant();
                dtos = dtos.Where(s =>
                    (s.Name?.ToLowerInvariant().Contains(term) ?? false) ||
                    (s.Description?.ToLowerInvariant().Contains(term) ?? false))
                    .ToList();
            }

            var desc = sortDirection?.ToLowerInvariant() == "desc";
            dtos = (orderBy?.ToLowerInvariant()) switch
            {
                "name" or _ => desc ? dtos.OrderByDescending(s => s.Name).ToList() : dtos.OrderBy(s => s.Name).ToList(),
            };

            var totalCount = dtos.Count;
            var items = dtos.Skip((page - 1) * pageSize).Take(pageSize);

            return new PagedResult<ServiceDto>(items, totalCount, page, pageSize);
        }

        public async Task<ServiceDto> UpdateAsync(Guid id, UpdateServiceDto dto)
        {
            var service = await _serviceRepository.GetByIdAsync(false, id)
                ?? throw new KeyNotFoundException($"Service '{id}' not found.");

            if (dto.Name != null) service.Name = dto.Name;
            if (dto.Category != null) service.Category = dto.Category;
            if (dto.Description != null) service.Description = dto.Description;
            if (dto.Price.HasValue) service.Price = dto.Price.Value;
            if (dto.DurationMinutes.HasValue) service.DurationMinutes = dto.DurationMinutes.Value;

            service.UpdatedAt = DateTimeOffset.UtcNow;

            _serviceRepository.Update(service);
            await _unitOfWork.SaveChangesAsync();

            await _cacheService.RemoveAsync($"services:tenant:{service.TenantId}");

            return new ServiceDto(service.Id, service.Name, service.Description, service.Price, service.DurationMinutes, service.CreatedAt, service.Category);
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var service = await _serviceRepository.GetByIdAsync(false, id);
            if (service == null) return false;

            service.IsDeleted = true;
            service.DeletedAt = DateTimeOffset.UtcNow;

            _serviceRepository.Update(service);
            await _unitOfWork.SaveChangesAsync();

            await _cacheService.RemoveAsync($"services:tenant:{service.TenantId}");

            return true;
        }
    }
}

using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class ServicePromotionService(
        IServicePromotionRepository promotionRepository,
        IServiceRepository serviceRepository,
        ICurrentUserService currentUserService,
        IUnitOfWork unitOfWork) : IServicePromotionService
    {
        public async Task<IEnumerable<ServicePromotionDto>> GetAllAsync()
        {
            var promotions = await promotionRepository
                .Include(p => p.Service)
                .ToListAsync();

            return promotions.Select(MapToDto);
        }

        public async Task<ServicePromotionDto?> GetByIdAsync(Guid id)
        {
            var promotion = await promotionRepository
                .Include(p => p.Service)
                .FirstOrDefaultAsync(p => p.Id == id);

            return promotion == null ? null : MapToDto(promotion);
        }

        public async Task<ServicePromotionDto> CreateAsync(CreateServicePromotionDto dto)
        {
            var tenantId = currentUserService.TenantId;
            if (tenantId == Guid.Empty)
                throw new UnauthorizedAccessException("Tenant invalid or not found in context.");

            var service = await serviceRepository.GetByIdAsync(true, dto.ServiceId)
                ?? throw new KeyNotFoundException("Service not found.");

            var promotion = new ServicePromotion
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                ServiceId = dto.ServiceId,
                PromotionalPrice = dto.PromotionalPrice,
                DaysOfWeek = dto.DaysOfWeek,
                ValidFrom = dto.ValidFrom,
                ValidUntil = dto.ValidUntil,
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await promotionRepository.AddAsync(promotion);
            await unitOfWork.SaveChangesAsync();

            promotion.Service = service;
            return MapToDto(promotion);
        }

        public async Task<ServicePromotionDto> UpdateAsync(UpdateServicePromotionDto dto)
        {
            var promotion = await promotionRepository
                .Include(p => p.Service)
                .FirstOrDefaultAsync(p => p.Id == dto.Id)
                ?? throw new KeyNotFoundException("Promotion not found.");

            promotion.PromotionalPrice = dto.PromotionalPrice;
            promotion.DaysOfWeek = dto.DaysOfWeek;
            promotion.ValidFrom = dto.ValidFrom;
            promotion.ValidUntil = dto.ValidUntil;
            promotion.IsActive = dto.IsActive;
            promotion.UpdatedAt = DateTimeOffset.UtcNow;

            promotionRepository.Update(promotion);
            await unitOfWork.SaveChangesAsync();

            return MapToDto(promotion);
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var promotion = await promotionRepository.GetByIdAsync(false, id);
            if (promotion == null) return false;

            promotionRepository.Delete(promotion);
            await unitOfWork.SaveChangesAsync();

            return true;
        }

        private static ServicePromotionDto MapToDto(ServicePromotion p) => new(
            p.Id,
            p.ServiceId,
            p.Service?.Name ?? string.Empty,
            p.Service?.Price ?? 0,
            p.PromotionalPrice,
            p.DaysOfWeek,
            p.ValidFrom,
            p.ValidUntil,
            p.IsActive,
            p.CreatedAt
        );
    }
}

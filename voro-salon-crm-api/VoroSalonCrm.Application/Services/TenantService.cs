using VoroSalonCrm.Application.DTOs.Tenant;
using VoroSalonCrm.Application.Services.Base;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class TenantService(ITenantRepository tenantRepository, IUnitOfWork unitOfWork) : ServiceBase<Tenant>(tenantRepository), ITenantService
    {
        private readonly ITenantRepository _tenantRepository = tenantRepository;
        private readonly IUnitOfWork _unitOfWork = unitOfWork;

        public async Task<Tenant> CreateAsync(CreateTenantDto dto)
        {
            var existing = await _tenantRepository.GetBySlugAsync(dto.Slug);
            if (existing is not null)
                throw new InvalidOperationException($"A tenant with slug '{dto.Slug}' already exists.");

            var tenant = new Tenant
            {
                Id = Guid.NewGuid(),
                Name = dto.Name,
                Slug = dto.Slug.ToLowerInvariant().Trim(),
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await _tenantRepository.AddAsync(tenant);
            await _unitOfWork.SaveChangesAsync();

            return tenant;
        }

        public async Task<Tenant?> GetByIdAsync(Guid id)
        {
            return await _tenantRepository.GetByIdAsync(id);
        }

        public async Task<Tenant?> GetBySlugAsync(string slug)
        {
            return await _tenantRepository.GetBySlugAsync(slug);
        }

        public async Task<IEnumerable<Tenant>> GetAllAsync()
        {
            return await _tenantRepository.GetAllAsync();
        }

        public async Task<Tenant> UpdateAsync(Guid id, UpdateTenantDto dto)
        {
            var tenant = await _tenantRepository.GetByIdAsync(id)
                ?? throw new KeyNotFoundException($"Tenant '{id}' not found.");

            if (dto.Name is not null) tenant.Name = dto.Name;
            if (dto.Slug is not null) tenant.Slug = dto.Slug.ToLowerInvariant().Trim();
            if (dto.IsActive.HasValue) tenant.IsActive = dto.IsActive.Value;
            if (dto.LogoUrl is not null) tenant.LogoUrl = dto.LogoUrl;
            if (dto.PrimaryColor is not null) tenant.PrimaryColor = dto.PrimaryColor;
            if (dto.SecondaryColor is not null) tenant.SecondaryColor = dto.SecondaryColor;
            if (dto.ContactPhone is not null) tenant.ContactPhone = dto.ContactPhone;
            if (dto.ContactEmail is not null) tenant.ContactEmail = dto.ContactEmail;
            if (dto.ThemeMode is not null) tenant.ThemeMode = dto.ThemeMode;

            tenant.UpdatedAt = DateTimeOffset.UtcNow;

            _tenantRepository.Update(tenant);
            await _unitOfWork.SaveChangesAsync();

            return tenant;
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var tenant = await _tenantRepository.GetByIdAsync(id);
            if (tenant is null) return false;

            tenant.IsDeleted = true;
            tenant.DeletedAt = DateTimeOffset.UtcNow;
            tenant.IsActive = false;

            _tenantRepository.Update(tenant);
            await _unitOfWork.SaveChangesAsync();

            return true;
        }
    }
}

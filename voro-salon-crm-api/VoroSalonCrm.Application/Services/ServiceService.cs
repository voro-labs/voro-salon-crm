using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class ServiceService(
        IServiceRepository serviceRepository,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService) : IServiceService
    {
        private readonly IServiceRepository _serviceRepository = serviceRepository;
        private readonly IUnitOfWork _unitOfWork = unitOfWork;
        private readonly ICurrentUserService _currentUserService = currentUserService;

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
                Description = dto.Description,
                Price = dto.Price,
                DurationMinutes = dto.DurationMinutes,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await _serviceRepository.AddAsync(service);
            await _unitOfWork.SaveChangesAsync();

            return new ServiceDto(service.Id, service.Name, service.Description, service.Price, service.DurationMinutes, service.CreatedAt);
        }

        public async Task<ServiceDto?> GetByIdAsync(Guid id)
        {
            var service = await _serviceRepository.GetByIdAsync(id);
            if (service == null) return null;

            return new ServiceDto(service.Id, service.Name, service.Description, service.Price, service.DurationMinutes, service.CreatedAt);
        }

        public async Task<IEnumerable<ServiceDto>> GetAllAsync()
        {
            var services = await _serviceRepository.GetAllAsync();
            return services.Select(s => new ServiceDto(s.Id, s.Name, s.Description, s.Price, s.DurationMinutes, s.CreatedAt));
        }

        public async Task<ServiceDto> UpdateAsync(Guid id, UpdateServiceDto dto)
        {
            var service = await _serviceRepository.GetByIdAsync(id)
                ?? throw new KeyNotFoundException($"Service '{id}' not found.");

            if (dto.Name != null) service.Name = dto.Name;
            if (dto.Description != null) service.Description = dto.Description;
            if (dto.Price.HasValue) service.Price = dto.Price.Value;
            if (dto.DurationMinutes.HasValue) service.DurationMinutes = dto.DurationMinutes.Value;

            service.UpdatedAt = DateTimeOffset.UtcNow;

            _serviceRepository.Update(service);
            await _unitOfWork.SaveChangesAsync();

            return new ServiceDto(service.Id, service.Name, service.Description, service.Price, service.DurationMinutes, service.CreatedAt);
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var service = await _serviceRepository.GetByIdAsync(id);
            if (service == null) return false;

            service.IsDeleted = true;
            service.DeletedAt = DateTimeOffset.UtcNow;

            _serviceRepository.Update(service);
            await _unitOfWork.SaveChangesAsync();

            return true;
        }
    }
}

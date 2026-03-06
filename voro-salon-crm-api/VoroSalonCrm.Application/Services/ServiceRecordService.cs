using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class ServiceRecordService(
        IServiceRecordRepository serviceRepository,
        IClientRepository clientRepository,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService) : IServiceRecordService
    {
        private readonly IServiceRecordRepository _serviceRepository = serviceRepository;
        private readonly IClientRepository _clientRepository = clientRepository;
        private readonly IUnitOfWork _unitOfWork = unitOfWork;
        private readonly ICurrentUserService _currentUserService = currentUserService;

        public async Task<ServiceRecordDto> CreateAsync(CreateServiceRecordDto dto)
        {
            var tenantId = _currentUserService.TenantId;
            if (tenantId == Guid.Empty)
                throw new UnauthorizedAccessException("Tenant invalid or not found in context.");

            // Validar se o cliente existe
            _ = await _clientRepository.GetByIdAsync(dto.ClientId)
                ?? throw new KeyNotFoundException($"Client '{dto.ClientId}' not found.");

            var record = new ServiceRecord
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                ClientId = dto.ClientId,
                ServiceId = dto.ServiceId,
                ServiceDate = dto.ServiceDate?.ToUniversalTime() ?? DateTimeOffset.UtcNow,
                Description = dto.Description,
                Amount = dto.Amount,
                Notes = dto.Notes,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await _serviceRepository.AddAsync(record);
            await _unitOfWork.SaveChangesAsync();

            return new ServiceRecordDto(record.Id, record.ClientId, record.ServiceId, null, record.ServiceDate, record.Description, record.Amount, record.Notes, record.CreatedAt);
        }

        public async Task<ServiceRecordDto?> GetByIdAsync(Guid id)
        {
            var record = await _serviceRepository.GetByIdAsync(r => r.Id == id, r => r.Include(x => x.Service!));
            if (record is null) return null;

            return new ServiceRecordDto(record.Id, record.ClientId, record.ServiceId, record.Service?.Name, record.ServiceDate, record.Description, record.Amount, record.Notes, record.CreatedAt);
        }

        public async Task<IEnumerable<ServiceRecordDto>> GetAllAsync()
        {
            var records = await _serviceRepository.GetAllAsync(r => true, true, r => r.Include(x => x.Service!));
            return records.Select(r => new ServiceRecordDto(r.Id, r.ClientId, r.ServiceId, r.Service?.Name, r.ServiceDate, r.Description, r.Amount, r.Notes, r.CreatedAt));
        }

        public async Task<IEnumerable<ServiceRecordDto>> GetByClientIdAsync(Guid clientId)
        {
            var records = await _serviceRepository.GetAllAsync(r => r.ClientId == clientId, true, r => r.Include(x => x.Service!));
            return records.Select(r => new ServiceRecordDto(r.Id, r.ClientId, r.ServiceId, r.Service?.Name, r.ServiceDate, r.Description, r.Amount, r.Notes, r.CreatedAt));
        }

        public async Task<ServiceRecordDto> UpdateAsync(Guid id, UpdateServiceRecordDto dto)
        {
            var record = await _serviceRepository.GetByIdAsync(r => r.Id == id, r => r.Include(x => x.Service!))
                ?? throw new KeyNotFoundException($"ServiceRecord '{id}' not found.");

            if (dto.ServiceId.HasValue) record.ServiceId = dto.ServiceId;
            if (dto.ServiceDate.HasValue) record.ServiceDate = dto.ServiceDate.Value.ToUniversalTime();
            if (dto.Description is not null) record.Description = dto.Description;
            if (dto.Amount.HasValue) record.Amount = dto.Amount.Value;
            if (dto.Notes is not null) record.Notes = dto.Notes;

            record.UpdatedAt = DateTimeOffset.UtcNow;

            _serviceRepository.Update(record);
            await _unitOfWork.SaveChangesAsync();

            return new ServiceRecordDto(record.Id, record.ClientId, record.ServiceId, record.Service?.Name, record.ServiceDate, record.Description, record.Amount, record.Notes, record.CreatedAt);
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var record = await _serviceRepository.GetByIdAsync(id);
            if (record is null) return false;

            record.IsDeleted = true;
            record.DeletedAt = DateTimeOffset.UtcNow;

            _serviceRepository.Update(record);
            await _unitOfWork.SaveChangesAsync();

            return true;
        }
    }
}

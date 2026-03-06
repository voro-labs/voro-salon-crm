using VoroSalonCrm.Application.DTOs.Employee;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Blob;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class EmployeeService(
        IEmployeeRepository repository,
        ICurrentUserService currentUser,
        IUnitOfWork unitOfWork,
        IBlobService blobService) : IEmployeeService
    {
        private readonly IEmployeeRepository _repository = repository;
        private readonly ICurrentUserService _currentUser = currentUser;
        private readonly IUnitOfWork _unitOfWork = unitOfWork;
        private readonly IBlobService _blobService = blobService;

        public async Task<IEnumerable<EmployeeDto>> GetAllAsync()
        {
            var employees = await _repository.GetByTenantWithSpecialtiesAsync(_currentUser.TenantId);
            return employees.Select(MapToDto);
        }

        public async Task<EmployeeDto?> GetByIdAsync(Guid id)
        {
            var employee = await _repository.GetByIdWithSpecialtiesAsync(id);
            return employee != null ? MapToDto(employee) : null;
        }

        public async Task<EmployeeDto> CreateAsync(CreateEmployeeDto dto)
        {
            var employee = new Employee
            {
                TenantId = _currentUser.TenantId,
                Name = dto.Name,
                PhotoUrl = dto.PhotoUrl,
                HireDate = dto.HireDate.ToUniversalTime(),
                IsActive = true
            };

            await _repository.AddAsync(employee);
            await _unitOfWork.CommitAsync();

            if (dto.SpecialtyIds.Count > 0)
            {
                await _repository.UpdateSpecialtiesAsync(employee.Id, dto.SpecialtyIds);
                await _unitOfWork.CommitAsync();
            }

            return MapToDto(employee);
        }

        public async Task UpdateAsync(Guid id, UpdateEmployeeDto dto)
        {
            var employee = await _repository.GetByIdAsync(id);
            if (employee == null) return;

            employee.Name = dto.Name;
            employee.PhotoUrl = dto.PhotoUrl;
            employee.HireDate = dto.HireDate.ToUniversalTime();
            employee.TerminationDate = dto.TerminationDate?.ToUniversalTime();
            employee.IsActive = dto.IsActive;
            employee.UpdatedAt = DateTimeOffset.UtcNow;

            _repository.Update(employee);
            await _repository.UpdateSpecialtiesAsync(id, dto.SpecialtyIds);

            await _unitOfWork.CommitAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            var employee = await _repository.GetByIdAsync(id);
            if (employee == null) return;

            _repository.Delete(employee);
            await _unitOfWork.CommitAsync();
        }

        public async Task<IEnumerable<EmployeeDto>> GetAvailableForServiceAsync(Guid serviceId)
        {
            var employees = await _repository.GetAvailableForServiceAsync(_currentUser.TenantId, serviceId);
            return employees.Select(MapToDto);
        }

        public async Task<string> UploadPhotoAsync(Guid id, Microsoft.AspNetCore.Http.IFormFile file)
        {
            var employee = await _repository.GetByIdAsync(id)
                ?? throw new KeyNotFoundException($"Employee '{id}' not found.");

            var photoUrl = await _blobService.UploadAsync("voro-salon-crm", file.OpenReadStream(), file.ContentType);

            employee.PhotoUrl = photoUrl;
            employee.UpdatedAt = DateTimeOffset.UtcNow;

            _repository.Update(employee);
            await _unitOfWork.CommitAsync();

            return photoUrl;
        }

        private static EmployeeDto MapToDto(Employee e) => new()
        {
            Id = e.Id,
            Name = e.Name,
            PhotoUrl = e.PhotoUrl,
            HireDate = e.HireDate,
            IsActive = e.IsActive,
            SpecialtyIds = e.Specialties.Select(s => s.ServiceId).ToList()
        };
    }
}

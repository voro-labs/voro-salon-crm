using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.DTOs.CRM.Financial;
using VoroSalonCrm.Application.DTOs.Employee;
using VoroSalonCrm.Application.DTOs.Identity;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Blob;
using VoroSalonCrm.Application.Services.Interfaces.Identity;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Shared.Constants;

namespace VoroSalonCrm.Application.Services
{
    public class EmployeeService(
        IEmployeeRepository repository,
        ICurrentUserService currentUser,
        IUnitOfWork unitOfWork,
        IBlobService blobService,
        ITenantSubscriptionRepository subscriptionRepository,
        ITransactionRepository transactionRepository,
        IUserService userService,
        IUserTenantRepository userTenantRepository) : IEmployeeService
    {
        private readonly IEmployeeRepository _repository = repository;
        private readonly ICurrentUserService _currentUser = currentUser;
        private readonly IUnitOfWork _unitOfWork = unitOfWork;
        private readonly IBlobService _blobService = blobService;
        private readonly ITenantSubscriptionRepository _subscriptionRepository = subscriptionRepository;
        private readonly ITransactionRepository _transactionRepository = transactionRepository;
        private readonly IUserService _userService = userService;
        private readonly IUserTenantRepository _userTenantRepository = userTenantRepository;

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

        public async Task<EmployeeDto?> GetByCurrentUserAsync()
        {
            var userId = _currentUser.UserId;
            if (userId == Guid.Empty) return null;

            var employee = await _repository.GetByIdAsync(
                e => e.UserId == userId && !e.IsDeleted);
            return employee != null ? MapToDto(employee) : null;
        }

        public async Task<EmployeeDto> CreateAsync(CreateEmployeeDto dto)
        {
            var subscription = await _subscriptionRepository.GetByTenantIdWithPlanAsync(_currentUser.TenantId);
            if (subscription?.Plan != null && subscription.Plan.MaxEmployees != -1)
            {
                var currentCount = await _repository.Query().CountAsync();
                if (currentCount >= subscription.Plan.MaxEmployees)
                    throw new InvalidOperationException($"Limite de {subscription.Plan.MaxEmployees} funcionários atingido para o seu plano atual.");
            }

            var employee = new Employee
            {
                TenantId = _currentUser.TenantId,
                Name = dto.Name,
                PhotoUrl = dto.PhotoUrl,
                HireDate = dto.HireDate.ToUniversalTime(),
                IsActive = true,
                CommissionPercentage = dto.CommissionPercentage
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
            var employee = await _repository.GetByIdAsync(false, id);
            if (employee == null) return;

            employee.Name = dto.Name;
            employee.PhotoUrl = dto.PhotoUrl;
            employee.HireDate = dto.HireDate.ToUniversalTime();
            employee.TerminationDate = dto.TerminationDate?.ToUniversalTime();
            employee.IsActive = dto.IsActive;
            employee.CommissionPercentage = dto.CommissionPercentage;
            employee.UpdatedAt = DateTimeOffset.UtcNow;

            _repository.Update(employee);
            await _repository.UpdateSpecialtiesAsync(id, dto.SpecialtyIds);

            await _unitOfWork.CommitAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            var employee = await _repository.GetByIdAsync(false, id);
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
            var employee = await _repository.GetByIdAsync(false, id)
                ?? throw new KeyNotFoundException($"Employee '{id}' not found.");

            var photoUrl = await _blobService.UploadAsync($"{Guid.NewGuid()}_{file.FileName}", file.OpenReadStream(), file.ContentType);

            employee.PhotoUrl = photoUrl;
            employee.UpdatedAt = DateTimeOffset.UtcNow;

            _repository.Update(employee);
            await _unitOfWork.CommitAsync();

            return photoUrl;
        }

        public async Task<IEnumerable<TransactionDto>> GetCommissionsAsync(Guid id, DateTimeOffset from, DateTimeOffset to)
        {
            var transactions = await _transactionRepository.GetAllAsync(
                t => t.TenantId == _currentUser.TenantId &&
                     t.EmployeeId == id &&
                     !t.IsDeleted &&
                     t.DueDate >= from.ToUniversalTime() &&
                     t.DueDate <= to.ToUniversalTime(),
                asNoTracking: true,
                q => q.Include(t => t.Employee)
            );

            return transactions.OrderByDescending(t => t.DueDate).Select(t => new TransactionDto
            {
                Id = t.Id,
                CategoryId = t.CategoryId,
                Description = t.Description,
                Amount = t.Amount,
                PaidAmount = t.PaidAmount,
                DueDate = t.DueDate,
                PaymentDate = t.PaymentDate,
                Type = t.Type,
                PaymentMethod = t.PaymentMethod,
                Status = t.Status,
                Notes = t.Notes,
                CreatedAt = t.CreatedAt,
                EmployeeId = t.EmployeeId,
                EmployeeName = t.Employee?.Name
            });
        }

        public async Task CreateAccessAsync(Guid employeeId, CreateEmployeeAccessDto dto)
        {
            var employee = await _repository.GetByIdAsync(false, employeeId)
                ?? throw new KeyNotFoundException("Funcionário não encontrado.");

            if (employee.UserId != null)
                throw new InvalidOperationException("Este funcionário já possui acesso ao sistema.");

            var existing = await _userService.FindByEmailAsync(dto.Email);
            if (existing != null)
                throw new InvalidOperationException("Já existe um usuário com este e-mail.");

            var nameParts = employee.Name.Trim().Split(' ', 2);
            var userDto = new UserDto
            {
                FirstName = nameParts[0],
                LastName = nameParts.Length > 1 ? nameParts[1] : string.Empty,
                Email = dto.Email,
                UserName = dto.Email,
                IsActive = true
            };

            var user = await _userService.CreateAsync(userDto, dto.Password, [RoleConstant.SalonEmployee]);

            await _userTenantRepository.AddAsync(new UserTenant
            {
                UserId = user.Id,
                TenantId = _currentUser.TenantId,
                IsDefault = true
            });

            employee.UserId = user.Id;
            employee.UpdatedAt = DateTimeOffset.UtcNow;
            _repository.Update(employee);

            await _unitOfWork.CommitAsync();
        }

        public async Task RevokeAccessAsync(Guid employeeId)
        {
            var employee = await _repository.GetByIdAsync(false, employeeId)
                ?? throw new KeyNotFoundException("Funcionário não encontrado.");

            if (employee.UserId == null)
                throw new InvalidOperationException("Este funcionário não possui acesso ao sistema.");

            var user = await _userService.GetByIdAsync(employee.UserId.Value);
            if (user != null)
            {
                await _userService.UpdateAsync(user.Id, new UserDto
                {
                    Id = user.Id,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Email = user.Email,
                    UserName = user.UserName,
                    IsActive = false
                });
            }

            employee.UserId = null;
            employee.UpdatedAt = DateTimeOffset.UtcNow;
            _repository.Update(employee);

            await _unitOfWork.CommitAsync();
        }

        private static EmployeeDto MapToDto(Employee e) => new()
        {
            Id = e.Id,
            Name = e.Name,
            PhotoUrl = e.PhotoUrl,
            HireDate = e.HireDate,
            IsActive = e.IsActive,
            CommissionPercentage = e.CommissionPercentage,
            HasAccess = e.UserId != null,
            UserId = e.UserId,
            SpecialtyIds = e.Specialties.Select(s => s.ServiceId).ToList()
        };
    }
}

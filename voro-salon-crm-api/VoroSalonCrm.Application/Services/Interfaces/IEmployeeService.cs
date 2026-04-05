using Microsoft.AspNetCore.Http;
using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Application.DTOs.CRM.Financial;
using VoroSalonCrm.Application.DTOs.Employee;

namespace VoroSalonCrm.Application.Services.Interfaces
{
    public interface IEmployeeService
    {
        Task<IEnumerable<EmployeeDto>> GetAllAsync();
        Task<PagedResult<EmployeeDto>> GetPagedAsync(int page, int pageSize, string? search);
        Task<EmployeeDto?> GetByIdAsync(Guid id);
        Task<EmployeeDto?> GetByCurrentUserAsync();
        Task<EmployeeDto> CreateAsync(CreateEmployeeDto dto);
        Task UpdateAsync(Guid id, UpdateEmployeeDto dto);
        Task DeleteAsync(Guid id);
        Task<IEnumerable<EmployeeDto>> GetAvailableForServiceAsync(Guid serviceId);
        Task<string> UploadPhotoAsync(Guid id, IFormFile file);
        Task<IEnumerable<TransactionDto>> GetCommissionsAsync(Guid id, DateTimeOffset from, DateTimeOffset to);
        Task CreateAccessAsync(Guid employeeId, CreateEmployeeAccessDto dto);
        Task RevokeAccessAsync(Guid employeeId);
    }
}

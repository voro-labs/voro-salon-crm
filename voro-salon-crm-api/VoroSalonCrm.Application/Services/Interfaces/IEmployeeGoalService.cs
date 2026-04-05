using VoroSalonCrm.Application.DTOs.Employee;

namespace VoroSalonCrm.Application.Services.Interfaces
{
    public interface IEmployeeGoalService
    {
        Task<EmployeeGoalDto?> GetAsync(Guid employeeId, int month, int year);
        Task<IEnumerable<EmployeeGoalDto>> GetAllByEmployeeAsync(Guid employeeId);
        Task<EmployeeGoalDto> CreateAsync(CreateEmployeeGoalDto dto);
        Task<EmployeeGoalDto> UpdateAsync(Guid id, UpdateEmployeeGoalDto dto);
        Task<bool> DeleteAsync(Guid id);
    }
}

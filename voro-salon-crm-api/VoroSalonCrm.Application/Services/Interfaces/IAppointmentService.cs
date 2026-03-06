using VoroSalonCrm.Application.DTOs.CRM;

namespace VoroSalonCrm.Application.Services.Interfaces
{
    public interface IAppointmentService
    {
        Task<AppointmentDto> CreateAsync(CreateAppointmentDto dto);
        Task<AppointmentDto?> GetByIdAsync(Guid id);
        Task<IEnumerable<AppointmentDto>> GetAllAsync(Guid? clientId = null);
        Task<AppointmentDto> UpdateAsync(Guid id, UpdateAppointmentDto dto);
        Task<bool> DeleteAsync(Guid id);
        Task<bool> UpdateStatusAsync(Guid id, Domain.Enums.AppointmentStatus status);
    }
}

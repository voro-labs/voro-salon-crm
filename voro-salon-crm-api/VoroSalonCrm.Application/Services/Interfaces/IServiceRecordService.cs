using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.Services.Interfaces.Base;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Application.Services.Interfaces
{
    public interface IServiceRecordService
    {
        Task<ServiceRecordDto> CreateAsync(CreateServiceRecordDto dto);
        Task<ServiceRecordDto?> GetByIdAsync(Guid id);
        Task<IEnumerable<ServiceRecordDto>> GetAllAsync();
        Task<IEnumerable<ServiceRecordDto>> GetByClientIdAsync(Guid clientId);
        Task<ServiceRecordDto> UpdateAsync(Guid id, UpdateServiceRecordDto dto);
        Task<bool> UpdateStatusAsync(Guid id, AppointmentStatus status);
        Task<bool> DeleteAsync(Guid id);
        Task<bool> DeleteByAppointmentIdAsync(Guid appointmentId);
    }
}

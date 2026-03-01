using VoroSalonCrm.Application.DTOs.CRM;

namespace VoroSalonCrm.Application.Services.Interfaces
{
    public interface IServiceRecordService
    {
        Task<ServiceRecordDto> CreateAsync(CreateServiceRecordDto dto);
        Task<ServiceRecordDto?> GetByIdAsync(Guid id);
        Task<IEnumerable<ServiceRecordDto>> GetAllAsync();
        Task<IEnumerable<ServiceRecordDto>> GetByClientIdAsync(Guid clientId);
        Task<ServiceRecordDto> UpdateAsync(Guid id, UpdateServiceRecordDto dto);
        Task<bool> DeleteAsync(Guid id);
    }
}

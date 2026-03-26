using VoroSalonCrm.Application.DTOs.CRM;

namespace VoroSalonCrm.Application.Services.Interfaces
{
    public interface ITimeSlotBlockService
    {
        Task<IEnumerable<TimeSlotBlockDto>> GetAllAsync();
        Task<TimeSlotBlockDto> CreateAsync(CreateTimeSlotBlockDto dto);
        Task<bool> DeleteAsync(Guid id);
        Task<IEnumerable<TimeSlotBlockDto>> GetOverlappingAsync(DateTimeOffset start, DateTimeOffset end);
    }
}

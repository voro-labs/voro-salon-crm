using VoroSalonCrm.Application.DTOs.CRM;

namespace VoroSalonCrm.Application.Services.Interfaces
{
    public interface IServicePromotionService
    {
        Task<IEnumerable<ServicePromotionDto>> GetAllAsync();
        Task<ServicePromotionDto?> GetByIdAsync(Guid id);
        Task<ServicePromotionDto> CreateAsync(CreateServicePromotionDto dto);
        Task<ServicePromotionDto> UpdateAsync(UpdateServicePromotionDto dto);
        Task<bool> DeleteAsync(Guid id);
    }
}

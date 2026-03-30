using VoroSalonCrm.Application.DTOs.Tenant;

namespace VoroSalonCrm.Application.Services.Interfaces
{
    public interface ITenantBusinessHoursService
    {
        Task<IEnumerable<BusinessHoursDayDto>> GetAsync();
        Task<IEnumerable<BusinessHoursDayDto>> UpsertAsync(UpsertBusinessHoursDto dto);
    }
}

using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories.Base;

namespace VoroSalonCrm.Domain.Interfaces.Repositories
{
    public interface ITenantBusinessHoursRepository : IRepositoryBase<TenantBusinessHours>
    {
        Task<IEnumerable<TenantBusinessHours>> GetByTenantAsync(Guid tenantId, bool includeRanges = true);
        Task DeleteRangesByBusinessHoursIdAsync(Guid businessHoursId);
        Task AddRangesAsync(IEnumerable<TenantBusinessHoursRange> ranges);
    }
}

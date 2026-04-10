using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories.Base;

namespace VoroSalonCrm.Domain.Interfaces.Repositories
{
    public interface ITenantBusinessHoursRepository : IRepositoryBase<TenantBusinessHours>
    {
        Task<IEnumerable<TenantBusinessHours>> GetByTenantAsync(Guid tenantId);
        Task DeleteRangesByBusinessHoursIdAsync(Guid businessHoursId);
    }
}

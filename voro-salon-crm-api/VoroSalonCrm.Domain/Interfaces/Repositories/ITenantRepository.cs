using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories.Base;

namespace VoroSalonCrm.Domain.Interfaces.Repositories
{
    public interface ITenantRepository : IRepositoryBase<Tenant>
    {
        Task<Tenant?> GetBySlugAsync(string slug);
    }
}

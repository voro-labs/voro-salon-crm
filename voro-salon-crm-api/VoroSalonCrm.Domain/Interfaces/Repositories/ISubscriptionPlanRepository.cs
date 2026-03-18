using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories.Base;

namespace VoroSalonCrm.Domain.Interfaces.Repositories
{
    public interface ISubscriptionPlanRepository : IRepositoryBase<SubscriptionPlan>
    {
        Task<IEnumerable<SubscriptionPlan>> GetActivePlansAsync();
    }
}

using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories.Base;

namespace VoroSalonCrm.Domain.Interfaces.Repositories
{
    public interface ISubscriptionCouponRepository : IRepositoryBase<SubscriptionCoupon>
    {
        Task<SubscriptionCoupon?> GetByCodeAsync(string code);
    }
}

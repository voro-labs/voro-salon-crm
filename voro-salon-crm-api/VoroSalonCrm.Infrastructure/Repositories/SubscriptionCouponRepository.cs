using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Infrastructure.Factories;
using VoroSalonCrm.Infrastructure.Repositories.Base;

namespace VoroSalonCrm.Infrastructure.Repositories
{
    public class SubscriptionCouponRepository(JasmimDbContext context, IUnitOfWork unitOfWork)
        : RepositoryBase<SubscriptionCoupon>(context, unitOfWork), ISubscriptionCouponRepository
    {
        private readonly JasmimDbContext _context = context;

        public async Task<SubscriptionCoupon?> GetByCodeAsync(string code)
        {
            return await _context.SubscriptionCoupons
                .FirstOrDefaultAsync(c => c.Code == code.ToUpper().Trim() && c.IsActive);
        }
    }
}

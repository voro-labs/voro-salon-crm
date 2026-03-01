using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Infrastructure.Factories;
using VoroSalonCrm.Infrastructure.Repositories.Base;

namespace VoroSalonCrm.Infrastructure.Repositories
{
    public class TenantRepository(JasmimDbContext context, IUnitOfWork unitOfWork)
        : RepositoryBase<Tenant>(context, unitOfWork), ITenantRepository
    {
        private readonly JasmimDbContext _context = context;

        public async Task<Tenant?> GetBySlugAsync(string slug)
        {
            return await _context.Tenants
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Slug == slug && !t.IsDeleted);
        }
    }
}

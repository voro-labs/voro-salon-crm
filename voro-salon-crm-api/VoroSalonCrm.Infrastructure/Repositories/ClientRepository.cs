using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Infrastructure.Factories;
using VoroSalonCrm.Infrastructure.Repositories.Base;

namespace VoroSalonCrm.Infrastructure.Repositories
{
    public class ClientRepository(JasmimDbContext context, IUnitOfWork unitOfWork)
        : RepositoryBase<Client>(context, unitOfWork), IClientRepository
    {
        private readonly JasmimDbContext _context = context;

        public async Task<Client?> GetByPhoneAsync(Guid tenantId, string phone)
        {
            return await _context.Clients
                .AsQueryable()
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Phone == phone && !c.IsDeleted);
        }
    }
}

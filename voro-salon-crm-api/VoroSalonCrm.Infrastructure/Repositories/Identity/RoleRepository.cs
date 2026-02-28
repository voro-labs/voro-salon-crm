using VoroSalonCrm.Domain.Interfaces.Repositories.Identity;
using VoroSalonCrm.Domain.Entities.Identity;
using VoroSalonCrm.Infrastructure.Repositories.Base;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Infrastructure.Factories;

namespace VoroSalonCrm.Infrastructure.Repositories.Identity
{
    public class RoleRepository(JasmimDbContext context, IUnitOfWork unitOfWork) : RepositoryBase<Role>(context, unitOfWork), IRoleRepository
    {
       
    }
}

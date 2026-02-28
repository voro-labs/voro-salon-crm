using VoroSalonCrm.Domain.Entities.Identity;
using VoroSalonCrm.Domain.Interfaces.Repositories.Identity;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Infrastructure.Factories;
using VoroSalonCrm.Infrastructure.Repositories.Base;

namespace VoroSalonCrm.Infrastructure.Repositories.Identity
{
    public class UserRoleRepository(JasmimDbContext context, IUnitOfWork unitOfWork) : RepositoryBase<UserRole>(context, unitOfWork), IUserRoleRepository
    {

    }
}

using VoroSalonCrm.Domain.Entities.Identity;
using VoroSalonCrm.Domain.Interfaces.Repositories.Identity;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Infrastructure.Factories;
using VoroSalonCrm.Infrastructure.Repositories.Base;

namespace VoroSalonCrm.Infrastructure.Repositories.Identity
{
    public class UserRepository(JasmimDbContext context, IUnitOfWork unitOfWork) : RepositoryBase<User>(context, unitOfWork), IUserRepository
    {
    }
}

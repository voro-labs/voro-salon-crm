using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Infrastructure.Repositories.Base;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Infrastructure.Factories;

namespace VoroSalonCrm.Infrastructure.Repositories
{
    public class UserExtensionRepository(JasmimDbContext context, IUnitOfWork unitOfWork) : RepositoryBase<UserExtension>(context, unitOfWork), IUserExtensionRepository
    {
    }
}

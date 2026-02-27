using VoroSwipeEntertainment.Domain.Interfaces.Repositories.Identity;
using VoroSwipeEntertainment.Domain.Entities.Identity;
using VoroSwipeEntertainment.Infrastructure.Repositories.Base;
using VoroSwipeEntertainment.Domain.Interfaces.UnitOfWork;
using VoroSwipeEntertainment.Infrastructure.Factories;

namespace VoroSwipeEntertainment.Infrastructure.Repositories.Identity
{
    public class RoleRepository(JasmimDbContext context, IUnitOfWork unitOfWork) : RepositoryBase<Role>(context, unitOfWork), IRoleRepository
    {
       
    }
}

using VoroSwipeEntertainment.Domain.Entities.Identity;
using VoroSwipeEntertainment.Domain.Interfaces.Repositories.Identity;
using VoroSwipeEntertainment.Domain.Interfaces.UnitOfWork;
using VoroSwipeEntertainment.Infrastructure.Factories;
using VoroSwipeEntertainment.Infrastructure.Repositories.Base;

namespace VoroSwipeEntertainment.Infrastructure.Repositories.Identity
{
    public class UserRepository(JasmimDbContext context, IUnitOfWork unitOfWork) : RepositoryBase<User>(context, unitOfWork), IUserRepository
    {
    }
}

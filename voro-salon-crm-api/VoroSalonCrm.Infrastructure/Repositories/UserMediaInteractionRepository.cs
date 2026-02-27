using VoroSwipeEntertainment.Domain.Entities;
using VoroSwipeEntertainment.Domain.Interfaces.Repositories;
using VoroSwipeEntertainment.Infrastructure.Repositories.Base;
using VoroSwipeEntertainment.Domain.Interfaces.UnitOfWork;
using VoroSwipeEntertainment.Infrastructure.Factories;

namespace VoroSwipeEntertainment.Infrastructure.Repositories
{
    public class UserMediaInteractionRepository(JasmimDbContext context, IUnitOfWork unitOfWork) : RepositoryBase<UserMediaInteraction>(context, unitOfWork), IUserMediaInteractionRepository
    {
    }
}

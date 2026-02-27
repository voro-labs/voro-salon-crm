using VoroSwipeEntertainment.Domain.Entities;
using VoroSwipeEntertainment.Domain.Interfaces.Repositories;
using VoroSwipeEntertainment.Infrastructure.Repositories.Base;
using VoroSwipeEntertainment.Domain.Interfaces.UnitOfWork;
using VoroSwipeEntertainment.Infrastructure.Factories;

namespace VoroSwipeEntertainment.Infrastructure.Repositories
{
    public class UserKeywordScoreRepository(JasmimDbContext context, IUnitOfWork unitOfWork) : RepositoryBase<UserKeywordScore>(context, unitOfWork), IUserKeywordScoreRepository
    {
    }
}

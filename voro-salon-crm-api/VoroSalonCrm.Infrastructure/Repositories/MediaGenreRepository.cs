using VoroSwipeEntertainment.Domain.Entities;
using VoroSwipeEntertainment.Domain.Interfaces.Repositories;
using VoroSwipeEntertainment.Infrastructure.Repositories.Base;
using VoroSwipeEntertainment.Domain.Interfaces.UnitOfWork;
using VoroSwipeEntertainment.Infrastructure.Factories;

namespace VoroSwipeEntertainment.Infrastructure.Repositories
{
    public class MediaGenreRepository(JasmimDbContext context, IUnitOfWork unitOfWork) : RepositoryBase<MediaGenre>(context, unitOfWork), IMediaGenreRepository
    {
    }
}

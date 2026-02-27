using VoroSwipeEntertainment.Application.DTOs;
using VoroSwipeEntertainment.Application.Services.Interfaces.Base;
using VoroSwipeEntertainment.Domain.Entities;

namespace VoroSwipeEntertainment.Application.Services.Interfaces
{
    public interface IMediaGenreService : IServiceBase<MediaGenre>
    {
        Task<IEnumerable<MediaGenreDto>> GetAllAsync();
        Task<MediaGenreDto?> GetByIdAsync(Guid genreId, Guid mediaItemId);
        Task<MediaGenreDto> CreateAsync(MediaGenreDto model);
        Task<MediaGenreDto> UpdateAsync(Guid genreId, Guid mediaItemId, MediaGenreDto model);
        Task DeleteAsync(Guid genreId, Guid mediaItemId);
    }

}

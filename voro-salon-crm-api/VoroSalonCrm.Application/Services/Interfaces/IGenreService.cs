using VoroSwipeEntertainment.Application.DTOs;
using VoroSwipeEntertainment.Application.Services.Interfaces.Base;
using VoroSwipeEntertainment.Domain.Entities;

namespace VoroSwipeEntertainment.Application.Services.Interfaces
{
    public interface IGenreService : IServiceBase<Genre>
    {
        Task<IEnumerable<GenreDto>> GetAllAsync();
        Task<GenreDto?> GetByIdAsync(Guid id);
        Task<GenreDto> CreateAsync(GenreDto model);
        Task<GenreDto> UpdateAsync(Guid id, GenreDto model);
        Task DeleteAsync(Guid id);
    }

}

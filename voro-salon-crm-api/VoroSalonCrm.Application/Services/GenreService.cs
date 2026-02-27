using AutoMapper;
using Microsoft.EntityFrameworkCore;
using VoroSwipeEntertainment.Application.DTOs;
using VoroSwipeEntertainment.Application.Services.Base;
using VoroSwipeEntertainment.Application.Services.Interfaces;
using VoroSwipeEntertainment.Domain.Entities;
using VoroSwipeEntertainment.Domain.Interfaces.Repositories;

namespace VoroSwipeEntertainment.Application.Services
{
    public class GenreService(IGenreRepository genreRepository, IMapper mapper) : ServiceBase<Genre>(genreRepository), IGenreService
    {
        public async Task<GenreDto> CreateAsync(GenreDto dto)
        {
            var createGenreDto = mapper.Map<Genre>(dto);

            await base.AddAsync(createGenreDto);

            return mapper.Map<GenreDto>(createGenreDto);
        }

        public Task DeleteAsync(Guid id)
        {
            return base.DeleteAsync(id);
        }

        public async Task<IEnumerable<GenreDto>> GetAllAsync()
        {
            var genres = await base.Query()
                .ToListAsync();

            return mapper.Map<IEnumerable<GenreDto>>(genres);
        }

        public async Task<GenreDto?> GetByIdAsync(Guid id)
        {
            var genre = await base.Query()
                .Where(s => s.Id == id)
                .FirstOrDefaultAsync();

            return mapper.Map<GenreDto?>(genre);
        }

        public async Task<GenreDto> UpdateAsync(Guid id, GenreDto dto)
        {
            var existingGenre = await base.GetByIdAsync(id)
                ?? throw new KeyNotFoundException("Genre não encontrado");

            mapper.Map(dto, existingGenre);

            base.Update(existingGenre);

            return mapper.Map<GenreDto>(existingGenre);
        }
    }
}

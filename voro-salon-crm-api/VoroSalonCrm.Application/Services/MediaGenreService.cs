using AutoMapper;
using Microsoft.EntityFrameworkCore;
using VoroSwipeEntertainment.Application.DTOs;
using VoroSwipeEntertainment.Application.Services.Base;
using VoroSwipeEntertainment.Application.Services.Interfaces;
using VoroSwipeEntertainment.Domain.Entities;
using VoroSwipeEntertainment.Domain.Interfaces.Repositories;

namespace VoroSwipeEntertainment.Application.Services
{
    public class MediaGenreService(IMediaGenreRepository mediaGenreRepository, IMapper mapper) : ServiceBase<MediaGenre>(mediaGenreRepository), IMediaGenreService
    {
        public async Task<MediaGenreDto> CreateAsync(MediaGenreDto dto)
        {
            var createMediaGenreDto = mapper.Map<MediaGenre>(dto);

            await base.AddAsync(createMediaGenreDto);

            return mapper.Map<MediaGenreDto>(createMediaGenreDto);
        }

        public Task DeleteAsync(Guid genreId, Guid mediaItemId)
        {
            return base.DeleteAsync(genreId, mediaItemId);
        }

        public async Task<IEnumerable<MediaGenreDto>> GetAllAsync()
        {
            var mediaGenres = await base.Query()
                .ToListAsync();

            return mapper.Map<IEnumerable<MediaGenreDto>>(mediaGenres);
        }

        public async Task<MediaGenreDto?> GetByIdAsync(Guid genreId, Guid mediaItemId)
        {
            var mediaGenre = await base.Query()
                .Where(s => s.GenreId == genreId && s.MediaItemId == mediaItemId)
                .FirstOrDefaultAsync();

            return mapper.Map<MediaGenreDto?>(mediaGenre);
        }

        public async Task<MediaGenreDto> UpdateAsync(Guid genreId, Guid mediaItemId, MediaGenreDto dto)
        {
            var existingMediaGenre = await base.GetByIdAsync(genreId, mediaItemId)
                ?? throw new KeyNotFoundException("MediaGenre não encontrado");

            mapper.Map(dto, existingMediaGenre);

            base.Update(existingMediaGenre);

            return mapper.Map<MediaGenreDto>(existingMediaGenre);
        }
    }
}

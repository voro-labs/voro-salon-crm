using AutoMapper;
using Microsoft.EntityFrameworkCore;
using VoroSwipeEntertainment.Application.DTOs;
using VoroSwipeEntertainment.Application.Services.Base;
using VoroSwipeEntertainment.Application.Services.Interfaces;
using VoroSwipeEntertainment.Domain.Entities;
using VoroSwipeEntertainment.Domain.Interfaces.Repositories;

namespace VoroSwipeEntertainment.Application.Services
{
    public class MediaItemService(IMediaItemRepository mediaItemRepository, IMapper mapper) : ServiceBase<MediaItem>(mediaItemRepository), IMediaItemService
    {
        public async Task<MediaItemDto> CreateAsync(MediaItemDto dto)
        {
            var createMediaItemDto = mapper.Map<MediaItem>(dto);

            await base.AddAsync(createMediaItemDto);

            return mapper.Map<MediaItemDto>(createMediaItemDto);
        }

        public Task DeleteAsync(Guid id)
        {
            return base.DeleteAsync(id);
        }

        public async Task<IEnumerable<MediaItemDto>> GetAllAsync()
        {
            var mediaItems = await base.Query()
                .ToListAsync();

            return mapper.Map<IEnumerable<MediaItemDto>>(mediaItems);
        }

        public async Task<MediaItemDto?> GetByIdAsync(Guid id)
        {
            var mediaItem = await base.Query()
                .Where(s => s.Id == id)
                .FirstOrDefaultAsync();

            return mapper.Map<MediaItemDto?>(mediaItem);
        }

        public async Task<MediaItemDto> UpdateAsync(Guid id, MediaItemDto dto)
        {
            var existingMediaItem = await base.GetByIdAsync(id)
                ?? throw new KeyNotFoundException("MediaItem não encontrado");

            mapper.Map(dto, existingMediaItem);

            base.Update(existingMediaItem);

            return mapper.Map<MediaItemDto>(existingMediaItem);
        }
    }
}

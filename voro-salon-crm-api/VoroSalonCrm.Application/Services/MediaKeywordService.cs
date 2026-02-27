using AutoMapper;
using Microsoft.EntityFrameworkCore;
using VoroSwipeEntertainment.Application.DTOs;
using VoroSwipeEntertainment.Application.Services.Base;
using VoroSwipeEntertainment.Application.Services.Interfaces;
using VoroSwipeEntertainment.Domain.Entities;
using VoroSwipeEntertainment.Domain.Interfaces.Repositories;

namespace VoroSwipeEntertainment.Application.Services
{
    public class MediaKeywordService(IMediaKeywordRepository mediaKeywordRepository, IMapper mapper) : ServiceBase<MediaKeyword>(mediaKeywordRepository), IMediaKeywordService
    {
        public async Task<MediaKeywordDto> CreateAsync(MediaKeywordDto dto)
        {
            var createMediaKeywordDto = mapper.Map<MediaKeyword>(dto);

            await base.AddAsync(createMediaKeywordDto);

            return mapper.Map<MediaKeywordDto>(createMediaKeywordDto);
        }

        public Task DeleteAsync(Guid keywordId, Guid mediaItemId)
        {
            return base.DeleteAsync(keywordId, mediaItemId);
        }

        public async Task<IEnumerable<MediaKeywordDto>> GetAllAsync()
        {
            var mediaKeywords = await base.Query()
                .ToListAsync();

            return mapper.Map<IEnumerable<MediaKeywordDto>>(mediaKeywords);
        }

        public async Task<MediaKeywordDto?> GetByIdAsync(Guid keywordId, Guid mediaItemId)
        {
            var mediaKeyword = await base.Query()
                .Where(s => s.KeywordId == keywordId && s.MediaItemId == mediaItemId)
                .FirstOrDefaultAsync();

            return mapper.Map<MediaKeywordDto?>(mediaKeyword);
        }

        public async Task<MediaKeywordDto> UpdateAsync(Guid keywordId, Guid mediaItemId, MediaKeywordDto dto)
        {
            var existingMediaKeyword = await base.GetByIdAsync(keywordId, mediaItemId)
                ?? throw new KeyNotFoundException("MediaKeyword não encontrado");

            mapper.Map(dto, existingMediaKeyword);

            base.Update(existingMediaKeyword);

            return mapper.Map<MediaKeywordDto>(existingMediaKeyword);
        }
    }
}

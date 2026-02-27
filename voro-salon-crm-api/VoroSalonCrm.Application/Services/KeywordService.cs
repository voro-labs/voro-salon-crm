using AutoMapper;
using Microsoft.EntityFrameworkCore;
using VoroSwipeEntertainment.Application.DTOs;
using VoroSwipeEntertainment.Application.Services.Base;
using VoroSwipeEntertainment.Application.Services.Interfaces;
using VoroSwipeEntertainment.Domain.Entities;
using VoroSwipeEntertainment.Domain.Interfaces.Repositories;

namespace VoroSwipeEntertainment.Application.Services
{
    public class KeywordService(IKeywordRepository keywordRepository, IMapper mapper) : ServiceBase<Keyword>(keywordRepository), IKeywordService
    {
        public async Task<KeywordDto> CreateAsync(KeywordDto dto)
        {
            var createKeywordDto = mapper.Map<Keyword>(dto);

            await base.AddAsync(createKeywordDto);

            return mapper.Map<KeywordDto>(createKeywordDto);
        }

        public Task DeleteAsync(Guid id)
        {
            return base.DeleteAsync(id);
        }

        public async Task<IEnumerable<KeywordDto>> GetAllAsync()
        {
            var keywords = await base.Query()
                .ToListAsync();

            return mapper.Map<IEnumerable<KeywordDto>>(keywords);
        }

        public async Task<KeywordDto?> GetByIdAsync(Guid id)
        {
            var keyword = await base.Query()
                .Where(s => s.Id == id)
                .FirstOrDefaultAsync();

            return mapper.Map<KeywordDto?>(keyword);
        }

        public async Task<KeywordDto> UpdateAsync(Guid id, KeywordDto dto)
        {
            var existingKeyword = await base.GetByIdAsync(id)
                ?? throw new KeyNotFoundException("Keyword não encontrado");

            mapper.Map(dto, existingKeyword);

            base.Update(existingKeyword);

            return mapper.Map<KeywordDto>(existingKeyword);
        }
    }
}

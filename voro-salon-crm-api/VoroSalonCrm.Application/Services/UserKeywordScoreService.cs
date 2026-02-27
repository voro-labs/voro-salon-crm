using AutoMapper;
using Microsoft.EntityFrameworkCore;
using VoroSwipeEntertainment.Application.DTOs;
using VoroSwipeEntertainment.Application.Services.Base;
using VoroSwipeEntertainment.Application.Services.Interfaces;
using VoroSwipeEntertainment.Domain.Entities;
using VoroSwipeEntertainment.Domain.Interfaces.Repositories;

namespace VoroSwipeEntertainment.Application.Services
{
    public class UserKeywordScoreService(IUserKeywordScoreRepository userKeywordScoreRepository, IMapper mapper) : ServiceBase<UserKeywordScore>(userKeywordScoreRepository), IUserKeywordScoreService
    {
        public async Task<UserKeywordScoreDto> CreateAsync(UserKeywordScoreDto dto)
        {
            var createUserKeywordScoreDto = mapper.Map<UserKeywordScore>(dto);

            await base.AddAsync(createUserKeywordScoreDto);

            return mapper.Map<UserKeywordScoreDto>(createUserKeywordScoreDto);
        }

        public Task DeleteAsync(Guid id)
        {
            return base.DeleteAsync(id);
        }

        public async Task<IEnumerable<UserKeywordScoreDto>> GetAllAsync()
        {
            var userKeywordScores = await base.Query()
                .ToListAsync();

            return mapper.Map<IEnumerable<UserKeywordScoreDto>>(userKeywordScores);
        }

        public async Task<UserKeywordScoreDto?> GetByIdAsync(Guid id)
        {
            var userKeywordScore = await base.Query()
                .Where(s => s.Id == id)
                .FirstOrDefaultAsync();

            return mapper.Map<UserKeywordScoreDto?>(userKeywordScore);
        }

        public async Task<UserKeywordScoreDto> UpdateAsync(Guid id, UserKeywordScoreDto dto)
        {
            var existingUserKeywordScore = await base.GetByIdAsync(id)
                ?? throw new KeyNotFoundException("UserKeywordScore não encontrado");

            mapper.Map(dto, existingUserKeywordScore);

            base.Update(existingUserKeywordScore);

            return mapper.Map<UserKeywordScoreDto>(existingUserKeywordScore);
        }
    }
}

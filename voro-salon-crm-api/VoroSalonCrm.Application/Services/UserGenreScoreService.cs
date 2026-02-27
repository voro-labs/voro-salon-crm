using AutoMapper;
using Microsoft.EntityFrameworkCore;
using VoroSwipeEntertainment.Application.DTOs;
using VoroSwipeEntertainment.Application.Services.Base;
using VoroSwipeEntertainment.Application.Services.Interfaces;
using VoroSwipeEntertainment.Domain.Entities;
using VoroSwipeEntertainment.Domain.Interfaces.Repositories;

namespace VoroSwipeEntertainment.Application.Services
{
    public class UserGenreScoreService(IUserGenreScoreRepository userGenreScoreRepository, IMapper mapper) : ServiceBase<UserGenreScore>(userGenreScoreRepository), IUserGenreScoreService
    {
        public async Task<UserGenreScoreDto> CreateAsync(UserGenreScoreDto dto)
        {
            var createUserGenreScoreDto = mapper.Map<UserGenreScore>(dto);

            await base.AddAsync(createUserGenreScoreDto);

            return mapper.Map<UserGenreScoreDto>(createUserGenreScoreDto);
        }

        public Task DeleteAsync(Guid id)
        {
            return base.DeleteAsync(id);
        }

        public async Task<IEnumerable<UserGenreScoreDto>> GetAllAsync()
        {
            var userGenreScores = await base.Query()
                .ToListAsync();

            return mapper.Map<IEnumerable<UserGenreScoreDto>>(userGenreScores);
        }

        public async Task<UserGenreScoreDto?> GetByIdAsync(Guid id)
        {
            var userGenreScore = await base.Query()
                .Where(s => s.Id == id)
                .FirstOrDefaultAsync();

            return mapper.Map<UserGenreScoreDto?>(userGenreScore);
        }

        public async Task<UserGenreScoreDto> UpdateAsync(Guid id, UserGenreScoreDto dto)
        {
            var existingUserGenreScore = await base.GetByIdAsync(id)
                ?? throw new KeyNotFoundException("UserGenreScore não encontrado");

            mapper.Map(dto, existingUserGenreScore);

            base.Update(existingUserGenreScore);

            return mapper.Map<UserGenreScoreDto>(existingUserGenreScore);
        }
    }
}

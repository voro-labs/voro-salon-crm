using AutoMapper;
using Microsoft.EntityFrameworkCore;
using VoroSwipeEntertainment.Application.DTOs;
using VoroSwipeEntertainment.Application.Services.Base;
using VoroSwipeEntertainment.Application.Services.Interfaces;
using VoroSwipeEntertainment.Domain.Entities;
using VoroSwipeEntertainment.Domain.Interfaces.Repositories;

namespace VoroSwipeEntertainment.Application.Services
{
    public class UserMediaInteractionService(IUserMediaInteractionRepository userMediaInteractionRepository, IMapper mapper) : ServiceBase<UserMediaInteraction>(userMediaInteractionRepository), IUserMediaInteractionService
    {
        public async Task<UserMediaInteractionDto> CreateAsync(UserMediaInteractionDto dto)
        {
            var createUserMediaInteractionDto = mapper.Map<UserMediaInteraction>(dto);

            await base.AddAsync(createUserMediaInteractionDto);

            return mapper.Map<UserMediaInteractionDto>(createUserMediaInteractionDto);
        }

        public Task DeleteAsync(Guid id)
        {
            return base.DeleteAsync(id);
        }

        public async Task<IEnumerable<UserMediaInteractionDto>> GetAllAsync()
        {
            var userMediaInteractions = await base.Query()
                .ToListAsync();

            return mapper.Map<IEnumerable<UserMediaInteractionDto>>(userMediaInteractions);
        }

        public async Task<UserMediaInteractionDto?> GetByIdAsync(Guid id)
        {
            var userMediaInteraction = await base.Query()
                .Where(s => s.Id == id)
                .FirstOrDefaultAsync();

            return mapper.Map<UserMediaInteractionDto?>(userMediaInteraction);
        }

        public async Task<UserMediaInteractionDto> UpdateAsync(Guid id, UserMediaInteractionDto dto)
        {
            var existingUserMediaInteraction = await base.GetByIdAsync(id)
                ?? throw new KeyNotFoundException("UserMediaInteraction não encontrado");

            mapper.Map(dto, existingUserMediaInteraction);

            base.Update(existingUserMediaInteraction);

            return mapper.Map<UserMediaInteractionDto>(existingUserMediaInteraction);
        }
    }
}

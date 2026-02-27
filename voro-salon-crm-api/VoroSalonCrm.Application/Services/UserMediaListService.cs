using AutoMapper;
using Microsoft.EntityFrameworkCore;
using VoroSwipeEntertainment.Application.DTOs;
using VoroSwipeEntertainment.Application.Services.Base;
using VoroSwipeEntertainment.Application.Services.Interfaces;
using VoroSwipeEntertainment.Domain.Entities;
using VoroSwipeEntertainment.Domain.Interfaces.Repositories;

namespace VoroSwipeEntertainment.Application.Services
{
    public class UserMediaListService(IUserMediaListRepository userMediaListRepository, IMapper mapper) : ServiceBase<UserMediaList>(userMediaListRepository), IUserMediaListService
    {
        public async Task<UserMediaListDto> CreateAsync(UserMediaListDto dto)
        {
            var createUserMediaListDto = mapper.Map<UserMediaList>(dto);

            await base.AddAsync(createUserMediaListDto);

            return mapper.Map<UserMediaListDto>(createUserMediaListDto);
        }

        public Task DeleteAsync(Guid id)
        {
            return base.DeleteAsync(id);
        }

        public async Task<IEnumerable<UserMediaListDto>> GetAllAsync()
        {
            var userMediaLists = await base.Query()
                .ToListAsync();

            return mapper.Map<IEnumerable<UserMediaListDto>>(userMediaLists);
        }

        public async Task<UserMediaListDto?> GetByIdAsync(Guid id)
        {
            var userMediaList = await base.Query()
                .Where(s => s.Id == id)
                .FirstOrDefaultAsync();

            return mapper.Map<UserMediaListDto?>(userMediaList);
        }

        public async Task<UserMediaListDto> UpdateAsync(Guid id, UserMediaListDto dto)
        {
            var existingUserMediaList = await base.GetByIdAsync(id)
                ?? throw new KeyNotFoundException("UserMediaList não encontrado");

            mapper.Map(dto, existingUserMediaList);

            base.Update(existingUserMediaList);

            return mapper.Map<UserMediaListDto>(existingUserMediaList);
        }
    }
}

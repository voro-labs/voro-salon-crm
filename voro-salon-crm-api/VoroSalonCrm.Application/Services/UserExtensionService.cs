using AutoMapper;
using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Application.Services.Base;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using System.Collections.Concurrent;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class UserExtensionService(IUserExtensionRepository userExtensionRepository, IMapper mapper) : ServiceBase<UserExtension>(userExtensionRepository), IUserExtensionService
    {

        public async Task<UserExtensionDto> CreateAsync(UserExtensionDto dto)
        {
            var createUserExtensionDto = mapper.Map<UserExtension>(dto);

            await base.AddAsync(createUserExtensionDto);

            return mapper.Map<UserExtensionDto>(createUserExtensionDto);
        }

        public Task DeleteAsync(Guid id)
        {
            return base.DeleteAsync(id);
        }

        public async Task<IEnumerable<UserExtensionDto>> GetAllAsync()
        {
            var userExtensions = await base.Query()
                .ToListAsync();

            return mapper.Map<IEnumerable<UserExtensionDto>>(userExtensions);
        }

        public async Task<UserExtensionDto?> GetByIdAsync(Guid id)
        {
            var userExtension = await base.Query()
                .Where(s => s.UserId == id)
                .FirstOrDefaultAsync();

            return mapper.Map<UserExtensionDto?>(userExtension);
        }

        public async Task<UserExtensionDto> UpdateAsync(Guid id, UserExtensionDto dto)
        {
            var existingUserExtension = await base.GetByIdAsync(id)
                ?? throw new KeyNotFoundException("UserExtension não encontrado");

            mapper.Map(dto, existingUserExtension);

            base.Update(existingUserExtension);

            return mapper.Map<UserExtensionDto>(existingUserExtension);
        }
    }
}
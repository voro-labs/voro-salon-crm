using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class TimeSlotBlockService(
        ITimeSlotBlockRepository repository,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService) : ITimeSlotBlockService
    {
        private readonly ITimeSlotBlockRepository _repository = repository;
        private readonly IUnitOfWork _unitOfWork = unitOfWork;
        private readonly ICurrentUserService _currentUserService = currentUserService;

        public async Task<IEnumerable<TimeSlotBlockDto>> GetAllAsync()
        {
            var blocks = await _repository.Query(_ => true).OrderBy(b => b.StartDateTime).ToListAsync();
            return blocks.Select(MapToDto);
        }

        public async Task<TimeSlotBlockDto> CreateAsync(CreateTimeSlotBlockDto dto)
        {
            if (dto.EndDateTime <= dto.StartDateTime)
                throw new ArgumentException("EndDateTime must be after StartDateTime.");

            var tenantId = _currentUserService.TenantId;
            if (tenantId == Guid.Empty)
                throw new UnauthorizedAccessException("Tenant invalid or not found in context.");

            var block = new TimeSlotBlock
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                StartDateTime = dto.StartDateTime,
                EndDateTime = dto.EndDateTime,
                Reason = dto.Reason,
                ClientMessage = dto.ClientMessage,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await _repository.AddAsync(block);
            await _unitOfWork.SaveChangesAsync();

            return MapToDto(block);
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var block = await _repository.GetByIdAsync(false, id);
            if (block == null) return false;

            _repository.Delete(block);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<TimeSlotBlockDto>> GetOverlappingAsync(DateTimeOffset start, DateTimeOffset end)
        {
            var blocks = await _repository.Query(b =>
                b.StartDateTime < end && b.EndDateTime > start)
                .ToListAsync();
            return blocks.Select(MapToDto);
        }

        private static TimeSlotBlockDto MapToDto(TimeSlotBlock b) =>
            new(b.Id, b.StartDateTime, b.EndDateTime, b.Reason, b.ClientMessage, b.CreatedAt);
    }
}

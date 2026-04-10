using VoroSalonCrm.Application.DTOs.Tenant;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class TenantBusinessHoursService(
        ITenantBusinessHoursRepository repository,
        ICurrentUserService currentUserService,
        IUnitOfWork unitOfWork) : ITenantBusinessHoursService
    {
        public async Task<IEnumerable<BusinessHoursDayDto>> GetAsync()
        {
            var tenantId = currentUserService.TenantId;
            var hours = await repository.GetByTenantAsync(tenantId);
            return hours.Select(MapToDto);
        }

        public async Task<IEnumerable<BusinessHoursDayDto>> UpsertAsync(UpsertBusinessHoursDto dto)
        {
            var tenantId = currentUserService.TenantId;
            if (tenantId == Guid.Empty)
                throw new UnauthorizedAccessException("Tenant invalid or not found in context.");

            var existing = (await repository.GetByTenantAsync(tenantId, false)).ToList();

            foreach (var day in dto.Days)
            {
                var record = existing.FirstOrDefault(h => h.DayOfWeek == day.DayOfWeek);
                
                if (record == null)
                {
                    record = new TenantBusinessHours
                    {
                        Id = Guid.NewGuid(),
                        TenantId = tenantId,
                        DayOfWeek = day.DayOfWeek,
                    };
                    await repository.AddAsync(record);
                    existing.Add(record);
                }

                record.IsOpen = day.IsOpen;

                await repository.DeleteRangesByBusinessHoursIdAsync(record.Id);

                var newRanges = (day.Ranges ?? []).Select((r, i) => new TenantBusinessHoursRange
                {
                    Id = Guid.NewGuid(),
                    BusinessHoursId = record.Id,
                    OpenTime = r.OpenTime,
                    CloseTime = r.CloseTime,
                    SortOrder = i
                });

                await repository.AddRangesAsync(newRanges);
            }

            await unitOfWork.SaveChangesAsync();

            var updated = await repository.GetByTenantAsync(tenantId);
            return updated.Select(MapToDto);
        }

        private static BusinessHoursDayDto MapToDto(TenantBusinessHours h)
        {
            var ranges = h.Ranges
                .OrderBy(r => r.SortOrder)
                .Select(r => new TimeRangeDto(r.OpenTime, r.CloseTime))
                .ToList();

            if (ranges.Count == 0)
                ranges.Add(new TimeRangeDto("08:00", "18:00"));

            return new BusinessHoursDayDto(h.DayOfWeek, h.IsOpen, ranges);
        }
    }
}

using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.DTOs.Employee;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class EmployeeGoalService(
        IEmployeeGoalRepository goalRepository,
        IAppointmentRepository appointmentRepository,
        ICurrentUserService currentUserService,
        IUnitOfWork unitOfWork) : IEmployeeGoalService
    {
        public async Task<EmployeeGoalDto?> GetAsync(Guid employeeId, int month, int year)
        {
            var tenantId = currentUserService.TenantId;
            var goal = await goalRepository
                .Query(g => g.TenantId == tenantId && g.EmployeeId == employeeId && g.Month == month && g.Year == year)
                .Include(g => g.Employee)
                .FirstOrDefaultAsync();

            if (goal == null) return null;
            return await BuildDtoAsync(goal, month, year);
        }

        public async Task<IEnumerable<EmployeeGoalDto>> GetAllByEmployeeAsync(Guid employeeId)
        {
            var tenantId = currentUserService.TenantId;
            var goals = await goalRepository
                .Query(g => g.TenantId == tenantId && g.EmployeeId == employeeId)
                .Include(g => g.Employee)
                .OrderByDescending(g => g.Year).ThenByDescending(g => g.Month)
                .ToListAsync();

            var dtos = new List<EmployeeGoalDto>();
            foreach (var g in goals)
                dtos.Add(await BuildDtoAsync(g, g.Month, g.Year));

            return dtos;
        }

        public async Task<EmployeeGoalDto> CreateAsync(CreateEmployeeGoalDto dto)
        {
            var tenantId = currentUserService.TenantId;

            var existing = await goalRepository
                .Query(g => g.TenantId == tenantId && g.EmployeeId == dto.EmployeeId && g.Month == dto.Month && g.Year == dto.Year)
                .FirstOrDefaultAsync();

            if (existing != null)
                throw new InvalidOperationException("Já existe uma meta para este profissional neste mês/ano.");

            var goal = new EmployeeGoal
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                EmployeeId = dto.EmployeeId,
                Month = dto.Month,
                Year = dto.Year,
                TargetAmount = dto.TargetAmount,
                TargetAppointments = dto.TargetAppointments,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await goalRepository.AddAsync(goal);
            await unitOfWork.SaveChangesAsync();

            var created = await goalRepository
                .Query(g => g.Id == goal.Id)
                .Include(g => g.Employee)
                .FirstAsync();

            return await BuildDtoAsync(created, dto.Month, dto.Year);
        }

        public async Task<EmployeeGoalDto> UpdateAsync(Guid id, UpdateEmployeeGoalDto dto)
        {
            var goal = await goalRepository
                .Query(g => g.Id == id)
                .Include(g => g.Employee)
                .FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException($"Meta '{id}' não encontrada.");

            goal.TargetAmount = dto.TargetAmount;
            goal.TargetAppointments = dto.TargetAppointments;
            goal.UpdatedAt = DateTimeOffset.UtcNow;

            goalRepository.Update(goal);
            await unitOfWork.SaveChangesAsync();

            return await BuildDtoAsync(goal, goal.Month, goal.Year);
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var goal = await goalRepository.GetByIdAsync(false, id);
            if (goal == null) return false;

            goalRepository.Delete(goal);
            await unitOfWork.SaveChangesAsync();
            return true;
        }

        private async Task<EmployeeGoalDto> BuildDtoAsync(EmployeeGoal goal, int month, int year)
        {
            var tenantId = goal.TenantId;

            var startUtc = new DateTimeOffset(year, month, 1, 0, 0, 0, TimeSpan.Zero);
            var endUtc = startUtc.AddMonths(1);

            // Usa os agendamentos concluídos para calcular valor e quantidade real
            var completedAppointments = await appointmentRepository
                .Query(a => a.TenantId == tenantId && a.EmployeeId == goal.EmployeeId
                    && a.Status == AppointmentStatus.Completed
                    && a.ScheduledDateTime >= startUtc && a.ScheduledDateTime < endUtc)
                .ToListAsync();

            var actualAmount = completedAppointments.Sum(a => a.Amount);
            var actualAppointments = completedAppointments.Count;

            var amountProgress = goal.TargetAmount > 0
                ? Math.Min(100, (double)(actualAmount / goal.TargetAmount) * 100)
                : 0;

            var appointmentsProgress = goal.TargetAppointments > 0
                ? Math.Min(100, (double)actualAppointments / goal.TargetAppointments * 100)
                : 0;

            return new EmployeeGoalDto(
                goal.Id,
                goal.EmployeeId,
                goal.Employee?.Name ?? "Profissional",
                goal.Month,
                goal.Year,
                goal.TargetAmount,
                goal.TargetAppointments,
                actualAmount,
                actualAppointments,
                Math.Round(amountProgress, 1),
                Math.Round(appointmentsProgress, 1)
            );
        }
    }
}

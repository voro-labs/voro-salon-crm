using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class ClientMembershipService(
        IClientMembershipPlanRepository planRepository,
        IClientMembershipRepository membershipRepository,
        IClientRepository clientRepository,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService) : IClientMembershipService
    {
        private Guid TenantId => currentUserService.TenantId;

        // ── Plans ──────────────────────────────────────────────

        public async Task<IEnumerable<ClientMembershipPlanDto>> GetAllPlansAsync()
        {
            var plans = await planRepository
                .Query(p => p.TenantId == TenantId)
                .OrderBy(p => p.Price)
                .ToListAsync();

            var membershipCounts = await membershipRepository
                .Query(m => m.TenantId == TenantId && m.Status == ClientMembershipStatus.Active)
                .GroupBy(m => m.PlanId)
                .Select(g => new { PlanId = g.Key, Count = g.Count() })
                .ToListAsync();

            return plans.Select(p => MapPlanToDto(p,
                membershipCounts.FirstOrDefault(c => c.PlanId == p.Id)?.Count ?? 0));
        }

        public async Task<ClientMembershipPlanDto> CreatePlanAsync(CreateClientMembershipPlanDto dto)
        {
            var plan = new ClientMembershipPlan
            {
                Id = Guid.NewGuid(),
                TenantId = TenantId,
                Name = dto.Name,
                Description = dto.Description,
                Price = dto.Price,
                Sessions = dto.Sessions,
                DurationDays = dto.DurationDays,
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow,
            };

            await planRepository.AddAsync(plan);
            await unitOfWork.SaveChangesAsync();
            return MapPlanToDto(plan, 0);
        }

        public async Task<ClientMembershipPlanDto> UpdatePlanAsync(Guid id, UpdateClientMembershipPlanDto dto)
        {
            var plan = await planRepository.GetByIdAsync(false, id)
                ?? throw new KeyNotFoundException("Plan not found.");

            plan.Name = dto.Name;
            plan.Description = dto.Description;
            plan.Price = dto.Price;
            plan.Sessions = dto.Sessions;
            plan.DurationDays = dto.DurationDays;
            plan.IsActive = dto.IsActive;

            planRepository.Update(plan);
            await unitOfWork.SaveChangesAsync();

            var activeCount = await membershipRepository
                .Query(m => m.PlanId == id && m.Status == ClientMembershipStatus.Active)
                .CountAsync();

            return MapPlanToDto(plan, activeCount);
        }

        public async Task<bool> DeletePlanAsync(Guid id)
        {
            var plan = await planRepository.GetByIdAsync(false, id);
            if (plan == null) return false;

            planRepository.Delete(plan);
            await unitOfWork.SaveChangesAsync();
            return true;
        }

        // ── Memberships ────────────────────────────────────────

        public async Task<IEnumerable<ClientMembershipDto>> GetAllMembershipsAsync()
        {
            var memberships = await membershipRepository
                .Query(m => m.TenantId == TenantId)
                .Include(m => m.Client)
                .Include(m => m.Plan)
                .OrderByDescending(m => m.StartDate)
                .ToListAsync();

            return memberships.Select(MapMembershipToDto);
        }

        public async Task<IEnumerable<ClientMembershipDto>> GetByClientAsync(Guid clientId)
        {
            var memberships = await membershipRepository
                .Query(m => m.TenantId == TenantId && m.ClientId == clientId)
                .Include(m => m.Client)
                .Include(m => m.Plan)
                .OrderByDescending(m => m.StartDate)
                .ToListAsync();

            return memberships.Select(MapMembershipToDto);
        }

        public async Task<ClientMembershipDto> CreateMembershipAsync(CreateClientMembershipDto dto)
        {
            var plan = await planRepository.GetByIdAsync(true, dto.PlanId)
                ?? throw new KeyNotFoundException("Plan not found.");

            var client = await clientRepository.GetByIdAsync(true, dto.ClientId)
                ?? throw new KeyNotFoundException("Client not found.");

            var membership = new ClientMembership
            {
                Id = Guid.NewGuid(),
                TenantId = TenantId,
                ClientId = dto.ClientId,
                PlanId = dto.PlanId,
                StartDate = dto.StartDate,
                EndDate = dto.StartDate.AddDays(plan.DurationDays),
                RemainingSessions = plan.Sessions,
                Status = ClientMembershipStatus.Active,
                Notes = dto.Notes,
                CreatedAt = DateTimeOffset.UtcNow,
            };

            await membershipRepository.AddAsync(membership);
            await unitOfWork.SaveChangesAsync();

            membership.Client = client;
            membership.Plan = plan;

            return MapMembershipToDto(membership);
        }

        public async Task<bool> CancelMembershipAsync(Guid id)
        {
            var membership = await membershipRepository.GetByIdAsync(false, id);
            if (membership == null) return false;

            membership.Status = ClientMembershipStatus.Cancelled;
            membership.UpdatedAt = DateTimeOffset.UtcNow;
            membershipRepository.Update(membership);
            await unitOfWork.SaveChangesAsync();
            return true;
        }

        // ── Mappers ────────────────────────────────────────────

        private static ClientMembershipPlanDto MapPlanToDto(ClientMembershipPlan p, int activeMemberships) =>
            new(p.Id, p.Name, p.Description, p.Price, p.Sessions, p.DurationDays, p.IsActive, activeMemberships);

        private static ClientMembershipDto MapMembershipToDto(ClientMembership m) =>
            new(m.Id, m.ClientId, m.Client.Name, m.PlanId, m.Plan.Name, m.Plan.Price,
                m.StartDate, m.EndDate, m.RemainingSessions, m.Plan.Sessions,
                m.Status.ToString(), m.Notes);
    }
}

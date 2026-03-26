using VoroSalonCrm.Application.DTOs.CRM;

namespace VoroSalonCrm.Application.Services.Interfaces
{
    public interface IClientMembershipService
    {
        // Plans
        Task<IEnumerable<ClientMembershipPlanDto>> GetAllPlansAsync();
        Task<ClientMembershipPlanDto> CreatePlanAsync(CreateClientMembershipPlanDto dto);
        Task<ClientMembershipPlanDto> UpdatePlanAsync(Guid id, UpdateClientMembershipPlanDto dto);
        Task<bool> DeletePlanAsync(Guid id);

        // Memberships
        Task<IEnumerable<ClientMembershipDto>> GetAllMembershipsAsync();
        Task<IEnumerable<ClientMembershipDto>> GetByClientAsync(Guid clientId);
        Task<ClientMembershipDto> CreateMembershipAsync(CreateClientMembershipDto dto);
        Task<bool> CancelMembershipAsync(Guid id);
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Shared.Extensions;
using VoroSalonCrm.Shared.ViewModels;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/[controller]")]
    [Tags("CRM")]
    [ApiController]
    [Authorize]
    public class ClientMembershipsController(IClientMembershipService service) : ControllerBase
    {
        // ── Plans ──────────────────────────────────────────────

        [HttpGet("plans")]
        public async Task<IActionResult> GetPlans()
        {
            try
            {
                var result = await service.GetAllPlansAsync();
                return ResponseViewModel<IEnumerable<ClientMembershipPlanDto>>.Success(result).ToActionResult();
            }
            catch (Exception ex) { return ResponseViewModel<object>.Fail(ex.Message).ToActionResult(); }
        }

        [HttpPost("plans")]
        public async Task<IActionResult> CreatePlan(CreateClientMembershipPlanDto dto)
        {
            try
            {
                var result = await service.CreatePlanAsync(dto);
                return ResponseViewModel<ClientMembershipPlanDto>.SuccessWithMessage("Plan created.", result).ToActionResult();
            }
            catch (Exception ex) { return ResponseViewModel<object>.Fail(ex.Message).ToActionResult(); }
        }

        [HttpPut("plans/{id:guid}")]
        public async Task<IActionResult> UpdatePlan(Guid id, UpdateClientMembershipPlanDto dto)
        {
            try
            {
                var result = await service.UpdatePlanAsync(id, dto);
                return ResponseViewModel<ClientMembershipPlanDto>.SuccessWithMessage("Plan updated.", result).ToActionResult();
            }
            catch (KeyNotFoundException) { return ResponseViewModel<object>.Fail("Plan not found.").ToActionResult(); }
            catch (Exception ex) { return ResponseViewModel<object>.Fail(ex.Message).ToActionResult(); }
        }

        [HttpDelete("plans/{id:guid}")]
        public async Task<IActionResult> DeletePlan(Guid id)
        {
            try
            {
                var result = await service.DeletePlanAsync(id);
                if (!result) return ResponseViewModel<object>.Fail("Plan not found.").ToActionResult();
                return ResponseViewModel<object>.SuccessWithMessage("Plan deleted.", null).ToActionResult();
            }
            catch (Exception ex) { return ResponseViewModel<object>.Fail(ex.Message).ToActionResult(); }
        }

        // ── Memberships ────────────────────────────────────────

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var result = await service.GetAllMembershipsAsync();
                return ResponseViewModel<IEnumerable<ClientMembershipDto>>.Success(result).ToActionResult();
            }
            catch (Exception ex) { return ResponseViewModel<object>.Fail(ex.Message).ToActionResult(); }
        }

        [HttpGet("client/{clientId:guid}")]
        public async Task<IActionResult> GetByClient(Guid clientId)
        {
            try
            {
                var result = await service.GetByClientAsync(clientId);
                return ResponseViewModel<IEnumerable<ClientMembershipDto>>.Success(result).ToActionResult();
            }
            catch (Exception ex) { return ResponseViewModel<object>.Fail(ex.Message).ToActionResult(); }
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateClientMembershipDto dto)
        {
            try
            {
                var result = await service.CreateMembershipAsync(dto);
                return ResponseViewModel<ClientMembershipDto>.SuccessWithMessage("Membership created.", result).ToActionResult();
            }
            catch (KeyNotFoundException ex) { return ResponseViewModel<object>.Fail(ex.Message).ToActionResult(); }
            catch (Exception ex) { return ResponseViewModel<object>.Fail(ex.Message).ToActionResult(); }
        }

        [HttpPatch("{id:guid}/cancel")]
        public async Task<IActionResult> Cancel(Guid id)
        {
            try
            {
                var result = await service.CancelMembershipAsync(id);
                if (!result) return ResponseViewModel<object>.Fail("Membership not found.").ToActionResult();
                return ResponseViewModel<object>.SuccessWithMessage("Membership cancelled.", null).ToActionResult();
            }
            catch (Exception ex) { return ResponseViewModel<object>.Fail(ex.Message).ToActionResult(); }
        }
    }
}

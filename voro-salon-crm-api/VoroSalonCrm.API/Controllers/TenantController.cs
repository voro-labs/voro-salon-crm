using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSalonCrm.Application.DTOs.Tenant;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Shared.Extensions;
using VoroSalonCrm.Shared.ViewModels;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/[controller]")]
    [Tags("Tenant")]
    [ApiController]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public class TenantController(ITenantService tenantService) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var tenants = await tenantService.GetAllAsync();

                return ResponseViewModel<IEnumerable<TenantDto>>
                    .SuccessWithMessage("Tenants retrieved.", tenants.Select(t => new TenantDto(
                        t.Id, t.Name, t.Slug, t.IsActive, t.CreatedAt)))
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById([FromRoute] Guid id)
        {
            try
            {
                var tenant = await tenantService.GetByIdAsync(id);
                if (tenant is null)
                    return ResponseViewModel<object>.Fail("Tenant not found.").ToActionResult();

                return ResponseViewModel<TenantDto>
                    .SuccessWithMessage("Tenant retrieved.", new TenantDto(
                        tenant.Id, tenant.Name, tenant.Slug, tenant.IsActive, tenant.CreatedAt))
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTenantDto dto)
        {
            try
            {
                var tenant = await tenantService.CreateAsync(dto);

                return ResponseViewModel<TenantDto>
                    .SuccessWithMessage("Tenant created.", new TenantDto(
                        tenant.Id, tenant.Name, tenant.Slug, tenant.IsActive, tenant.CreatedAt))
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update([FromRoute] Guid id, [FromBody] UpdateTenantDto dto)
        {
            try
            {
                var tenant = await tenantService.UpdateAsync(id, dto);

                return ResponseViewModel<TenantDto>
                    .SuccessWithMessage("Tenant updated.", new TenantDto(
                        tenant.Id, tenant.Name, tenant.Slug, tenant.IsActive, tenant.CreatedAt))
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete([FromRoute] Guid id)
        {
            try
            {
                var deleted = await tenantService.DeleteAsync(id);
                if (!deleted)
                    return ResponseViewModel<object>.Fail("Tenant not found.").ToActionResult();

                return ResponseViewModel<object>
                    .SuccessWithMessage("Tenant deleted.", null)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }
    }
}

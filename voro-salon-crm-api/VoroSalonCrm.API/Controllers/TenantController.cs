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
    [Authorize]
    public class TenantController(ITenantService tenantService, ICurrentUserService currentUserService) : ControllerBase
    {
        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentTenant()
        {
            try
            {
                var tenantId = currentUserService.TenantId;
                if (tenantId == Guid.Empty)
                    return ResponseViewModel<object>.Fail("No tenant associated to the current user.").ToActionResult();

                var tenant = await tenantService.GetByIdAsync(tenantId);
                if (tenant is null)
                    return ResponseViewModel<object>.Fail("Tenant not found.").ToActionResult();

                var dto = new TenantDto(
                    tenant.Id, tenant.Name, tenant.Slug, tenant.IsActive, tenant.CreatedAt,
                    tenant.LogoUrl, tenant.PrimaryColor, tenant.SecondaryColor, tenant.ContactPhone, tenant.ContactEmail, tenant.ThemeMode);

                return ResponseViewModel<TenantDto>.SuccessWithMessage("Current tenant retrieved.", dto).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPut("me")]
        public async Task<IActionResult> UpdateCurrentTenant([FromBody] UpdateTenantDto dto)
        {
            try
            {
                var tenantId = currentUserService.TenantId;
                if (tenantId == Guid.Empty)
                    return ResponseViewModel<object>.Fail("No tenant associated to the current user.").ToActionResult();

                var tenant = await tenantService.UpdateAsync(tenantId, dto);

                var responseDto = new TenantDto(
                    tenant.Id, tenant.Name, tenant.Slug, tenant.IsActive, tenant.CreatedAt,
                    tenant.LogoUrl, tenant.PrimaryColor, tenant.SecondaryColor, tenant.ContactPhone, tenant.ContactEmail, tenant.ThemeMode);

                return ResponseViewModel<TenantDto>.SuccessWithMessage("Current tenant updated.", responseDto).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var tenants = await tenantService.GetAllAsync();

                return ResponseViewModel<IEnumerable<TenantDto>>
                    .SuccessWithMessage("Tenants retrieved.", tenants.Select(t => new TenantDto(
                        t.Id, t.Name, t.Slug, t.IsActive, t.CreatedAt,
                        t.LogoUrl, t.PrimaryColor, t.SecondaryColor, t.ContactPhone, t.ContactEmail, t.ThemeMode)))
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
                        tenant.Id, tenant.Name, tenant.Slug, tenant.IsActive, tenant.CreatedAt,
                        tenant.LogoUrl, tenant.PrimaryColor, tenant.SecondaryColor, tenant.ContactPhone, tenant.ContactEmail, tenant.ThemeMode))
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
                        tenant.Id, tenant.Name, tenant.Slug, tenant.IsActive, tenant.CreatedAt,
                        tenant.LogoUrl, tenant.PrimaryColor, tenant.SecondaryColor, tenant.ContactPhone, tenant.ContactEmail, tenant.ThemeMode))
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
                        tenant.Id, tenant.Name, tenant.Slug, tenant.IsActive, tenant.CreatedAt,
                        tenant.LogoUrl, tenant.PrimaryColor, tenant.SecondaryColor, tenant.ContactPhone, tenant.ContactEmail, tenant.ThemeMode))
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

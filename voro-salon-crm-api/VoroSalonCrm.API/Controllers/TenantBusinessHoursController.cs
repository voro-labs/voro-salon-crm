using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSalonCrm.Application.DTOs.Tenant;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Shared.Extensions;
using VoroSalonCrm.Shared.ViewModels;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/tenant/me/business-hours")]
    [Tags("Tenant")]
    [ApiController]
    [Authorize(Roles = "Owner,SalonOwner")]
    public class TenantBusinessHoursController(ITenantBusinessHoursService service) : ControllerBase
    {
        private readonly ITenantBusinessHoursService _service = service;

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            try
            {
                var result = await _service.GetAsync();
                return ResponseViewModel<IEnumerable<BusinessHoursDayDto>>.Success(result).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPut]
        public async Task<IActionResult> Upsert(UpsertBusinessHoursDto dto)
        {
            try
            {
                var result = await _service.UpsertAsync(dto);
                return ResponseViewModel<IEnumerable<BusinessHoursDayDto>>
                    .SuccessWithMessage("Business hours updated.", result)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }
    }
}

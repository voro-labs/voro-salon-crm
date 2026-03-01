using Asp.Versioning;
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
    public class ServiceRecordController(IServiceRecordService serviceRecordService) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] Guid? clientId)
        {
            try
            {
                var records = clientId.HasValue
                    ? await serviceRecordService.GetByClientIdAsync(clientId.Value)
                    : await serviceRecordService.GetAllAsync();

                return ResponseViewModel<IEnumerable<ServiceRecordDto>>
                    .SuccessWithMessage("Service records retrieved.", records)
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
                var record = await serviceRecordService.GetByIdAsync(id);
                if (record is null)
                    return ResponseViewModel<object>.Fail("Service record not found.").ToActionResult();

                return ResponseViewModel<ServiceRecordDto>
                    .SuccessWithMessage("Service record retrieved.", record)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateServiceRecordDto dto)
        {
            try
            {
                var record = await serviceRecordService.CreateAsync(dto);

                return ResponseViewModel<ServiceRecordDto>
                    .SuccessWithMessage("Service record created.", record)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update([FromRoute] Guid id, [FromBody] UpdateServiceRecordDto dto)
        {
            try
            {
                var record = await serviceRecordService.UpdateAsync(id, dto);

                return ResponseViewModel<ServiceRecordDto>
                    .SuccessWithMessage("Service record updated.", record)
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
                var deleted = await serviceRecordService.DeleteAsync(id);
                if (!deleted)
                    return ResponseViewModel<object>.Fail("Service record not found.").ToActionResult();

                return ResponseViewModel<object>
                    .SuccessWithMessage("Service record deleted.", null)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }
    }
}

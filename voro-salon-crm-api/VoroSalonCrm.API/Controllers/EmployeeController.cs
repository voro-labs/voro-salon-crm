using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSalonCrm.Application.DTOs.Employee;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Shared.Extensions;
using VoroSalonCrm.Shared.ViewModels;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/[controller]")]
    [Tags("CRM")]
    [ApiController]
    [Authorize]
    public class EmployeeController(IEmployeeService service) : ControllerBase
    {
        private readonly IEmployeeService _service = service;

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var result = await _service.GetAllAsync();
                return ResponseViewModel<IEnumerable<EmployeeDto>>
                    .SuccessWithMessage("Employees retrieved.", result)
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
                var result = await _service.GetByIdAsync(id);
                if (result == null)
                    return ResponseViewModel<object>.Fail("Employee not found.").ToActionResult();

                return ResponseViewModel<EmployeeDto>
                    .SuccessWithMessage("Employee retrieved.", result)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateEmployeeDto dto)
        {
            try
            {
                var result = await _service.CreateAsync(dto);
                return ResponseViewModel<EmployeeDto>
                    .SuccessWithMessage("Employee created.", result)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update([FromRoute] Guid id, [FromBody] UpdateEmployeeDto dto)
        {
            try
            {
                await _service.UpdateAsync(id, dto);
                return ResponseViewModel<object>
                    .SuccessWithMessage("Employee updated.", null)
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
                await _service.DeleteAsync(id);
                return ResponseViewModel<object>
                    .SuccessWithMessage("Employee deleted.", null)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpGet("available-for-service/{serviceId:guid}")]
        public async Task<IActionResult> GetAvailableForService([FromRoute] Guid serviceId)
        {
            try
            {
                var result = await _service.GetAvailableForServiceAsync(serviceId);
                return ResponseViewModel<IEnumerable<EmployeeDto>>
                    .SuccessWithMessage("Available employees retrieved.", result)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPost("{id:guid}/photo")]
        public async Task<IActionResult> UploadPhoto([FromRoute] Guid id, [FromForm] IFormFile file)
        {
            try
            {
                if (file == null || file.Length == 0)
                    return ResponseViewModel<object>.Fail("No file uploaded.").ToActionResult();

                var photoUrl = await _service.UploadPhotoAsync(id, file);

                return ResponseViewModel<string>.SuccessWithMessage("Photo uploaded successfully.", photoUrl).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }
    }
}

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
    public class ServicesController(IServiceService serviceService) : ControllerBase
    {
        private readonly IServiceService _serviceService = serviceService;

        [HttpPost]
        public async Task<IActionResult> Create(CreateServiceDto dto)
        {
            try
            {
                var result = await _serviceService.CreateAsync(dto);
                return ResponseViewModel<ServiceDto>
                    .SuccessWithMessage("Service created.", result)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            try
            {
                var result = await _serviceService.GetByIdAsync(id);
                if (result is null)
                    return ResponseViewModel<object>.Fail("Service not found.").ToActionResult();

                return ResponseViewModel<ServiceDto>
                    .SuccessWithMessage("Service retrieved.", result)
                    .ToActionResult();
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
                var result = await _serviceService.GetAllAsync();
                return ResponseViewModel<IEnumerable<ServiceDto>>
                    .SuccessWithMessage("Services retrieved.", result)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, UpdateServiceDto dto)
        {
            try
            {
                var result = await _serviceService.UpdateAsync(id, dto);
                return ResponseViewModel<ServiceDto>
                    .SuccessWithMessage("Service updated.", result)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            try
            {
                var result = await _serviceService.DeleteAsync(id);
                if (!result)
                    return ResponseViewModel<object>.Fail("Service not found.").ToActionResult();

                return ResponseViewModel<object>
                    .SuccessWithMessage("Service deleted.", null)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }
    }
}

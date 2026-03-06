using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSalonCrm.Application.DTOs.Public;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Shared.Extensions;
using VoroSalonCrm.Shared.ViewModels;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/public/[controller]")]
    [Tags("Public")]
    [ApiController]
    [AllowAnonymous]
    public class PublicBookingController(IPublicBookingService service) : ControllerBase
    {
        private readonly IPublicBookingService _service = service;

        [HttpGet("tenant/{slug}")]
        public async Task<IActionResult> GetTenantBySlug([FromRoute] string slug)
        {
            try
            {
                var result = await _service.GetTenantBySlugAsync(slug);
                if (result == null)
                    return ResponseViewModel<object>.Fail("Estabelecimento não encontrado.").ToActionResult();

                return ResponseViewModel<PublicTenantDto>.Success(result).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpGet("client/check")]
        public async Task<IActionResult> CheckClient([FromQuery] string tenantSlug, [FromQuery] string phone)
        {
            try
            {
                var result = await _service.CheckClientByPhoneAsync(tenantSlug, phone);
                return ResponseViewModel<PublicClientDto?>.Success(result).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpGet("services")]
        public async Task<IActionResult> GetServices([FromQuery] string tenantSlug)
        {
            try
            {
                var result = await _service.GetServicesByTenantAsync(tenantSlug);
                return ResponseViewModel<IEnumerable<PublicServiceDto>>.Success(result).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpGet("employees")]
        public async Task<IActionResult> GetEmployees([FromQuery] string tenantSlug, [FromQuery] Guid serviceId)
        {
            try
            {
                var result = await _service.GetEmployeesByServiceAsync(tenantSlug, serviceId);
                return ResponseViewModel<IEnumerable<PublicEmployeeDto>>.Success(result).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPost("booking")]
        public async Task<IActionResult> CreateBooking([FromBody] PublicBookingCreateDto dto)
        {
            try
            {
                var result = await _service.CreateBookingAsync(dto);
                if (!result.Success)
                    return ResponseViewModel<object>.Fail(result.Message).ToActionResult();

                return ResponseViewModel<PublicBookingResponseDto>.Success(result).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }
    }
}

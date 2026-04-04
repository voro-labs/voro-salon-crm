using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSalonCrm.Application.DTOs;
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
    public class ClientController(IClientService clientService) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? search = null)
        {
            try
            {
                var result = await clientService.GetPagedAsync(page, pageSize, search);

                return ResponseViewModel<PagedResult<ClientDto>>
                    .SuccessWithMessage("Clients retrieved.", result)
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
                var client = await clientService.GetByIdAsync(id);
                if (client is null)
                    return ResponseViewModel<object>.Fail("Client not found.").ToActionResult();

                return ResponseViewModel<ClientDto>
                    .SuccessWithMessage("Client retrieved.", client)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateClientDto dto)
        {
            try
            {
                var client = await clientService.CreateAsync(dto);

                return ResponseViewModel<ClientDto>
                    .SuccessWithMessage("Client created.", client)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update([FromRoute] Guid id, [FromBody] UpdateClientDto dto)
        {
            try
            {
                var client = await clientService.UpdateAsync(id, dto);

                return ResponseViewModel<ClientDto>
                    .SuccessWithMessage("Client updated.", client)
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
                var deleted = await clientService.DeleteAsync(id);
                if (!deleted)
                    return ResponseViewModel<object>.Fail("Client not found.").ToActionResult();

                return ResponseViewModel<object>
                    .SuccessWithMessage("Client deleted.", null)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }
    }
}

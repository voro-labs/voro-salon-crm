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
    public class EmployeeGoalController(IEmployeeGoalService goalService) : ControllerBase
    {
        [HttpGet("{employeeId:guid}")]
        public async Task<IActionResult> GetByEmployee(
            Guid employeeId,
            [FromQuery] int? month,
            [FromQuery] int? year)
        {
            try
            {
                if (month.HasValue && year.HasValue)
                {
                    var result = await goalService.GetAsync(employeeId, month.Value, year.Value);
                    if (result is null)
                        return ResponseViewModel<object>.Fail("Meta não encontrada.").ToActionResult();
                    return ResponseViewModel<EmployeeGoalDto>.SuccessWithMessage("Meta recuperada.", result).ToActionResult();
                }

                var all = await goalService.GetAllByEmployeeAsync(employeeId);
                return ResponseViewModel<IEnumerable<EmployeeGoalDto>>.SuccessWithMessage("Metas recuperadas.", all).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateEmployeeGoalDto dto)
        {
            try
            {
                var result = await goalService.CreateAsync(dto);
                return ResponseViewModel<EmployeeGoalDto>.SuccessWithMessage("Meta criada.", result).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateEmployeeGoalDto dto)
        {
            try
            {
                var result = await goalService.UpdateAsync(id, dto);
                return ResponseViewModel<EmployeeGoalDto>.SuccessWithMessage("Meta atualizada.", result).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            try
            {
                var result = await goalService.DeleteAsync(id);
                if (!result)
                    return ResponseViewModel<object>.Fail("Meta não encontrada.").ToActionResult();
                return ResponseViewModel<object>.SuccessWithMessage("Meta excluída.", null).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }
    }
}

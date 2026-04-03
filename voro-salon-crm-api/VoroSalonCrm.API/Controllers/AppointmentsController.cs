using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Shared.Extensions;
using VoroSalonCrm.Shared.ViewModels;
using VoroSalonCrm.Application.DTOs.Employee;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/[controller]")]
    [Tags("CRM")]
    [ApiController]
    [Authorize]
    public class AppointmentsController(IAppointmentService appointmentService, IEmployeeService employeeService) : ControllerBase
    {
        private readonly IAppointmentService _appointmentService = appointmentService;
        private readonly IEmployeeService _employeeService = employeeService;

        [HttpPost]
        public async Task<IActionResult> Create(CreateAppointmentDto dto)
        {
            try
            {
                var result = await _appointmentService.CreateAsync(dto);
                return ResponseViewModel<AppointmentDto>
                    .SuccessWithMessage("Appointment created.", result)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            try
            {
                var result = await _appointmentService.GetByIdAsync(id);
                if (result is null)
                    return ResponseViewModel<object>.Fail("Appointment not found.").ToActionResult();

                return ResponseViewModel<AppointmentDto>
                    .SuccessWithMessage("Appointment retrieved.", result)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] Guid? clientId)
        {
            try
            {
                Guid? employeeId = null;
                if (User.IsInRole("SalonEmployee"))
                {
                    var employee = await _employeeService.GetByCurrentUserAsync();
                    if (employee == null)
                        return ResponseViewModel<IEnumerable<AppointmentDto>>
                            .SuccessWithMessage("Appointments retrieved.", Enumerable.Empty<AppointmentDto>())
                            .ToActionResult();
                    employeeId = employee.Id;
                }

                var result = await _appointmentService.GetAllAsync(clientId, employeeId);
                return ResponseViewModel<IEnumerable<AppointmentDto>>
                    .SuccessWithMessage("Appointments retrieved.", result)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, UpdateAppointmentDto dto)
        {
            try
            {
                var result = await _appointmentService.UpdateAsync(id, dto);
                return ResponseViewModel<AppointmentDto>
                    .SuccessWithMessage("Appointment updated.", result)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPatch("{id:guid}/status")]
        public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] AppointmentStatus status)
        {
            try
            {
                var result = await _appointmentService.UpdateStatusAsync(id, status);
                if (!result)
                    return ResponseViewModel<object>.Fail("Appointment not found.").ToActionResult();

                return ResponseViewModel<object>
                    .SuccessWithMessage("Appointment status updated.", null)
                    .ToActionResult();
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
                var result = await _appointmentService.DeleteAsync(id);
                if (!result)
                    return ResponseViewModel<object>.Fail("Appointment not found.").ToActionResult();

                return ResponseViewModel<object>
                    .SuccessWithMessage("Appointment deleted.", null)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpGet("availability")]
        public async Task<IActionResult> GetAvailability([FromQuery] DateTime date, [FromQuery] Guid? serviceId, [FromQuery] Guid? employeeId)
        {
            try
            {
                var result = await _appointmentService.GetAvailableSlotsAsync(date, serviceId, employeeId);
                return ResponseViewModel<IEnumerable<AvailabilitySlotDto>>.Success(result).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }
    }
}

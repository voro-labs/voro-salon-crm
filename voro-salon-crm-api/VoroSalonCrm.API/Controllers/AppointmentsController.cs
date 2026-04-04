using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.DTOs.Employee;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Shared.Extensions;
using VoroSalonCrm.Shared.ViewModels;

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
        public async Task<IActionResult> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? search = null,
            [FromQuery] Guid? clientId = null)
        {
            try
            {
                if (User.IsInRole("SalonEmployee"))
                {
                    var employee = await _employeeService.GetByCurrentUserAsync();
                    if (employee == null)
                    {
                        var empty = new PagedResult<AppointmentDto>(Enumerable.Empty<AppointmentDto>(), 0, page, pageSize);
                        return ResponseViewModel<PagedResult<AppointmentDto>>
                            .SuccessWithMessage("Appointments retrieved.", empty)
                            .ToActionResult();
                    }

                    // For SalonEmployee, scope results to their own appointments and apply pagination/search in-memory
                    var all = (await _appointmentService.GetAllAsync(clientId, employee.Id)).ToList();

                    if (!string.IsNullOrWhiteSpace(search))
                    {
                        var term = search.Trim().ToLowerInvariant();
                        all = all.Where(a =>
                            (a.ClientName?.ToLowerInvariant().Contains(term) ?? false) ||
                            (a.ServiceName?.ToLowerInvariant().Contains(term) ?? false) ||
                            (a.Description?.ToLowerInvariant().Contains(term) ?? false))
                            .ToList();
                    }

                    var employeeTotal = all.Count;
                    var employeeItems = all.Skip((page - 1) * pageSize).Take(pageSize);
                    var employeePaged = new PagedResult<AppointmentDto>(employeeItems, employeeTotal, page, pageSize);

                    return ResponseViewModel<PagedResult<AppointmentDto>>
                        .SuccessWithMessage("Appointments retrieved.", employeePaged)
                        .ToActionResult();
                }

                var result = await _appointmentService.GetPagedAsync(page, pageSize, search, clientId);
                return ResponseViewModel<PagedResult<AppointmentDto>>
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

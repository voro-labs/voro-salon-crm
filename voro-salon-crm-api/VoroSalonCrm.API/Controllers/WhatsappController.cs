using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using VoroSalonCrm.Application.DTOs.Integration;
using VoroSalonCrm.Application.DTOs.Public;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Shared.Utils;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/[controller]")]
    [Tags("WhatsApp Integration")]
    [ApiController]
    [AllowAnonymous]
    public class WhatsappController(
        IOptions<IntegrationUtil> integrationUtil, 
        ILogger<WhatsappController> logger,
        IPublicBookingService publicBookingService,
        ITenantRepository tenantRepository) : ControllerBase
    {
        private readonly IntegrationUtil _integrationUtil = integrationUtil.Value;
        private readonly ILogger<WhatsappController> _logger = logger;
        private readonly IPublicBookingService _publicBookingService = publicBookingService;
        private readonly ITenantRepository _tenantRepository = tenantRepository;

        [HttpGet]
        public IActionResult VerifyWebhook(
            [FromQuery(Name = "hub.mode")] string? mode,
            [FromQuery(Name = "hub.challenge")] string? challenge,
            [FromQuery(Name = "hub.verify_token")] string? token)
        {
            var verifyToken = _integrationUtil.Whatsapp.VerifyToken;

            if (mode == "subscribe" && token == verifyToken)
            {
                _logger.LogInformation("WEBHOOK VERIFIED");

                return Content(challenge ?? string.Empty, "text/plain");
            }

            return StatusCode(403);
        }

        [HttpPost]
        public async Task<IActionResult> ReceiveWebhook()
        {
            var timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss");
            _logger.LogInformation("\n\nWebhook received {Timestamp}\n", timestamp);

            using var reader = new StreamReader(Request.Body);
            var body = await reader.ReadToEndAsync();

            _logger.LogInformation("{Body}", body);

            return Ok();
        }

        [HttpPost("flow")]
        public async Task<IActionResult> ReceiveFlow([FromBody] FlowRequestDto request)
        {
            if (request == null)
                return BadRequest();

            // Fetch the primary tenant's slug. If the system supports multi-tenant via webhook, we might need a way to distinguish.
            var tenant = await _tenantRepository.Query(t => t.IsActive).FirstOrDefaultAsync();
            if (tenant == null)
                return BadRequest("Tenant não configurado");

            var tenantSlug = tenant.Slug;

            switch (request.Trigger)
            {
                case "INIT":
                    return await LoadInitialDataAsync(tenantSlug);

                case "service_selected":
                    return await ServiceSelectedAsync(tenantSlug, request);

                case "date_selected":
                    return await DateSelectedAsync(tenantSlug, request);

                case "confirm_booking":
                    return await ConfirmBookingAsync(tenantSlug, request);

                default:
                    return Ok(new FlowResponseDto
                    {
                        Data = new { }
                    });
            }
        }

        private async Task<IActionResult> LoadInitialDataAsync(string tenantSlug)
        {
            var servicesDto = await _publicBookingService.GetServicesByTenantAsync(tenantSlug);
            
            var services = servicesDto.Select(s => new 
            {
                id = s.Id.ToString(),
                title = $"{s.Name} - {s.Price:C}"
            }).ToArray();

            return Ok(new FlowResponseDto
            {
                Data = new
                {
                    services
                }
            });
        }

        private async Task<IActionResult> ServiceSelectedAsync(string tenantSlug, FlowRequestDto request)
        {
            if (!Guid.TryParse(request.ServiceId, out var serviceId))
                return BadRequest("Invalid service Id");

            var employeesDto = await _publicBookingService.GetEmployeesByServiceAsync(tenantSlug, serviceId);
            
            var employees = new List<object>
            {
                new { id = "any", title = "Nenhum em específico" }
            };

            employees.AddRange(employeesDto.Select(e => new 
            {
                id = e.Id.ToString(),
                title = e.Name
            }));

            return Ok(new FlowResponseDto
            {
                Data = new
                {
                    employees = employees.ToArray()
                }
            });
        }

        private async Task<IActionResult> DateSelectedAsync(string tenantSlug, FlowRequestDto request)
        {
            if (!Guid.TryParse(request.ServiceId, out var serviceId) || 
                !DateTime.TryParseExact(request.Date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
            {
                return BadRequest("Invalid service Id or date");
            }

            Guid? employeeId = null;
            if (!string.IsNullOrEmpty(request.EmployeeId) && request.EmployeeId != "any")
            {
                if (Guid.TryParse(request.EmployeeId, out var parsedEmployeeId))
                    employeeId = parsedEmployeeId;
            }

            var slotsDto = await _publicBookingService.GetAvailableSlotsAsync(tenantSlug, date, serviceId, employeeId);
            
            var times = slotsDto.Where(s => s.IsAvailable).Select(s => new 
            {
                id = s.StartTime.ToString("HH:mm"),
                title = s.StartTime.ToString("HH:mm")
            }).ToArray();

            return Ok(new FlowResponseDto
            {
                Data = new
                {
                    times
                }
            });
        }

        private async Task<IActionResult> ConfirmBookingAsync(string tenantSlug, FlowRequestDto request)
        {
            if (!Guid.TryParse(request.ServiceId, out var serviceId) || 
                !DateTime.TryParseExact($"{request.Date} {request.Time}", "yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var scheduledDateTime))
            {
                return BadRequest("Invalid data");
            }

            Guid? employeeId = null;
            if (!string.IsNullOrEmpty(request.EmployeeId) && request.EmployeeId != "any")
            {
                if (Guid.TryParse(request.EmployeeId, out var parsedEmployeeId))
                    employeeId = parsedEmployeeId;
            }

            // Converter para DateTimeOffset local do brasil para gravar certo caso o agendamento precise
            var scheduledDateTimeOffset = new DateTimeOffset(scheduledDateTime, TimeSpan.FromHours(-3));

            var dto = new PublicBookingCreateDto
            {
                TenantSlug = tenantSlug,
                ClientName = request.Name ?? "Cliente WhatsApp",
                ClientPhone = request.Phone ?? string.Empty,
                Description = request.Description,
                ServiceId = serviceId,
                EmployeeId = employeeId,
                ScheduledDateTime = scheduledDateTimeOffset
            };

            var result = await _publicBookingService.CreateBookingAsync(dto);

            return Ok(new FlowResponseDto
            {
                Data = new
                {
                    success = result.Success
                }
            });
        }
    }
}

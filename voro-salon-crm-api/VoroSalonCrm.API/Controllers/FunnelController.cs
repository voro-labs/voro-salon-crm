using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.DTOs.Public;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Shared.Extensions;
using VoroSalonCrm.Shared.ViewModels;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/[controller]")]
    [Tags("CRM")]
    [ApiController]
    [Authorize]
    public class FunnelController(
        ICurrentUserService currentUserService,
        IBookingFunnelSessionRepository funnelRepository,
        IAppointmentRepository appointmentRepository) : ControllerBase
    {
        [HttpGet("appointments")]
        public async Task<IActionResult> GetFunnelAppointments([FromQuery] int days = 30)
        {
            try
            {
                var tenantId = currentUserService.TenantId;
                var since = DateTimeOffset.UtcNow.AddDays(-days);
                var items = new List<FunnelItemDto>();

                // Auto-cancelar sessões abandonadas (não atualizadas há mais de 2 horas)
                var staleThreshold = DateTimeOffset.UtcNow.AddHours(-2);
                var staleSessions = await funnelRepository
                    .Query(s => s.TenantId == tenantId
                        && s.FunnelState != "COMPLETED"
                        && s.FunnelState != "CANCELLED"
                        && s.UpdatedAt < staleThreshold, false)
                    .ToListAsync();

                if (staleSessions.Count > 0)
                {
                    foreach (var stale in staleSessions)
                    {
                        stale.FunnelState = "ABANDONED";
                        stale.UpdatedAt = DateTimeOffset.UtcNow;
                    }
                    funnelRepository.UpdateRange(staleSessions);
                    await funnelRepository.SaveChangesAsync();
                }

                // 1. Sessions em progresso (não completados/cancelados)
                var sessions = await funnelRepository
                    .Query(s => s.TenantId == tenantId
                        && s.CreatedAt >= since
                        && s.FunnelState != "COMPLETED"
                        && s.FunnelState != "CANCELLED")
                    .ToListAsync();

                foreach (var s in sessions)
                {
                    items.Add(new FunnelItemDto(
                        Id: s.Id,
                        ClientName: s.ContactName ?? "Visitante",
                        ClientPhone: s.PhoneNumber,
                        ServiceName: null,
                        ScheduledDateTime: null,
                        DurationMinutes: null,
                        Status: null,
                        Amount: null,
                        Source: s.Source,
                        EmployeeName: null,
                        FunnelState: s.FunnelState,
                        SessionId: s.SessionId
                    ));
                }

                // 1b. Sessions canceladas/abandonadas dentro do período
                var cancelledSessions = await funnelRepository
                    .Query(s => s.TenantId == tenantId
                        && s.CreatedAt >= since
                        && (s.FunnelState == "CANCELLED" || s.FunnelState == "ABANDONED"))
                    .ToListAsync();

                foreach (var s in cancelledSessions)
                {
                    items.Add(new FunnelItemDto(
                        Id: s.Id,
                        ClientName: s.ContactName ?? "Visitante",
                        ClientPhone: s.PhoneNumber,
                        ServiceName: null,
                        ScheduledDateTime: null,
                        DurationMinutes: null,
                        Status: null,
                        Amount: null,
                        Source: s.Source,
                        EmployeeName: null,
                        FunnelState: s.FunnelState,
                        SessionId: s.SessionId
                    ));
                }

                // 2. Appointments de fontes não-internas (WhatsApp=1, App=2, Website=3)
                var appointments = await appointmentRepository
                    .Query(a => a.TenantId == tenantId
                        && a.Source != AppointmentSource.Internal
                        && a.ScheduledDateTime >= since)
                    .Include(a => a.Service)
                    .Include(a => a.Employee)
                    .Include(a => a.Client)
                    .IgnoreQueryFilters()
                    .ToListAsync();

                foreach (var a in appointments)
                {
                    var funnelState = (int)a.Status switch
                    {
                        3 => "CANCELLED",
                        4 => "CANCELLED",
                        _ => "COMPLETED"
                    };

                    items.Add(new FunnelItemDto(
                        Id: a.Id,
                        ClientName: a.Client?.Name ?? a.Description ?? "—",
                        ClientPhone: a.Client?.Phone,
                        ServiceName: a.Service?.Name,
                        ScheduledDateTime: a.ScheduledDateTime.ToString("o"),
                        DurationMinutes: a.DurationMinutes,
                        Status: (int)a.Status,
                        Amount: a.Amount,
                        Source: (int)a.Source,
                        EmployeeName: a.Employee?.Name,
                        FunnelState: funnelState,
                        SessionId: null
                    ));
                }

                return ResponseViewModel<IEnumerable<FunnelItemDto>>.Success(items).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }
    }
}

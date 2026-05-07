using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.DTOs.Employee;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Shared.Extensions;
using VoroSalonCrm.Shared.ViewModels;
using VoroSalonCrm.API.Attributes;

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
        [Idempotent]
        public async Task<IActionResult> Create(CreateAppointmentDto dto)
        {
            try
            {
                var isHistoric = dto.Status == AppointmentStatus.Completed || dto.Status == AppointmentStatus.Cancelled;
                if (!isHistoric && dto.ScheduledDateTime <= DateTimeOffset.UtcNow)
                    return ResponseViewModel<object>.Fail("Não é possível criar um agendamento em um horário que já passou.").ToActionResult();

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
            [FromQuery] Guid? clientId = null,
            [FromQuery] DateTimeOffset? dateFrom = null,
            [FromQuery] DateTimeOffset? dateTo = null)
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

                    if (dateFrom.HasValue)
                        all = all.Where(a => a.ScheduledDateTime >= dateFrom.Value).ToList();

                    if (dateTo.HasValue)
                        all = all.Where(a => a.ScheduledDateTime <= dateTo.Value).ToList();

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

                var result = await _appointmentService.GetPagedAsync(page, pageSize, search, clientId, dateFrom, dateTo);
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
        [Idempotent]
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

        [HttpPost("transcribe-audio")]
        [RequestSizeLimit(25 * 1024 * 1024)] // 25 MB
        public async Task<IActionResult> TranscribeAudio(
            IFormFile audio,
            [FromServices] IWhisperService whisperService,
            [FromServices] IGeminiService geminiService,
            [FromServices] IServiceService serviceService,
            [FromServices] IIntegrationAuditService integrationAuditService,
            [FromServices] ICurrentUserService currentUserService)
        {
            try
            {
                if (audio == null || audio.Length == 0)
                    return ResponseViewModel<object>.Fail("Nenhum arquivo de áudio enviado.").ToActionResult();

                // 1. Transcrever com Whisper
                await using var stream = audio.OpenReadStream();
                var transcript = await whisperService.TranscribeAsync(stream, audio.FileName);

                // Auditoria Whisper
                try
                {
                    await integrationAuditService.LogAsync(
                        "Whisper",
                        "https://api.openai.com/v1/audio/transcriptions",
                        $"file={audio.FileName}, size={audio.Length}bytes, lang=pt",
                        string.IsNullOrWhiteSpace(transcript) ? null : (transcript.Length > 500 ? transcript[..500] : transcript),
                        string.IsNullOrWhiteSpace(transcript) ? 422 : 200,
                        currentUserService.TenantId != Guid.Empty ? currentUserService.TenantId : null
                    );
                }
                catch { /* não bloquear a transcrição se a auditoria falhar */ }

                if (string.IsNullOrWhiteSpace(transcript))
                    return ResponseViewModel<object>.Fail("Não foi possível transcrever o áudio.").ToActionResult();

                // 2. Buscar serviços do tenant para contexto
                var services = await serviceService.GetAllAsync();
                var serviceContext = services.Any()
                    ? string.Join("\n", services.Select(s => $"- {s.Name} (R${s.Price:F2}, {s.DurationMinutes}min)"))
                    : "Nenhum serviço cadastrado.";

                // 3. Extrair dados com Gemini
                var today = DateTimeOffset.Now.ToString("yyyy-MM-dd");
                var systemPrompt =
                    "Você é um assistente especializado em extrair informações de agendamento de salão de beleza a partir de transcrições de áudio.\n" +
                    $"Hoje é {today}.\n\n" +
                    "Retorne SOMENTE um JSON válido (sem markdown, sem blocos de código, sem explicações) com exatamente estes campos:\n" +
                    "{\n" +
                    "  \"nome_do_cliente\": \"string ou null\",\n" +
                    "  \"servico\": \"string ou null\",\n" +
                    "  \"valor\": number ou null,\n" +
                    "  \"duracao\": number (minutos) ou null,\n" +
                    "  \"dia_marcado\": \"YYYY-MM-DD ou null\",\n" +
                    "  \"horario\": \"HH:mm ou null\"\n" +
                    "}\n\n" +
                    "Regras:\n" +
                    $"- Datas relativas (\"amanhã\", \"sexta\", \"semana que vem\") devem ser convertidas para YYYY-MM-DD relativo a hoje ({today})\n" +
                    "- Se o serviço mencionado existir na lista abaixo, use o valor e duração cadastrados quando não informados explicitamente\n" +
                    "- valor deve ser um número (sem R$, sem símbolos)\n" +
                    "- duracao deve ser em minutos (número inteiro)\n" +
                    "- horario no formato HH:mm (24h)\n\n" +
                    "Serviços disponíveis no estabelecimento:\n" +
                    serviceContext;

                var rawResult = await geminiService.GenerateResponseAsync(systemPrompt, [], transcript);

                // Auditoria Gemini
                try
                {
                    await integrationAuditService.LogAsync(
                        "Gemini-Transcription",
                        "generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent",
                        $"systemPrompt length={systemPrompt.Length}, userMessage length={transcript.Length}",
                        rawResult.Length > 500 ? rawResult[..500] : rawResult,
                        200,
                        currentUserService.TenantId != Guid.Empty ? currentUserService.TenantId : null
                    );
                }
                catch { /* não bloquear a extração se a auditoria falhar */ }

                // Limpar markdown caso Gemini envolva em ```json
                var cleaned = Regex.Replace(rawResult.Trim(), @"^```(?:json)?\s*|\s*```$", "", RegexOptions.Multiline).Trim();

                JsonElement parsedData;
                try
                {
                    parsedData = JsonSerializer.Deserialize<JsonElement>(cleaned);
                }
                catch
                {
                    return ResponseViewModel<object>.Fail("IA não retornou JSON válido.").ToActionResult();
                }

                return Ok(new { transcript, data = parsedData });
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }
    }
}

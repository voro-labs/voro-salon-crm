using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.DTOs.Integration;
using VoroSalonCrm.Application.DTOs.Public;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Identity;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Shared.Extensions;
using VoroSalonCrm.Shared.Utils;
using VoroSalonCrm.Shared.ViewModels;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/[controller]")]
    [Route("api/[controller]")]
    [Tags("WhatsApp Integration")]
    [ApiController]
    [AllowAnonymous]
    public class WhatsappController(
        IOptions<IntegrationUtil> integrationUtil,
        ILogger<WhatsappController> logger,
        IPublicBookingService publicBookingService,
        ITenantRepository tenantRepository,
        IWhatsAppMessageService whatsAppMessageService,
        IWhatsAppTemplateService whatsAppTemplateService,
        IWhatsappChatService whatsappChatService) : ControllerBase
    {
        private readonly IntegrationUtil _integrationUtil = integrationUtil.Value;
        private readonly ILogger<WhatsappController> _logger = logger;
        private readonly IPublicBookingService _publicBookingService = publicBookingService;
        private readonly ITenantRepository _tenantRepository = tenantRepository;
        private readonly IWhatsAppMessageService _whatsAppMessageService = whatsAppMessageService;
        private readonly IWhatsAppTemplateService _whatsAppTemplateService = whatsAppTemplateService;
        private readonly IWhatsappChatService _whatsappChatService = whatsappChatService;

        [HttpGet]
        public IActionResult VerifyWebhook(
            [FromQuery(Name = "hub.mode")] string? mode,
            [FromQuery(Name = "hub.challenge")] string? challenge,
            [FromQuery(Name = "hub.verify_token")] string? token)
        {
            _logger.LogInformation("Webhook Verification Request Received: mode={Mode}, token={Token}, challenge={Challenge}", mode, token, challenge);

            var verifyToken = _integrationUtil?.Whatsapp?.VerifyToken;

            if (string.IsNullOrEmpty(verifyToken))
            {
                _logger.LogError("WhatsApp VerifyToken is not configured in IntegrationSettings.");
                return StatusCode(500, "Configuration Error: VerifyToken not set.");
            }

            _logger.LogInformation("Comparing tokens: Received={ReceivedToken}, Expected={ExpectedToken}", token, verifyToken);

            if (mode == "subscribe" && token == verifyToken)
            {
                _logger.LogInformation("WEBHOOK VERIFIED successfully");

                // Facebook expects the challenge to be returned as plain text. 
                // Using ContentResult ensures it is returned as a direct string without extra formatting.
                return Content(challenge ?? string.Empty, "text/plain");
            }

            _logger.LogWarning("Webhook Verification Failed: mode={Mode}, token_match={TokenMatch}", mode, token == verifyToken);
            return StatusCode(403);
        }

        [HttpPost]
        public async Task<IActionResult> ReceiveWebhook([FromBody] WhatsappWebhookDto webhook)
        {
            if (webhook?.Object != "whatsapp_business_account")
                return Ok();

            foreach (var entry in webhook.Entry)
            {
                foreach (var change in entry.Changes)
                {
                    if (change.Field != "messages" || change.Value?.Messages == null)
                        continue;

                    var metadata = change.Value.Metadata;
                    var contact = change.Value.Contacts?.FirstOrDefault();
                    var contactName = contact?.Profile?.Name ?? "Cliente";

                    // Resolve tenant pelo ID técnico do Meta (prioridade) ou número exibido (fallback)
                    var allActiveTenants = await _tenantRepository.Query(t => t.IsActive).ToListAsync();
                    var targetNumber = new string(metadata.DisplayPhoneNumber.Where(char.IsDigit).ToArray());
                    
                    var tenant = allActiveTenants.FirstOrDefault(t => 
                        t.WhatsappPhoneNumberId == metadata.PhoneNumberId || 
                        (t.ContactPhone != null && new string(t.ContactPhone.Where(char.IsDigit).ToArray()) == targetNumber));

                    foreach (var message in change.Value.Messages)
                    {
                        // Salvar mensagem recebida
                        if (tenant != null)
                        {
                            var body = message.Type switch
                            {
                                "text" => message.Text?.Body ?? string.Empty,
                                "interactive" => message.Interactive?.ButtonReply?.Title
                                              ?? message.Interactive?.ListReply?.Title
                                              ?? "[Interativo]",
                                "audio" => "[Áudio]",
                                "image" => "[Imagem]",
                                "document" => "[Documento]",
                                _ => $"[{message.Type}]"
                            };

                            try
                            {
                                await _whatsAppMessageService.SaveInboundAsync(
                                    tenantId: tenant.Id,
                                    from: message.From,
                                    to: metadata.DisplayPhoneNumber,
                                    body: body,
                                    whatsAppMessageId: message.Id);
                            }
                            catch (Exception ex)
                            {
                                _logger.LogError(ex, "Erro ao salvar mensagem inbound do WhatsApp.");
                            }
                        }

                        await _whatsappChatService.HandleMessageAsync(message, contactName, metadata.DisplayPhoneNumber, metadata.PhoneNumberId);
                    }
                }
            }

            return Ok();
        }

        [HttpGet("messages")]
        [Authorize]
        public async Task<IActionResult> GetMessages(
            [FromServices] ICurrentUserService currentUserService,
            [FromQuery] string? phone = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            try
            {
                var tenantId = currentUserService.TenantId;
                IEnumerable<WhatsAppMessageDto> messages;
                if (!string.IsNullOrWhiteSpace(phone))
                    messages = await _whatsAppMessageService.GetByPhoneAsync(tenantId, phone, page, 100);
                else
                    messages = await _whatsAppMessageService.GetByTenantAsync(tenantId, page, pageSize);
                return ResponseViewModel<IEnumerable<WhatsAppMessageDto>>.Success(messages).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpGet("conversations")]
        [Authorize]
        public async Task<IActionResult> GetConversations(
            [FromServices] ICurrentUserService currentUserService,
            [FromServices] IClientRepository clientRepository)
        {
            try
            {
                var tenantId = currentUserService.TenantId;
                var conversations = await _whatsAppMessageService.GetConversationsAsync(tenantId);

                var clients = await clientRepository
                    .Query(c => c.TenantId == tenantId && c.Phone != null)
                    .Select(c => new { c.Id, c.Phone })
                    .ToListAsync();

                var result = conversations.Select(conv =>
                {
                    var convSuffix = NormalizePhone(conv.PhoneNumber);
                    if (convSuffix.Length > 10) convSuffix = convSuffix[^10..];

                    var match = clients.FirstOrDefault(c =>
                    {
                        var clientSuffix = NormalizePhone(c.Phone!);
                        if (clientSuffix.Length > 10) clientSuffix = clientSuffix[^10..];
                        return clientSuffix.Length >= 8 && clientSuffix == convSuffix;
                    });
                    return conv with { ClientId = match?.Id };
                });

                return ResponseViewModel<IEnumerable<WhatsAppConversationDto>>.Success(result).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        private static string NormalizePhone(string phone) =>
            new string(phone.Where(char.IsDigit).ToArray());

        [HttpGet("kanban-appointments")]
        [Authorize]
        public async Task<IActionResult> GetKanbanAppointments(
            [FromServices] IAppointmentService appointmentService,
            [FromQuery] int days = 30)
        {
            try
            {
                var appointments = await appointmentService.GetPublicSourceAppointmentsAsync(days);
                return ResponseViewModel<IEnumerable<AppointmentDto>>.Success(appointments).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpGet("templates")]
        [Authorize]
        public async Task<IActionResult> GetTemplates()
        {
            try
            {
                var templates = await _whatsAppTemplateService.GetMyTemplatesAsync();
                return ResponseViewModel<IEnumerable<WhatsAppTemplateDto>>.Success(templates).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPost("templates")]
        [Authorize(Roles = "Owner,SalonOwner")]
        public async Task<IActionResult> CreateTemplate([FromBody] CreateWhatsAppTemplateDto dto)
        {
            try
            {
                var template = await _whatsAppTemplateService.CreateAsync(dto);
                return ResponseViewModel<WhatsAppTemplateDto>
                    .SuccessWithMessage("Template created.", template)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPut("templates/{id:guid}")]
        [Authorize(Roles = "Owner,SalonOwner")]
        public async Task<IActionResult> UpdateTemplate([FromRoute] Guid id, [FromBody] UpdateWhatsAppTemplateDto dto)
        {
            try
            {
                var template = await _whatsAppTemplateService.UpdateAsync(id, dto);
                return ResponseViewModel<WhatsAppTemplateDto>
                    .SuccessWithMessage("Template updated.", template)
                    .ToActionResult();
            }
            catch (KeyNotFoundException ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpDelete("templates/{id:guid}")]
        [Authorize(Roles = "Owner,SalonOwner")]
        public async Task<IActionResult> DeleteTemplate([FromRoute] Guid id)
        {
            try
            {
                var deleted = await _whatsAppTemplateService.DeleteAsync(id);
                if (!deleted)
                    return ResponseViewModel<object>.Fail("Template not found.").ToActionResult();

                return ResponseViewModel<object>
                    .SuccessWithMessage("Template deleted.", null)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPost("send-template")]
        [Authorize]
        public async Task<IActionResult> SendTemplate(
            [FromServices] ICurrentUserService currentUserService,
            [FromServices] IClientRepository clientRepository,
            [FromServices] IWhatsappService whatsappService,
            [FromBody] SendTemplateToClientsDto dto)
        {
            if (!ModelState.IsValid)
                return ResponseViewModel<object>.Fail("Dados inválidos.").ToActionResult();

            try
            {
                var tenantId = currentUserService.TenantId;

                // Busca o PhoneNumberId do tenant para envio
                var tenant = await _tenantRepository.GetByIdAsync(true, tenantId);
                var phoneNumberId = tenant?.WhatsappPhoneNumberId;

                // Busca os clientes selecionados
                var clients = await clientRepository
                    .Query(c => dto.ClientIds.Contains(c.Id) && c.TenantId == tenantId)
                    .ToListAsync();

                var results = new List<SendTemplateResultDto>();

                foreach (var client in clients)
                {
                    if (string.IsNullOrWhiteSpace(client.Phone))
                    {
                        results.Add(new SendTemplateResultDto(client.Id, client.Name, "", false, "Sem telefone cadastrado"));
                        continue;
                    }

                    try
                    {
                        var parameters = dto.BodyParams
                            .Select(p => new WhatsappParameterDto
                            {
                                Type = "text",
                                Text = p == "__CLIENT_NAME__" ? client.Name : p
                            })
                            .ToList();

                        var templateMsg = new WhatsappTemplateMessageDto
                        {
                            To = client.Phone.Replace(" ", "").Replace("-", "").Replace("(", "").Replace(")", ""),
                            Template = new WhatsappTemplateDto
                            {
                                Name = dto.TemplateName,
                                Language = new WhatsappLanguageDto { Code = dto.Language },
                                Components = parameters.Count > 0
                                    ? new List<WhatsappComponentDto>
                                    {
                                        new() { Type = "body", Parameters = parameters }
                                    }
                                    : null
                            }
                        };

                        var success = await whatsappService.SendTemplateMessageAsync(templateMsg, phoneNumberId);
                        results.Add(new SendTemplateResultDto(client.Id, client.Name, client.Phone, success, success ? null : "Falha no envio"));
                    }
                    catch (Exception ex)
                    {
                        results.Add(new SendTemplateResultDto(client.Id, client.Name, client.Phone ?? "", false, ex.Message));
                    }
                }

                return ResponseViewModel<IEnumerable<SendTemplateResultDto>>.Success(results).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPost("messages")]
        [Authorize]
        public async Task<IActionResult> SendMessage(
            [FromServices] ICurrentUserService currentUserService,
            [FromServices] IWhatsappService whatsappService,
            [FromBody] SendWhatsAppMessageDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.To) || string.IsNullOrWhiteSpace(dto.Body))
                return ResponseViewModel<object>.Fail("Destinatário e mensagem são obrigatórios.").ToActionResult();

            try
            {
                var tenantId = currentUserService.TenantId;
                var tenant = await _tenantRepository.GetByIdAsync(true, tenantId);
                var phoneNumberId = tenant?.WhatsappPhoneNumberId;

                var success = await whatsappService.SendTextMessageAsync(dto.To, dto.Body, phoneNumberId);
                
                if (success)
                    return ResponseViewModel<object>.SuccessWithMessage("Mensagem enviada.", null).ToActionResult();
                
                return ResponseViewModel<object>.Fail("Falha ao enviar mensagem via WhatsApp.").ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
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

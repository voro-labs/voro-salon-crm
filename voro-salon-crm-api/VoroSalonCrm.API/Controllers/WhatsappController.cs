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

        [HttpPost("evolution-webhook")]
        public async Task<IActionResult> ReceiveEvolutionWebhook(
            [FromBody] EvolutionWebhookDto webhook,
            [FromServices] ITenantEvolutionInstanceRepository evolutionInstanceRepository)
        {
            Console.WriteLine("Received Evolution Webhook: " + System.Text.Json.JsonSerializer.Serialize(webhook));
            if (!string.Equals(webhook?.Event, "MESSAGE", StringComparison.OrdinalIgnoreCase) || webhook?.Data == null)
                return Ok();

            var data = webhook.Data;

            // Ignorar mensagens enviadas pelo próprio bot
            if (data.Key.FromMe)
                return Ok();

            // Extrair número do remetente (remover sufixo @s.whatsapp.net ou @c.us)
            var from = data.Key.RemoteJid.Split('@')[0];
            var contactName = data.PushName ?? "Cliente";
            var messageId = data.Key.Id;
            var instanceId = webhook.InstanceId;

            // Resolver tenant pela instância no banco de dados
            Guid? tenantId = null;
            if (!string.IsNullOrEmpty(instanceId))
            {
                var evolutionInstance = await evolutionInstanceRepository.GetByInstanceIdAsync(instanceId);
                if (evolutionInstance != null)
                    tenantId = evolutionInstance.TenantId;
            }

            // Determinar tipo e conteúdo da mensagem
            var (messageType, bodyText) = DetermineEvolutionMessageType(data.Message);

            // Salvar mensagem inbound
            if (tenantId.HasValue)
            {
                try
                {
                    await _whatsAppMessageService.SaveInboundAsync(
                        tenantId: tenantId.Value,
                        from: from,
                        to: instanceId ?? string.Empty,
                        body: bodyText,
                        whatsAppMessageId: messageId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Erro ao salvar mensagem inbound Evolution Go.");
                }
            }

            // Montar WhatsappMessageDto compatível com o HandleMessageAsync existente
            var message = new WhatsappMessageDto
            {
                From = from,
                Id = messageId,
                Timestamp = data.MessageTimestamp.ToString(),
                Type = messageType,
                Text = messageType == "text" ? new WhatsappTextDto { Body = bodyText } : null,
                Audio = messageType == "audio" && data.Message?.AudioMessage != null
                    ? new WhatsappAudioDto { Id = messageId, Url = data.Message.AudioMessage.Url ?? string.Empty }
                    : null,
                Interactive = messageType == "interactive"
                    ? BuildInteractiveFromEvolution(data.Message)
                    : null
            };

            await _whatsappChatService.HandleMessageAsync(message, contactName, instanceId, instanceId);

            return Ok();
        }

        private static (string type, string body) DetermineEvolutionMessageType(EvolutionMessageContentDto? msg)
        {
            if (msg == null) return ("text", string.Empty);
            if (!string.IsNullOrEmpty(msg.Conversation)) return ("text", msg.Conversation);
            if (msg.AudioMessage != null) return ("audio", "[Áudio]");
            if (msg.ImageMessage != null) return ("image", "[Imagem]");
            if (msg.DocumentMessage != null) return ("document", "[Documento]");
            if (msg.ButtonsResponseMessage != null)
                return ("interactive", msg.ButtonsResponseMessage.SelectedDisplayText ?? "[Botão]");
            if (msg.ListResponseMessage != null)
                return ("interactive", msg.ListResponseMessage.Title ?? "[Lista]");
            return ("text", string.Empty);
        }

        private static WhatsappInteractiveDto? BuildInteractiveFromEvolution(EvolutionMessageContentDto? msg)
        {
            if (msg?.ButtonsResponseMessage != null)
                return new WhatsappInteractiveDto
                {
                    Type = "button_reply",
                    ButtonReply = new WhatsappButtonReplyDto
                    {
                        Id = msg.ButtonsResponseMessage.SelectedButtonId ?? string.Empty,
                        Title = msg.ButtonsResponseMessage.SelectedDisplayText ?? string.Empty
                    }
                };

            if (msg?.ListResponseMessage != null)
                return new WhatsappInteractiveDto
                {
                    Type = "list_reply",
                    ListReply = new WhatsappListReplyDto
                    {
                        Id = msg.ListResponseMessage.SingleSelectReply?.SelectedRowId ?? string.Empty,
                        Title = msg.ListResponseMessage.Title ?? string.Empty
                    }
                };

            return null;
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

        [HttpGet("onboarding/config")]
        [AllowAnonymous]
        public IActionResult GetOnboardingConfig([FromServices] IWhatsAppOnboardingService onboardingService)
        {
            var cfg = onboardingService.GetConfig();
            if (string.IsNullOrEmpty(cfg.AppId))
                return ResponseViewModel<object>.Fail("WhatsApp AppId não configurado.").ToActionResult();
            return ResponseViewModel<WhatsAppOnboardingConfigDto>
                .Success(cfg)
                .ToActionResult();
        }

        [HttpPost("onboarding/exchange")]
        [Authorize]
        public async Task<IActionResult> ExchangeCode(
            [FromServices] IWhatsAppOnboardingService onboardingService,
            [FromServices] ICurrentUserService currentUserService,
            [FromBody] WhatsAppExchangeCodeDto dto)
        {
            try
            {
                await onboardingService.ExchangeCodeAsync(dto, currentUserService.TenantId);
                return ResponseViewModel<object>
                    .SuccessWithMessage("WhatsApp conectado com sucesso.", null)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpDelete("onboarding/disconnect")]
        [Authorize]
        public async Task<IActionResult> Disconnect(
            [FromServices] IWhatsAppOnboardingService onboardingService,
            [FromServices] ICurrentUserService currentUserService)
        {
            try
            {
                await onboardingService.DisconnectAsync(currentUserService.TenantId);
                return ResponseViewModel<object>
                    .SuccessWithMessage("WhatsApp desconectado.", null)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpGet("onboarding/status")]
        [Authorize]
        public async Task<IActionResult> GetOnboardingStatus(
            [FromServices] IWhatsAppOnboardingService onboardingService,
            [FromServices] ICurrentUserService currentUserService)
        {
            try
            {
                var status = await onboardingService.GetStatusAsync(currentUserService.TenantId);
                return ResponseViewModel<WhatsAppOnboardingStatusDto>
                    .Success(status)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

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

                        if (success)
                        {
                            var resolvedParams = dto.BodyParams
                                .Select(p => p == "__CLIENT_NAME__" ? client.Name : p)
                                .Where(p => !string.IsNullOrWhiteSpace(p))
                                .ToList();
                            var templateBody = resolvedParams.Count > 0
                                ? $"[Template: {dto.TemplateName}] " + string.Join(" · ", resolvedParams)
                                : $"[Template: {dto.TemplateName}]";

                            try
                            {
                                await _whatsAppMessageService.SaveOutboundAsync(
                                    tenantId: tenantId,
                                    from: tenant?.WhatsAppDisplayPhone ?? tenant?.ContactPhone ?? "business",
                                    to: client.Phone.Replace(" ", "").Replace("-", "").Replace("(", "").Replace(")", ""),
                                    body: templateBody);
                            }
                            catch { /* não-crítico */ }
                        }

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

        [HttpDelete("conversations/{id:guid}")]
        [Authorize]
        public async Task<IActionResult> DeleteConversation(
            [FromRoute] Guid id,
            [FromServices] ICurrentUserService currentUserService,
            [FromServices] IWhatsAppConversationRepository conversationRepository)
        {
            try
            {
                var tenantId = currentUserService.TenantId;
                var conversation = await conversationRepository.GetByIdAsync(false, id);

                if (conversation == null || conversation.TenantId != tenantId)
                    return ResponseViewModel<object>.Fail("Conversa não encontrada.").ToActionResult();

                conversation.DeletedAt = DateTimeOffset.UtcNow;
                conversationRepository.Update(conversation);
                await conversationRepository.SaveChangesAsync();

                return ResponseViewModel<object>.SuccessWithMessage("Conversa excluída.", null).ToActionResult();
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

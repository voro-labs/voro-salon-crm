using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using VoroSalonCrm.Application.DTOs.Integration;
using VoroSalonCrm.Application.DTOs.Public;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Infrastructure.Integration
{
    public class WhatsappChatService : IWhatsappChatService
    {
        private readonly IWhatsappService _whatsappService;
        private readonly IPublicBookingService _publicBookingService;
        private readonly ITenantRepository _tenantRepository;
        private readonly IWhatsAppConversationRepository _conversationRepository;
        private readonly IWhatsAppMessageService _messageService;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMemoryCache _cache;
        private readonly ILogger<WhatsappChatService> _logger;
        private readonly IAppointmentRepository _appointmentRepository;
        private readonly IClientRepository _clientRepository;

        private const string CACHE_PREFIX = "wa_booking_";

        public WhatsappChatService(
            IWhatsappService whatsappService,
            IPublicBookingService publicBookingService,
            ITenantRepository tenantRepository,
            IWhatsAppConversationRepository conversationRepository,
            IWhatsAppMessageService messageService,
            IUnitOfWork unitOfWork,
            IMemoryCache cache,
            ILogger<WhatsappChatService> logger,
            IAppointmentRepository appointmentRepository,
            IClientRepository clientRepository)
        {
            _whatsappService = whatsappService;
            _publicBookingService = publicBookingService;
            _tenantRepository = tenantRepository;
            _conversationRepository = conversationRepository;
            _messageService = messageService;
            _unitOfWork = unitOfWork;
            _cache = cache;
            _logger = logger;
            _appointmentRepository = appointmentRepository;
            _clientRepository = clientRepository;
        }

        /// <summary>Salva mensagem enviada pelo bot no histórico da conversa.</summary>
        private async Task SaveBotMessageAsync(Guid tenantId, string to, string? phoneNumberId, string body)
        {
            if (tenantId == Guid.Empty || string.IsNullOrWhiteSpace(body)) return;
            try
            {
                await _messageService.SaveOutboundAsync(
                    tenantId,
                    from: phoneNumberId ?? "bot",
                    to: to,
                    body: body);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Falha ao salvar mensagem outbound do bot para {To}.", to);
            }
        }

        private class BookingSession
        {
            public string State { get; set; } = "START";
            public Guid TenantId { get; set; }
            public string? TenantSlug { get; set; }
            public string? TenantName { get; set; }
            public string? WhatsappPhoneNumberId { get; set; }
            public bool UseWhatsappBooking { get; set; }
            public Guid? ServiceId { get; set; }
            public string? ServiceName { get; set; }
            public Guid? EmployeeId { get; set; }
            public string? EmployeeName { get; set; }
            public DateTime? SelectedDate { get; set; }
            public string? SelectedTime { get; set; }
            public string? AppointmentDescription { get; set; }
            public Guid? AppointmentId { get; set; }
            public string? ContactName { get; set; }
            public int TimeSlotPage { get; set; } = 0;
            public int DatePage { get; set; } = 0;
            public int ServicePage { get; set; } = 0;
            public int EmployeePage { get; set; } = 0;
            // Task 4: existing appointment detected
            public Guid? PendingAppointmentId { get; set; }
            public string? PendingAppointmentSummary { get; set; }
        }

        public async Task HandleMessageAsync(WhatsappMessageDto message, string contactName, string displayPhoneNumber, CancellationToken ct = default)
        {
            var from = message.From;
            var sessionKey = $"{CACHE_PREFIX}{from}";

            if (!_cache.TryGetValue(sessionKey, out BookingSession? session) || session == null)
            {
                session = new BookingSession();

                // Try to find tenant by receiving phone number
                var tenant = await _tenantRepository.Query(t => t.IsActive && t.ContactPhone == displayPhoneNumber).FirstOrDefaultAsync(ct);

                if (tenant != null)
                {
                    if (!tenant.UseWhatsappBooking)
                    {
                        // Tenant has WhatsApp booking disabled
                        return;
                    }

                    session.TenantId = tenant.Id;
                    session.TenantSlug = tenant.Slug;
                    session.TenantName = tenant.Name;
                    session.WhatsappPhoneNumberId = tenant.WhatsappPhoneNumberId;
                    session.UseWhatsappBooking = tenant.UseWhatsappBooking;
                    session.State = "START";
                }
                else
                {
                    // For global/unknown tenant lookup, we don't have UseWhatsappBooking yet
                    // But if we are in AWAITING_TENANT, we will check it once selected
                    session.State = "AWAITING_TENANT";
                    await AskForTenantAsync(from, contactName, ct);
                    _cache.Set(sessionKey, session, TimeSpan.FromMinutes(15));
                    return;
                }
            }

            // Handle user response based on current state
            try
            {
                if (message.Type == "audio")
                {
                    const string audioReply = "Ainda estou aprendendo a ouvir áudios! 🎧 Por favor, pode digitar sua mensagem?";
                    await _whatsappService.SendTextMessageAsync(from, audioReply, session.WhatsappPhoneNumberId, ct);
                    await SaveBotMessageAsync(session.TenantId, from, session.WhatsappPhoneNumberId, audioReply);
                    return;
                }

                switch (session.State)
                {
                    case "AWAITING_TENANT":
                        await HandleTenantSelectionAsync(from, message, session, ct);
                        break;

                    case "START":
                        await StartBookingFlowAsync(from, contactName, session, ct);
                        break;

                    case "AWAITING_APPOINTMENT_ACTION":
                        await HandleAppointmentActionAsync(from, message, contactName, session, ct);
                        break;

                    case "AWAITING_SERVICE":
                        await HandleServiceSelectionAsync(from, message, session, ct);
                        break;

                    case "AWAITING_EMPLOYEE":
                        await HandleEmployeeSelectionAsync(from, message, session, ct);
                        break;

                    case "AWAITING_DATE":
                        await HandleDateSelectionAsync(from, message, session, ct);
                        break;

                    case "AWAITING_TIME":
                        await HandleTimeSelectionAsync(from, message, session, ct);
                        break;

                    case "AWAITING_DESCRIPTION":
                        await HandleDescriptionAsync(from, message, session, ct);
                        break;

                    case "AWAITING_CONFIRMATION":
                        await HandleConfirmationAsync(from, message, contactName, session, ct);
                        break;

                    case "AWAITING_REMINDER_TIME":
                        await HandleReminderTimeAsync(from, message, session, ct);
                        break;

                    case "AWAITING_CANCEL_CONFIRMATION":
                        await HandleCancelConfirmationAsync(from, message, session, ct);
                        break;

                    case "AWAITING_RESCHEDULE_CONFIRMATION":
                        await HandleRescheduleConfirmationAsync(from, message, session, ct);
                        break;

                    default:
                        session.State = "START";
                        await StartBookingFlowAsync(from, contactName, session, ct);
                        break;
                }

                // Save or clear session
                if (session.State == "COMPLETED" || session.State == "CANCELLED")
                {
                    _cache.Remove(sessionKey);
                }
                else
                {
                    _cache.Set(sessionKey, session, TimeSpan.FromMinutes(15));
                }

                // Persist conversation state to DB (fire-and-forget on failure)
                if (session.TenantId != Guid.Empty)
                {
                    try
                    {
                        await PersistConversationStateAsync(
                            session.TenantId, from, contactName, session,
                            GetLastInboundBody(message), ct);
                    }
                    catch (Exception persistEx)
                    {
                        _logger.LogWarning(persistEx, "Falha ao persistir estado da conversa WhatsApp para {From}", from);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error handling WhatsApp message for {From}", from);
                const string errMsg = "Ops, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente mais tarde.";
                await _whatsappService.SendTextMessageAsync(from, errMsg, session?.WhatsappPhoneNumberId, ct);
                if (session != null) await SaveBotMessageAsync(session.TenantId, from, session.WhatsappPhoneNumberId, errMsg);
            }
        }

        private async Task AskForTenantAsync(string from, string contactName, CancellationToken ct)
        {
            var tenants = await _tenantRepository.Query(t => t.IsActive).Take(10).ToListAsync(ct);

            if (tenants.Count == 0)
            {
                await _whatsappService.SendTextMessageAsync(from, "Desculpe, não encontramos estabelecimentos ativos no sistema.", null, ct);
                return;
            }

            var rows = tenants
                .Where(t => t.UseWhatsappBooking)
                .Select(t => new
                {
                    id = t.Slug,
                    title = t.Name.Length > 24 ? $"{t.Name[..21]}..." : t.Name,
                    description = "Clique para selecionar"
                }).ToList();

            var interactive = new
            {
                type = "list",
                header = new { type = "text", text = "VoroLabs" },
                body = new { text = $"Olá {contactName}! Qual estabelecimento você deseja agendar hoje?" },
                action = new
                {
                    button = "Ver estabelecimentos",
                    sections = new[]
                    {
                        new { title = "Estabelecimentos", rows }
                    }
                }
            };

            await _whatsappService.SendInteractiveMessageAsync(from, interactive, null, ct);
        }

        private async Task HandleTenantSelectionAsync(string from, WhatsappMessageDto message, BookingSession session, CancellationToken ct)
        {
            string? slug = null;
            if (message.Type == "interactive" && message.Interactive?.ListReply != null)
                slug = message.Interactive.ListReply.Id;

            if (!string.IsNullOrEmpty(slug))
            {
                var tenant = await _tenantRepository.Query(t => t.Slug == slug).FirstOrDefaultAsync(ct);

                if (tenant == null || !tenant.UseWhatsappBooking)
                {
                    const string notAvailableMsg = "Desculpe, este estabelecimento não está aceitando agendamentos via WhatsApp no momento.";
                    await _whatsappService.SendTextMessageAsync(from, notAvailableMsg, session.WhatsappPhoneNumberId, ct);
                    await SaveBotMessageAsync(session.TenantId, from, session.WhatsappPhoneNumberId, notAvailableMsg);
                    return;
                }

                session.TenantSlug = slug;
                session.TenantName = tenant.Name;
                session.WhatsappPhoneNumberId = tenant.WhatsappPhoneNumberId;
                session.UseWhatsappBooking = tenant.UseWhatsappBooking;
                session.State = "START";

                await StartBookingFlowAsync(from, "Cliente", session, ct);
            }
            else
            {
                await _whatsappService.SendTextMessageAsync(from, "Por favor, selecione um estabelecimento da lista.", null, ct);
            }
        }

        private const int ServicePageSize = 9;

        private async Task StartBookingFlowAsync(string from, string contactName, BookingSession session, CancellationToken ct)
        {
            session.ContactName = contactName;

            // Task 4: check if client already has a Pending or Confirmed appointment
            if (session.TenantId != Guid.Empty)
            {
                try
                {
                    // Normalize phone to last 10 digits for matching
                    var rawPhone = new string(from.Where(char.IsDigit).ToArray());
                    var phoneSuffix = rawPhone.Length > 10 ? rawPhone[^10..] : rawPhone;

                    // Find matching client by phone suffix
                    var clients = await _clientRepository
                        .Query(c => c.TenantId == session.TenantId && c.Phone != null)
                        .ToListAsync(ct);

                    var matchedClient = clients.FirstOrDefault(c =>
                    {
                        var digits = new string(c.Phone!.Where(char.IsDigit).ToArray());
                        var suffix = digits.Length > 10 ? digits[^10..] : digits;
                        return suffix.Length >= 8 && suffix == phoneSuffix;
                    });

                    if (matchedClient != null)
                    {
                        var appointment = await _appointmentRepository
                            .Query(a =>
                                a.TenantId == session.TenantId &&
                                !a.IsDeleted &&
                                a.ClientId == matchedClient.Id &&
                                (a.Status == AppointmentStatus.Pending || a.Status == AppointmentStatus.Confirmed) &&
                                a.ScheduledDateTime > DateTimeOffset.UtcNow)
                            .Include(a => a.Service)
                            .OrderBy(a => a.ScheduledDateTime)
                            .FirstOrDefaultAsync(ct);

                        if (appointment != null)
                        {
                            var local = appointment.ScheduledDateTime.ToOffset(TimeSpan.FromHours(-3));
                            var serviceName = appointment.Service?.Name ?? "Serviço";
                            session.PendingAppointmentId = appointment.Id;
                            session.PendingAppointmentSummary =
                                $"*Serviço:* {serviceName}\n*Data:* {local:dd/MM/yyyy}\n*Horário:* {local:HH:mm}";

                            var detectionMsg =
                                $"Olá {contactName}! Encontrei um agendamento ativo:\n\n" +
                                session.PendingAppointmentSummary +
                                "\n\nO que você gostaria de fazer?\n" +
                                "1 - Cancelar agendamento\n" +
                                "2 - Reagendar\n" +
                                "3 - Continuar sem alterar";

                            await _whatsappService.SendTextMessageAsync(from, detectionMsg, session.WhatsappPhoneNumberId, ct);
                            await SaveBotMessageAsync(session.TenantId, from, session.WhatsappPhoneNumberId, detectionMsg);
                            session.State = "AWAITING_APPOINTMENT_ACTION";
                            return;
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Falha ao verificar agendamento existente para {From}.", from);
                }
            }

            session.ServicePage = 0;
            await AskForServiceAsync(from, session, ct);
        }

        private async Task HandleAppointmentActionAsync(string from, WhatsappMessageDto message, string contactName, BookingSession session, CancellationToken ct)
        {
            var text = message.Type == "text" ? message.Text?.Body?.Trim() : null;
            var interactiveId = message.Type == "interactive"
                ? (message.Interactive?.ButtonReply?.Id ?? message.Interactive?.ListReply?.Id)
                : null;
            var choice = interactiveId ?? text;

            if (choice == "1" || choice?.ToLower().Contains("cancel") == true)
            {
                var cancelMsg = $"Tem certeza que deseja cancelar seu agendamento de {session.SelectedTime}?\n\n1 - Sim, cancelar\n2 - Não, manter";
                var buttons = new[]
                {
                    new { type = "reply", reply = new { id = "yes", title = "Sim, cancelar" } },
                    new { type = "reply", reply = new { id = "no", title = "Não, manter" } }
                };
                var interactive = new { type = "button", body = new { text = cancelMsg }, action = new { buttons } };
                await _whatsappService.SendInteractiveMessageAsync(from, interactive, session.WhatsappPhoneNumberId, ct);
                await SaveBotMessageAsync(session.TenantId, from, session.WhatsappPhoneNumberId, cancelMsg);
                session.State = "AWAITING_CANCEL_CONFIRMATION";
            }
            else if (choice == "2" || choice?.ToLower().Contains("reaGend") == true || choice?.ToLower().Contains("reschedul") == true)
            {
                var rescheduleMsg = "Deseja realmente trocar o horário do seu agendamento?\n\n1 - Sim, reagendar\n2 - Não, manter";
                var buttons = new[]
                {
                    new { type = "reply", reply = new { id = "yes", title = "Sim, reagendar" } },
                    new { type = "reply", reply = new { id = "no", title = "Não, manter" } }
                };
                var interactive = new { type = "button", body = new { text = rescheduleMsg }, action = new { buttons } };
                await _whatsappService.SendInteractiveMessageAsync(from, interactive, session.WhatsappPhoneNumberId, ct);
                await SaveBotMessageAsync(session.TenantId, from, session.WhatsappPhoneNumberId, rescheduleMsg);
                session.State = "AWAITING_RESCHEDULE_CONFIRMATION";
            }
            else if (choice == "3" || choice?.ToLower().Contains("contin") == true)
            {
                // Continue without changes
                const string continueMsg = "Tudo bem! Seu agendamento permanece confirmado. Até breve! 😊";
                await _whatsappService.SendTextMessageAsync(from, continueMsg, session.WhatsappPhoneNumberId, ct);
                await SaveBotMessageAsync(session.TenantId, from, session.WhatsappPhoneNumberId, continueMsg);
                session.State = "COMPLETED";
            }
            else
            {
                // Re-send options
                var retryMsg =
                    $"Por favor, escolha uma opção:\n\n{session.PendingAppointmentSummary}\n\n" +
                    "1 - Cancelar agendamento\n" +
                    "2 - Reagendar\n" +
                    "3 - Continuar sem alterar";
                await _whatsappService.SendTextMessageAsync(from, retryMsg, session.WhatsappPhoneNumberId, ct);
                await SaveBotMessageAsync(session.TenantId, from, session.WhatsappPhoneNumberId, retryMsg);
            }
        }

        private async Task AskForServiceAsync(string from, BookingSession session, CancellationToken ct)
        {
            var allServices = (await _publicBookingService.GetServicesByTenantAsync(session.TenantSlug!)).ToList();

            if (allServices.Count == 0)
            {
                var noServicesMsg = $"Olá {session.ContactName}! No momento não temos serviços disponíveis para agendamento.";
                await _whatsappService.SendTextMessageAsync(from, noServicesMsg, session.WhatsappPhoneNumberId, ct);
                await SaveBotMessageAsync(session.TenantId, from, session.WhatsappPhoneNumberId, noServicesMsg);
                return;
            }

            var page = session.ServicePage;
            var pageServices = allServices.Skip(page * ServicePageSize).Take(ServicePageSize).ToList();
            var hasMore = allServices.Count > (page + 1) * ServicePageSize;

            var rows = pageServices.Select(s => new
            {
                id = s.Id.ToString(),
                title = s.Name.Length > 24 ? $"{s.Name[..21]}..." : s.Name,
                description = s.Price > 0 ? $"R$ {s.Price:N2}" : (string?)null
            }).Cast<object>().ToList();

            if (hasMore)
            {
                rows.Add(new
                {
                    id = "more_services",
                    title = "Ver mais serviços",
                    description = "Próximas opções"
                });
            }

            var isFirstPage = page == 0;
            var bodyText = isFirstPage
                ? $"Olá {session.ContactName}! Bem-vindo ao {session.TenantName}. Qual serviço você gostaria de agendar?"
                : "Qual serviço você gostaria de agendar?";

            var sections = new[]
            {
                new { title = "Serviços", rows }
            };

            var interactive = new
            {
                type = "list",
                header = new { type = "text", text = session.TenantName },
                body = new { text = bodyText },
                action = new
                {
                    button = "Ver serviços",
                    sections
                }
            };

            await _whatsappService.SendInteractiveMessageAsync(from, interactive, session.WhatsappPhoneNumberId, ct);
            await SaveBotMessageAsync(session.TenantId, from, session.WhatsappPhoneNumberId, bodyText);
            session.State = "AWAITING_SERVICE";
        }

        private async Task HandleServiceSelectionAsync(string from, WhatsappMessageDto message, BookingSession session, CancellationToken ct)
        {
            string? serviceIdStr = null;
            if (message.Type == "interactive" && message.Interactive?.ListReply != null)
                serviceIdStr = message.Interactive.ListReply.Id;
            else if (message.Type == "text")
            {
                await AskForServiceAsync(from, session, ct);
                return;
            }

            if (serviceIdStr == "more_services")
            {
                session.ServicePage++;
                await AskForServiceAsync(from, session, ct);
                return;
            }

            if (Guid.TryParse(serviceIdStr, out var serviceId))
            {
                var services = (await _publicBookingService.GetServicesByTenantAsync(session.TenantSlug!)).ToList();
                var selectedService = services.FirstOrDefault(s => s.Id == serviceId);

                if (selectedService == null)
                {
                    // Se não encontrou o serviço, talvez seja um ID de outro step
                    const string invalidMsg = "Por favor, selecione um serviço da lista atual.";
                    await _whatsappService.SendTextMessageAsync(from, invalidMsg, session.WhatsappPhoneNumberId, ct);
                    await AskForServiceAsync(from, session, ct);
                    return;
                }

                session.ServiceId = serviceId;
                session.ServiceName = selectedService.Name;

                var employees = await _publicBookingService.GetEmployeesByServiceAsync(session.TenantSlug!, serviceId);

                if (!employees.Any())
                {
                    session.EmployeeId = null;
                    session.State = "AWAITING_DATE";
                    session.DatePage = 0;
                    await AskForDateAsync(from, session, ct);
                    return;
                }

                session.EmployeePage = 0;
                await AskForEmployeeAsync(from, session, employees, ct);
            }
            else
            {
                await AskForServiceAsync(from, session, ct);
            }
        }

        private const int EmployeePageSize = 8; // reserva 1 row para "Tanto faz" e 1 para "Ver mais"

        private async Task HandleEmployeeSelectionAsync(string from, WhatsappMessageDto message, BookingSession session, CancellationToken ct)
        {
            string? employeeIdStr = null;
            if (message.Type == "interactive" && message.Interactive?.ListReply != null)
                employeeIdStr = message.Interactive.ListReply.Id;

            // Validação: Se mandou uma data no lugar de funcionário
            if (DateTime.TryParseExact(employeeIdStr, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _))
            {
                const string msg = "Você ainda não escolheu o profissional. Por favor, selecione um profissional da lista acima antes de escolher a data.";
                await _whatsappService.SendTextMessageAsync(from, msg, session.WhatsappPhoneNumberId, ct);
                var employeesList = await _publicBookingService.GetEmployeesByServiceAsync(session.TenantSlug!, session.ServiceId!.Value);
                await AskForEmployeeAsync(from, session, employeesList, ct);
                return;
            }

            if (employeeIdStr == "more_employees")
            {
                session.EmployeePage++;
                var employees = await _publicBookingService.GetEmployeesByServiceAsync(session.TenantSlug!, session.ServiceId!.Value);
                await AskForEmployeeAsync(from, session, employees, ct);
                return;
            }

            if (employeeIdStr == "any")
            {
                session.EmployeeId = null;
                session.EmployeeName = "Qualquer profissional";
            }
            else if (Guid.TryParse(employeeIdStr, out var employeeId))
            {
                var employees = (await _publicBookingService.GetEmployeesByServiceAsync(session.TenantSlug!, session.ServiceId!.Value)).ToList();
                var selectedEmployee = employees.FirstOrDefault(e => e.Id == employeeId);

                if (selectedEmployee == null)
                {
                    const string invalidMsg = "Por favor, selecione um profissional da lista atual.";
                    await _whatsappService.SendTextMessageAsync(from, invalidMsg, session.WhatsappPhoneNumberId, ct);
                    await AskForEmployeeAsync(from, session, employees, ct);
                    return;
                }

                session.EmployeeId = employeeId;
                session.EmployeeName = selectedEmployee.Name;
            }
            else
            {
                var employees = await _publicBookingService.GetEmployeesByServiceAsync(session.TenantSlug!, session.ServiceId!.Value);
                await AskForEmployeeAsync(from, session, employees, ct);
                return;
            }

            session.State = "AWAITING_DATE";
            session.DatePage = 0;
            await AskForDateAsync(from, session, ct);
        }

        private async Task AskForEmployeeAsync(string from, BookingSession session, IEnumerable<PublicEmployeeDto> employees, CancellationToken ct)
        {
            var allEmployees = employees.ToList();
            var page = session.EmployeePage;
            var pageEmployees = allEmployees.Skip(page * EmployeePageSize).Take(EmployeePageSize).ToList();
            var hasMore = allEmployees.Count > (page + 1) * EmployeePageSize;

            var rows = new List<object>();

            if (page == 0)
            {
                rows.Add(new
                {
                    id = "any",
                    title = "Tanto faz",
                    description = "Qualquer profissional disponível"
                });
            }

            rows.AddRange(pageEmployees.Select(e => new
            {
                id = e.Id.ToString(),
                title = e.Name.Length > 24 ? $"{e.Name[..21]}..." : e.Name,
                description = (string?)null
            }).Cast<object>());

            if (hasMore)
            {
                rows.Add(new
                {
                    id = "more_employees",
                    title = "Ver mais profissionais",
                    description = (string?)"Próximas opções"
                });
            }

            var sections = new[]
            {
                new { title = "Profissionais", rows }
            };

            var interactive = new
            {
                type = "list",
                body = new { text = "Com qual profissional você prefere ser atendido?" },
                action = new
                {
                    button = "Ver profissionais",
                    sections
                }
            };

            await _whatsappService.SendInteractiveMessageAsync(from, interactive, session.WhatsappPhoneNumberId, ct);
            await SaveBotMessageAsync(session.TenantId, from, session.WhatsappPhoneNumberId, "Com qual profissional você prefere ser atendido?");
            session.State = "AWAITING_EMPLOYEE";
        }

        private const int DatePageSize = 9; // reserva 1 row para "Ver mais" quando necessário

        private async Task AskForDateAsync(string from, BookingSession session, CancellationToken ct)
        {
            var allDates = Enumerable.Range(0, 30).Select(i => DateTime.Today.AddDays(i)).ToList();

            var page = session.DatePage;
            var pageDates = allDates.Skip(page * DatePageSize).Take(DatePageSize).ToList();
            var hasMore = allDates.Count > (page + 1) * DatePageSize;

            var rows = pageDates.Select(d => new
            {
                id = d.ToString("yyyy-MM-dd"),
                title = d.ToString("dd/MM/yyyy"),
                description = (string?)(d == DateTime.Today ? "Hoje" : d.DayOfWeek switch
                {
                    DayOfWeek.Monday => "Segunda-feira",
                    DayOfWeek.Tuesday => "Terça-feira",
                    DayOfWeek.Wednesday => "Quarta-feira",
                    DayOfWeek.Thursday => "Quinta-feira",
                    DayOfWeek.Friday => "Sexta-feira",
                    DayOfWeek.Saturday => "Sábado",
                    DayOfWeek.Sunday => "Domingo",
                    _ => null
                })
            }).Cast<object>().ToList();

            if (hasMore)
            {
                rows.Add(new
                {
                    id = "more_dates",
                    title = "Ver mais datas",
                    description = (string?)"Próximas opções"
                });
            }

            var sections = new[]
            {
                new { title = "Datas", rows }
            };

            var interactive = new
            {
                type = "list",
                body = new { text = "Para qual data você gostaria de agendar?" },
                action = new
                {
                    button = "Ver datas",
                    sections
                }
            };

            await _whatsappService.SendInteractiveMessageAsync(from, interactive, session.WhatsappPhoneNumberId, ct);
            await SaveBotMessageAsync(session.TenantId, from, session.WhatsappPhoneNumberId, "Para qual data você gostaria de agendar?");
        }

        private async Task HandleDateSelectionAsync(string from, WhatsappMessageDto message, BookingSession session, CancellationToken ct)
        {
            string? dateStr = null;
            if (message.Type == "interactive" && message.Interactive?.ListReply != null)
                dateStr = message.Interactive.ListReply.Id;

            // Validação: Se mandou um ID (GUID) no lugar da data (clicou em serviço/prof anterior)
            if (Guid.TryParse(dateStr, out _))
            {
                const string msg = "Você já selecionou o serviço/profissional. Por favor, selecione uma data da lista acima.";
                await _whatsappService.SendTextMessageAsync(from, msg, session.WhatsappPhoneNumberId, ct);
                await AskForDateAsync(from, session, ct);
                return;
            }

            if (dateStr == "more_dates")
            {
                session.DatePage++;
                await AskForDateAsync(from, session, ct);
                return;
            }

            if (DateTime.TryParseExact(dateStr, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
            {
                session.SelectedDate = date;
                session.DatePage = 0;
                session.TimeSlotPage = 0;
                await AskForTimeAsync(from, session, ct);
            }
            else
            {
                // Input inválido: reenvia a seleção de data
                await AskForDateAsync(from, session, ct);
            }
        }

        private const int TimeSlotPageSize = 9; // reserva 1 row para "Ver mais" quando necessário

        private async Task AskForTimeAsync(string from, BookingSession session, CancellationToken ct)
        {
            var slots = await _publicBookingService.GetAvailableSlotsAsync(session.TenantSlug!, session.SelectedDate!.Value, session.ServiceId!.Value, session.EmployeeId);
            var availableSlots = slots.Where(s => s.IsAvailable).ToList();

            if (availableSlots.Count == 0)
            {
                const string noSlotsMsg = "Desculpe, não há horários disponíveis para esta data. Por favor, escolha outro dia.";
                await _whatsappService.SendTextMessageAsync(from, noSlotsMsg, session.WhatsappPhoneNumberId, ct);
                await SaveBotMessageAsync(session.TenantId, from, session.WhatsappPhoneNumberId, noSlotsMsg);
                session.SelectedDate = null;
                session.TimeSlotPage = 0;
                session.DatePage = 0;
                await AskForDateAsync(from, session, ct);
                return;
            }

            // StartTime está em UTC — converte para Brasília (UTC-3) antes de exibir
            var brasilia = TimeSpan.FromHours(-3);
            var slotsLocal = availableSlots.Select(s => s.StartTime.ToOffset(brasilia)).ToList();

            var page = session.TimeSlotPage;
            var pageSlots = slotsLocal.Skip(page * TimeSlotPageSize).Take(TimeSlotPageSize).ToList();
            var hasMore = slotsLocal.Count > (page + 1) * TimeSlotPageSize;

            var rows = pageSlots.Select(s => new
            {
                id = s.ToString("HH:mm"),
                title = s.ToString("HH:mm"),
                description = "Disponível"
            }).Cast<object>().ToList();

            if (hasMore)
            {
                rows.Add(new
                {
                    id = "more_times",
                    title = "Ver mais horários",
                    description = "Próximas opções"
                });
            }

            var sections = new[]
            {
                new { title = "Horários", rows }
            };

            var interactive = new
            {
                type = "list",
                header = new { type = "text", text = session.TenantName },
                body = new { text = "Selecione o melhor horário para você:" },
                action = new
                {
                    button = "Ver horários",
                    sections
                }
            };

            await _whatsappService.SendInteractiveMessageAsync(from, interactive, session.WhatsappPhoneNumberId, ct);
            await SaveBotMessageAsync(session.TenantId, from, session.WhatsappPhoneNumberId, "Selecione o melhor horário para você:");
            session.State = "AWAITING_TIME";
        }

        private async Task HandleTimeSelectionAsync(string from, WhatsappMessageDto message, BookingSession session, CancellationToken ct)
        {
            string? timeStr = null;
            if (message.Type == "interactive" && message.Interactive?.ListReply != null)
                timeStr = message.Interactive.ListReply.Id;

            // Validação: Se mandou uma data ou GUID no lugar do horário
            if (DateTime.TryParseExact(timeStr, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _) || Guid.TryParse(timeStr, out _))
            {
                const string msg = "Você já selecionou a data. Por favor, escolha um horário da lista acima.";
                await _whatsappService.SendTextMessageAsync(from, msg, session.WhatsappPhoneNumberId, ct);
                await AskForTimeAsync(from, session, ct);
                return;
            }

            if (timeStr == "more_times")
            {
                session.TimeSlotPage++;
                await AskForTimeAsync(from, session, ct);
            }
            else if (!string.IsNullOrEmpty(timeStr) && timeStr.Contains(':'))
            {
                session.SelectedTime = timeStr;
                // Task 5: ask for optional description before confirmation
                await AskForDescriptionAsync(from, session, ct);
            }
            else
            {
                // Input inválido: reenvia a lista de horários
                await AskForTimeAsync(from, session, ct);
            }
        }

        private async Task AskForDescriptionAsync(string from, BookingSession session, CancellationToken ct)
        {
            const string descMsg = "Tem alguma observação para o profissional? ✍️\n\nExemplo: \"quero corte mais curto nas laterais\"\n\nOu responda *não* para pular.";
            await _whatsappService.SendTextMessageAsync(from, descMsg, session.WhatsappPhoneNumberId, ct);
            await SaveBotMessageAsync(session.TenantId, from, session.WhatsappPhoneNumberId, descMsg);
            session.State = "AWAITING_DESCRIPTION";
        }

        private async Task HandleDescriptionAsync(string from, WhatsappMessageDto message, BookingSession session, CancellationToken ct)
        {
            var text = message.Type == "text" ? message.Text?.Body?.Trim() : null;

            if (!string.IsNullOrEmpty(text) &&
                !text.Equals("nao", StringComparison.OrdinalIgnoreCase) &&
                !text.Equals("não", StringComparison.OrdinalIgnoreCase) &&
                !text.Equals("no", StringComparison.OrdinalIgnoreCase) &&
                !text.Equals("n", StringComparison.OrdinalIgnoreCase))
            {
                session.AppointmentDescription = text;
            }
            else
            {
                session.AppointmentDescription = null;
            }

            await AskForConfirmationAsync(from, session, ct);
        }

        private async Task AskForConfirmationAsync(string from, BookingSession session, CancellationToken ct)
        {
            var summary = $"*Resumo do Agendamento*\n\n" +
                          $"*Serviço:* {session.ServiceName}\n" +
                          $"*Profissional:* {session.EmployeeName ?? "Qualquer"}\n" +
                          $"*Data:* {session.SelectedDate:dd/MM/yyyy}\n" +
                          $"*Horário:* {session.SelectedTime}\n";

            if (!string.IsNullOrEmpty(session.AppointmentDescription))
                summary += $"*Observação:* {session.AppointmentDescription}\n";

            summary += "\nPodemos confirmar este agendamento?";

            var buttons = new[]
            {
                new { type = "reply", reply = new { id = "confirm", title = "Confirmar ✅" } },
                new { type = "reply", reply = new { id = "cancel", title = "Cancelar ❌" } }
            };

            var interactive = new
            {
                type = "button",
                body = new { text = summary },
                action = new { buttons }
            };

            await _whatsappService.SendInteractiveMessageAsync(from, interactive, session.WhatsappPhoneNumberId, ct);
            await SaveBotMessageAsync(session.TenantId, from, session.WhatsappPhoneNumberId, summary);
            session.State = "AWAITING_CONFIRMATION";
        }

        private async Task HandleConfirmationAsync(string from, WhatsappMessageDto message, string contactName, BookingSession session, CancellationToken ct)
        {
            string? choice = null;
            if (message.Type == "interactive" && message.Interactive?.ButtonReply != null)
                choice = message.Interactive.ButtonReply.Id;

            if (choice == null)
            {
                // Input inválido: reenvia o resumo de confirmação
                await AskForConfirmationAsync(from, session, ct);
                return;
            }

            if (choice == "confirm")
            {
                var scheduledDateTime = session.SelectedDate!.Value.Add(TimeSpan.Parse(session.SelectedTime!));
                var scheduledDateTimeOffset = new DateTimeOffset(scheduledDateTime, TimeSpan.FromHours(-3));

                var dto = new PublicBookingCreateDto
                {
                    TenantSlug = session.TenantSlug!,
                    ClientName = contactName,
                    ClientPhone = from,
                    Description = "Agendado via WhatsApp Bot",
                    Notes = session.AppointmentDescription,
                    ServiceId = session.ServiceId!.Value,
                    EmployeeId = session.EmployeeId,
                    ScheduledDateTime = scheduledDateTimeOffset
                };

                var result = await _publicBookingService.CreateBookingAsync(dto);

                if (result.Success)
                {
                    session.AppointmentId = result.AppointmentId;
                    var confirmedMsg = $"✅ *Agendamento Confirmado!*\n\n{contactName}, seu horário para {session.ServiceName} em *{session.TenantName}* foi marcado para o dia {session.SelectedDate:dd/MM} às {session.SelectedTime}. Esperamos por você!";
                    await _whatsappService.SendTextMessageAsync(from, confirmedMsg, session.WhatsappPhoneNumberId, ct);
                    await SaveBotMessageAsync(session.TenantId, from, session.WhatsappPhoneNumberId, confirmedMsg);
                    
                    // Task 2: ask for reminder time
                    await AskForReminderTimeAsync(from, session, ct);
                }
                else
                {
                    const string failedMsg = "Desculpe, não conseguimos concluir seu agendamento. Por favor, tente novamente.";
                    await _whatsappService.SendTextMessageAsync(from, failedMsg, session.WhatsappPhoneNumberId, ct);
                    await SaveBotMessageAsync(session.TenantId, from, session.WhatsappPhoneNumberId, failedMsg);
                    session.State = "CANCELLED";
                }
            }
            else
            {
                const string cancelledMsg = "Agendamento cancelado. Se precisar de algo mais, é só chamar!";
                await _whatsappService.SendTextMessageAsync(from, cancelledMsg, session.WhatsappPhoneNumberId, ct);
                await SaveBotMessageAsync(session.TenantId, from, session.WhatsappPhoneNumberId, cancelledMsg);
                session.State = "CANCELLED";
            }
        }

        private async Task AskForReminderTimeAsync(string from, BookingSession session, CancellationToken ct)
        {
            var body = "Quando você deseja receber um lembrete no WhatsApp antes do seu agendamento? ⏰";
            var rows = new[]
            {
                new { id = "15", title = "15 minutos antes", description = "" },
                new { id = "30", title = "30 minutos antes", description = "" },
                new { id = "60", title = "1 hora antes", description = "" },
                new { id = "120", title = "2 horas antes", description = "" },
                new { id = "240", title = "4 horas antes", description = "" },
                new { id = "480", title = "8 horas antes", description = "" },
                new { id = "1440", title = "24 horas antes", description = "" },
                new { id = "2880", title = "48 horas antes", description = "" },
                new { id = "0", title = "Não receber", description = "" }
            };

            var interactive = new
            {
                type = "list",
                header = new { type = "text", text = "Lembrete" },
                body = new { text = body },
                action = new
                {
                    button = "Escolher lembrete",
                    sections = new[] { new { title = "Opções", rows } }
                }
            };

            await _whatsappService.SendInteractiveMessageAsync(from, interactive, session.WhatsappPhoneNumberId, ct);
            await SaveBotMessageAsync(session.TenantId, from, session.WhatsappPhoneNumberId, body);
            session.State = "AWAITING_REMINDER_TIME";
        }

        private async Task HandleReminderTimeAsync(string from, WhatsappMessageDto message, BookingSession session, CancellationToken ct)
        {
            string? choice = null;
            if (message.Type == "interactive" && message.Interactive?.ListReply != null)
                choice = message.Interactive.ListReply.Id;

            if (choice != null && int.TryParse(choice, out var minutes))
            {
                if (session.AppointmentId.HasValue)
                {
                    var appt = await _appointmentRepository.GetByIdAsync(false, session.AppointmentId.Value);
                    if (appt != null)
                    {
                        appt.ReminderMinutes = minutes > 0 ? minutes : null;
                        _appointmentRepository.Update(appt);
                        await _unitOfWork.SaveChangesAsync();
                    }
                }

                var msg = minutes > 0
                    ? $"Perfeito! Avisaremos você {message.Interactive!.ListReply!.Title.ToLower()}."
                    : "Tudo bem! Não enviaremos lembretes para este agendamento.";

                await _whatsappService.SendTextMessageAsync(from, msg, session.WhatsappPhoneNumberId, ct);
                await SaveBotMessageAsync(session.TenantId, from, session.WhatsappPhoneNumberId, msg);
                session.State = "COMPLETED";
            }
            else
            {
                await AskForReminderTimeAsync(from, session, ct);
            }
        }

        private async Task HandleCancelConfirmationAsync(string from, WhatsappMessageDto message, BookingSession session, CancellationToken ct)
        {
            var choice = message.Type == "interactive" ? message.Interactive?.ButtonReply?.Id : message.Text?.Body?.Trim();

            if (choice == "yes" || choice == "1")
            {
                if (session.PendingAppointmentId.HasValue)
                {
                    var appt = await _appointmentRepository.GetByIdAsync(false, session.PendingAppointmentId.Value);
                    if (appt != null)
                    {
                        appt.Status = AppointmentStatus.Cancelled;
                        appt.UpdatedAt = DateTimeOffset.UtcNow;
                        _appointmentRepository.Update(appt);
                        await _unitOfWork.SaveChangesAsync();
                    }
                }
                const string msg = "✅ Seu agendamento foi cancelado com sucesso. Se precisar de algo, é só chamar!";
                await _whatsappService.SendTextMessageAsync(from, msg, session.WhatsappPhoneNumberId, ct);
                await SaveBotMessageAsync(session.TenantId, from, session.WhatsappPhoneNumberId, msg);
                session.State = "CANCELLED";
            }
            else
            {
                const string msg = "Tudo bem! Mantivemos seu agendamento. Se precisar de outra coisa, estou à disposição.";
                await _whatsappService.SendTextMessageAsync(from, msg, session.WhatsappPhoneNumberId, ct);
                await SaveBotMessageAsync(session.TenantId, from, session.WhatsappPhoneNumberId, msg);
                session.State = "COMPLETED";
            }
        }

        private async Task HandleRescheduleConfirmationAsync(string from, WhatsappMessageDto message, BookingSession session, CancellationToken ct)
        {
            var choice = message.Type == "interactive" ? message.Interactive?.ButtonReply?.Id : message.Text?.Body?.Trim();

            if (choice == "yes" || choice == "1")
            {
                session.PendingAppointmentId = null;
                session.PendingAppointmentSummary = null;
                session.ServicePage = 0;
                await AskForServiceAsync(from, session, ct);
            }
            else
            {
                const string msg = "Tudo bem! Mantivemos seu agendamento atual. Até breve!";
                await _whatsappService.SendTextMessageAsync(from, msg, session.WhatsappPhoneNumberId, ct);
                await SaveBotMessageAsync(session.TenantId, from, session.WhatsappPhoneNumberId, msg);
                session.State = "COMPLETED";
            }
        }

        private static string GetLastInboundBody(WhatsappMessageDto message)
        {
            return message.Type switch
            {
                "text" => message.Text?.Body ?? string.Empty,
                "interactive" => message.Interactive?.ButtonReply?.Title
                              ?? message.Interactive?.ListReply?.Title
                              ?? "[Interativo]",
                _ => $"[{message.Type}]"
            };
        }

        private async Task PersistConversationStateAsync(
            Guid tenantId, string phoneNumber, string contactName,
            BookingSession session, string lastMessageBody, CancellationToken ct)
        {
            var existing = await _conversationRepository
                .Query(c => c.TenantId == tenantId && c.PhoneNumber == phoneNumber)
                .FirstOrDefaultAsync(ct);

            if (existing == null)
            {
                await _conversationRepository.AddAsync(new WhatsAppConversation
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    PhoneNumber = phoneNumber,
                    ContactName = contactName,
                    State = session.State,
                    LastMessageBody = lastMessageBody,
                    AppointmentId = session.AppointmentId,
                    LastMessageAt = DateTimeOffset.UtcNow,
                    CreatedAt = DateTimeOffset.UtcNow,
                });
            }
            else
            {
                existing.State = session.State;
                existing.LastMessageBody = lastMessageBody;
                existing.AppointmentId = session.AppointmentId ?? existing.AppointmentId;
                existing.LastMessageAt = DateTimeOffset.UtcNow;
                existing.UpdatedAt = DateTimeOffset.UtcNow;
                if (!string.IsNullOrEmpty(contactName) && contactName != "Cliente")
                    existing.ContactName = contactName;
                _conversationRepository.Update(existing);
            }

            await _unitOfWork.SaveChangesAsync();
        }
    }
}

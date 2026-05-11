using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using VoroSalonCrm.Application.DTOs.Public;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Infrastructure.Integration
{
    public class EvolutionBookingChatService : IEvolutionBookingChatService
    {
        private readonly IEvolutionService _evolutionService;
        private readonly IPublicBookingService _publicBookingService;
        private readonly ITenantRepository _tenantRepository;
        private readonly IWhatsAppConversationRepository _conversationRepository;
        private readonly IWhatsAppMessageService _messageService;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMemoryCache _cache;
        private readonly ILogger<EvolutionBookingChatService> _logger;
        private readonly IAppointmentRepository _appointmentRepository;
        private readonly IClientRepository _clientRepository;
        private readonly IClientRatingRepository _clientRatingRepository;
        private readonly IAIConversationService _aiConversationService;

        private const string CACHE_PREFIX = "evo_booking_";

        public EvolutionBookingChatService(
            IEvolutionService evolutionService,
            IPublicBookingService publicBookingService,
            ITenantRepository tenantRepository,
            IWhatsAppConversationRepository conversationRepository,
            IWhatsAppMessageService messageService,
            IUnitOfWork unitOfWork,
            IMemoryCache cache,
            ILogger<EvolutionBookingChatService> logger,
            IAppointmentRepository appointmentRepository,
            IClientRepository clientRepository,
            IClientRatingRepository clientRatingRepository,
            IAIConversationService aiConversationService)
        {
            _evolutionService = evolutionService;
            _publicBookingService = publicBookingService;
            _tenantRepository = tenantRepository;
            _conversationRepository = conversationRepository;
            _messageService = messageService;
            _unitOfWork = unitOfWork;
            _cache = cache;
            _logger = logger;
            _appointmentRepository = appointmentRepository;
            _clientRepository = clientRepository;
            _clientRatingRepository = clientRatingRepository;
            _aiConversationService = aiConversationService;
        }

        private class EvolutionBookingSession
        {
            public string State { get; set; } = "START";
            public Guid TenantId { get; set; }
            public string? TenantSlug { get; set; }
            public string? TenantName { get; set; }
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
            public Guid? PendingAppointmentId { get; set; }
            public string? PendingAppointmentSummary { get; set; }
            public List<(string Id, string Label)> CurrentOptions { get; set; } = new();
            public string InstanceId { get; set; } = string.Empty;
        }

        private string SessionKey(Guid tenantId, string from) => $"{CACHE_PREFIX}{tenantId}_{from}";

        private async Task SendAsync(EvolutionBookingSession session, string to, string text, CancellationToken ct)
        {
            var sent = await _evolutionService.SendTextAsync(session.InstanceId, to, text, ct);
            if (!sent)
                _logger.LogWarning("Evolution send failed for {To}.", to);

            if (session.TenantId != Guid.Empty && !string.IsNullOrWhiteSpace(text))
            {
                try
                {
                    await _messageService.SaveOutboundAsync(
                        tenantId: session.TenantId,
                        from: session.InstanceId,
                        to: to,
                        body: text);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Falha ao salvar outbound para {To}.", to);
                }
            }
        }

        public async Task HandleMessageAsync(WhatsAppMessage msg, CancellationToken ct = default)
        {
            try
            {
                var from = msg.From;
                var sessionKey = SessionKey(msg.TenantId, from);

                // Deduplicar webhooks duplicados: Evolution pode entregar o mesmo evento mais de uma vez.
                // Para IDs conhecidos, usa o WhatsAppMessageId; para IDs nulos, usa remetente+corpo+janela de 1 segundo.
                var bodySnippet = msg.Body?.Length > 50 ? msg.Body[..50] : (msg.Body ?? string.Empty);
                var dedupKey = !string.IsNullOrEmpty(msg.WhatsAppMessageId)
                    ? $"evo_dedup_{msg.WhatsAppMessageId}"
                    : $"evo_dedup_{msg.TenantId}_{from}_{msg.Timestamp:yyyyMMddHHmmss}_{bodySnippet}";

                if (_cache.TryGetValue(dedupKey, out _))
                {
                    msg.ProcessedByBotAt ??= DateTimeOffset.UtcNow;
                    return;
                }
                _cache.Set(dedupKey, true, TimeSpan.FromMinutes(5));

                if (!_cache.TryGetValue(sessionKey, out EvolutionBookingSession? session) || session == null)
                {
                    session = new EvolutionBookingSession
                    {
                        TenantId = msg.TenantId,
                        InstanceId = msg.To
                    };

                    var tenant = await _tenantRepository.GetByIdAsync(true, msg.TenantId);
                    if (tenant == null || !tenant.UseWhatsappBooking)
                    {
                        msg.ProcessedByBotAt = DateTimeOffset.UtcNow;
                        return;
                    }

                    session.TenantSlug = tenant.Slug;
                    session.TenantName = tenant.Name;
                    session.UseWhatsappBooking = true;

                    var conversation = await _conversationRepository
                        .Query(c => c.TenantId == msg.TenantId && c.PhoneNumber == from)
                        .FirstOrDefaultAsync(ct);
                    session.ContactName = conversation?.ContactName ?? "Cliente";

                    if (conversation?.DeletedAt != null)
                    {
                        conversation.DeletedAt = null;
                        conversation.UpdatedAt = DateTimeOffset.UtcNow;
                        _conversationRepository.Update(conversation);
                        await _unitOfWork.SaveChangesAsync();
                    }
                }
                else
                {
                    // Re-valida o flag a cada mensagem de sessões já em cache para garantir que
                    // desativar o agendamento pelo WhatsApp tenha efeito imediato.
                    var tenant = await _tenantRepository.GetByIdAsync(true, msg.TenantId);
                    if (tenant == null || !tenant.UseWhatsappBooking)
                    {
                        _cache.Remove(sessionKey);
                        msg.ProcessedByBotAt = DateTimeOffset.UtcNow;
                        return;
                    }
                }

                try
                {
                    var body = msg.Body?.Trim() ?? string.Empty;
                    var bodyLower = body.ToLower();

                    if (body == "[Áudio]")
                    {
                        const string audioReply = "Ainda estou aprendendo a ouvir áudios! 🎧 Por favor, pode digitar sua mensagem?";
                        await SendAsync(session, from, audioReply, ct);
                        _cache.Set(sessionKey, session, TimeSpan.FromMinutes(15));
                        return;
                    }

                    if (bodyLower.Length == 1 && bodyLower[0] >= '1' && bodyLower[0] <= '5')
                    {
                        var isIdle = session.State == "COMPLETED" || session.State == "CANCELLED";
                        if (isIdle)
                        {
                            var rated = await TryHandleRatingAsync(from, bodyLower[0] - '0', session, ct);
                            if (rated) { _cache.Remove(sessionKey); return; }
                        }
                    }

                    if (bodyLower.Contains("reagend") &&
                        session.State != "AWAITING_APPOINTMENT_ACTION" &&
                        session.State != "AWAITING_RESCHEDULE_CONFIRMATION" &&
                        session.State != "AWAITING_CANCEL_CONFIRMATION")
                    {
                        session.State = "START";
                        await StartBookingFlowAsync(from, session, ct);
                        _cache.Set(sessionKey, session, TimeSpan.FromMinutes(15));
                        return;
                    }

                    switch (session.State)
                    {
                        case "START":
                            await StartBookingFlowAsync(from, session, ct);
                            break;
                        case "AWAITING_APPOINTMENT_ACTION":
                            await HandleAppointmentActionAsync(from, body, session, ct);
                            break;
                        case "AWAITING_SERVICE":
                            await HandleSelectionAsync(from, body, session, ct,
                                onMore: async () => { session.ServicePage++; await AskForServiceAsync(from, session, ct); },
                                onValid: async id =>
                                {
                                    if (!Guid.TryParse(id, out var serviceId)) { await AskForServiceAsync(from, session, ct); return; }
                                    var services = (await _publicBookingService.GetServicesByTenantAsync(session.TenantSlug!)).ToList();
                                    var svc = services.FirstOrDefault(s => s.Id == serviceId);
                                    if (svc == null) { await AskForServiceAsync(from, session, ct); return; }
                                    session.ServiceId = serviceId;
                                    session.ServiceName = svc.Name;
                                    var employees = await _publicBookingService.GetEmployeesByServiceAsync(session.TenantSlug!, serviceId);
                                    if (!employees.Any())
                                    {
                                        session.EmployeeId = null;
                                        session.State = "AWAITING_DATE";
                                        session.DatePage = 0;
                                        await AskForDateAsync(from, session, ct);
                                    }
                                    else
                                    {
                                        session.EmployeePage = 0;
                                        await AskForEmployeeAsync(from, session, employees, ct);
                                    }
                                },
                                onInvalid: async () => await AskForServiceAsync(from, session, ct));
                            break;
                        case "AWAITING_EMPLOYEE":
                            await HandleEmployeeSelectionAsync(from, body, session, ct);
                            break;
                        case "AWAITING_DATE":
                            await HandleSelectionAsync(from, body, session, ct,
                                onMore: async () => { session.DatePage++; await AskForDateAsync(from, session, ct); },
                                onValid: async id =>
                                {
                                    if (!DateTime.TryParseExact(id, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
                                    { await AskForDateAsync(from, session, ct); return; }
                                    session.SelectedDate = date;
                                    session.DatePage = 0;
                                    session.TimeSlotPage = 0;
                                    await AskForTimeAsync(from, session, ct);
                                },
                                onInvalid: async () => await AskForDateAsync(from, session, ct));
                            break;
                        case "AWAITING_TIME":
                            await HandleSelectionAsync(from, body, session, ct,
                                onMore: async () => { session.TimeSlotPage++; await AskForTimeAsync(from, session, ct); },
                                onValid: async id =>
                                {
                                    if (!id.Contains(':')) { await AskForTimeAsync(from, session, ct); return; }
                                    session.SelectedTime = id;
                                    await AskForDescriptionAsync(from, session, ct);
                                },
                                onInvalid: async () => await AskForTimeAsync(from, session, ct));
                            break;
                        case "AWAITING_DESCRIPTION":
                            await HandleDescriptionAsync(from, body, session, ct);
                            break;
                        case "AWAITING_CONFIRMATION":
                            await HandleConfirmationAsync(from, body, session, ct);
                            break;
                        case "AWAITING_REMINDER_TIME":
                            await HandleReminderTimeAsync(from, body, session, ct);
                            break;
                        case "AWAITING_CANCEL_CONFIRMATION":
                            await HandleCancelConfirmationAsync(from, body, session, ct);
                            break;
                        case "AWAITING_RESCHEDULE_CONFIRMATION":
                            await HandleRescheduleConfirmationAsync(from, body, session, ct);
                            break;
                        default:
                            if (!string.IsNullOrWhiteSpace(body) && session.TenantId != Guid.Empty)
                            {
                                try
                                {
                                    var aiReply = await _aiConversationService.RespondAsync(
                                        session.TenantId, session.TenantName ?? "Salão", from, body);
                                    await SendAsync(session, from, aiReply, ct);
                                }
                                catch (Exception aiEx)
                                {
                                    _logger.LogWarning(aiEx, "AI fallback falhou para {From}.", from);
                                    session.State = "START";
                                    await StartBookingFlowAsync(from, session, ct);
                                }
                            }
                            else
                            {
                                session.State = "START";
                                await StartBookingFlowAsync(from, session, ct);
                            }
                            break;
                    }

                    if (session.State == "COMPLETED" || session.State == "CANCELLED")
                        _cache.Remove(sessionKey);
                    else
                        _cache.Set(sessionKey, session, TimeSpan.FromMinutes(15));
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Erro ao processar mensagem Evolution para {From}.", from);
                    try
                    {
                        const string errMsg = "Ops, ocorreu um erro. Por favor, tente novamente mais tarde.";
                        await SendAsync(session, from, errMsg, ct);
                    }
                    catch { /* absorve */ }
                }
            }
            finally
            {
                msg.ProcessedByBotAt ??= DateTimeOffset.UtcNow;
            }
        }

        private async Task HandleSelectionAsync(
            string from, string body, EvolutionBookingSession session, CancellationToken ct,
            Func<Task> onMore, Func<string, Task> onValid, Func<Task> onInvalid)
        {
            if (int.TryParse(body, out var num) && num >= 1 && num <= session.CurrentOptions.Count)
            {
                var selected = session.CurrentOptions[num - 1];
                if (selected.Id == "__more__")
                    await onMore();
                else
                    await onValid(selected.Id);
            }
            else
            {
                await onInvalid();
            }
        }

        private const int ServicePageSize = 9;
        private const int EmployeePageSize = 8;
        private const int DatePageSize = 9;
        private const int TimeSlotPageSize = 9;

        private async Task AskForServiceAsync(string from, EvolutionBookingSession session, CancellationToken ct)
        {
            var allServices = (await _publicBookingService.GetServicesByTenantAsync(session.TenantSlug!)).ToList();

            if (allServices.Count == 0)
            {
                var noServicesMsg = $"Olá {session.ContactName}! No momento não temos serviços disponíveis para agendamento.";
                await SendAsync(session, from, noServicesMsg, ct);
                return;
            }

            var page = session.ServicePage;
            var pageServices = allServices.Skip(page * ServicePageSize).Take(ServicePageSize).ToList();
            var hasMore = allServices.Count > (page + 1) * ServicePageSize;

            session.CurrentOptions = pageServices
                .Select(s => (s.Id.ToString(), s.Name))
                .ToList();

            var isFirst = page == 0;
            var header = isFirst
                ? $"Olá {session.ContactName}! Bem-vindo ao {session.TenantName}. Qual serviço você gostaria de agendar?\n\n"
                : "Qual serviço você gostaria de agendar?\n\n";

            var lines = pageServices.Select((s, i) =>
            {
                var price = s.HasPromotion && s.PromotionalPrice.HasValue
                    ? $"R$ {s.PromotionalPrice.Value:N2} 🏷️"
                    : (s.Price > 0 ? $"R$ {s.Price:N2}" : "");
                return $"{i + 1} – {s.Name}{(price.Length > 0 ? $" ({price})" : "")}";
            }).ToList();

            if (hasMore)
            {
                session.CurrentOptions.Add(("__more__", "Ver mais opções"));
                lines.Add($"{lines.Count + 1} - Ver mais opções →");
            }

            var text = header + string.Join("\n", lines) + "\n\nDigite o número da opção desejada.";
            await SendAsync(session, from, text, ct);
            session.State = "AWAITING_SERVICE";
        }

        private async Task AskForEmployeeAsync(string from, EvolutionBookingSession session, IEnumerable<PublicEmployeeDto> employees, CancellationToken ct)
        {
            var allEmployees = employees.ToList();
            var page = session.EmployeePage;
            var pageEmployees = allEmployees.Skip(page * EmployeePageSize).Take(EmployeePageSize).ToList();
            var hasMore = allEmployees.Count > (page + 1) * EmployeePageSize;

            session.CurrentOptions = new List<(string Id, string Label)>();
            var lines = new List<string>();
            var idx = 1;

            if (page == 0)
            {
                session.CurrentOptions.Add(("any", "Tanto faz"));
                lines.Add($"{idx++} - Tanto faz");
            }

            foreach (var e in pageEmployees)
            {
                session.CurrentOptions.Add((e.Id.ToString(), e.Name));
                lines.Add($"{idx++} – {e.Name}");
            }

            if (hasMore)
            {
                session.CurrentOptions.Add(("__more__", "Ver mais"));
                lines.Add($"{idx} - Ver mais profissionais →");
            }

            var text = "Com qual profissional você prefere ser atendido?\n\n" +
                       string.Join("\n", lines) +
                       "\n\nDigite o número da opção desejada.";
            await SendAsync(session, from, text, ct);
            session.State = "AWAITING_EMPLOYEE";
        }

        private async Task HandleEmployeeSelectionAsync(string from, string body, EvolutionBookingSession session, CancellationToken ct)
        {
            if (int.TryParse(body, out var num) && num >= 1 && num <= session.CurrentOptions.Count)
            {
                var selected = session.CurrentOptions[num - 1];
                if (selected.Id == "__more__")
                {
                    session.EmployeePage++;
                    var employees = await _publicBookingService.GetEmployeesByServiceAsync(session.TenantSlug!, session.ServiceId!.Value);
                    await AskForEmployeeAsync(from, session, employees, ct);
                    return;
                }
                if (selected.Id == "any")
                {
                    session.EmployeeId = null;
                    session.EmployeeName = "Qualquer profissional";
                }
                else if (Guid.TryParse(selected.Id, out var empId))
                {
                    session.EmployeeId = empId;
                    session.EmployeeName = selected.Label;
                }
                session.State = "AWAITING_DATE";
                session.DatePage = 0;
                await AskForDateAsync(from, session, ct);
            }
            else
            {
                var employees = await _publicBookingService.GetEmployeesByServiceAsync(session.TenantSlug!, session.ServiceId!.Value);
                await AskForEmployeeAsync(from, session, employees, ct);
            }
        }

        private async Task AskForDateAsync(string from, EvolutionBookingSession session, CancellationToken ct)
        {
            var allDates = Enumerable.Range(0, 30).Select(i => DateTime.Today.AddDays(i)).ToList();
            var page = session.DatePage;
            var pageDates = allDates.Skip(page * DatePageSize).Take(DatePageSize).ToList();
            var hasMore = allDates.Count > (page + 1) * DatePageSize;

            session.CurrentOptions = pageDates
                .Select(d => (d.ToString("yyyy-MM-dd"), d.ToString("dd/MM/yyyy")))
                .ToList();

            var lines = pageDates.Select((d, i) =>
            {
                var suffix = d == DateTime.Today ? " (Hoje)" : d.DayOfWeek switch
                {
                    DayOfWeek.Monday => " (Segunda)",
                    DayOfWeek.Tuesday => " (Terça)",
                    DayOfWeek.Wednesday => " (Quarta)",
                    DayOfWeek.Thursday => " (Quinta)",
                    DayOfWeek.Friday => " (Sexta)",
                    DayOfWeek.Saturday => " (Sábado)",
                    DayOfWeek.Sunday => " (Domingo)",
                    _ => ""
                };
                return $"{i + 1} – {d:dd/MM/yyyy}{suffix}";
            }).ToList();

            if (hasMore)
            {
                session.CurrentOptions.Add(("__more__", "Ver mais"));
                lines.Add($"{lines.Count + 1} - Ver mais datas →");
            }

            var text = "Para qual data você gostaria de agendar?\n\n" +
                       string.Join("\n", lines) +
                       "\n\nDigite o número da opção desejada.";
            await SendAsync(session, from, text, ct);
            session.State = "AWAITING_DATE";
        }

        private async Task AskForTimeAsync(string from, EvolutionBookingSession session, CancellationToken ct)
        {
            var slots = await _publicBookingService.GetAvailableSlotsAsync(
                session.TenantSlug!, session.SelectedDate!.Value, session.ServiceId!.Value, session.EmployeeId);
            var available = slots.Where(s => s.IsAvailable)
                .Select(s => s.StartTime.ToOffset(TimeSpan.FromHours(-3)))
                .ToList();

            if (available.Count == 0)
            {
                const string noSlots = "Desculpe, não há horários disponíveis para esta data. Escolha outro dia.";
                await SendAsync(session, from, noSlots, ct);
                session.SelectedDate = null;
                session.TimeSlotPage = 0;
                session.DatePage = 0;
                await AskForDateAsync(from, session, ct);
                return;
            }

            var page = session.TimeSlotPage;
            var pageSlots = available.Skip(page * TimeSlotPageSize).Take(TimeSlotPageSize).ToList();
            var hasMore = available.Count > (page + 1) * TimeSlotPageSize;

            session.CurrentOptions = pageSlots
                .Select(s => (s.ToString("HH:mm"), s.ToString("HH:mm")))
                .ToList();

            var lines = pageSlots.Select((s, i) => $"{i + 1} – {s:HH:mm}").ToList();

            if (hasMore)
            {
                session.CurrentOptions.Add(("__more__", "Ver mais"));
                lines.Add($"{lines.Count + 1} - Ver mais horários →");
            }

            var text = "Selecione o melhor horário para você:\n\n" +
                       string.Join("\n", lines) +
                       "\n\nDigite o número da opção desejada.";
            await SendAsync(session, from, text, ct);
            session.State = "AWAITING_TIME";
        }

        private async Task AskForDescriptionAsync(string from, EvolutionBookingSession session, CancellationToken ct)
        {
            const string msg = "Tem alguma observação para o profissional? ✍️\n\nExemplo: \"quero corte mais curto nas laterais\"\n\nOu responda *não* para pular.";
            await SendAsync(session, from, msg, ct);
            session.State = "AWAITING_DESCRIPTION";
        }

        private async Task HandleDescriptionAsync(string from, string body, EvolutionBookingSession session, CancellationToken ct)
        {
            session.AppointmentDescription =
                (string.IsNullOrEmpty(body) ||
                 body.Equals("nao", StringComparison.OrdinalIgnoreCase) ||
                 body.Equals("não", StringComparison.OrdinalIgnoreCase) ||
                 body.Equals("no", StringComparison.OrdinalIgnoreCase) ||
                 body.Equals("n", StringComparison.OrdinalIgnoreCase))
                ? null
                : body;

            await AskForConfirmationAsync(from, session, ct);
        }

        private async Task AskForConfirmationAsync(string from, EvolutionBookingSession session, CancellationToken ct)
        {
            var summary = $"*Resumo do Agendamento*\n\n" +
                          $"✂️ Serviço: {session.ServiceName}\n" +
                          $"👤 Profissional: {session.EmployeeName ?? "Qualquer"}\n" +
                          $"📅 Data: {session.SelectedDate:dd/MM/yyyy}\n" +
                          $"🕐 Horário: {session.SelectedTime}\n";

            if (!string.IsNullOrEmpty(session.AppointmentDescription))
                summary += $"📝 Observação: {session.AppointmentDescription}\n";

            summary += "\nPodemos confirmar?\n\n1 - Confirmar ✅\n2 - Cancelar ❌";

            session.CurrentOptions = new List<(string Id, string Label)>
            {
                ("confirm", "Confirmar"),
                ("cancel", "Cancelar")
            };

            await SendAsync(session, from, summary, ct);
            session.State = "AWAITING_CONFIRMATION";
        }

        private async Task HandleConfirmationAsync(string from, string body, EvolutionBookingSession session, CancellationToken ct)
        {
            if (body == "1")
            {
                var scheduled = session.SelectedDate!.Value.Add(TimeSpan.Parse(session.SelectedTime!));
                var scheduledOffset = new DateTimeOffset(scheduled, TimeSpan.FromHours(-3));

                var dto = new PublicBookingCreateDto
                {
                    TenantSlug = session.TenantSlug!,
                    ClientName = session.ContactName ?? "Cliente",
                    ClientPhone = from,
                    Description = "Agendado via Evolution Bot",
                    Notes = session.AppointmentDescription,
                    ServiceId = session.ServiceId!.Value,
                    EmployeeId = session.EmployeeId,
                    ScheduledDateTime = scheduledOffset,
                    Source = AppointmentSource.EvolutionBot,
                };

                var result = await _publicBookingService.CreateBookingAsync(dto);

                if (result.Success)
                {
                    session.AppointmentId = result.AppointmentId;

                    // Reagendamento: cancela o agendamento anterior após criar o novo
                    if (session.PendingAppointmentId.HasValue)
                    {
                        var oldId = session.PendingAppointmentId.Value;
                        var oldAppt = await _appointmentRepository
                            .Query(a => a.Id == oldId, asNoTracking: false)
                            .IgnoreQueryFilters()
                            .FirstOrDefaultAsync(ct);
                        if (oldAppt != null)
                        {
                            oldAppt.Status = AppointmentStatus.Cancelled;
                            oldAppt.UpdatedAt = DateTimeOffset.UtcNow;
                            _appointmentRepository.Update(oldAppt);
                            await _unitOfWork.SaveChangesAsync();
                        }
                        session.PendingAppointmentId = null;
                    }

                    var confirmed = $"✅ *Agendamento Confirmado!*\n\n{session.ContactName}, seu horário para {session.ServiceName} foi marcado para {session.SelectedDate:dd/MM} às {session.SelectedTime}. Esperamos por você!";
                    await SendAsync(session, from, confirmed, ct);
                    await AskForReminderTimeAsync(from, session, ct);
                }
                else
                {
                    const string failed = "Desculpe, não conseguimos concluir seu agendamento. Por favor, tente novamente.";
                    await SendAsync(session, from, failed, ct);
                    session.State = "CANCELLED";
                }
            }
            else if (body == "2")
            {
                const string cancelled = "Agendamento cancelado. Se precisar de algo mais, é só chamar!";
                await SendAsync(session, from, cancelled, ct);
                session.State = "CANCELLED";
            }
            else
            {
                await AskForConfirmationAsync(from, session, ct);
            }
        }

        private static readonly (string Id, string Label, string Display)[] ReminderOptions =
        [
            ("15",   "15 minutos", "1 – 15 minutos antes"),
            ("30",   "30 minutos", "2 – 30 minutos antes"),
            ("60",   "1 hora",     "3 – 1 hora antes"),
            ("120",  "2 horas",    "4 – 2 horas antes"),
            ("240",  "4 horas",    "5 – 4 horas antes"),
            ("480",  "8 horas",    "6 – 8 horas antes"),
            ("1440", "24 horas",   "7 – 24 horas antes"),
            ("2880", "48 horas",   "8 – 48 horas antes"),
            ("0",    "Não receber","9 – Não receber"),
        ];

        private async Task AskForReminderTimeAsync(string from, EvolutionBookingSession session, CancellationToken ct)
        {
            session.CurrentOptions = ReminderOptions.Select(r => (r.Id, r.Label)).ToList();
            var lines = string.Join("\n", ReminderOptions.Select(r => r.Display));
            var text = $"Quando deseja receber um lembrete? ⏰\n\n{lines}\n\nDigite o número da opção desejada.";
            await SendAsync(session, from, text, ct);
            session.State = "AWAITING_REMINDER_TIME";
        }

        private async Task HandleReminderTimeAsync(string from, string body, EvolutionBookingSession session, CancellationToken ct)
        {
            if (int.TryParse(body, out var num) && num >= 1 && num <= session.CurrentOptions.Count)
            {
                var selected = session.CurrentOptions[num - 1];
                if (int.TryParse(selected.Id, out var minutes) && session.AppointmentId.HasValue)
                {
                    var appt = await _appointmentRepository.GetByIdAsync(false, session.AppointmentId.Value);
                    if (appt != null)
                    {
                        appt.ReminderMinutes = minutes > 0 ? minutes : null;
                        _appointmentRepository.Update(appt);
                        await _unitOfWork.SaveChangesAsync();
                    }
                }

                var msg = num < 9
                    ? $"Perfeito! Avisaremos você {selected.Label.ToLower()} antes do seu agendamento."
                    : "Tudo bem! Não enviaremos lembretes para este agendamento.";

                await SendAsync(session, from, msg, ct);
                session.State = "COMPLETED";
            }
            else
            {
                await AskForReminderTimeAsync(from, session, ct);
            }
        }

        private async Task HandleAppointmentActionAsync(string from, string body, EvolutionBookingSession session, CancellationToken ct)
        {
            if (body == "1")
            {
                var cancelMsg = "Tem certeza que deseja cancelar seu agendamento?\n\n1 - Sim, cancelar\n2 - Não, manter";
                session.CurrentOptions = new List<(string, string)> { ("yes", "Sim"), ("no", "Não") };
                await SendAsync(session, from, cancelMsg, ct);
                session.State = "AWAITING_CANCEL_CONFIRMATION";
            }
            else if (body == "2")
            {
                var rescheduleMsg = "Deseja realmente trocar o horário?\n\n1 - Sim, reagendar\n2 - Não, manter";
                session.CurrentOptions = new List<(string, string)> { ("yes", "Sim"), ("no", "Não") };
                await SendAsync(session, from, rescheduleMsg, ct);
                session.State = "AWAITING_RESCHEDULE_CONFIRMATION";
            }
            else if (body == "3")
            {
                // Cliente quer agendar um novo serviço mantendo o agendamento existente
                const string continueMsg = "Ótimo! Seu agendamento segue confirmado 😊 Vamos agendar outro serviço?";
                await SendAsync(session, from, continueMsg, ct);
                session.PendingAppointmentId = null;
                session.PendingAppointmentSummary = null;
                session.ServicePage = 0;
                await AskForServiceAsync(from, session, ct);
            }
            else
            {
                var retryMsg = $"Por favor, escolha uma opção:\n\n{session.PendingAppointmentSummary}\n\n1 - Cancelar agendamento\n2 - Reagendar\n3 - Agendar novo serviço";
                await SendAsync(session, from, retryMsg, ct);
            }
        }

        private async Task HandleCancelConfirmationAsync(string from, string body, EvolutionBookingSession session, CancellationToken ct)
        {
            if (body == "1")
            {
                if (session.PendingAppointmentId.HasValue)
                {
                    var pendingId = session.PendingAppointmentId.Value;
                    var appt = await _appointmentRepository
                        .Query(a => a.Id == pendingId, asNoTracking: false)
                        .IgnoreQueryFilters()
                        .FirstOrDefaultAsync(ct);
                    if (appt != null)
                    {
                        appt.Status = AppointmentStatus.Cancelled;
                        appt.UpdatedAt = DateTimeOffset.UtcNow;
                        _appointmentRepository.Update(appt);
                        await _unitOfWork.SaveChangesAsync();
                    }
                }
                const string msg = "✅ Seu agendamento foi cancelado com sucesso. Se precisar de algo, é só chamar!";
                await SendAsync(session, from, msg, ct);
                session.State = "CANCELLED";
            }
            else
            {
                const string msg = "Tudo bem! Mantivemos seu agendamento.";
                await SendAsync(session, from, msg, ct);
                session.State = "COMPLETED";
            }
        }

        private async Task HandleRescheduleConfirmationAsync(string from, string body, EvolutionBookingSession session, CancellationToken ct)
        {
            if (body == "1")
            {
                // Mantém PendingAppointmentId para cancelar o agendamento antigo em HandleConfirmationAsync
                session.PendingAppointmentSummary = null;
                session.ServicePage = 0;
                await AskForServiceAsync(from, session, ct);
            }
            else
            {
                const string msg = "Tudo bem! Mantivemos seu agendamento atual. Até breve!";
                await SendAsync(session, from, msg, ct);
                session.State = "COMPLETED";
            }
        }

        private async Task StartBookingFlowAsync(string from, EvolutionBookingSession session, CancellationToken ct)
        {
            if (session.TenantId != Guid.Empty)
            {
                try
                {
                    var rawPhone = new string(from.Where(char.IsDigit).ToArray());
                    var phoneSuffix = rawPhone.Length > 10 ? rawPhone[^10..] : rawPhone;
                    var clients = await _clientRepository
                        .Query(c => c.TenantId == session.TenantId && c.Phone != null && !c.IsDeleted)
                        .IgnoreQueryFilters()
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
                            .IgnoreQueryFilters()
                            .Include(a => a.Service)
                            .OrderBy(a => a.ScheduledDateTime)
                            .FirstOrDefaultAsync(ct);

                        if (appointment != null)
                        {
                            var local = appointment.ScheduledDateTime.ToOffset(TimeSpan.FromHours(-3));
                            var serviceName = appointment.Service?.Name ?? "Serviço";
                            session.PendingAppointmentId = appointment.Id;
                            session.PendingAppointmentSummary =
                                $"✂️ Serviço: {serviceName}\n📅 Data: {local:dd/MM/yyyy}\n🕐 Horário: {local:HH:mm}";

                            var detectionMsg =
                                $"Olá {session.ContactName}! Encontrei um agendamento ativo:\n\n" +
                                session.PendingAppointmentSummary +
                                "\n\nO que você gostaria de fazer?\n\n" +
                                "1 - Cancelar agendamento\n2 - Reagendar\n3 - Agendar novo serviço";

                            session.CurrentOptions = new List<(string, string)>
                            {
                                ("cancel", "Cancelar"),
                                ("reschedule", "Reagendar"),
                                ("new", "Agendar novo")
                            };

                            await SendAsync(session, from, detectionMsg, ct);
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

        private async Task<bool> TryHandleRatingAsync(string from, int stars, EvolutionBookingSession session, CancellationToken ct)
        {
            try
            {
                var rawPhone = new string(from.Where(char.IsDigit).ToArray());
                var phoneSuffix = rawPhone.Length > 10 ? rawPhone[^10..] : rawPhone;
                var clients = await _clientRepository
                    .Query(c => c.Phone != null)
                    .IgnoreQueryFilters()
                    .ToListAsync(ct);
                var matchedClient = clients.FirstOrDefault(c =>
                {
                    var digits = new string(c.Phone!.Where(char.IsDigit).ToArray());
                    var suffix = digits.Length > 10 ? digits[^10..] : digits;
                    return suffix.Length >= 8 && suffix == phoneSuffix;
                });
                if (matchedClient == null) return false;

                var cutoff = DateTimeOffset.UtcNow.AddHours(-48);
                var appointment = await _appointmentRepository
                    .Query(a =>
                        a.ClientId == matchedClient.Id &&
                        a.Status == AppointmentStatus.Completed &&
                        a.ScheduledDateTime >= cutoff &&
                        !a.IsDeleted)
                    .IgnoreQueryFilters()
                    .OrderByDescending(a => a.ScheduledDateTime)
                    .FirstOrDefaultAsync(ct);
                if (appointment == null) return false;

                var existing = await _clientRatingRepository
                    .Query(r => r.AppointmentId == appointment.Id)
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(ct);
                if (existing != null) return false;

                await _clientRatingRepository.AddAsync(new ClientRating
                {
                    Id = Guid.NewGuid(),
                    TenantId = appointment.TenantId,
                    AppointmentId = appointment.Id,
                    ClientId = matchedClient.Id,
                    Stars = stars,
                    Source = RatingSource.WhatsApp,
                    CreatedAt = DateTimeOffset.UtcNow
                });
                await _unitOfWork.SaveChangesAsync();

                var starsEmoji = new string('⭐', stars);
                await SendAsync(session, from, $"Obrigado pela sua avaliação {starsEmoji}! Sua opinião é muito importante para nós. Até a próxima! 😊", ct);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Falha ao processar avaliação para {From}.", from);
                return false;
            }
        }
    }
}

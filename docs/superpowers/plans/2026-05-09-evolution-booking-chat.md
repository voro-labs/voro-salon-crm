# Evolution Booking Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir `EvolutionResponseService` (keyword matching + AI stateless) por `EvolutionBookingChatService`, um serviço stateful de agendamento via texto numerado análogo ao `WhatsappChatService` da API Meta.

**Architecture:** O novo serviço mantém sessão em `IMemoryCache` com chave `evo_booking_{tenantId}_{from}` e apresenta todas as opções como listas numeradas em texto simples (a Evolution não suporta botões/listas interativas). Cada envio popula `session.CurrentOptions` para que o número digitado resolva para o ID real. O `EvolutionResponseWorker` passa a chamar `IEvolutionBookingChatService.HandleMessageAsync` em lugar de `IEvolutionResponseService.ProcessAsync`. Serviços antigos (`IEvolutionResponseService`, `IEvolutionRulesEngine`, `IEvolutionAIResponder` e respectivas implementações) são deletados.

**Tech Stack:** C# / .NET 8, `IMemoryCache`, `IEvolutionService.SendTextAsync`, `IPublicBookingService`, `IAIConversationService`, xUnit + Moq

## Tasks

### Task 1: Adicionar `EvolutionBot` ao enum `AppointmentSource`

**Files:**
- Modify: `voro-salon-crm-api/VoroSalonCrm.Domain/Enums/AppointmentSource.cs`

- [ ] **Step 1: Adicionar o valor ao enum**

Abrir o arquivo e adicionar a linha marcada:

```csharp
public enum AppointmentSource
{
    Internal    = 0,
    WhatsAppBot = 1,
    App         = 2,
    Website     = 3,
    EvolutionBot = 4, // agendamento via Evolution (texto numerado)
}
```

- [ ] **Step 2: Build para verificar sem erros**

```bash
cd voro-salon-crm-api
dotnet build --no-restore -v q
```

Expected: Build succeeded, 0 errors.

- [ ] **Step 3: Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.Domain/Enums/AppointmentSource.cs
git commit -m "feat(evolution): add EvolutionBot = 4 to AppointmentSource enum"
```

### Task 2: Corrigir body do webhook Evolution (áudio/imagem detectable)

**Files:**
- Modify: `voro-salon-crm-api/VoroSalonCrm.API/Controllers/WhatsappController.cs:93`

**Contexto:** A linha 93 do controller usa `webhook.Data.Message?.Conversation ?? string.Empty`, o que salva body vazio para áudios/imagens. O método estático `DetermineEvolutionMessageType` (já existe na linha 270) corrige isso retornando `"[Áudio]"`, `"[Imagem]"` etc.

- [ ] **Step 1: Substituir a linha de bodyText**

Localizar no `ReceiveEvolutionWebhook` (por volta da linha 93):

```csharp
var bodyText = webhook.Data.Message?.Conversation ?? string.Empty;
```

Substituir por:

```csharp
var (_, bodyText) = DetermineEvolutionMessageType(webhook.Data.Message, info.Type);
```

- [ ] **Step 2: Build**

```bash
dotnet build --no-restore -v q
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.API/Controllers/WhatsappController.cs
git commit -m "fix(evolution): save audio/image sentinel body in webhook via DetermineEvolutionMessageType"
```

### Task 3: Criar `IEvolutionBookingChatService`

**Files:**
- Create: `voro-salon-crm-api/VoroSalonCrm.Application/Services/Interfaces/Integration/IEvolutionBookingChatService.cs`

- [ ] **Step 1: Criar a interface**

```csharp
using VoroSalonCrm.Domain.Entities;

namespace VoroSalonCrm.Application.Services.Interfaces.Integration
{
    public interface IEvolutionBookingChatService
    {
        /// <summary>
        /// Processa uma mensagem inbound do canal Evolution.
        /// Mantém sessão stateful em IMemoryCache e responde via texto numerado.
        /// Sempre define msg.ProcessedByBotAt antes de retornar (inclusive em erro).
        /// </summary>
        Task HandleMessageAsync(WhatsAppMessage msg, CancellationToken ct = default);
    }
}
```

- [ ] **Step 2: Build**

```bash
dotnet build --no-restore -v q
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.Application/Services/Interfaces/Integration/IEvolutionBookingChatService.cs
git commit -m "feat(evolution): add IEvolutionBookingChatService interface"
```

### Task 4: Criar `EvolutionBookingChatService`

**Files:**
- Create: `voro-salon-crm-api/VoroSalonCrm.Infrastructure/Integration/EvolutionBookingChatService.cs`

**Contexto:** Este é o coração da feature. Modela-se 1:1 no `WhatsappChatService` (já existente), mas:
- Recebe `WhatsAppMessage msg` (entidade DB), não um DTO
- Envia via `IEvolutionService.SendTextAsync(instanceId, from, text)` onde `instanceId = session.InstanceId` (= `msg.To`)
- Não usa widgets interativos — todas as opções são texto numerado
- `CurrentOptions` mapeia posição → ID real (GUID do serviço, string de data, "__more__" para paginação)
- Detecta áudio via `msg.Body == "[Áudio]"` (não pelo `Type`)

- [ ] **Step 1: Criar o arquivo com sessão e construtor**

```csharp
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
    }
}
```

- [ ] **Step 2: Adicionar `HandleMessageAsync` (entrada principal)**

Dentro da classe, após `SendAsync`, adicionar:

```csharp
public async Task HandleMessageAsync(WhatsAppMessage msg, CancellationToken ct = default)
{
    var from = msg.From;
    var sessionKey = SessionKey(msg.TenantId, from);

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

        // Buscar ContactName em WhatsAppConversation
        var conversation = await _conversationRepository
            .Query(c => c.TenantId == msg.TenantId && c.PhoneNumber == from)
            .FirstOrDefaultAsync(ct);
        session.ContactName = conversation?.ContactName ?? "Cliente";
    }

    try
    {
        var body = msg.Body?.Trim() ?? string.Empty;
        var bodyLower = body.ToLower();

        // Detecção de áudio
        if (body == "[Áudio]")
        {
            const string audioReply = "Ainda estou aprendendo a ouvir áudios! 🎧 Por favor, pode digitar sua mensagem?";
            await SendAsync(session, from, audioReply, ct);
            _cache.Set(sessionKey, session, TimeSpan.FromMinutes(15));
            return;
        }

        // Rating (sessão COMPLETED/CANCELLED + dígito 1-5)
        if (bodyLower.Length == 1 && bodyLower[0] >= '1' && bodyLower[0] <= '5')
        {
            var isIdle = session.State == "COMPLETED" || session.State == "CANCELLED";
            if (isIdle)
            {
                var rated = await TryHandleRatingAsync(from, bodyLower[0] - '0', session, ct);
                if (rated) { _cache.Remove(sessionKey); return; }
            }
        }

        // Keyword global: "reagend" reinicia em qualquer estado fora das confirmações
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
                // AI fallback
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
    finally
    {
        msg.ProcessedByBotAt ??= DateTimeOffset.UtcNow;
    }
}
```

- [ ] **Step 3: Adicionar helper `HandleSelectionAsync` e métodos de listagem**

```csharp
/// <summary>
/// Resolve o número digitado contra CurrentOptions.
/// Chama onMore se "__more__", onValid com o Id se número válido, onInvalid caso contrário.
/// </summary>
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
        return $"{i + 1} - {s.Name}{(price.Length > 0 ? $" ({price})" : "")}";
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
        lines.Add($"{idx++} - {e.Name}");
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
        return $"{i + 1} - {d:dd/MM/yyyy}{suffix}";
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

    var lines = pageSlots.Select((s, i) => $"{i + 1} - {s:HH:mm}").ToList();

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
```

- [ ] **Step 4: Adicionar métodos de descrição, confirmação, lembrete, cancel/reschedule**

```csharp
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
    ("15",   "15 minutos", "1 - 15 minutos antes"),
    ("30",   "30 minutos", "2 - 30 minutos antes"),
    ("60",   "1 hora",     "3 - 1 hora antes"),
    ("120",  "2 horas",    "4 - 2 horas antes"),
    ("240",  "4 horas",    "5 - 4 horas antes"),
    ("480",  "8 horas",    "6 - 8 horas antes"),
    ("1440", "24 horas",   "7 - 24 horas antes"),
    ("2880", "48 horas",   "8 - 48 horas antes"),
    ("0",    "Não receber","9 - Não receber"),
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
        const string continueMsg = "Tudo bem! Seu agendamento permanece confirmado. Até breve! 😊";
        await SendAsync(session, from, continueMsg, ct);
        session.State = "COMPLETED";
    }
    else
    {
        var retryMsg = $"Por favor, escolha uma opção:\n\n{session.PendingAppointmentSummary}\n\n1 - Cancelar agendamento\n2 - Reagendar\n3 - Continuar sem alterar";
        await SendAsync(session, from, retryMsg, ct);
    }
}

private async Task HandleCancelConfirmationAsync(string from, string body, EvolutionBookingSession session, CancellationToken ct)
{
    if (body == "1")
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
        session.PendingAppointmentId = null;
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
```

- [ ] **Step 5: Adicionar `StartBookingFlowAsync` e `TryHandleRatingAsync`**

```csharp
private async Task StartBookingFlowAsync(string from, EvolutionBookingSession session, CancellationToken ct)
{
    if (session.TenantId != Guid.Empty)
    {
        try
        {
            var rawPhone = new string(from.Where(char.IsDigit).ToArray());
            var phoneSuffix = rawPhone.Length > 10 ? rawPhone[^10..] : rawPhone;
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
                        $"✂️ Serviço: {serviceName}\n📅 Data: {local:dd/MM/yyyy}\n🕐 Horário: {local:HH:mm}";

                    var detectionMsg =
                        $"Olá {session.ContactName}! Encontrei um agendamento ativo:\n\n" +
                        session.PendingAppointmentSummary +
                        "\n\nO que você gostaria de fazer?\n\n" +
                        "1 - Cancelar agendamento\n2 - Reagendar\n3 - Continuar sem alterar";

                    session.CurrentOptions = new List<(string, string)>
                    {
                        ("cancel", "Cancelar"),
                        ("reschedule", "Reagendar"),
                        ("keep", "Continuar")
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
```

- [ ] **Step 6: Build completo**

```bash
dotnet build --no-restore -v q
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.Infrastructure/Integration/EvolutionBookingChatService.cs
git commit -m "feat(evolution): implement EvolutionBookingChatService with stateful numbered-text flow"
```

### Task 5: Atualizar `EvolutionResponseWorker`

**Files:**
- Modify: `voro-salon-crm-api/VoroSalonCrm.Infrastructure/Integration/EvolutionResponseWorker.cs`

- [ ] **Step 1: Atualizar using e injeção de dependência**

Substituir a linha:

```csharp
var responseService = scope.ServiceProvider.GetRequiredService<IEvolutionResponseService>();
```

Por:

```csharp
var bookingService = scope.ServiceProvider.GetRequiredService<IEvolutionBookingChatService>();
```

Substituir no loop:

```csharp
await responseService.ProcessAsync(msg, ct);
```

Por:

```csharp
await bookingService.HandleMessageAsync(msg, ct);
```

Atualizar o `using` no topo (adicionar se necessário):

```csharp
using VoroSalonCrm.Application.Services.Interfaces.Integration;
```

- [ ] **Step 2: Build**

```bash
dotnet build --no-restore -v q
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.Infrastructure/Integration/EvolutionResponseWorker.cs
git commit -m "feat(evolution): wire EvolutionResponseWorker to IEvolutionBookingChatService"
```

---

### Task 6: Atualizar registro de DI em `AddAppServicesExtension`

**Files:**
- Modify: `voro-salon-crm-api/VoroSalonCrm.Contract/Extensions/Configurations/AddAppServicesExtension.cs:169-171`

- [ ] **Step 1: Remover 3 registros antigos e adicionar 1 novo**

Localizar o bloco (linhas 169-171):

```csharp
services.AddScoped<IEvolutionRulesEngine, EvolutionRulesEngine>();
services.AddScoped<IEvolutionAIResponder, EvolutionAIResponder>();
services.AddScoped<IEvolutionResponseService, EvolutionResponseService>();
```

Substituir por:

```csharp
services.AddScoped<IEvolutionBookingChatService, EvolutionBookingChatService>();
```

Remover quaisquer `using` que apontem para as classes deletadas (`IEvolutionRulesEngine`, `IEvolutionAIResponder`, `IEvolutionResponseService`, `EvolutionRulesEngine`, `EvolutionAIResponder`, `EvolutionResponseService`), se existirem no topo do arquivo.

- [ ] **Step 2: Build**

```bash
dotnet build --no-restore -v q
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.Contract/Extensions/Configurations/AddAppServicesExtension.cs
git commit -m "feat(evolution): update DI: remove old services, register EvolutionBookingChatService"
```

---

### Task 7: Deletar arquivos obsoletos

**Files to delete:**

| Interface | `Application/Services/Interfaces/Integration/` |
| Implementação | `Infrastructure/Integration/` |
| Testes | `Tests.Integration/Evolution/` |

- [ ] **Step 1: Deletar interfaces antigas**

```bash
rm voro-salon-crm-api/VoroSalonCrm.Application/Services/Interfaces/Integration/IEvolutionResponseService.cs
rm voro-salon-crm-api/VoroSalonCrm.Application/Services/Interfaces/Integration/IEvolutionRulesEngine.cs
rm voro-salon-crm-api/VoroSalonCrm.Application/Services/Interfaces/Integration/IEvolutionAIResponder.cs
```

- [ ] **Step 2: Deletar implementações antigas**

```bash
rm voro-salon-crm-api/VoroSalonCrm.Infrastructure/Integration/EvolutionResponseService.cs
rm voro-salon-crm-api/VoroSalonCrm.Infrastructure/Integration/EvolutionRulesEngine.cs
rm voro-salon-crm-api/VoroSalonCrm.Infrastructure/Integration/EvolutionAIResponder.cs
```

- [ ] **Step 3: Deletar testes das classes removidas**

```bash
rm voro-salon-crm-api/VoroSalonCrm.Tests.Integration/Evolution/EvolutionRulesEngineTests.cs
rm voro-salon-crm-api/VoroSalonCrm.Tests.Integration/Evolution/EvolutionResponseServiceTests.cs
rm voro-salon-crm-api/VoroSalonCrm.Tests.Integration/Evolution/EvolutionAIResponderTests.cs
```

- [ ] **Step 4: Build — verificar que 0 erros**

```bash
dotnet build --no-restore -v q
```

Expected: 0 errors. (Os projetos de testes também fazem parte do build.)

- [ ] **Step 5: Commit**

```bash
git add -u
git commit -m "chore(evolution): delete IEvolutionResponseService, IEvolutionRulesEngine, IEvolutionAIResponder and their implementations/tests"
```

### Task 8: Escrever testes de `EvolutionBookingChatService`

**Files:**
- Create: `voro-salon-crm-api/VoroSalonCrm.Tests.Integration/Evolution/EvolutionBookingChatServiceTests.cs`

**Foco:** diferenças do canal Evolution vs Meta (spec seção 9). Os testes validam input numérico, detecção de áudio, chave de sessão, InstanceId, ContactName, paginação, ProcessedByBotAt e AppointmentSource.

**Contexto:** O projeto de testes já usa xUnit + Moq. Ver `EvolutionResponseServiceTests.cs` como referência de setup. O `IMemoryCache` pode ser instanciado real via `new MemoryCache(new MemoryCacheOptions())`.

- [ ] **Step 1: Escrever arquivo de testes**

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using VoroSalonCrm.Application.DTOs.Public;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using Xunit;

namespace VoroSalonCrm.Tests.Integration.Evolution;

public class EvolutionBookingChatServiceTests
{
    private static readonly Guid TenantId = Guid.NewGuid();
    private const string InstanceId = "evo-instance-01";
    private const string UserPhone = "5511999990000";

    private static WhatsAppMessage MakeMsg(string body) => new()
    {
        Id = Guid.NewGuid(),
        TenantId = TenantId,
        From = UserPhone,
        To = InstanceId,
        Body = body,
        Direction = "inbound",
        Timestamp = DateTimeOffset.UtcNow
    };

    private static (EvolutionBookingChatService svc, IMemoryCache cache, Mock<IEvolutionService> evoSvc) BuildSut(
        Mock<ITenantRepository>? tenantRepo = null,
        Mock<IPublicBookingService>? bookingSvc = null,
        Mock<IWhatsAppConversationRepository>? convRepo = null)
    {
        tenantRepo ??= new Mock<ITenantRepository>();
        bookingSvc ??= new Mock<IPublicBookingService>();
        convRepo ??= new Mock<IWhatsAppConversationRepository>();

        var tenant = new Tenant
        {
            Id = TenantId,
            Name = "Salão Teste",
            Slug = "salao-teste",
            UseWhatsappBooking = true
        };
        tenantRepo.Setup(r => r.GetByIdAsync(It.IsAny<bool>(), TenantId)).ReturnsAsync(tenant);

        convRepo.Setup(r => r.Query(It.IsAny<System.Linq.Expressions.Expression<Func<WhatsAppConversation, bool>>>()))
            .Returns(new List<WhatsAppConversation>().AsQueryable());

        bookingSvc.Setup(b => b.GetServicesByTenantAsync("salao-teste"))
            .ReturnsAsync(new List<PublicServiceDto>
            {
                new() { Id = Guid.NewGuid(), Name = "Corte de Cabelo", Price = 30 },
                new() { Id = Guid.NewGuid(), Name = "Barba", Price = 25 }
            });

        var evoSvc = new Mock<IEvolutionService>();
        evoSvc.Setup(e => e.SendTextAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var msgSvc = new Mock<IWhatsAppMessageService>();
        var uow = new Mock<IUnitOfWork>();
        var apptRepo = new Mock<IAppointmentRepository>();
        apptRepo.Setup(r => r.Query(It.IsAny<System.Linq.Expressions.Expression<Func<Appointment, bool>>>()))
            .Returns(new List<Appointment>().AsQueryable());
        var clientRepo = new Mock<IClientRepository>();
        clientRepo.Setup(r => r.Query(It.IsAny<System.Linq.Expressions.Expression<Func<Client, bool>>>()))
            .Returns(new List<Client>().AsQueryable());
        var ratingRepo = new Mock<IClientRatingRepository>();
        var aiSvc = new Mock<IAIConversationService>();
        var cache = new MemoryCache(new MemoryCacheOptions());

        var svc = new EvolutionBookingChatService(
            evoSvc.Object,
            bookingSvc.Object,
            tenantRepo.Object,
            convRepo.Object,
            msgSvc.Object,
            uow.Object,
            cache,
            NullLogger<EvolutionBookingChatService>.Instance,
            apptRepo.Object,
            clientRepo.Object,
            ratingRepo.Object,
            aiSvc.Object);

        return (svc, cache, evoSvc);
    }

    [Fact]
    public async Task ProcessedByBotAt_IsAlwaysSet_EvenOnError()
    {
        // Arrange — tenant repo lança exceção para provocar erro
        var tenantRepo = new Mock<ITenantRepository>();
        tenantRepo.Setup(r => r.GetByIdAsync(It.IsAny<bool>(), It.IsAny<Guid>()))
            .ThrowsAsync(new InvalidOperationException("DB offline"));
        var (svc, _, _) = BuildSut(tenantRepo: tenantRepo);
        var msg = MakeMsg("oi");

        // Act
        await svc.HandleMessageAsync(msg);

        // Assert
        Assert.NotNull(msg.ProcessedByBotAt);
    }

    [Fact]
    public async Task SessionKey_UsesEvoCachePrefixWithTenantIdAndFrom()
    {
        // Arrange
        var (svc, cache, _) = BuildSut();
        var msg = MakeMsg("oi");

        // Act
        await svc.HandleMessageAsync(msg);

        // Assert — deve existir entrada no cache com o prefixo correto
        var expectedKey = $"evo_booking_{TenantId}_{UserPhone}";
        Assert.True(cache.TryGetValue(expectedKey, out _));
    }

    [Fact]
    public async Task InstanceId_IsSetFromMsgTo()
    {
        // Arrange
        var (svc, cache, evoSvc) = BuildSut();
        var msg = MakeMsg("oi");

        // Act
        await svc.HandleMessageAsync(msg);

        // Assert — SendTextAsync deve ser chamado com instanceId = msg.To
        evoSvc.Verify(e => e.SendTextAsync(InstanceId, UserPhone, It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.AtLeastOnce);
    }

    [Fact]
    public async Task AudioBody_RepliesWithUnsupportedMessage_StateUnchanged()
    {
        // Arrange
        var (svc, cache, evoSvc) = BuildSut();
        // Primeiro inicializa a sessão em AWAITING_SERVICE
        await svc.HandleMessageAsync(MakeMsg("oi"));

        var audioMsg = MakeMsg("[Áudio]");

        // Act
        await svc.HandleMessageAsync(audioMsg);

        // Assert — responde com mensagem de áudio e mantém sessão
        evoSvc.Verify(e => e.SendTextAsync(InstanceId, UserPhone,
            It.Is<string>(t => t.Contains("aprendendo a ouvir")), It.IsAny<CancellationToken>()), Times.Once);

        var cacheKey = $"evo_booking_{TenantId}_{UserPhone}";
        Assert.True(cache.TryGetValue(cacheKey, out _)); // sessão ainda existe
    }

    [Fact]
    public async Task NumericInput_1_SelectsFirstCurrentOption()
    {
        // Arrange
        var (svc, cache, evoSvc) = BuildSut();
        // Inicia flow → vai para AWAITING_SERVICE
        await svc.HandleMessageAsync(MakeMsg("oi"));

        // Act — digitar "1" deve selecionar o primeiro serviço
        var msg2 = MakeMsg("1");
        await svc.HandleMessageAsync(msg2);

        // Assert — deve ter avançado para além de AWAITING_SERVICE (agendou serviço)
        var cacheKey = $"evo_booking_{TenantId}_{UserPhone}";
        cache.TryGetValue(cacheKey, out object? sessionObj);
        Assert.NotNull(sessionObj); // sessão continua ativa
    }

    [Fact]
    public async Task OutOfRangeNumber_ResendsCurrentList()
    {
        // Arrange
        var (svc, cache, evoSvc) = BuildSut();
        await svc.HandleMessageAsync(MakeMsg("oi")); // → AWAITING_SERVICE (2 serviços)
        evoSvc.Invocations.Clear(); // limpa chamadas anteriores

        // Act — número 99 está fora do range de 2 opções
        await svc.HandleMessageAsync(MakeMsg("99"));

        // Assert — reenviou lista de serviços
        evoSvc.Verify(e => e.SendTextAsync(InstanceId, UserPhone,
            It.Is<string>(t => t.Contains("Corte de Cabelo")), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task MoreOption_IncreasesPageAndResendsList()
    {
        // Arrange — serviços suficientes para criar paginação (> 9)
        var bookingSvc = new Mock<IPublicBookingService>();
        var manyServices = Enumerable.Range(1, 11).Select(i => new PublicServiceDto
        {
            Id = Guid.NewGuid(),
            Name = $"Serviço {i}",
            Price = 50
        }).ToList();
        bookingSvc.Setup(b => b.GetServicesByTenantAsync("salao-teste")).ReturnsAsync(manyServices);

        var (svc, cache, evoSvc) = BuildSut(bookingSvc: bookingSvc);
        await svc.HandleMessageAsync(MakeMsg("oi")); // → AWAITING_SERVICE (page 0, mostra 9 + 1 "Ver mais")
        evoSvc.Invocations.Clear();

        // Act — "10" seleciona "Ver mais" (índice 10 = posição 10 na lista de 10 itens: 9 serviços + 1 ver mais)
        await svc.HandleMessageAsync(MakeMsg("10"));

        // Assert — reenviou lista com itens da página 1
        evoSvc.Verify(e => e.SendTextAsync(InstanceId, UserPhone,
            It.Is<string>(t => t.Contains("Serviço 10") || t.Contains("Serviço 11")), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task AppointmentSource_IsEvolutionBot_WhenBookingCreated()
    {
        // Arrange
        var bookingSvc = new Mock<IPublicBookingService>();
        var serviceId = Guid.NewGuid();
        var employeeId = Guid.NewGuid();
        bookingSvc.Setup(b => b.GetServicesByTenantAsync("salao-teste"))
            .ReturnsAsync(new List<PublicServiceDto> { new() { Id = serviceId, Name = "Corte", Price = 30 } });
        bookingSvc.Setup(b => b.GetEmployeesByServiceAsync("salao-teste", serviceId))
            .ReturnsAsync(new List<PublicEmployeeDto>());
        bookingSvc.Setup(b => b.GetAvailableSlotsAsync("salao-teste", It.IsAny<DateTime>(), serviceId, null))
            .ReturnsAsync(new List<PublicTimeSlotDto>
            {
                new() { StartTime = DateTimeOffset.UtcNow.AddHours(5), IsAvailable = true }
            });

        PublicBookingCreateDto? captured = null;
        bookingSvc.Setup(b => b.CreateBookingAsync(It.IsAny<PublicBookingCreateDto>()))
            .Callback<PublicBookingCreateDto>(dto => captured = dto)
            .ReturnsAsync(new PublicBookingResult { Success = true, AppointmentId = Guid.NewGuid() });

        var (svc, _, _) = BuildSut(bookingSvc: bookingSvc);

        // Simulate full flow: START → AWAITING_SERVICE → AWAITING_DATE → AWAITING_TIME → AWAITING_DESCRIPTION → AWAITING_CONFIRMATION
        await svc.HandleMessageAsync(MakeMsg("oi"));      // START → AWAITING_SERVICE
        await svc.HandleMessageAsync(MakeMsg("1"));       // seleciona serviço → AWAITING_DATE
        await svc.HandleMessageAsync(MakeMsg("1"));       // seleciona data → AWAITING_TIME
        await svc.HandleMessageAsync(MakeMsg("1"));       // seleciona horário → AWAITING_DESCRIPTION
        await svc.HandleMessageAsync(MakeMsg("não"));     // sem descrição → AWAITING_CONFIRMATION
        await svc.HandleMessageAsync(MakeMsg("1"));       // confirma → chama CreateBookingAsync

        // Assert
        Assert.NotNull(captured);
        Assert.Equal(AppointmentSource.EvolutionBot, captured!.Source);
    }

    [Fact]
    public async Task ContactName_FallsBackToCliente_WhenConversationNotFound()
    {
        // Arrange
        var (svc, _, evoSvc) = BuildSut(); // convRepo já retorna lista vazia no BuildSut padrão

        // Act
        await svc.HandleMessageAsync(MakeMsg("oi"));

        // Assert — mensagem de boas-vindas usa "Cliente" como fallback
        evoSvc.Verify(e => e.SendTextAsync(InstanceId, UserPhone,
            It.Is<string>(t => t.Contains("Cliente") || t.Contains("Bem-vindo")), It.IsAny<CancellationToken>()), Times.AtLeastOnce);
    }
}
```

- [ ] **Step 2: Rodar os testes**

```bash
cd voro-salon-crm-api
dotnet test VoroSalonCrm.Tests.Integration --filter "EvolutionBookingChatServiceTests" -v normal
```

Expected: todos os testes PASS. Se algum falhar, investigar e corrigir a implementação antes de continuar.

- [ ] **Step 3: Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.Tests.Integration/Evolution/EvolutionBookingChatServiceTests.cs
git commit -m "test(evolution): add unit tests for EvolutionBookingChatService channel differences"
```

---

## Self-Review

### Spec coverage

| Requisito do spec | Task |
|---|---|
| `DetermineEvolutionMessageType` no webhook | Task 2 |
| `IEvolutionBookingChatService` interface | Task 3 |
| `EvolutionBookingChatService` stateful | Task 4 |
| `EvolutionBookingSession` com `CurrentOptions` e `InstanceId` | Task 4 step 1 |
| Chave de cache `evo_booking_{tenantId}_{from}` | Task 4 step 1 (`SessionKey`) |
| TTL 15 min | Task 4 step 2 |
| Detecção de áudio via `msg.Body == "[Áudio]"` | Task 4 step 2 |
| Rating em sessão COMPLETED/CANCELLED | Task 4 step 2 |
| Keyword "reagend" reinicia | Task 4 step 2 |
| Verificação de agendamento existente no START | Task 4 step 5 (`StartBookingFlowAsync`) |
| Listas numeradas com paginação e `__more__` | Task 4 step 3 |
| `AWAITING_APPOINTMENT_ACTION` | Task 4 step 4 |
| `AWAITING_SERVICE` → `AWAITING_EMPLOYEE` → `AWAITING_DATE` → `AWAITING_TIME` | Task 4 step 2 switch |
| `AWAITING_DESCRIPTION` | Task 4 step 4 |
| `AWAITING_CONFIRMATION` com resumo | Task 4 step 4 |
| `AWAITING_REMINDER_TIME` | Task 4 step 4 |
| `AWAITING_CANCEL_CONFIRMATION` / `AWAITING_RESCHEDULE_CONFIRMATION` | Task 4 step 4 |
| AI fallback no estado `default` | Task 4 step 2 |
| `AppointmentSource.EvolutionBot = 4` | Task 1 + Task 4 step 4 |
| `msg.ProcessedByBotAt` sempre definido | Task 4 step 2 (finally) |
| Worker atualizado | Task 5 |
| DI atualizado | Task 6 |
| Arquivos antigos deletados | Task 7 |
| Testes das diferenças do canal | Task 8 |
| `ContactName` de `WhatsAppConversation` ou fallback "Cliente" | Task 4 step 2 |
| `InstanceId = msg.To` na criação da sessão | Task 4 step 2 |

### Scan de placeholders

Nenhum TBD ou "implementar depois" encontrado. Todos os passos têm código completo.

### Consistência de tipos

- `PublicBookingCreateDto.Source` recebe `AppointmentSource.EvolutionBot` (definido na Task 1).
- `session.CurrentOptions` é `List<(string Id, string Label)>` — usado consistentemente em `HandleSelectionAsync` e todos os `Ask*Async`.
- `SendAsync` usa sempre `session.InstanceId` como primeiro argumento e `from` como segundo — consistente com `IEvolutionService.SendTextAsync(instanceId, to, text)`.

---

## Execution Handoff

Plano completo salvo em `docs/superpowers/plans/2026-05-09-evolution-booking-chat.md`.

**Duas opções de execução:**

**1. Subagent-Driven (recomendado)** — Um subagente por task, review entre tasks, iteração rápida. Use `superpowers:subagent-driven-development`.

**2. Inline Execution** — Execute nesta sessão com checkpoints. Use `superpowers:executing-plans`.

**Qual prefere?**


### Arquivos criados

| Arquivo | Responsabilidade |
|---|---|
| `Application/Services/Interfaces/Integration/IEvolutionBookingChatService.cs` | Interface pública do novo serviço |
| `Infrastructure/Integration/EvolutionBookingChatService.cs` | Implementação completa da state machine |
| `Tests.Integration/Evolution/EvolutionBookingChatServiceTests.cs` | Testes unitários das diferenças do canal |

### Arquivos modificados

| Arquivo | O que muda |
|---|---|
| `Domain/Enums/AppointmentSource.cs` | Adiciona `EvolutionBot = 4` |
| `API/Controllers/WhatsappController.cs` | Usa `DetermineEvolutionMessageType` para salvar body no webhook |
| `Infrastructure/Integration/EvolutionResponseWorker.cs` | Troca `IEvolutionResponseService` → `IEvolutionBookingChatService` |
| `Contract/Extensions/Configurations/AddAppServicesExtension.cs` | Remove 3 registros antigos, adiciona 1 novo |

### Arquivos deletados

| Arquivo | Caminho completo |
|---|---|
| `IEvolutionResponseService.cs` | `Application/Services/Interfaces/Integration/` |
| `EvolutionResponseService.cs` | `Infrastructure/Integration/` |
| `IEvolutionRulesEngine.cs` | `Application/Services/Interfaces/Integration/` |
| `EvolutionRulesEngine.cs` | `Infrastructure/Integration/` |
| `IEvolutionAIResponder.cs` | `Application/Services/Interfaces/Integration/` |
| `EvolutionAIResponder.cs` | `Infrastructure/Integration/` |
| `EvolutionRulesEngineTests.cs` | `Tests.Integration/Evolution/` |
| `EvolutionResponseServiceTests.cs` | `Tests.Integration/Evolution/` |
| `EvolutionAIResponderTests.cs` | `Tests.Integration/Evolution/` |

---

using System.Linq.Expressions;
using FluentAssertions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.DTOs.Public;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Infrastructure.Integration;
using VoroSalonCrm.Tests.Integration.Helpers;

namespace VoroSalonCrm.Tests.Integration.Evolution;

public class EvolutionBookingChatServiceTests
{
    // ── shared fixtures ───────────────────────────────────────────────────────

    private readonly Guid   _tenantId = Guid.NewGuid();
    private readonly string _from     = "5511999990001";
    private readonly string _to       = "instance-abc";
    private readonly string _slug     = "meu-salao";
    private readonly string _name     = "Salão Teste";

    // ── factory helpers ───────────────────────────────────────────────────────

    /// <summary>Builds a service with the given mocks and a real MemoryCache.</summary>
    private static EvolutionBookingChatService Build(
        Mock<IEvolutionService>              evolutionSvc,
        Mock<IPublicBookingService>          bookingSvc,
        Mock<ITenantRepository>             tenantRepo,
        Mock<IWhatsAppConversationRepository> convRepo,
        Mock<IWhatsAppMessageService>        messageSvc,
        Mock<IUnitOfWork>                   unitOfWork,
        IMemoryCache                        cache,
        Mock<IAppointmentRepository>        apptRepo,
        Mock<IClientRepository>             clientRepo,
        Mock<IClientRatingRepository>       ratingRepo,
        Mock<IAIConversationService>        aiSvc)
        => new(
            evolutionSvc.Object,
            bookingSvc.Object,
            tenantRepo.Object,
            convRepo.Object,
            messageSvc.Object,
            unitOfWork.Object,
            cache,
            NullLogger<EvolutionBookingChatService>.Instance,
            apptRepo.Object,
            clientRepo.Object,
            ratingRepo.Object,
            aiSvc.Object);

    private WhatsAppMessage MakeMsg(string body)
        => new()
        {
            Id       = Guid.NewGuid(),
            TenantId = _tenantId,
            From     = _from,
            To       = _to,
            Body     = body,
            Timestamp = DateTimeOffset.UtcNow,
        };

    /// <summary>Tenant that has WhatsApp booking enabled.</summary>
    private Tenant MakeTenant()
        => new()
        {
            Id                 = _tenantId,
            Name               = _name,
            Slug               = _slug,
            UseWhatsappBooking = true,
        };

    private static IQueryable<T> AsyncOf<T>(IEnumerable<T> source)
        => new TestAsyncEnumerable<T>(source);

    // ── default neutral mock wiring ───────────────────────────────────────────

    private (Mock<IEvolutionService>,
             Mock<IPublicBookingService>,
             Mock<ITenantRepository>,
             Mock<IWhatsAppConversationRepository>,
             Mock<IWhatsAppMessageService>,
             Mock<IUnitOfWork>,
             IMemoryCache,
             Mock<IAppointmentRepository>,
             Mock<IClientRepository>,
             Mock<IClientRatingRepository>,
             Mock<IAIConversationService>)
    BuildMocks(Tenant? tenant = null)
    {
        var evolutionSvc = new Mock<IEvolutionService>();
        var bookingSvc   = new Mock<IPublicBookingService>();
        var tenantRepo   = new Mock<ITenantRepository>();
        var convRepo     = new Mock<IWhatsAppConversationRepository>();
        var messageSvc   = new Mock<IWhatsAppMessageService>();
        var unitOfWork   = new Mock<IUnitOfWork>();
        var cache        = new MemoryCache(new MemoryCacheOptions());
        var apptRepo     = new Mock<IAppointmentRepository>();
        var clientRepo   = new Mock<IClientRepository>();
        var ratingRepo   = new Mock<IClientRatingRepository>();
        var aiSvc        = new Mock<IAIConversationService>();

        // tenant repo — default returns the supplied tenant
        tenantRepo
            .Setup(r => r.GetByIdAsync(It.IsAny<bool>(), It.IsAny<object[]>()))
            .ReturnsAsync(tenant ?? MakeTenant());

        // conversation repo — default no conversation found
        convRepo
            .Setup(r => r.Query(It.IsAny<Expression<Func<WhatsAppConversation, bool>>>(), It.IsAny<bool>()))
            .Returns(AsyncOf(Array.Empty<WhatsAppConversation>()));

        // evolution service — default send succeeds
        evolutionSvc
            .Setup(s => s.SendTextAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // message service — fire-and-forget, ignore
        messageSvc
            .Setup(s => s.SaveOutboundAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>()))
            .Returns(Task.CompletedTask);

        // unit of work
        unitOfWork
            .Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);

        // client repo — default empty (no client match → no pending appointment check)
        clientRepo
            .Setup(r => r.Query(It.IsAny<Expression<Func<Client, bool>>>(), It.IsAny<bool>()))
            .Returns(AsyncOf(Array.Empty<Client>()));

        // appointment repo — default empty
        apptRepo
            .Setup(r => r.Query(It.IsAny<Expression<Func<Appointment, bool>>>(), It.IsAny<bool>()))
            .Returns(AsyncOf(Array.Empty<Appointment>()));

        // booking service — default returns a list of services when asked
        bookingSvc
            .Setup(s => s.GetServicesByTenantAsync(It.IsAny<string>()))
            .ReturnsAsync(Array.Empty<PublicServiceDto>());

        // AI fallback
        aiSvc
            .Setup(a => a.RespondAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync("Olá, como posso ajudar?");

        return (evolutionSvc, bookingSvc, tenantRepo, convRepo, messageSvc,
                unitOfWork, cache, apptRepo, clientRepo, ratingRepo, aiSvc);
    }

    // ── helpers to reduce duplication ─────────────────────────────────────────

    private EvolutionBookingChatService BuildService(
        Mock<IEvolutionService>? evolutionSvc = null,
        Mock<IPublicBookingService>? bookingSvc = null,
        Mock<ITenantRepository>? tenantRepo = null,
        Mock<IWhatsAppConversationRepository>? convRepo = null,
        Mock<IWhatsAppMessageService>? messageSvc = null,
        Mock<IUnitOfWork>? unitOfWork = null,
        IMemoryCache? cache = null,
        Mock<IAppointmentRepository>? apptRepo = null,
        Mock<IClientRepository>? clientRepo = null,
        Mock<IClientRatingRepository>? ratingRepo = null,
        Mock<IAIConversationService>? aiSvc = null,
        Tenant? tenant = null)
    {
        var (evo, bkg, tr, cr, ms, uow, mc, ar, clr, rar, ai) = BuildMocks(tenant);
        return Build(
            evolutionSvc ?? evo,
            bookingSvc   ?? bkg,
            tenantRepo   ?? tr,
            convRepo     ?? cr,
            messageSvc   ?? ms,
            unitOfWork   ?? uow,
            cache        ?? mc,
            apptRepo     ?? ar,
            clientRepo   ?? clr,
            ratingRepo   ?? rar,
            aiSvc        ?? ai);
    }

    // =========================================================================
    // Test 1 — ProcessedByBotAt is always set, even on error inside the try block
    // =========================================================================

    [Fact]
    public async Task ProcessedByBotAt_IsAlwaysSet_EvenOnError()
    {
        // Arrange
        // The try/catch/finally that sets ProcessedByBotAt wraps the state-machine
        // dispatch, NOT the initial session creation. We need an error that occurs
        // inside the try block. We achieve this by:
        //   1. Pre-warming the session in cache (so GetByIdAsync is never called).
        //   2. Putting the session in state START, which calls StartBookingFlowAsync
        //      → AskForServiceAsync → GetServicesByTenantAsync.
        //   3. Making GetServicesByTenantAsync throw, so the catch block absorbs it
        //      and the finally always stamps ProcessedByBotAt.
        var (evo, bkg, tr, cr, ms, uow, mc, ar, clr, rar, ai) = BuildMocks();

        // Pre-warm session in cache so the tenant lookup path is skipped
        var sessionType = typeof(EvolutionBookingChatService)
            .GetNestedType("EvolutionBookingSession", System.Reflection.BindingFlags.NonPublic)!;
        var session = Activator.CreateInstance(sessionType)!;
        sessionType.GetProperty("State")!.SetValue(session, "START");
        sessionType.GetProperty("TenantId")!.SetValue(session, _tenantId);
        sessionType.GetProperty("TenantSlug")!.SetValue(session, _slug);
        sessionType.GetProperty("TenantName")!.SetValue(session, _name);
        sessionType.GetProperty("UseWhatsappBooking")!.SetValue(session, true);
        sessionType.GetProperty("InstanceId")!.SetValue(session, _to);
        sessionType.GetProperty("ContactName")!.SetValue(session, "Cliente");

        var sessionKey = $"evo_booking_{_tenantId}_{_from}";
        mc.Set(sessionKey, session, TimeSpan.FromMinutes(15));

        // Force a failure inside the try block: GetServicesByTenantAsync is called
        // inside StartBookingFlowAsync → AskForServiceAsync, both within the try block.
        bkg.Setup(s => s.GetServicesByTenantAsync(It.IsAny<string>()))
           .ThrowsAsync(new Exception("DB offline"));

        // clientRepo returns empty so StartBookingFlowAsync passes client check and
        // proceeds to AskForServiceAsync which will then fail
        clr.Setup(r => r.Query(It.IsAny<Expression<Func<Client, bool>>>(), It.IsAny<bool>()))
           .Returns(AsyncOf(Array.Empty<Client>()));

        var svc = Build(evo, bkg, tr, cr, ms, uow, mc, ar, clr, rar, ai);
        var msg = MakeMsg("Olá");

        // Act
        await svc.HandleMessageAsync(msg);

        // Assert — finally block must always stamp ProcessedByBotAt
        msg.ProcessedByBotAt.Should().NotBeNull("o finally sempre deve setar ProcessedByBotAt, mesmo em caso de erro");
    }

    // =========================================================================
    // Test 2 — Session key format: evo_booking_{tenantId}_{from}
    // =========================================================================

    [Fact]
    public async Task SessionKey_UsesEvoCachePrefixWithTenantIdAndFrom()
    {
        // Arrange
        var (evo, bkg, tr, cr, ms, uow, mc, ar, clr, rar, ai) = BuildMocks();

        bkg.Setup(s => s.GetServicesByTenantAsync(_slug))
           .ReturnsAsync(Array.Empty<PublicServiceDto>());

        var svc = Build(evo, bkg, tr, cr, ms, uow, mc, ar, clr, rar, ai);
        var msg = MakeMsg("Olá");

        // Act
        await svc.HandleMessageAsync(msg);

        // Assert — cache must contain an entry under the expected key
        var expectedKey = $"evo_booking_{_tenantId}_{_from}";
        mc.TryGetValue(expectedKey, out object? session).Should().BeTrue(
            $"o cache deve conter a chave '{expectedKey}' após HandleMessageAsync");
        session.Should().NotBeNull();
    }

    // =========================================================================
    // Test 3 — InstanceId is taken from msg.To and forwarded to SendTextAsync
    // =========================================================================

    [Fact]
    public async Task InstanceId_IsSetFromMsgTo()
    {
        // Arrange
        var (evo, bkg, tr, cr, ms, uow, mc, ar, clr, rar, ai) = BuildMocks();

        string? capturedInstance = null;
        evo.Reset();
        evo.Setup(s => s.SendTextAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
           .Callback<string, string, string, CancellationToken>((inst, _, _, _) => capturedInstance = inst)
           .ReturnsAsync(true);

        bkg.Setup(s => s.GetServicesByTenantAsync(_slug))
           .ReturnsAsync(Array.Empty<PublicServiceDto>());

        var svc = Build(evo, bkg, tr, cr, ms, uow, mc, ar, clr, rar, ai);
        var msg = MakeMsg("Olá");

        // Act
        await svc.HandleMessageAsync(msg);

        // Assert
        capturedInstance.Should().Be(_to,
            "SendTextAsync deve ser chamado com instanceId = msg.To");
    }

    // =========================================================================
    // Test 4 — Audio body replies with unsupported message, session stays in cache
    // =========================================================================

    [Fact]
    public async Task AudioBody_RepliesWithUnsupportedMessage_StateUnchanged()
    {
        // Arrange
        var (evo, bkg, tr, cr, ms, uow, mc, ar, clr, rar, ai) = BuildMocks();

        // Pre-warm session in state START so the first message creates the session
        // then send the audio on the second call using the same cache
        bkg.Setup(s => s.GetServicesByTenantAsync(_slug))
           .ReturnsAsync(Array.Empty<PublicServiceDto>());

        var svc = Build(evo, bkg, tr, cr, ms, uow, mc, ar, clr, rar, ai);

        // First message to establish session
        await svc.HandleMessageAsync(MakeMsg("Olá"));

        // Capture what gets sent for the audio message
        var sentTexts = new List<string>();
        evo.Reset();
        evo.Setup(s => s.SendTextAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
           .Callback<string, string, string, CancellationToken>((_, _, text, _) => sentTexts.Add(text))
           .ReturnsAsync(true);

        // Act — send audio message
        var audioMsg = MakeMsg("[Áudio]");
        await svc.HandleMessageAsync(audioMsg);

        // Assert — replied with the audio-unsupported text
        sentTexts.Should().ContainMatch("*aprendendo a ouvir áudios*",
            "deve responder que ainda não suporta áudios");

        // Session still in cache (not removed)
        var sessionKey = $"evo_booking_{_tenantId}_{_from}";
        mc.TryGetValue(sessionKey, out object? session).Should().BeTrue(
            "a sessão deve permanecer no cache após receber áudio");
    }

    // =========================================================================
    // Test 5 — Out-of-range number causes list to be resent
    // =========================================================================

    [Fact]
    public async Task OutOfRangeNumber_ResendsCurrentList()
    {
        // Arrange
        var (evo, bkg, tr, cr, ms, uow, mc, ar, clr, rar, ai) = BuildMocks();

        var services = new[]
        {
            new PublicServiceDto(Guid.NewGuid(), "Corte",   50m, 30),
            new PublicServiceDto(Guid.NewGuid(), "Coloração", 150m, 60),
        };

        bkg.Setup(s => s.GetServicesByTenantAsync(_slug))
           .ReturnsAsync(services);

        var svc = Build(evo, bkg, tr, cr, ms, uow, mc, ar, clr, rar, ai);

        // First message → receives the service list (state becomes AWAITING_SERVICE)
        await svc.HandleMessageAsync(MakeMsg("Olá"));

        var sentTexts = new List<string>();
        evo.Reset();
        evo.Setup(s => s.SendTextAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
           .Callback<string, string, string, CancellationToken>((_, _, text, _) => sentTexts.Add(text))
           .ReturnsAsync(true);

        // Act — send a number that is out of the list range (3 when only 2 services)
        await svc.HandleMessageAsync(MakeMsg("99"));

        // Assert — should resend the service list
        sentTexts.Should().ContainMatch("*Qual serviço*",
            "ao digitar número fora do range, a lista de serviços deve ser reenviada");
    }

    // =========================================================================
    // Test 6 — "Ver mais" option increases page and resends list
    // =========================================================================

    [Fact]
    public async Task MoreOption_IncreasesPageAndResendsList()
    {
        // Arrange — 11 services so page 0 = 9 + "Ver mais" at position 10
        var (evo, bkg, tr, cr, ms, uow, mc, ar, clr, rar, ai) = BuildMocks();

        var services = Enumerable.Range(1, 11)
            .Select(i => new PublicServiceDto(Guid.NewGuid(), $"Serviço {i}", 50m, 30))
            .ToArray();

        bkg.Setup(s => s.GetServicesByTenantAsync(_slug))
           .ReturnsAsync(services);

        var svc = Build(evo, bkg, tr, cr, ms, uow, mc, ar, clr, rar, ai);

        // First message → service list page 0 with 9 services + "10 - Ver mais opções →"
        await svc.HandleMessageAsync(MakeMsg("Olá"));

        var sentTexts = new List<string>();
        evo.Reset();
        evo.Setup(s => s.SendTextAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
           .Callback<string, string, string, CancellationToken>((_, _, text, _) => sentTexts.Add(text))
           .ReturnsAsync(true);

        // Act — digit 10 = "Ver mais opções" position
        await svc.HandleMessageAsync(MakeMsg("10"));

        // Assert — next page was sent (contains the remaining 2 services from page 1)
        sentTexts.Should().ContainMatch("*Serviço 10*",
            "página 2 deve conter 'Serviço 10' que estava além da primeira página");
    }

    // =========================================================================
    // Test 7 — AppointmentSource is EvolutionBot when booking is created
    // =========================================================================

    [Fact]
    public async Task AppointmentSource_IsEvolutionBot_WhenBookingCreated()
    {
        // Arrange
        var (evo, bkg, tr, cr, ms, uow, mc, ar, clr, rar, ai) = BuildMocks();

        var serviceId  = Guid.NewGuid();
        var employeeId = Guid.NewGuid();

        // Pre-load the session in AWAITING_CONFIRMATION state via cache
        var sessionType = typeof(EvolutionBookingChatService)
            .GetNestedType("EvolutionBookingSession", System.Reflection.BindingFlags.NonPublic)!;

        var session = Activator.CreateInstance(sessionType)!;
        sessionType.GetProperty("State")!.SetValue(session, "AWAITING_CONFIRMATION");
        sessionType.GetProperty("TenantId")!.SetValue(session, _tenantId);
        sessionType.GetProperty("TenantSlug")!.SetValue(session, _slug);
        sessionType.GetProperty("TenantName")!.SetValue(session, _name);
        sessionType.GetProperty("UseWhatsappBooking")!.SetValue(session, true);
        sessionType.GetProperty("InstanceId")!.SetValue(session, _to);
        sessionType.GetProperty("ContactName")!.SetValue(session, "João");
        sessionType.GetProperty("ServiceId")!.SetValue(session, (Guid?)serviceId);
        sessionType.GetProperty("ServiceName")!.SetValue(session, "Corte");
        sessionType.GetProperty("EmployeeId")!.SetValue(session, (Guid?)employeeId);
        sessionType.GetProperty("EmployeeName")!.SetValue(session, "Carlos");
        sessionType.GetProperty("SelectedDate")!.SetValue(session, (DateTime?)DateTime.SpecifyKind(DateTime.Today.AddDays(1), DateTimeKind.Unspecified));
        sessionType.GetProperty("SelectedTime")!.SetValue(session, "10:00");

        // CurrentOptions must have (confirm, cancel)
        var optionsList = (System.Collections.IList)sessionType.GetProperty("CurrentOptions")!.GetValue(session)!;
        optionsList.Add(((string Id, string Label))("confirm", "Confirmar"));
        optionsList.Add(((string Id, string Label))("cancel", "Cancelar"));

        var sessionKey = $"evo_booking_{_tenantId}_{_from}";
        mc.Set(sessionKey, session, TimeSpan.FromMinutes(15));

        PublicBookingCreateDto? capturedDto = null;
        bkg.Setup(s => s.CreateBookingAsync(It.IsAny<PublicBookingCreateDto>()))
           .Callback<PublicBookingCreateDto>(dto => capturedDto = dto)
           .ReturnsAsync(new PublicBookingResponseDto(true, "OK", Guid.NewGuid()));

        // Appointment repo returns null for reminder setup
        ar.Setup(r => r.GetByIdAsync(It.IsAny<bool>(), It.IsAny<object[]>()))
          .ReturnsAsync((Appointment?)null);

        var svc = Build(evo, bkg, tr, cr, ms, uow, mc, ar, clr, rar, ai);

        // Act — confirm with "1"
        await svc.HandleMessageAsync(MakeMsg("1"));

        // Assert
        capturedDto.Should().NotBeNull("CreateBookingAsync deve ter sido chamado");
        capturedDto!.Source.Should().Be(AppointmentSource.EvolutionBot,
            "o source deve ser EvolutionBot quando agendado via Evolution Bot");
    }

    // =========================================================================
    // Test 8 — ContactName falls back to "Cliente" when no conversation is found
    // =========================================================================

    [Fact]
    public async Task ContactName_FallsBackToCliente_WhenConversationNotFound()
    {
        // Arrange
        var (evo, bkg, tr, cr, ms, uow, mc, ar, clr, rar, ai) = BuildMocks();

        // convRepo already returns empty by default — no conversation
        bkg.Setup(s => s.GetServicesByTenantAsync(_slug))
           .ReturnsAsync(Array.Empty<PublicServiceDto>());

        var sentTexts = new List<string>();
        evo.Reset();
        evo.Setup(s => s.SendTextAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
           .Callback<string, string, string, CancellationToken>((_, _, text, _) => sentTexts.Add(text))
           .ReturnsAsync(true);

        var svc = Build(evo, bkg, tr, cr, ms, uow, mc, ar, clr, rar, ai);

        // Act
        await svc.HandleMessageAsync(MakeMsg("Olá"));

        // Assert — greeting must use "Cliente" as fallback name
        sentTexts.Should().ContainMatch("*Olá Cliente*",
            "quando não há conversa registrada, o nome de contato deve ser 'Cliente'");
    }
}

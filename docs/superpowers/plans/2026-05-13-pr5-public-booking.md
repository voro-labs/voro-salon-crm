# PR #5 — PublicBookingService Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Pré-requisito:** PR #1 (`refactor/mediatr-setup`) mergeado em `improvement/api-refactor`.

**Goal:** Extrair a lógica do `PublicBookingService` (577 linhas, zero testes) para Handlers MediatR com cobertura de testes — GetAvailableSlots, CreateBooking, GetBookingFunnel, UpdateFunnelSession.

**Architecture:** `PublicBookingService` mantido como façade. O handler de `GetAvailableSlotsQuery` é o mais crítico — recebe os maiores riscos de regressão (lógica de horário comercial + bloqueios). Nenhum Controller é alterado.

**Tech Stack:** .NET 9, MediatR 12, xUnit, Moq, FluentAssertions

---

## File Structure

```
VoroSalonCrm.Application/
  Features/
    PublicBooking/
      Queries/
        GetAvailableSlotsQuery.cs               ← CREATE
        GetAvailableSlotsQueryHandler.cs        ← CREATE
        GetBookingFunnelQuery.cs                ← CREATE
        GetBookingFunnelQueryHandler.cs         ← CREATE
      Commands/
        CreateBookingCommand.cs                 ← CREATE
        CreateBookingCommandHandler.cs          ← CREATE
        UpdateFunnelSessionCommand.cs           ← CREATE
        UpdateFunnelSessionCommandHandler.cs    ← CREATE
  Services/
    PublicBookingService.cs                     ← MODIFY: virar façade

VoroSalonCrm.Tests.Integration/
  PublicBooking/
    Queries/
      GetAvailableSlotsQueryHandlerTests.cs     ← CREATE
    Commands/
      CreateBookingCommandHandlerTests.cs       ← CREATE
```

---

### Task 1: Criar branch e explorar PublicBookingService

- [ ] **Step 1: Criar branch**

```bash
cd voro-salon-crm-api
git checkout improvement/api-refactor
git pull origin improvement/api-refactor
git checkout -b refactor/public-booking
```

- [ ] **Step 2: Ler o PublicBookingService para entender as dependências**

```bash
cat VoroSalonCrm.Application/Services/PublicBookingService.cs | head -60
```

Identificar: quais repositórios são injetados, o que `GetAvailableSlotsAsync` e `CreateBookingAsync` recebem/retornam.

---

### Task 2: Criar GetAvailableSlotsQueryHandler

**Files:**
- Create: `VoroSalonCrm.Application/Features/PublicBooking/Queries/GetAvailableSlotsQuery.cs`
- Create: `VoroSalonCrm.Application/Features/PublicBooking/Queries/GetAvailableSlotsQueryHandler.cs`
- Create: `VoroSalonCrm.Tests.Integration/PublicBooking/Queries/GetAvailableSlotsQueryHandlerTests.cs`

- [ ] **Step 1: Criar testes falhando**

Criar `VoroSalonCrm.Tests.Integration/PublicBooking/Queries/GetAvailableSlotsQueryHandlerTests.cs`:

```csharp
using FluentAssertions;
using Moq;
using VoroSalonCrm.Application.DTOs.Public;
using VoroSalonCrm.Application.Features.PublicBooking.Queries;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Application.Services.Interfaces;

namespace VoroSalonCrm.Tests.Integration.PublicBooking.Queries;

public class GetAvailableSlotsQueryHandlerTests
{
    private readonly Mock<ITenantBusinessHoursRepository> _businessHoursRepo = new();
    private readonly Mock<IAppointmentRepository>         _appointmentRepo   = new();
    private readonly Mock<ITimeSlotBlockService>          _timeSlotBlockSvc  = new();

    private GetAvailableSlotsQueryHandler Build() => new(
        _businessHoursRepo.Object,
        _appointmentRepo.Object,
        _timeSlotBlockSvc.Object);

    [Fact]
    public async Task Handle_WhenNoBusinessHours_ReturnsEmptySlots()
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        _businessHoursRepo
            .Setup(r => r.GetByTenantAsync(tenantId, It.IsAny<bool>()))
            .ReturnsAsync(new List<TenantBusinessHours>());

        _timeSlotBlockSvc
            .Setup(s => s.GetOverlappingAsync(It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>()))
            .ReturnsAsync(new List<TimeSlotBlockDto>());

        _appointmentRepo
            .Setup(r => r.Query(It.IsAny<System.Linq.Expressions.Expression<Func<Appointment, bool>>>(), It.IsAny<bool>()))
            .Returns(new List<Appointment>().AsQueryable());

        var query = new GetAvailableSlotsQuery(
            TenantId        : tenantId,
            ServiceId       : Guid.NewGuid(),
            Date            : DateOnly.FromDateTime(DateTime.Today.AddDays(1)),
            DurationMinutes : 60);

        var handler = Build();

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task Handle_WhenSlotIsBlocked_ExcludesBlockedSlot()
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        var date     = DateOnly.FromDateTime(DateTime.Today.AddDays(1));

        _businessHoursRepo
            .Setup(r => r.GetByTenantAsync(tenantId, It.IsAny<bool>()))
            .ReturnsAsync(new List<TenantBusinessHours>
            {
                new()
                {
                    DayOfWeek  = (int)date.DayOfWeek,
                    IsOpen     = true,
                    OpenTime   = new TimeOnly(9, 0),
                    CloseTime  = new TimeOnly(11, 0)
                }
            });

        var blockedStart = new DateTimeOffset(date.Year, date.Month, date.Day, 9, 0, 0, TimeSpan.Zero);
        var blockedEnd   = blockedStart.AddMinutes(60);

        _timeSlotBlockSvc
            .Setup(s => s.GetOverlappingAsync(It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>()))
            .ReturnsAsync(new List<TimeSlotBlockDto>
            {
                new(Guid.NewGuid(), tenantId, null, blockedStart, blockedEnd, "Bloqueado")
            });

        _appointmentRepo
            .Setup(r => r.Query(It.IsAny<System.Linq.Expressions.Expression<Func<Appointment, bool>>>(), It.IsAny<bool>()))
            .Returns(new List<Appointment>().AsQueryable());

        var query = new GetAvailableSlotsQuery(
            TenantId        : tenantId,
            ServiceId       : Guid.NewGuid(),
            Date            : date,
            DurationMinutes : 60);

        var handler = Build();

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().NotContain(s => s.Start == blockedStart);
    }

    [Fact]
    public async Task Handle_WhenDayIsClosed_ReturnsEmptySlots()
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        var date     = DateOnly.FromDateTime(DateTime.Today.AddDays(1));

        _businessHoursRepo
            .Setup(r => r.GetByTenantAsync(tenantId, It.IsAny<bool>()))
            .ReturnsAsync(new List<TenantBusinessHours>
            {
                new() { DayOfWeek = (int)date.DayOfWeek, IsOpen = false }
            });

        _timeSlotBlockSvc
            .Setup(s => s.GetOverlappingAsync(It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>()))
            .ReturnsAsync(new List<TimeSlotBlockDto>());

        _appointmentRepo
            .Setup(r => r.Query(It.IsAny<System.Linq.Expressions.Expression<Func<Appointment, bool>>>(), It.IsAny<bool>()))
            .Returns(new List<Appointment>().AsQueryable());

        var query = new GetAvailableSlotsQuery(
            TenantId        : tenantId,
            ServiceId       : Guid.NewGuid(),
            Date            : date,
            DurationMinutes : 60);

        var handler = Build();

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().BeEmpty();
    }
}
```

- [ ] **Step 2: Rodar para confirmar que falha**

```bash
dotnet test VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj \
  --filter "GetAvailableSlotsQueryHandlerTests" --verbosity normal
```

Expected: FAIL — tipos não existem.

- [ ] **Step 3: Criar `GetAvailableSlotsQuery`**

Criar `VoroSalonCrm.Application/Features/PublicBooking/Queries/GetAvailableSlotsQuery.cs`:

```csharp
using MediatR;
using VoroSalonCrm.Application.DTOs.Public;

namespace VoroSalonCrm.Application.Features.PublicBooking.Queries;

public record GetAvailableSlotsQuery(
    Guid      TenantId,
    Guid      ServiceId,
    DateOnly  Date,
    int       DurationMinutes) : IRequest<IEnumerable<AvailableSlotDto>>;
```

- [ ] **Step 4: Criar `GetAvailableSlotsQueryHandler`**

Criar `VoroSalonCrm.Application/Features/PublicBooking/Queries/GetAvailableSlotsQueryHandler.cs`:

```csharp
using MediatR;
using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.DTOs.Public;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;

namespace VoroSalonCrm.Application.Features.PublicBooking.Queries;

public class GetAvailableSlotsQueryHandler(
    ITenantBusinessHoursRepository businessHoursRepository,
    IAppointmentRepository         appointmentRepository,
    ITimeSlotBlockService          timeSlotBlockService)
    : IRequestHandler<GetAvailableSlotsQuery, IEnumerable<AvailableSlotDto>>
{
    public async Task<IEnumerable<AvailableSlotDto>> Handle(
        GetAvailableSlotsQuery query, CancellationToken cancellationToken)
    {
        var businessHours = await businessHoursRepository.GetByTenantAsync(query.TenantId);
        var dayHours = businessHours.FirstOrDefault(h => h.DayOfWeek == (int)query.Date.DayOfWeek);

        if (dayHours is null || !dayHours.IsOpen)
            return Enumerable.Empty<AvailableSlotDto>();

        var dayStart = new DateTimeOffset(
            query.Date.Year, query.Date.Month, query.Date.Day,
            dayHours.OpenTime.Hour, dayHours.OpenTime.Minute, 0, TimeSpan.Zero);
        var dayEnd = new DateTimeOffset(
            query.Date.Year, query.Date.Month, query.Date.Day,
            dayHours.CloseTime.Hour, dayHours.CloseTime.Minute, 0, TimeSpan.Zero);

        var blocks = await timeSlotBlockService.GetOverlappingAsync(dayStart, dayEnd);

        var appointments = await appointmentRepository
            .Query(a => a.TenantId == query.TenantId
                && !a.IsDeleted
                && a.ScheduledDateTime >= dayStart
                && a.ScheduledDateTime < dayEnd
                && a.Status != AppointmentStatus.Cancelled)
            .ToListAsync(cancellationToken);

        var slots = new List<AvailableSlotDto>();
        var current = dayStart;

        while (current.AddMinutes(query.DurationMinutes) <= dayEnd)
        {
            var slotEnd = current.AddMinutes(query.DurationMinutes);

            var isBlocked = blocks.Any(b => b.Start < slotEnd && b.End > current);
            var isBooked  = appointments.Any(a =>
                a.ScheduledDateTime < slotEnd &&
                a.ScheduledDateTime.AddMinutes(a.DurationMinutes) > current);

            if (!isBlocked && !isBooked)
                slots.Add(new AvailableSlotDto(Start: current, End: slotEnd));

            current = current.AddMinutes(30); // incremento de 30 min
        }

        return slots;
    }
}
```

- [ ] **Step 5: Rodar testes para confirmar que passam**

```bash
dotnet test VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj \
  --filter "GetAvailableSlotsQueryHandlerTests" --verbosity normal
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add VoroSalonCrm.Application/Features/PublicBooking/Queries/GetAvailableSlotsQuery.cs
git add VoroSalonCrm.Application/Features/PublicBooking/Queries/GetAvailableSlotsQueryHandler.cs
git add VoroSalonCrm.Tests.Integration/PublicBooking/Queries/GetAvailableSlotsQueryHandlerTests.cs
git commit -m "feat(public-booking): criar GetAvailableSlotsQueryHandler com testes"
```

---

### Task 3: Criar CreateBookingCommandHandler

**Files:**
- Create: `VoroSalonCrm.Application/Features/PublicBooking/Commands/CreateBookingCommand.cs`
- Create: `VoroSalonCrm.Application/Features/PublicBooking/Commands/CreateBookingCommandHandler.cs`
- Create: `VoroSalonCrm.Tests.Integration/PublicBooking/Commands/CreateBookingCommandHandlerTests.cs`

- [ ] **Step 1: Criar testes falhando**

Criar `VoroSalonCrm.Tests.Integration/PublicBooking/Commands/CreateBookingCommandHandlerTests.cs`:

```csharp
using FluentAssertions;
using Moq;
using VoroSalonCrm.Application.DTOs.Public;
using VoroSalonCrm.Application.Features.PublicBooking.Commands;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Tests.Integration.PublicBooking.Commands;

public class CreateBookingCommandHandlerTests
{
    private readonly Mock<IAppointmentRepository> _appointmentRepo = new();
    private readonly Mock<ITenantRepository>      _tenantRepo      = new();
    private readonly Mock<IClientRepository>      _clientRepo      = new();
    private readonly Mock<ITimeSlotBlockService>  _timeSlotBlock   = new();
    private readonly Mock<IUnitOfWork>            _unitOfWork      = new();

    public CreateBookingCommandHandlerTests()
    {
        _unitOfWork.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(0);
        _timeSlotBlock
            .Setup(s => s.GetOverlappingAsync(It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>()))
            .ReturnsAsync(new List<TimeSlotBlockDto>());
    }

    private CreateBookingCommandHandler Build() => new(
        _appointmentRepo.Object,
        _tenantRepo.Object,
        _clientRepo.Object,
        _timeSlotBlock.Object,
        _unitOfWork.Object);

    [Fact]
    public async Task Handle_WhenTenantNotFound_ThrowsKeyNotFoundException()
    {
        // Arrange
        _tenantRepo
            .Setup(r => r.GetByIdAsync(It.IsAny<bool>(), It.IsAny<object[]>()))
            .ReturnsAsync((Tenant?)null);

        var handler = Build();
        var command = new CreateBookingCommand(new PublicBookingDto(
            TenantId        : Guid.NewGuid(),
            ServiceId       : Guid.NewGuid(),
            ClientName      : "João",
            ClientPhone     : "11999999999",
            ScheduledAt     : DateTimeOffset.UtcNow.AddDays(1),
            DurationMinutes : 60));

        // Act
        var act = () => handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task Handle_WhenSlotIsBlocked_ThrowsInvalidOperationException()
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        var tenant   = new Tenant { Id = tenantId, IsActive = true };

        _tenantRepo
            .Setup(r => r.GetByIdAsync(true, tenantId))
            .ReturnsAsync(tenant);

        var scheduledAt = DateTimeOffset.UtcNow.AddDays(1);
        _timeSlotBlock
            .Setup(s => s.GetOverlappingAsync(scheduledAt, scheduledAt.AddMinutes(60)))
            .ReturnsAsync(new List<TimeSlotBlockDto>
            {
                new(Guid.NewGuid(), tenantId, null, scheduledAt, scheduledAt.AddMinutes(60), "Bloqueado")
            });

        var handler = Build();
        var command = new CreateBookingCommand(new PublicBookingDto(
            TenantId        : tenantId,
            ServiceId       : Guid.NewGuid(),
            ClientName      : "João",
            ClientPhone     : "11999999999",
            ScheduledAt     : scheduledAt,
            DurationMinutes : 60));

        // Act
        var act = () => handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*horário*");
    }

    [Fact]
    public async Task Handle_WhenValidBooking_CreatesAppointment()
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        var tenant   = new Tenant { Id = tenantId, IsActive = true };

        _tenantRepo.Setup(r => r.GetByIdAsync(true, tenantId)).ReturnsAsync(tenant);

        _clientRepo
            .Setup(r => r.GetByIdAsync(It.IsAny<System.Linq.Expressions.Expression<Func<Client, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<Client>, IQueryable<Client>>[]>()))
            .ReturnsAsync((Client?)null); // novo cliente será criado

        _clientRepo.Setup(r => r.AddAsync(It.IsAny<Client>())).Returns(Task.CompletedTask);

        Appointment? captured = null;
        _appointmentRepo
            .Setup(r => r.AddAsync(It.IsAny<Appointment>()))
            .Callback<Appointment>(a => captured = a)
            .Returns(Task.CompletedTask);

        var handler = Build();
        var command = new CreateBookingCommand(new PublicBookingDto(
            TenantId        : tenantId,
            ServiceId       : Guid.NewGuid(),
            ClientName      : "João",
            ClientPhone     : "11999999999",
            ScheduledAt     : DateTimeOffset.UtcNow.AddDays(1),
            DurationMinutes : 60));

        // Act
        await handler.Handle(command, CancellationToken.None);

        // Assert
        captured.Should().NotBeNull();
        captured!.TenantId.Should().Be(tenantId);
        captured.Source.Should().Be(AppointmentSource.Online);
    }
}
```

- [ ] **Step 2: Rodar para confirmar que falha**

```bash
dotnet test VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj \
  --filter "CreateBookingCommandHandlerTests" --verbosity normal
```

Expected: FAIL

- [ ] **Step 3: Criar `CreateBookingCommand`**

Criar `VoroSalonCrm.Application/Features/PublicBooking/Commands/CreateBookingCommand.cs`:

```csharp
using MediatR;
using VoroSalonCrm.Application.DTOs.Public;

namespace VoroSalonCrm.Application.Features.PublicBooking.Commands;

public record CreateBookingCommand(PublicBookingDto Dto) : IRequest<Guid>;
```

- [ ] **Step 4: Criar `CreateBookingCommandHandler`**

Criar `VoroSalonCrm.Application/Features/PublicBooking/Commands/CreateBookingCommandHandler.cs`:

```csharp
using MediatR;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Features.PublicBooking.Commands;

public class CreateBookingCommandHandler(
    IAppointmentRepository appointmentRepository,
    ITenantRepository      tenantRepository,
    IClientRepository      clientRepository,
    ITimeSlotBlockService  timeSlotBlockService,
    IUnitOfWork            unitOfWork)
    : IRequestHandler<CreateBookingCommand, Guid>
{
    public async Task<Guid> Handle(CreateBookingCommand request, CancellationToken cancellationToken)
    {
        var dto = request.Dto;

        var tenant = await tenantRepository.GetByIdAsync(true, dto.TenantId)
            ?? throw new KeyNotFoundException($"Estabelecimento '{dto.TenantId}' não encontrado.");

        var slotEnd = dto.ScheduledAt.AddMinutes(dto.DurationMinutes);
        var blocks  = await timeSlotBlockService.GetOverlappingAsync(dto.ScheduledAt, slotEnd);

        if (blocks.Any())
            throw new InvalidOperationException("Este horário está bloqueado para agendamentos.");

        // Encontrar ou criar cliente pelo telefone
        var client = await clientRepository.GetByIdAsync(
            c => c.TenantId == dto.TenantId && c.Phone == dto.ClientPhone, asNoTracking: false);

        if (client is null)
        {
            client = new Client
            {
                Id        = Guid.NewGuid(),
                TenantId  = dto.TenantId,
                Name      = dto.ClientName,
                Phone     = dto.ClientPhone,
                CreatedAt = DateTimeOffset.UtcNow
            };
            await clientRepository.AddAsync(client);
        }

        var appointment = new Appointment
        {
            Id                = Guid.NewGuid(),
            TenantId          = dto.TenantId,
            ClientId          = client.Id,
            ServiceId         = dto.ServiceId,
            ScheduledDateTime = dto.ScheduledAt,
            DurationMinutes   = dto.DurationMinutes,
            Status            = AppointmentStatus.Pending,
            Source            = AppointmentSource.Online,
            CreatedAt         = DateTimeOffset.UtcNow
        };

        await appointmentRepository.AddAsync(appointment);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return appointment.Id;
    }
}
```

- [ ] **Step 5: Rodar testes para confirmar que passam**

```bash
dotnet test VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj \
  --filter "CreateBookingCommandHandlerTests" --verbosity normal
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add VoroSalonCrm.Application/Features/PublicBooking/Commands/CreateBookingCommand.cs
git add VoroSalonCrm.Application/Features/PublicBooking/Commands/CreateBookingCommandHandler.cs
git add VoroSalonCrm.Tests.Integration/PublicBooking/Commands/CreateBookingCommandHandlerTests.cs
git commit -m "feat(public-booking): criar CreateBookingCommandHandler com testes"
```

---

### Task 4: Criar handlers restantes e converter PublicBookingService em façade

**Files:**
- Create: `VoroSalonCrm.Application/Features/PublicBooking/Queries/GetBookingFunnelQuery.cs`
- Create: `VoroSalonCrm.Application/Features/PublicBooking/Queries/GetBookingFunnelQueryHandler.cs`
- Create: `VoroSalonCrm.Application/Features/PublicBooking/Commands/UpdateFunnelSessionCommand.cs`
- Create: `VoroSalonCrm.Application/Features/PublicBooking/Commands/UpdateFunnelSessionCommandHandler.cs`
- Modify: `VoroSalonCrm.Application/Services/PublicBookingService.cs`

- [ ] **Step 1: Criar `GetBookingFunnelQuery` e handler**

Criar `VoroSalonCrm.Application/Features/PublicBooking/Queries/GetBookingFunnelQuery.cs`:
```csharp
using MediatR;
using VoroSalonCrm.Application.DTOs.Public;

namespace VoroSalonCrm.Application.Features.PublicBooking.Queries;

public record GetBookingFunnelQuery(Guid TenantId) : IRequest<BookingFunnelDto?>;
```

Criar `VoroSalonCrm.Application/Features/PublicBooking/Queries/GetBookingFunnelQueryHandler.cs`:
```csharp
using MediatR;
using VoroSalonCrm.Application.DTOs.Public;
using VoroSalonCrm.Domain.Interfaces.Repositories;

namespace VoroSalonCrm.Application.Features.PublicBooking.Queries;

public class GetBookingFunnelQueryHandler(ITenantRepository tenantRepository)
    : IRequestHandler<GetBookingFunnelQuery, BookingFunnelDto?>
{
    public async Task<BookingFunnelDto?> Handle(GetBookingFunnelQuery request, CancellationToken cancellationToken)
    {
        var tenant = await tenantRepository.GetByIdAsync(true, request.TenantId);
        if (tenant is null) return null;

        return new BookingFunnelDto(
            TenantId    : tenant.Id,
            TenantName  : tenant.Name,
            LogoUrl     : tenant.LogoUrl,
            IsActive    : tenant.IsActive);
    }
}
```

- [ ] **Step 2: Criar `UpdateFunnelSessionCommand` e handler**

Criar `VoroSalonCrm.Application/Features/PublicBooking/Commands/UpdateFunnelSessionCommand.cs`:
```csharp
using MediatR;
using VoroSalonCrm.Application.DTOs.Public;

namespace VoroSalonCrm.Application.Features.PublicBooking.Commands;

public record UpdateFunnelSessionCommand(Guid SessionId, UpdateFunnelSessionDto Dto) : IRequest;
```

Criar `VoroSalonCrm.Application/Features/PublicBooking/Commands/UpdateFunnelSessionCommandHandler.cs`:
```csharp
using MediatR;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Features.PublicBooking.Commands;

public class UpdateFunnelSessionCommandHandler(
    IBookingFunnelSessionRepository sessionRepository,
    IUnitOfWork                     unitOfWork)
    : IRequestHandler<UpdateFunnelSessionCommand>
{
    public async Task Handle(UpdateFunnelSessionCommand request, CancellationToken cancellationToken)
    {
        var session = await sessionRepository.GetByIdAsync(false, request.SessionId)
            ?? throw new KeyNotFoundException($"Sessão '{request.SessionId}' não encontrada.");

        session.CurrentStep = request.Dto.CurrentStep;
        session.UpdatedAt   = DateTimeOffset.UtcNow;

        sessionRepository.Update(session);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
```

- [ ] **Step 3: Converter PublicBookingService em façade**

Adicionar `IMediator mediator` ao constructor do `PublicBookingService` e substituir os métodos principais:

```csharp
public async Task<IEnumerable<AvailableSlotDto>> GetAvailableSlotsAsync(
    Guid tenantId, Guid serviceId, DateOnly date, int durationMinutes)
    => await _mediator.Send(new GetAvailableSlotsQuery(tenantId, serviceId, date, durationMinutes));

public async Task<Guid> CreateBookingAsync(PublicBookingDto dto)
    => await _mediator.Send(new CreateBookingCommand(dto));

public async Task<BookingFunnelDto?> GetFunnelAsync(Guid tenantId)
    => await _mediator.Send(new GetBookingFunnelQuery(tenantId));
```

Adicionar usings:
```csharp
using MediatR;
using VoroSalonCrm.Application.Features.PublicBooking.Commands;
using VoroSalonCrm.Application.Features.PublicBooking.Queries;
```

- [ ] **Step 4: Build e testes**

```bash
dotnet build VoroSalonCrm.API/VoroSalonCrm.API.csproj
dotnet test VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj --verbosity minimal
```

Expected: build OK, todos os testes passam.

- [ ] **Step 5: Commit**

```bash
git add VoroSalonCrm.Application/Features/PublicBooking/
git add VoroSalonCrm.Application/Services/PublicBookingService.cs
git commit -m "refactor(public-booking): converter PublicBookingService em façade MediatR + handlers"
```

---

### Task 5: Abrir PR para `improvement/api-refactor`

- [ ] **Step 1: Push**

```bash
git push -u origin refactor/public-booking
```

- [ ] **Step 2: Criar PR**

```bash
gh pr create \
  --base improvement/api-refactor \
  --title "refactor(public-booking): extrair handlers MediatR + testes" \
  --body "$(cat <<'EOF'
## O que muda
- `GetAvailableSlotsQueryHandler` com testes: sem horário comercial, slot bloqueado, dia fechado
- `CreateBookingCommandHandler` com testes: tenant not found, slot bloqueado, booking criado
- Handlers sem testes (baixo risco): GetBookingFunnel, UpdateFunnelSession
- `PublicBookingService` convertido em façade

## Impacto
- Nenhum Controller alterado — zero breaking changes
- Todos os testes existentes passam

## Como testar
dotnet test --filter "GetAvailableSlotsQueryHandlerTests|CreateBookingCommandHandlerTests"
EOF
)"
```

---

## PR Final: `improvement/api-refactor` → `dev`

Após todos os PRs (#1–#5) mergeados em `improvement/api-refactor`:

- [ ] **Step 1: Rodar toda a suite de testes na branch central**

```bash
git checkout improvement/api-refactor
git pull origin improvement/api-refactor
dotnet test VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj --verbosity normal
```

Expected: todos os testes passam.

- [ ] **Step 2: Criar PR final**

```bash
gh pr create \
  --base dev \
  --title "refactor(api): extrair handlers MediatR + aumentar cobertura de testes" \
  --body "$(cat <<'EOF'
## Resumo

Refatoração de 4 services God Object usando MediatR, adicionando cobertura de testes e corrigindo o ExceptionHandlingMiddleware.

## O que muda

### Infraestrutura
- MediatR 12.4.1 adicionado
- `ExceptionHandlingMiddleware` retorna `ResponseViewModel` em português

### AppointmentService (915 → façade)
- `CreateAppointmentCommandHandler` — criação + validação de tenant
- `UpdateAppointmentStatusCommandHandler` — status + publish de notificação
- `AppointmentCompletedNotification` + 3 handlers de efeito colateral (comissão, receita, histórico)

### AuthService (698 → façade)
- `SignInCommandHandler` — login + 2FA + validação de estabelecimento
- `VerifyTwoFactorCommandHandler` — validação de código + geração de JWT
- `RefreshToken`, `SignUp`, `ForgotPassword`, `ResetPassword` handlers

### SubscriptionService (692 → façade, zero testes → coberto)
- `CreateSubscriptionCommandHandler` — ativação + validação de cupom
- `CancelSubscriptionCommandHandler` — cancelamento
- `ChangePlan`, `GetSubscription`, `ProcessWebhook` handlers

### PublicBookingService (577 → façade, zero testes → coberto)
- `GetAvailableSlotsQueryHandler` — slots com horário comercial + bloqueios
- `CreateBookingCommandHandler` — agendamento público + validações
- `GetBookingFunnel`, `UpdateFunnelSession` handlers

## Impacto
- Nenhum Controller alterado — zero breaking changes nas interfaces públicas
- Todos os testes passam

## Como testar
dotnet test VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj
EOF
)"
```

---

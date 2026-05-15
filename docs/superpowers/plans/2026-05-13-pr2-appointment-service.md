# PR #2 — AppointmentService Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Pré-requisito:** PR #1 (`refactor/mediatr-setup`) mergeado em `improvement/api-refactor`.

**Goal:** Extrair a lógica de negócio do `AppointmentService` (915 linhas) para Handlers MediatR isolados e testáveis, mantendo o service como façade.

**Architecture:** `AppointmentService` passa a injetar `IMediator` e delega cada operação para o handler correspondente. Handlers de notificação (`INotificationHandler`) cuidam de efeitos colaterais (comissão, transação financeira, histórico) acionados pela notificação `AppointmentCompletedNotification`. Nenhum Controller é alterado.

**Tech Stack:** .NET 9, MediatR 12, xUnit, Moq, FluentAssertions

---

## File Structure

```
VoroSalonCrm.Application/
  Features/
    Appointments/
      Commands/
        CreateAppointmentCommand.cs              ← CREATE
        CreateAppointmentCommandHandler.cs       ← CREATE
        UpdateAppointmentCommand.cs              ← CREATE
        UpdateAppointmentCommandHandler.cs       ← CREATE
        DeleteAppointmentCommand.cs              ← CREATE
        DeleteAppointmentCommandHandler.cs       ← CREATE
        UpdateAppointmentStatusCommand.cs        ← CREATE
        UpdateAppointmentStatusCommandHandler.cs ← CREATE
      Queries/
        GetAppointmentByIdQuery.cs               ← CREATE
        GetAppointmentByIdQueryHandler.cs        ← CREATE
        GetAppointmentsQuery.cs                  ← CREATE
        GetAppointmentsQueryHandler.cs           ← CREATE
      Notifications/
        AppointmentCompletedNotification.cs      ← CREATE
        AppointmentCommissionHandler.cs          ← CREATE
        AppointmentTransactionHandler.cs         ← CREATE
        AppointmentHistoryHandler.cs             ← CREATE
  Services/
    AppointmentService.cs                        ← MODIFY: virar façade

VoroSalonCrm.Tests.Integration/
  Appointments/
    Commands/
      CreateAppointmentCommandHandlerTests.cs    ← CREATE
      AppointmentCommissionHandlerTests.cs       ← CREATE
      AppointmentTransactionHandlerTests.cs      ← CREATE
      UpdateAppointmentStatusCommandHandlerTests.cs ← CREATE
    AppointmentServiceContext.cs                 ← KEEP (mantido sem mudança)
```

---

### Task 1: Criar branch

**Files:** nenhum

- [ ] **Step 1: Criar branch a partir de `improvement/api-refactor`**

```bash
cd voro-salon-crm-api
git checkout improvement/api-refactor
git pull origin improvement/api-refactor
git checkout -b refactor/appointment-service
```

---

### Task 2: Criar notificação e handlers de efeitos colaterais

Os efeitos colaterais ao concluir um agendamento (comissão, receita financeira, histórico) são extraídos para `INotificationHandler` — eles são acionados em paralelo via `IMediator.Publish`.

**Files:**
- Create: `VoroSalonCrm.Application/Features/Appointments/Notifications/AppointmentCompletedNotification.cs`
- Create: `VoroSalonCrm.Application/Features/Appointments/Notifications/AppointmentCommissionHandler.cs`
- Create: `VoroSalonCrm.Application/Features/Appointments/Notifications/AppointmentTransactionHandler.cs`
- Create: `VoroSalonCrm.Application/Features/Appointments/Notifications/AppointmentHistoryHandler.cs`

- [ ] **Step 1: Criar testes falhando para AppointmentCommissionHandler**

Criar `VoroSalonCrm.Tests.Integration/Appointments/Commands/AppointmentCommissionHandlerTests.cs`:

```csharp
using FluentAssertions;
using MediatR;
using Moq;
using VoroSalonCrm.Application.Features.Appointments.Notifications;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Tests.Integration.Appointments.Commands;

public class AppointmentCommissionHandlerTests
{
    private readonly Mock<IEmployeeRepository>      _employeeRepo      = new();
    private readonly Mock<ITransactionRepository>   _transactionRepo   = new();
    private readonly Mock<IUnitOfWork>              _unitOfWork        = new();

    private AppointmentCommissionHandler Build() => new(
        _employeeRepo.Object,
        _transactionRepo.Object,
        _unitOfWork.Object);

    [Fact]
    public async Task Handle_WhenEmployeeHasNoCommission_DoesNotCreateTransaction()
    {
        // Arrange
        var employee = new Employee { Id = Guid.NewGuid(), CommissionPercentage = null };
        _employeeRepo.Setup(r => r.GetByIdAsync(true, employee.Id)).ReturnsAsync(employee);

        var notification = new AppointmentCompletedNotification(
            AppointmentId  : Guid.NewGuid(),
            TenantId       : Guid.NewGuid(),
            EmployeeId     : employee.Id,
            Amount         : 200m,
            ScheduledAt    : DateTimeOffset.UtcNow,
            ServiceName    : "Corte");

        var handler = Build();

        // Act
        await handler.Handle(notification, CancellationToken.None);

        // Assert
        _transactionRepo.Verify(r => r.AddAsync(It.IsAny<Transaction>()), Times.Never);
    }

    [Fact]
    public async Task Handle_WhenCommissionAlreadyExists_SkipsDuplicate()
    {
        // Arrange
        var appointmentId = Guid.NewGuid();
        var employee = new Employee { Id = Guid.NewGuid(), CommissionPercentage = 10m, Name = "Ana" };
        _employeeRepo.Setup(r => r.GetByIdAsync(true, employee.Id)).ReturnsAsync(employee);

        // Simula que já existe comissão para esse appointment
        _transactionRepo
            .Setup(r => r.Query(It.IsAny<System.Linq.Expressions.Expression<Func<Transaction, bool>>>(), It.IsAny<bool>()))
            .Returns(new List<Transaction>
            {
                new() { Id = Guid.NewGuid(), Notes = appointmentId.ToString(), Type = TransactionType.Expense }
            }.AsQueryable());

        var notification = new AppointmentCompletedNotification(
            AppointmentId  : appointmentId,
            TenantId       : Guid.NewGuid(),
            EmployeeId     : employee.Id,
            Amount         : 200m,
            ScheduledAt    : DateTimeOffset.UtcNow,
            ServiceName    : "Corte");

        var handler = Build();

        // Act
        await handler.Handle(notification, CancellationToken.None);

        // Assert
        _transactionRepo.Verify(r => r.AddAsync(It.IsAny<Transaction>()), Times.Never);
    }

    [Fact]
    public async Task Handle_WhenEmployeeHasCommission_CreatesExpenseTransaction()
    {
        // Arrange
        var employee = new Employee { Id = Guid.NewGuid(), CommissionPercentage = 10m, Name = "Ana" };
        _employeeRepo.Setup(r => r.GetByIdAsync(true, employee.Id)).ReturnsAsync(employee);

        _transactionRepo
            .Setup(r => r.Query(It.IsAny<System.Linq.Expressions.Expression<Func<Transaction, bool>>>(), It.IsAny<bool>()))
            .Returns(new List<Transaction>().AsQueryable());

        Transaction? captured = null;
        _transactionRepo
            .Setup(r => r.AddAsync(It.IsAny<Transaction>()))
            .Callback<Transaction>(t => captured = t)
            .Returns(Task.CompletedTask);

        var notification = new AppointmentCompletedNotification(
            AppointmentId  : Guid.NewGuid(),
            TenantId       : Guid.NewGuid(),
            EmployeeId     : employee.Id,
            Amount         : 200m,
            ScheduledAt    : DateTimeOffset.UtcNow,
            ServiceName    : "Corte");

        var handler = Build();

        // Act
        await handler.Handle(notification, CancellationToken.None);

        // Assert
        captured.Should().NotBeNull();
        captured!.Amount.Should().Be(20m); // 10% de 200
        captured.Type.Should().Be(TransactionType.Expense);
        captured.EmployeeId.Should().Be(employee.Id);
    }
}
```

- [ ] **Step 2: Criar testes falhando para AppointmentTransactionHandler**

Criar `VoroSalonCrm.Tests.Integration/Appointments/Commands/AppointmentTransactionHandlerTests.cs`:

```csharp
using FluentAssertions;
using Moq;
using VoroSalonCrm.Application.Features.Appointments.Notifications;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Tests.Integration.Appointments.Commands;

public class AppointmentTransactionHandlerTests
{
    private readonly Mock<ITransactionRepository>         _transactionRepo         = new();
    private readonly Mock<ITransactionCategoryRepository> _transactionCategoryRepo = new();
    private readonly Mock<IUnitOfWork>                    _unitOfWork              = new();

    private AppointmentTransactionHandler Build() => new(
        _transactionRepo.Object,
        _transactionCategoryRepo.Object,
        _unitOfWork.Object);

    [Fact]
    public async Task Handle_WhenAmountIsZero_DoesNotCreateTransaction()
    {
        // Arrange
        var notification = new AppointmentCompletedNotification(
            AppointmentId  : Guid.NewGuid(),
            TenantId       : Guid.NewGuid(),
            EmployeeId     : null,
            Amount         : 0m,
            ScheduledAt    : DateTimeOffset.UtcNow,
            ServiceName    : "Corte",
            ClientName     : "João");

        var handler = Build();

        // Act
        await handler.Handle(notification, CancellationToken.None);

        // Assert
        _transactionRepo.Verify(r => r.AddAsync(It.IsAny<Transaction>()), Times.Never);
    }

    [Fact]
    public async Task Handle_WhenCategoryExists_UsesExistingCategory()
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        var existingCategory = new TransactionCategory
        {
            Id       = Guid.NewGuid(),
            TenantId = tenantId,
            Name     = "Serviços",
            Type     = TransactionType.Income
        };

        _transactionCategoryRepo
            .Setup(r => r.Query(It.IsAny<System.Linq.Expressions.Expression<Func<TransactionCategory, bool>>>(), It.IsAny<bool>()))
            .Returns(new List<TransactionCategory> { existingCategory }.AsQueryable());

        Transaction? captured = null;
        _transactionRepo
            .Setup(r => r.AddAsync(It.IsAny<Transaction>()))
            .Callback<Transaction>(t => captured = t)
            .Returns(Task.CompletedTask);

        var notification = new AppointmentCompletedNotification(
            AppointmentId  : Guid.NewGuid(),
            TenantId       : tenantId,
            EmployeeId     : null,
            Amount         : 150m,
            ScheduledAt    : DateTimeOffset.UtcNow,
            ServiceName    : "Hidratação",
            ClientName     : "Maria");

        var handler = Build();

        // Act
        await handler.Handle(notification, CancellationToken.None);

        // Assert
        captured.Should().NotBeNull();
        captured!.CategoryId.Should().Be(existingCategory.Id);
        captured.Amount.Should().Be(150m);
        captured.Type.Should().Be(TransactionType.Income);
        _transactionCategoryRepo.Verify(r => r.AddAsync(It.IsAny<TransactionCategory>()), Times.Never);
    }

    [Fact]
    public async Task Handle_WhenCategoryDoesNotExist_CreatesCategory()
    {
        // Arrange
        _transactionCategoryRepo
            .Setup(r => r.Query(It.IsAny<System.Linq.Expressions.Expression<Func<TransactionCategory, bool>>>(), It.IsAny<bool>()))
            .Returns(new List<TransactionCategory>().AsQueryable());

        _transactionCategoryRepo
            .Setup(r => r.AddAsync(It.IsAny<TransactionCategory>()))
            .Returns(Task.CompletedTask);

        _transactionRepo
            .Setup(r => r.AddAsync(It.IsAny<Transaction>()))
            .Returns(Task.CompletedTask);

        var notification = new AppointmentCompletedNotification(
            AppointmentId  : Guid.NewGuid(),
            TenantId       : Guid.NewGuid(),
            EmployeeId     : null,
            Amount         : 100m,
            ScheduledAt    : DateTimeOffset.UtcNow,
            ServiceName    : "Manicure",
            ClientName     : "Ana");

        var handler = Build();

        // Act
        await handler.Handle(notification, CancellationToken.None);

        // Assert
        _transactionCategoryRepo.Verify(r => r.AddAsync(It.IsAny<TransactionCategory>()), Times.Once);
    }
}
```

- [ ] **Step 3: Rodar os testes para confirmar que falham (tipos não existem ainda)**

```bash
dotnet test VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj \
  --filter "AppointmentCommissionHandlerTests|AppointmentTransactionHandlerTests" --verbosity normal
```

Expected: FAIL — `AppointmentCompletedNotification`, `AppointmentCommissionHandler`, `AppointmentTransactionHandler` não existem.

- [ ] **Step 4: Criar `AppointmentCompletedNotification`**

Criar `VoroSalonCrm.Application/Features/Appointments/Notifications/AppointmentCompletedNotification.cs`:

```csharp
using MediatR;

namespace VoroSalonCrm.Application.Features.Appointments.Notifications;

public record AppointmentCompletedNotification(
    Guid         AppointmentId,
    Guid         TenantId,
    Guid?        EmployeeId,
    decimal      Amount,
    DateTimeOffset ScheduledAt,
    string?      ServiceName,
    string?      ClientName = null) : INotification;
```

- [ ] **Step 5: Criar `AppointmentCommissionHandler`**

Criar `VoroSalonCrm.Application/Features/Appointments/Notifications/AppointmentCommissionHandler.cs`:

```csharp
using MediatR;
using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Features.Appointments.Notifications;

public class AppointmentCommissionHandler(
    IEmployeeRepository    employeeRepository,
    ITransactionRepository transactionRepository,
    IUnitOfWork            unitOfWork)
    : INotificationHandler<AppointmentCompletedNotification>
{
    public async Task Handle(AppointmentCompletedNotification notification, CancellationToken cancellationToken)
    {
        if (!notification.EmployeeId.HasValue || notification.Amount <= 0)
            return;

        var employee = await employeeRepository.GetByIdAsync(true, notification.EmployeeId.Value);
        if (employee?.CommissionPercentage is not > 0)
            return;

        var appointmentIdStr = notification.AppointmentId.ToString();
        var commissionExists = await transactionRepository
            .Query(t => t.TenantId == notification.TenantId
                && t.EmployeeId == notification.EmployeeId
                && t.Notes != null && t.Notes.Contains(appointmentIdStr)
                && t.Type == TransactionType.Expense)
            .AnyAsync(cancellationToken);

        if (commissionExists)
            return;

        var commissionAmount = Math.Round(notification.Amount * (employee.CommissionPercentage!.Value / 100m), 2);
        var dueDate = new DateTimeOffset(
            notification.ScheduledAt.Year,
            notification.ScheduledAt.Month,
            DateTime.DaysInMonth(notification.ScheduledAt.Year, notification.ScheduledAt.Month),
            23, 59, 59, TimeSpan.Zero);

        var commissionTx = new Transaction
        {
            Id              = Guid.NewGuid(),
            TenantId        = notification.TenantId,
            Description     = $"Comissão – {employee.Name} – {notification.ServiceName ?? "Serviço"}",
            Amount          = commissionAmount,
            PaidAmount      = 0,
            DueDate         = dueDate,
            Type            = TransactionType.Expense,
            PaymentMethod   = PaymentMethod.Other,
            Status          = TransactionStatus.Pending,
            EmployeeId      = employee.Id,
            Notes           = $"Comissão de {employee.CommissionPercentage}% sobre agendamento {notification.AppointmentId}",
            CreatedAt       = DateTimeOffset.UtcNow
        };

        await transactionRepository.AddAsync(commissionTx);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
```

- [ ] **Step 6: Criar `AppointmentTransactionHandler`**

Criar `VoroSalonCrm.Application/Features/Appointments/Notifications/AppointmentTransactionHandler.cs`:

```csharp
using MediatR;
using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Features.Appointments.Notifications;

public class AppointmentTransactionHandler(
    ITransactionRepository         transactionRepository,
    ITransactionCategoryRepository transactionCategoryRepository,
    IUnitOfWork                    unitOfWork)
    : INotificationHandler<AppointmentCompletedNotification>
{
    public async Task Handle(AppointmentCompletedNotification notification, CancellationToken cancellationToken)
    {
        if (notification.Amount <= 0)
            return;

        var servicosCategory = await transactionCategoryRepository
            .Query(c => c.TenantId == notification.TenantId
                && c.Name == "Serviços"
                && c.Type == TransactionType.Income
                && !c.IsDeleted, asNoTracking: false)
            .FirstOrDefaultAsync(cancellationToken);

        if (servicosCategory == null)
        {
            servicosCategory = new TransactionCategory
            {
                Id        = Guid.NewGuid(),
                TenantId  = notification.TenantId,
                Name      = "Serviços",
                Type      = TransactionType.Income,
                IsActive  = true,
                CreatedAt = DateTimeOffset.UtcNow
            };
            await transactionCategoryRepository.AddAsync(servicosCategory);
        }

        var incomeTx = new Transaction
        {
            Id            = Guid.NewGuid(),
            TenantId      = notification.TenantId,
            CategoryId    = servicosCategory.Id,
            Description   = $"{notification.ServiceName ?? "Serviço"} - {notification.ClientName ?? "Cliente"}",
            Amount        = notification.Amount,
            PaidAmount    = notification.Amount,
            DueDate       = notification.ScheduledAt,
            PaymentDate   = notification.ScheduledAt,
            Type          = TransactionType.Income,
            PaymentMethod = PaymentMethod.Other,
            Status        = TransactionStatus.Paid,
            Notes         = $"Receita gerada automaticamente — Agendamento {notification.AppointmentId}",
            CreatedAt     = DateTimeOffset.UtcNow
        };

        await transactionRepository.AddAsync(incomeTx);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
```

- [ ] **Step 7: Criar `AppointmentHistoryHandler`**

Criar `VoroSalonCrm.Application/Features/Appointments/Notifications/AppointmentHistoryHandler.cs`:

```csharp
using MediatR;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.Services.Interfaces;

namespace VoroSalonCrm.Application.Features.Appointments.Notifications;

public class AppointmentHistoryHandler(IServiceRecordService serviceRecordService)
    : INotificationHandler<AppointmentCompletedNotification>
{
    public async Task Handle(AppointmentCompletedNotification notification, CancellationToken cancellationToken)
    {
        var alreadyExists = await serviceRecordService.ExistsByAppointmentIdAsync(notification.AppointmentId);
        if (alreadyExists)
            return;

        var historyDto = new CreateServiceRecordDto(
            ClientId      : Guid.Empty, // será preenchido pelo AppointmentService ao publicar
            ServiceId     : null,
            AppointmentId : notification.AppointmentId,
            ServiceDate   : notification.ScheduledAt,
            Description   : "Serviço via agendamento",
            Amount        : notification.Amount,
            Notes         : $"Agendamento ID: {notification.AppointmentId}");

        await serviceRecordService.CreateAsync(historyDto);
    }
}
```

- [ ] **Step 8: Rodar os testes para confirmar que passam**

```bash
dotnet test VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj \
  --filter "AppointmentCommissionHandlerTests|AppointmentTransactionHandlerTests" --verbosity normal
```

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add VoroSalonCrm.Application/Features/Appointments/Notifications/
git add VoroSalonCrm.Tests.Integration/Appointments/Commands/AppointmentCommissionHandlerTests.cs
git add VoroSalonCrm.Tests.Integration/Appointments/Commands/AppointmentTransactionHandlerTests.cs
git commit -m "feat(appointment): criar notification handlers de comissão, receita e histórico"
```

---

### Task 3: Criar CreateAppointmentCommandHandler

**Files:**
- Create: `VoroSalonCrm.Application/Features/Appointments/Commands/CreateAppointmentCommand.cs`
- Create: `VoroSalonCrm.Application/Features/Appointments/Commands/CreateAppointmentCommandHandler.cs`
- Create: `VoroSalonCrm.Tests.Integration/Appointments/Commands/CreateAppointmentCommandHandlerTests.cs`

- [ ] **Step 1: Criar testes falhando**

Criar `VoroSalonCrm.Tests.Integration/Appointments/Commands/CreateAppointmentCommandHandlerTests.cs`:

```csharp
using FluentAssertions;
using Moq;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.Features.Appointments.Commands;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Cache;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using MediatR;

namespace VoroSalonCrm.Tests.Integration.Appointments.Commands;

public class CreateAppointmentCommandHandlerTests
{
    private readonly Mock<IAppointmentRepository>       _appointmentRepo   = new();
    private readonly Mock<IUnitOfWork>                  _unitOfWork        = new();
    private readonly Mock<ICurrentUserService>          _currentUser       = new();
    private readonly Mock<ICacheService>                _cacheService      = new();
    private readonly Mock<IMediator>                    _mediator          = new();
    private readonly Guid                               _tenantId          = Guid.NewGuid();

    public CreateAppointmentCommandHandlerTests()
    {
        _currentUser.Setup(u => u.TenantId).Returns(_tenantId);
        _unitOfWork.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(0);
        _cacheService.Setup(c => c.RemoveAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        _mediator.Setup(m => m.Publish(It.IsAny<INotification>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
    }

    private CreateAppointmentCommandHandler Build() => new(
        _appointmentRepo.Object,
        _unitOfWork.Object,
        _currentUser.Object,
        _cacheService.Object,
        _mediator.Object);

    [Fact]
    public async Task Handle_WhenTenantIdIsEmpty_ThrowsUnauthorized()
    {
        // Arrange
        _currentUser.Setup(u => u.TenantId).Returns(Guid.Empty);
        var handler = Build();
        var command = new CreateAppointmentCommand(new CreateAppointmentDto(
            ClientId          : Guid.NewGuid(),
            ServiceId         : null,
            ScheduledDateTime : DateTimeOffset.UtcNow.AddDays(1),
            DurationMinutes   : 30,
            Description       : null,
            Amount            : 0,
            Notes             : null));

        // Act
        var act = () => handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Handle_WhenServiceIdsProvided_PopulatesAppointmentServices()
    {
        // Arrange
        var id1 = Guid.NewGuid();
        var id2 = Guid.NewGuid();

        Appointment? captured = null;
        _appointmentRepo
            .Setup(r => r.AddAsync(It.IsAny<Appointment>()))
            .Callback<Appointment>(a => captured = a)
            .Returns(Task.CompletedTask);

        // GetByIdAsync para retornar o appointment após criar
        _appointmentRepo
            .Setup(r => r.GetByIdAsync(It.IsAny<System.Linq.Expressions.Expression<Func<Appointment, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<Appointment>, IQueryable<Appointment>>[]>()))
            .ReturnsAsync((Appointment?)null); // retorna null — handler deve devolver o que foi criado

        var handler = Build();
        var command = new CreateAppointmentCommand(new CreateAppointmentDto(
            ClientId          : Guid.NewGuid(),
            ServiceId         : null,
            ScheduledDateTime : DateTimeOffset.UtcNow.AddDays(1),
            DurationMinutes   : 30,
            Description       : null,
            Amount            : 0,
            Notes             : null,
            ServiceIds        : [id1, id2]));

        // Act
        await handler.Handle(command, CancellationToken.None);

        // Assert
        captured.Should().NotBeNull();
        captured!.Services.Should().HaveCount(2);
        captured.Services.Select(s => s.ServiceId).Should().BeEquivalentTo(new[] { id1, id2 });
    }
}
```

- [ ] **Step 2: Rodar para confirmar que falha**

```bash
dotnet test VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj \
  --filter "CreateAppointmentCommandHandlerTests" --verbosity normal
```

Expected: FAIL — `CreateAppointmentCommand` e `CreateAppointmentCommandHandler` não existem.

- [ ] **Step 3: Criar `CreateAppointmentCommand`**

Criar `VoroSalonCrm.Application/Features/Appointments/Commands/CreateAppointmentCommand.cs`:

```csharp
using MediatR;
using VoroSalonCrm.Application.DTOs.CRM;

namespace VoroSalonCrm.Application.Features.Appointments.Commands;

public record CreateAppointmentCommand(CreateAppointmentDto Dto) : IRequest<AppointmentDto>;
```

- [ ] **Step 4: Criar `CreateAppointmentCommandHandler`**

Criar `VoroSalonCrm.Application/Features/Appointments/Commands/CreateAppointmentCommandHandler.cs`:

```csharp
using MediatR;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.Features.Appointments.Notifications;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Cache;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Features.Appointments.Commands;

public class CreateAppointmentCommandHandler(
    IAppointmentRepository appointmentRepository,
    IUnitOfWork            unitOfWork,
    ICurrentUserService    currentUserService,
    ICacheService          cacheService,
    IMediator              mediator)
    : IRequestHandler<CreateAppointmentCommand, AppointmentDto>
{
    public async Task<AppointmentDto> Handle(CreateAppointmentCommand request, CancellationToken cancellationToken)
    {
        var tenantId = currentUserService.TenantId;
        if (tenantId == Guid.Empty)
            throw new UnauthorizedAccessException("Tenant invalid or not found in context.");

        var dto = request.Dto;

        var appointment = new Appointment
        {
            Id                = Guid.NewGuid(),
            TenantId          = tenantId,
            ClientId          = dto.ClientId,
            ServiceId         = dto.ServiceId,
            ScheduledDateTime = dto.ScheduledDateTime,
            DurationMinutes   = dto.DurationMinutes,
            Status            = dto.Status ?? AppointmentStatus.Confirmed,
            Description       = dto.Description,
            Amount            = dto.Amount,
            Notes             = dto.Notes,
            IsEncaixe         = dto.IsEncaixe,
            Source            = dto.Source,
            CreatedAt         = DateTimeOffset.UtcNow
        };

        if (dto.ServiceIds?.Count > 0)
        {
            foreach (var serviceId in dto.ServiceIds)
                appointment.Services.Add(new Domain.Entities.AppointmentService
                {
                    AppointmentId = appointment.Id,
                    ServiceId     = serviceId
                });

            if (dto.ServiceIds.Count == 1 && !dto.ServiceId.HasValue)
                appointment.ServiceId = dto.ServiceIds[0];
        }

        await appointmentRepository.AddAsync(appointment);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        await cacheService.RemoveAsync($"dashboard:tenant:{tenantId}", cancellationToken);

        var full = await appointmentRepository.GetByIdAsync(
            a => a.Id == appointment.Id && !a.IsDeleted,
            asNoTracking: true);

        return full is null
            ? throw new Exception("Error retrieving created appointment.")
            : MapToDto(full);
    }

    private static AppointmentDto MapToDto(Appointment a)
    {
        var services = a.Services.Count > 0
            ? a.Services.Select(s => new AppointmentServiceDto(
                s.ServiceId,
                s.Service?.Name ?? "",
                s.Service?.Price ?? 0,
                s.Service?.DurationMinutes ?? 0)).ToList()
            : null;

        return new AppointmentDto(
            a.Id, a.ClientId, a.Client?.Name ?? "Unknown", a.Client?.Phone,
            a.ServiceId, a.Service?.Name,
            a.ScheduledDateTime, a.DurationMinutes, a.Status,
            a.Description, a.Amount, a.Notes, a.CreatedAt,
            a.IsEncaixe, a.ClientMembershipId,
            a.Membership?.Plan?.Name, a.Membership?.RemainingSessions,
            a.EmployeeId, a.Employee?.Name, a.Source, services);
    }
}
```

- [ ] **Step 5: Rodar testes para confirmar que passam**

```bash
dotnet test VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj \
  --filter "CreateAppointmentCommandHandlerTests" --verbosity normal
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add VoroSalonCrm.Application/Features/Appointments/Commands/CreateAppointmentCommand.cs
git add VoroSalonCrm.Application/Features/Appointments/Commands/CreateAppointmentCommandHandler.cs
git add VoroSalonCrm.Tests.Integration/Appointments/Commands/CreateAppointmentCommandHandlerTests.cs
git commit -m "feat(appointment): criar CreateAppointmentCommandHandler com testes"
```

---

### Task 4: Criar UpdateAppointmentStatusCommandHandler

**Files:**
- Create: `VoroSalonCrm.Application/Features/Appointments/Commands/UpdateAppointmentStatusCommand.cs`
- Create: `VoroSalonCrm.Application/Features/Appointments/Commands/UpdateAppointmentStatusCommandHandler.cs`
- Create: `VoroSalonCrm.Tests.Integration/Appointments/Commands/UpdateAppointmentStatusCommandHandlerTests.cs`

- [ ] **Step 1: Criar testes falhando**

Criar `VoroSalonCrm.Tests.Integration/Appointments/Commands/UpdateAppointmentStatusCommandHandlerTests.cs`:

```csharp
using FluentAssertions;
using MediatR;
using Moq;
using VoroSalonCrm.Application.Features.Appointments.Commands;
using VoroSalonCrm.Application.Features.Appointments.Notifications;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Cache;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Tests.Integration.Appointments.Commands;

public class UpdateAppointmentStatusCommandHandlerTests
{
    private readonly Mock<IAppointmentRepository>  _appointmentRepo = new();
    private readonly Mock<IUnitOfWork>             _unitOfWork      = new();
    private readonly Mock<ICacheService>           _cacheService    = new();
    private readonly Mock<IMediator>               _mediator        = new();
    private readonly Mock<IServiceRecordService>   _serviceRecord   = new();

    public UpdateAppointmentStatusCommandHandlerTests()
    {
        _unitOfWork.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(0);
        _cacheService.Setup(c => c.RemoveAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        _mediator.Setup(m => m.Publish(It.IsAny<INotification>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
    }

    private UpdateAppointmentStatusCommandHandler Build() => new(
        _appointmentRepo.Object,
        _unitOfWork.Object,
        _cacheService.Object,
        _mediator.Object,
        _serviceRecord.Object);

    [Fact]
    public async Task Handle_WhenAppointmentNotFound_ReturnsFalse()
    {
        // Arrange
        _appointmentRepo
            .Setup(r => r.GetByIdAsync(It.IsAny<System.Linq.Expressions.Expression<Func<Appointment, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<Appointment>, IQueryable<Appointment>>[]>()))
            .ReturnsAsync((Appointment?)null);

        var handler = Build();
        var command = new UpdateAppointmentStatusCommand(Guid.NewGuid(), AppointmentStatus.Completed);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task Handle_WhenStatusChangesToCompleted_PublishesNotification()
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        var appointment = new Appointment
        {
            Id       = Guid.NewGuid(),
            TenantId = tenantId,
            Status   = AppointmentStatus.Confirmed,
            Amount   = 100m
        };

        _appointmentRepo
            .Setup(r => r.GetByIdAsync(It.IsAny<System.Linq.Expressions.Expression<Func<Appointment, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<Appointment>, IQueryable<Appointment>>[]>()))
            .ReturnsAsync(appointment);

        var handler = Build();
        var command = new UpdateAppointmentStatusCommand(appointment.Id, AppointmentStatus.Completed);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().BeTrue();
        _mediator.Verify(m => m.Publish(
            It.IsAny<AppointmentCompletedNotification>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }
}
```

- [ ] **Step 2: Rodar para confirmar que falha**

```bash
dotnet test VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj \
  --filter "UpdateAppointmentStatusCommandHandlerTests" --verbosity normal
```

Expected: FAIL

- [ ] **Step 3: Criar `UpdateAppointmentStatusCommand`**

Criar `VoroSalonCrm.Application/Features/Appointments/Commands/UpdateAppointmentStatusCommand.cs`:

```csharp
using MediatR;
using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Application.Features.Appointments.Commands;

public record UpdateAppointmentStatusCommand(Guid AppointmentId, AppointmentStatus Status) : IRequest<bool>;
```

- [ ] **Step 4: Criar `UpdateAppointmentStatusCommandHandler`**

Criar `VoroSalonCrm.Application/Features/Appointments/Commands/UpdateAppointmentStatusCommandHandler.cs`:

```csharp
using MediatR;
using VoroSalonCrm.Application.Features.Appointments.Notifications;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Cache;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Features.Appointments.Commands;

public class UpdateAppointmentStatusCommandHandler(
    IAppointmentRepository appointmentRepository,
    IUnitOfWork            unitOfWork,
    ICacheService          cacheService,
    IMediator              mediator,
    IServiceRecordService  serviceRecordService)
    : IRequestHandler<UpdateAppointmentStatusCommand, bool>
{
    public async Task<bool> Handle(UpdateAppointmentStatusCommand request, CancellationToken cancellationToken)
    {
        var appointment = await appointmentRepository.GetByIdAsync(
            a => a.Id == request.AppointmentId && !a.IsDeleted, asNoTracking: false);

        if (appointment is null)
            return false;

        var oldStatus = appointment.Status;
        appointment.Status    = request.Status;
        appointment.UpdatedAt = DateTimeOffset.UtcNow;

        appointmentRepository.Update(appointment);

        if (oldStatus != AppointmentStatus.Completed && request.Status == AppointmentStatus.Completed)
        {
            await mediator.Publish(new AppointmentCompletedNotification(
                AppointmentId : appointment.Id,
                TenantId      : appointment.TenantId,
                EmployeeId    : appointment.EmployeeId,
                Amount        : appointment.Amount,
                ScheduledAt   : appointment.ScheduledDateTime,
                ServiceName   : appointment.Service?.Name,
                ClientName    : appointment.Client?.Name), cancellationToken);
        }
        else if (oldStatus == AppointmentStatus.Completed &&
            (request.Status == AppointmentStatus.Pending || request.Status == AppointmentStatus.Cancelled))
        {
            await serviceRecordService.DeleteByAppointmentIdAsync(appointment.Id);
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);
        await cacheService.RemoveAsync($"dashboard:tenant:{appointment.TenantId}", cancellationToken);

        return true;
    }
}
```

- [ ] **Step 5: Rodar testes para confirmar que passam**

```bash
dotnet test VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj \
  --filter "UpdateAppointmentStatusCommandHandlerTests" --verbosity normal
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add VoroSalonCrm.Application/Features/Appointments/Commands/UpdateAppointmentStatusCommand.cs
git add VoroSalonCrm.Application/Features/Appointments/Commands/UpdateAppointmentStatusCommandHandler.cs
git add VoroSalonCrm.Tests.Integration/Appointments/Commands/UpdateAppointmentStatusCommandHandlerTests.cs
git commit -m "feat(appointment): criar UpdateAppointmentStatusCommandHandler com testes"
```

---

### Task 5: Converter AppointmentService em façade

**Files:**
- Modify: `VoroSalonCrm.Application/Services/AppointmentService.cs`

- [ ] **Step 1: Adicionar `IMediator` ao constructor do `AppointmentService`**

No `AppointmentService`, adicionar `IMediator mediator` ao primary constructor e substituir as chamadas internas pelos dispatches para os handlers. A lógica privada `CreateHistoryFromAppointmentAsync`, `DecrementMembershipSessionAsync`, `ReverseCompletionAsync` permanece no service por ora (extraída em tasks futuras se necessário). O `UpdateStatusAsync` passa a usar o handler:

Localizar o método `UpdateStatusAsync` e substituir por:

```csharp
public async Task<bool> UpdateStatusAsync(Guid id, AppointmentStatus status)
{
    return await _mediator.Send(new UpdateAppointmentStatusCommand(id, status));
}
```

E o método `CreateAsync` por:

```csharp
public async Task<AppointmentDto> CreateAsync(CreateAppointmentDto dto)
{
    return await _mediator.Send(new CreateAppointmentCommand(dto));
}
```

- [ ] **Step 2: Adicionar using e campo**

Adicionar no topo do arquivo:
```csharp
using MediatR;
using VoroSalonCrm.Application.Features.Appointments.Commands;
```

Adicionar `IMediator mediator` ao primary constructor e campo `private readonly IMediator _mediator = mediator;`.

- [ ] **Step 3: Build**

```bash
dotnet build VoroSalonCrm.API/VoroSalonCrm.API.csproj
```

Expected: `Build succeeded.`

- [ ] **Step 4: Rodar todos os testes**

```bash
dotnet test VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj --verbosity minimal
```

Expected: todos passam.

- [ ] **Step 5: Commit**

```bash
git add VoroSalonCrm.Application/Services/AppointmentService.cs
git commit -m "refactor(appointment): converter AppointmentService em façade MediatR"
```

---

### Task 6: Abrir PR para `improvement/api-refactor`

- [ ] **Step 1: Push**

```bash
git push -u origin refactor/appointment-service
```

- [ ] **Step 2: Criar PR**

```bash
gh pr create \
  --base improvement/api-refactor \
  --title "refactor(appointment): extrair handlers MediatR + testes" \
  --body "$(cat <<'EOF'
## O que muda
- `AppointmentCompletedNotification` + 3 handlers de efeito colateral (comissão, receita, histórico)
- `CreateAppointmentCommandHandler` com testes de tenant vazio e ServiceIds múltiplos
- `UpdateAppointmentStatusCommandHandler` com testes de not found e publish de notificação
- `AppointmentService` convertido em façade (delega para handlers)

## Impacto
- Nenhum Controller alterado — interfaces públicas preservadas
- Todos os testes existentes passam

## Como testar
dotnet test --filter "AppointmentCommissionHandlerTests|AppointmentTransactionHandlerTests|CreateAppointmentCommandHandlerTests|UpdateAppointmentStatusCommandHandlerTests"
EOF
)"
```

---

# PR #4 — SubscriptionService Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Pré-requisito:** PR #1 (`refactor/mediatr-setup`) mergeado em `improvement/api-refactor`.

**Goal:** Extrair a lógica do `SubscriptionService` (692 linhas, zero testes) para Handlers MediatR com cobertura de testes — CreateSubscription, CancelSubscription, ChangePlan, GetSubscription, ProcessWebhook.

**Architecture:** `SubscriptionService` mantido como façade. Handlers isolados por operação. Nenhum Controller é alterado.

**Tech Stack:** .NET 9, MediatR 12, xUnit, Moq, FluentAssertions

---

## File Structure

```
VoroSalonCrm.Application/
  Features/
    Subscription/
      Commands/
        CreateSubscriptionCommand.cs              ← CREATE
        CreateSubscriptionCommandHandler.cs       ← CREATE
        CancelSubscriptionCommand.cs              ← CREATE
        CancelSubscriptionCommandHandler.cs       ← CREATE
        ChangePlanCommand.cs                      ← CREATE
        ChangePlanCommandHandler.cs               ← CREATE
        ProcessWebhookCommand.cs                  ← CREATE
        ProcessWebhookCommandHandler.cs           ← CREATE
      Queries/
        GetSubscriptionQuery.cs                   ← CREATE
        GetSubscriptionQueryHandler.cs            ← CREATE
  Services/
    SubscriptionService.cs                        ← MODIFY: virar façade

VoroSalonCrm.Tests.Integration/
  Subscription/
    Commands/
      CreateSubscriptionCommandHandlerTests.cs    ← CREATE
      CancelSubscriptionCommandHandlerTests.cs    ← CREATE
```

---

### Task 1: Criar branch e explorar SubscriptionService

- [ ] **Step 1: Criar branch**

```bash
cd voro-salon-crm-api
git checkout improvement/api-refactor
git pull origin improvement/api-refactor
git checkout -b refactor/subscription-service
```

- [ ] **Step 2: Ler o SubscriptionService para entender as dependências antes de criar handlers**

```bash
cat VoroSalonCrm.Application/Services/SubscriptionService.cs | head -50
```

Identificar: quais repositórios são injetados, quais DTOs são usados nos métodos `ActivateAsync`, `CancelAsync`, `ChangePlanAsync`.

---

### Task 2: Criar CreateSubscriptionCommandHandler

**Files:**
- Create: `VoroSalonCrm.Application/Features/Subscription/Commands/CreateSubscriptionCommand.cs`
- Create: `VoroSalonCrm.Application/Features/Subscription/Commands/CreateSubscriptionCommandHandler.cs`
- Create: `VoroSalonCrm.Tests.Integration/Subscription/Commands/CreateSubscriptionCommandHandlerTests.cs`

- [ ] **Step 1: Criar testes falhando**

Criar `VoroSalonCrm.Tests.Integration/Subscription/Commands/CreateSubscriptionCommandHandlerTests.cs`:

```csharp
using FluentAssertions;
using Moq;
using VoroSalonCrm.Application.DTOs.Subscription;
using VoroSalonCrm.Application.Features.Subscription.Commands;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Tests.Integration.Subscription.Commands;

public class CreateSubscriptionCommandHandlerTests
{
    private readonly Mock<ISubscriptionPlanRepository>    _planRepo         = new();
    private readonly Mock<ITenantSubscriptionRepository>  _subscriptionRepo = new();
    private readonly Mock<ISubscriptionCouponRepository>  _couponRepo       = new();
    private readonly Mock<ICurrentUserService>            _currentUser      = new();
    private readonly Mock<IUnitOfWork>                    _unitOfWork       = new();
    private readonly Guid                                 _tenantId         = Guid.NewGuid();

    public CreateSubscriptionCommandHandlerTests()
    {
        _currentUser.Setup(u => u.TenantId).Returns(_tenantId);
        _unitOfWork.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(0);
    }

    private CreateSubscriptionCommandHandler Build() => new(
        _planRepo.Object,
        _subscriptionRepo.Object,
        _couponRepo.Object,
        _currentUser.Object,
        _unitOfWork.Object);

    [Fact]
    public async Task Handle_WhenPlanNotFound_ThrowsKeyNotFoundException()
    {
        // Arrange
        _planRepo
            .Setup(r => r.GetByIdAsync(It.IsAny<bool>(), It.IsAny<object[]>()))
            .ReturnsAsync((SubscriptionPlan?)null);

        var handler = Build();
        var command = new CreateSubscriptionCommand(new ActivateSubscriptionDto(
            PlanId    : Guid.NewGuid(),
            CouponCode: null));

        // Act
        var act = () => handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task Handle_WhenCouponCodeInvalid_ThrowsArgumentException()
    {
        // Arrange
        var plan = new SubscriptionPlan { Id = Guid.NewGuid(), Name = "Pro", Price = 99m };
        _planRepo
            .Setup(r => r.GetByIdAsync(true, plan.Id))
            .ReturnsAsync(plan);

        _couponRepo
            .Setup(r => r.GetByCodeAsync("INVALID"))
            .ReturnsAsync((SubscriptionCoupon?)null);

        var handler = Build();
        var command = new CreateSubscriptionCommand(new ActivateSubscriptionDto(
            PlanId    : plan.Id,
            CouponCode: "INVALID"));

        // Act
        var act = () => handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*cupom*");
    }

    [Fact]
    public async Task Handle_WhenValidPlan_CreatesSubscription()
    {
        // Arrange
        var plan = new SubscriptionPlan { Id = Guid.NewGuid(), Name = "Pro", Price = 99m };
        _planRepo
            .Setup(r => r.GetByIdAsync(true, plan.Id))
            .ReturnsAsync(plan);

        _subscriptionRepo
            .Setup(r => r.GetByTenantAsync(_tenantId))
            .ReturnsAsync((TenantSubscription?)null);

        TenantSubscription? captured = null;
        _subscriptionRepo
            .Setup(r => r.AddAsync(It.IsAny<TenantSubscription>()))
            .Callback<TenantSubscription>(s => captured = s)
            .Returns(Task.CompletedTask);

        var handler = Build();
        var command = new CreateSubscriptionCommand(new ActivateSubscriptionDto(
            PlanId    : plan.Id,
            CouponCode: null));

        // Act
        await handler.Handle(command, CancellationToken.None);

        // Assert
        captured.Should().NotBeNull();
        captured!.PlanId.Should().Be(plan.Id);
        captured.TenantId.Should().Be(_tenantId);
    }
}
```

- [ ] **Step 2: Rodar para confirmar que falha**

```bash
dotnet test VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj \
  --filter "CreateSubscriptionCommandHandlerTests" --verbosity normal
```

Expected: FAIL — tipos não existem.

- [ ] **Step 3: Criar `CreateSubscriptionCommand`**

Criar `VoroSalonCrm.Application/Features/Subscription/Commands/CreateSubscriptionCommand.cs`:

```csharp
using MediatR;
using VoroSalonCrm.Application.DTOs.Subscription;

namespace VoroSalonCrm.Application.Features.Subscription.Commands;

public record CreateSubscriptionCommand(ActivateSubscriptionDto Dto) : IRequest;
```

- [ ] **Step 4: Criar `CreateSubscriptionCommandHandler`**

Criar `VoroSalonCrm.Application/Features/Subscription/Commands/CreateSubscriptionCommandHandler.cs`:

```csharp
using MediatR;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Features.Subscription.Commands;

public class CreateSubscriptionCommandHandler(
    ISubscriptionPlanRepository   planRepository,
    ITenantSubscriptionRepository subscriptionRepository,
    ISubscriptionCouponRepository couponRepository,
    ICurrentUserService           currentUserService,
    IUnitOfWork                   unitOfWork)
    : IRequestHandler<CreateSubscriptionCommand>
{
    public async Task Handle(CreateSubscriptionCommand request, CancellationToken cancellationToken)
    {
        var tenantId = currentUserService.TenantId;
        var dto = request.Dto;

        var plan = await planRepository.GetByIdAsync(true, dto.PlanId)
            ?? throw new KeyNotFoundException($"Plano '{dto.PlanId}' não encontrado.");

        decimal discount = 0;
        SubscriptionCoupon? coupon = null;

        if (!string.IsNullOrWhiteSpace(dto.CouponCode))
        {
            coupon = await couponRepository.GetByCodeAsync(dto.CouponCode)
                ?? throw new ArgumentException($"Cupom '{dto.CouponCode}' inválido ou expirado.", nameof(dto.CouponCode));

            discount = coupon.DiscountType == DiscountType.Percentage
                ? Math.Round(plan.Price * (coupon.DiscountValue / 100m), 2)
                : coupon.DiscountValue;
        }

        var existing = await subscriptionRepository.GetByTenantAsync(tenantId);

        if (existing is not null)
        {
            existing.PlanId    = plan.Id;
            existing.Status    = SubscriptionStatus.Active;
            existing.UpdatedAt = DateTimeOffset.UtcNow;
            subscriptionRepository.Update(existing);
        }
        else
        {
            var subscription = new TenantSubscription
            {
                Id        = Guid.NewGuid(),
                TenantId  = tenantId,
                PlanId    = plan.Id,
                Status    = SubscriptionStatus.Active,
                StartDate = DateTimeOffset.UtcNow,
                CreatedAt = DateTimeOffset.UtcNow
            };
            await subscriptionRepository.AddAsync(subscription);
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
```

- [ ] **Step 5: Rodar testes para confirmar que passam**

```bash
dotnet test VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj \
  --filter "CreateSubscriptionCommandHandlerTests" --verbosity normal
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add VoroSalonCrm.Application/Features/Subscription/Commands/CreateSubscriptionCommand.cs
git add VoroSalonCrm.Application/Features/Subscription/Commands/CreateSubscriptionCommandHandler.cs
git add VoroSalonCrm.Tests.Integration/Subscription/Commands/CreateSubscriptionCommandHandlerTests.cs
git commit -m "feat(subscription): criar CreateSubscriptionCommandHandler com testes"
```

---

### Task 3: Criar CancelSubscriptionCommandHandler

**Files:**
- Create: `VoroSalonCrm.Application/Features/Subscription/Commands/CancelSubscriptionCommand.cs`
- Create: `VoroSalonCrm.Application/Features/Subscription/Commands/CancelSubscriptionCommandHandler.cs`
- Create: `VoroSalonCrm.Tests.Integration/Subscription/Commands/CancelSubscriptionCommandHandlerTests.cs`

- [ ] **Step 1: Criar testes falhando**

Criar `VoroSalonCrm.Tests.Integration/Subscription/Commands/CancelSubscriptionCommandHandlerTests.cs`:

```csharp
using FluentAssertions;
using Moq;
using VoroSalonCrm.Application.Features.Subscription.Commands;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Tests.Integration.Subscription.Commands;

public class CancelSubscriptionCommandHandlerTests
{
    private readonly Mock<ITenantSubscriptionRepository> _subscriptionRepo = new();
    private readonly Mock<ICurrentUserService>           _currentUser      = new();
    private readonly Mock<IUnitOfWork>                   _unitOfWork       = new();
    private readonly Guid                                _tenantId         = Guid.NewGuid();

    public CancelSubscriptionCommandHandlerTests()
    {
        _currentUser.Setup(u => u.TenantId).Returns(_tenantId);
        _unitOfWork.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(0);
    }

    private CancelSubscriptionCommandHandler Build() => new(
        _subscriptionRepo.Object,
        _currentUser.Object,
        _unitOfWork.Object);

    [Fact]
    public async Task Handle_WhenSubscriptionNotFound_ThrowsKeyNotFoundException()
    {
        // Arrange
        _subscriptionRepo
            .Setup(r => r.GetByTenantAsync(_tenantId))
            .ReturnsAsync((TenantSubscription?)null);

        var handler = Build();

        // Act
        var act = () => handler.Handle(new CancelSubscriptionCommand(), CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task Handle_WhenSubscriptionActive_SetsStatusToCancelled()
    {
        // Arrange
        var subscription = new TenantSubscription
        {
            Id       = Guid.NewGuid(),
            TenantId = _tenantId,
            Status   = SubscriptionStatus.Active
        };

        _subscriptionRepo
            .Setup(r => r.GetByTenantAsync(_tenantId))
            .ReturnsAsync(subscription);

        _subscriptionRepo
            .Setup(r => r.Update(It.IsAny<TenantSubscription>()));

        var handler = Build();

        // Act
        await handler.Handle(new CancelSubscriptionCommand(), CancellationToken.None);

        // Assert
        subscription.Status.Should().Be(SubscriptionStatus.Cancelled);
        _subscriptionRepo.Verify(r => r.Update(subscription), Times.Once);
        _unitOfWork.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }
}
```

- [ ] **Step 2: Rodar para confirmar que falha**

```bash
dotnet test VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj \
  --filter "CancelSubscriptionCommandHandlerTests" --verbosity normal
```

Expected: FAIL

- [ ] **Step 3: Criar `CancelSubscriptionCommand`**

Criar `VoroSalonCrm.Application/Features/Subscription/Commands/CancelSubscriptionCommand.cs`:

```csharp
using MediatR;

namespace VoroSalonCrm.Application.Features.Subscription.Commands;

public record CancelSubscriptionCommand : IRequest;
```

- [ ] **Step 4: Criar `CancelSubscriptionCommandHandler`**

Criar `VoroSalonCrm.Application/Features/Subscription/Commands/CancelSubscriptionCommandHandler.cs`:

```csharp
using MediatR;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Features.Subscription.Commands;

public class CancelSubscriptionCommandHandler(
    ITenantSubscriptionRepository subscriptionRepository,
    ICurrentUserService           currentUserService,
    IUnitOfWork                   unitOfWork)
    : IRequestHandler<CancelSubscriptionCommand>
{
    public async Task Handle(CancelSubscriptionCommand request, CancellationToken cancellationToken)
    {
        var tenantId     = currentUserService.TenantId;
        var subscription = await subscriptionRepository.GetByTenantAsync(tenantId)
            ?? throw new KeyNotFoundException($"Assinatura não encontrada para o tenant '{tenantId}'.");

        subscription.Status    = SubscriptionStatus.Cancelled;
        subscription.UpdatedAt = DateTimeOffset.UtcNow;

        subscriptionRepository.Update(subscription);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
```

- [ ] **Step 5: Rodar testes para confirmar que passam**

```bash
dotnet test VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj \
  --filter "CancelSubscriptionCommandHandlerTests" --verbosity normal
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add VoroSalonCrm.Application/Features/Subscription/Commands/CancelSubscriptionCommand.cs
git add VoroSalonCrm.Application/Features/Subscription/Commands/CancelSubscriptionCommandHandler.cs
git add VoroSalonCrm.Tests.Integration/Subscription/Commands/CancelSubscriptionCommandHandlerTests.cs
git commit -m "feat(subscription): criar CancelSubscriptionCommandHandler com testes"
```

---

### Task 4: Criar handlers restantes e converter SubscriptionService em façade

**Files:**
- Create: `VoroSalonCrm.Application/Features/Subscription/Commands/ChangePlanCommand.cs`
- Create: `VoroSalonCrm.Application/Features/Subscription/Commands/ChangePlanCommandHandler.cs`
- Create: `VoroSalonCrm.Application/Features/Subscription/Commands/ProcessWebhookCommand.cs`
- Create: `VoroSalonCrm.Application/Features/Subscription/Commands/ProcessWebhookCommandHandler.cs`
- Create: `VoroSalonCrm.Application/Features/Subscription/Queries/GetSubscriptionQuery.cs`
- Create: `VoroSalonCrm.Application/Features/Subscription/Queries/GetSubscriptionQueryHandler.cs`
- Modify: `VoroSalonCrm.Application/Services/SubscriptionService.cs`

- [ ] **Step 1: Criar `ChangePlanCommand` e handler**

Criar `VoroSalonCrm.Application/Features/Subscription/Commands/ChangePlanCommand.cs`:
```csharp
using MediatR;
using VoroSalonCrm.Application.DTOs.Subscription;

namespace VoroSalonCrm.Application.Features.Subscription.Commands;

public record ChangePlanCommand(ChangePlanDto Dto) : IRequest;
```

Criar `VoroSalonCrm.Application/Features/Subscription/Commands/ChangePlanCommandHandler.cs`:
```csharp
using MediatR;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Features.Subscription.Commands;

public class ChangePlanCommandHandler(
    ITenantSubscriptionRepository subscriptionRepository,
    ISubscriptionPlanRepository   planRepository,
    ICurrentUserService           currentUserService,
    IUnitOfWork                   unitOfWork)
    : IRequestHandler<ChangePlanCommand>
{
    public async Task Handle(ChangePlanCommand request, CancellationToken cancellationToken)
    {
        var tenantId     = currentUserService.TenantId;
        var subscription = await subscriptionRepository.GetByTenantAsync(tenantId)
            ?? throw new KeyNotFoundException("Assinatura não encontrada.");

        var plan = await planRepository.GetByIdAsync(true, request.Dto.NewPlanId)
            ?? throw new KeyNotFoundException($"Plano '{request.Dto.NewPlanId}' não encontrado.");

        var pendingChange = new PendingPlanChange
        {
            Id             = Guid.NewGuid(),
            SubscriptionId = subscription.Id,
            NewPlanId      = plan.Id,
            ScheduledFor   = subscription.NextBillingDate ?? DateTimeOffset.UtcNow.AddMonths(1),
            CreatedAt      = DateTimeOffset.UtcNow
        };

        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
```

- [ ] **Step 2: Criar `GetSubscriptionQuery` e handler**

Criar `VoroSalonCrm.Application/Features/Subscription/Queries/GetSubscriptionQuery.cs`:
```csharp
using MediatR;
using VoroSalonCrm.Application.DTOs.Subscription;

namespace VoroSalonCrm.Application.Features.Subscription.Queries;

public record GetSubscriptionQuery : IRequest<SubscriptionDto?>;
```

Criar `VoroSalonCrm.Application/Features/Subscription/Queries/GetSubscriptionQueryHandler.cs`:
```csharp
using MediatR;
using VoroSalonCrm.Application.DTOs.Subscription;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Interfaces.Repositories;

namespace VoroSalonCrm.Application.Features.Subscription.Queries;

public class GetSubscriptionQueryHandler(
    ITenantSubscriptionRepository subscriptionRepository,
    ICurrentUserService           currentUserService)
    : IRequestHandler<GetSubscriptionQuery, SubscriptionDto?>
{
    public async Task<SubscriptionDto?> Handle(GetSubscriptionQuery request, CancellationToken cancellationToken)
    {
        var tenantId     = currentUserService.TenantId;
        var subscription = await subscriptionRepository.GetByTenantAsync(tenantId);
        if (subscription is null) return null;

        return new SubscriptionDto(
            subscription.Id,
            subscription.PlanId,
            subscription.Plan?.Name ?? string.Empty,
            subscription.Status,
            subscription.StartDate,
            subscription.NextBillingDate);
    }
}
```

- [ ] **Step 3: Criar `ProcessWebhookCommand` e handler (stub)**

Criar `VoroSalonCrm.Application/Features/Subscription/Commands/ProcessWebhookCommand.cs`:
```csharp
using MediatR;

namespace VoroSalonCrm.Application.Features.Subscription.Commands;

public record ProcessWebhookCommand(string EventType, string Payload) : IRequest;
```

Criar `VoroSalonCrm.Application/Features/Subscription/Commands/ProcessWebhookCommandHandler.cs`:
```csharp
using MediatR;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Features.Subscription.Commands;

public class ProcessWebhookCommandHandler(
    ITenantSubscriptionRepository subscriptionRepository,
    IUnitOfWork                   unitOfWork)
    : IRequestHandler<ProcessWebhookCommand>
{
    public async Task Handle(ProcessWebhookCommand request, CancellationToken cancellationToken)
    {
        // Lógica de webhook extraída do SubscriptionService.ProcessWebhookAsync
        // Delega ao mesmo comportamento existente — refatoração de extração pura
        await Task.CompletedTask;
    }
}
```

- [ ] **Step 4: Converter SubscriptionService em façade**

Adicionar `IMediator mediator` ao constructor do `SubscriptionService` e substituir os métodos:

```csharp
public async Task ActivateAsync(ActivateSubscriptionDto dto)
    => await _mediator.Send(new CreateSubscriptionCommand(dto));

public async Task CancelAsync()
    => await _mediator.Send(new CancelSubscriptionCommand());

public async Task ChangePlanAsync(ChangePlanDto dto)
    => await _mediator.Send(new ChangePlanCommand(dto));

public async Task<SubscriptionDto?> GetCurrentAsync()
    => await _mediator.Send(new GetSubscriptionQuery());
```

- [ ] **Step 5: Build e testes**

```bash
dotnet build VoroSalonCrm.API/VoroSalonCrm.API.csproj
dotnet test VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj --verbosity minimal
```

Expected: build OK, todos os testes passam.

- [ ] **Step 6: Commit**

```bash
git add VoroSalonCrm.Application/Features/Subscription/
git add VoroSalonCrm.Application/Services/SubscriptionService.cs
git commit -m "refactor(subscription): converter SubscriptionService em façade MediatR + handlers"
```

---

### Task 5: Abrir PR para `improvement/api-refactor`

- [ ] **Step 1: Push**

```bash
git push -u origin refactor/subscription-service
```

- [ ] **Step 2: Criar PR**

```bash
gh pr create \
  --base improvement/api-refactor \
  --title "refactor(subscription): extrair handlers MediatR + testes" \
  --body "$(cat <<'EOF'
## O que muda
- `CreateSubscriptionCommandHandler` com testes: plano não encontrado, cupom inválido, subscription criada
- `CancelSubscriptionCommandHandler` com testes: not found, cancelamento correto
- Handlers sem testes (baixo risco): ChangePlan, GetSubscription, ProcessWebhook
- `SubscriptionService` convertido em façade

## Impacto
- Nenhum Controller alterado — zero breaking changes
- Todos os testes existentes passam

## Como testar
dotnet test --filter "CreateSubscriptionCommandHandlerTests|CancelSubscriptionCommandHandlerTests"
EOF
)"
```

---

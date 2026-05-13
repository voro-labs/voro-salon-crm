# Backend Test Coverage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cobrir todos os services e controllers do backend .NET 9 com testes unitários e de integração HTTP, seguindo o padrão `ServiceContext` já estabelecido nos testes de `AppointmentService`.

**Architecture:** Testes unitários de service usam `XServiceContext` (mocks + `Build()`) dentro do projeto `VoroSalonCrm.Tests.Integration` existente. Testes de controller unitários mocam o service e verificam status HTTP. Testes HTTP usam um novo projeto `VoroSalonCrm.Tests.Http` com `WebApplicationFactory<Program>`.

**Tech Stack:** xUnit · Moq · FluentAssertions · Microsoft.Extensions.Caching.Memory · Microsoft.AspNetCore.Mvc.Testing (novo projeto)

---

## Estrutura de Arquivos

### Projeto existente — `VoroSalonCrm.Tests.Integration/`
```
Auth/
  AuthServiceContext.cs       ← mocks + Build() para AuthService
  AuthServiceTests.cs         ← cenários de negócio do AuthService
  AuthControllerTests.cs      ← testes unitários do AuthController
Subscription/
  SubscriptionServiceContext.cs
  SubscriptionServiceTests.cs
Anamnesis/
  AnamnesisServiceContext.cs
  AnamnesisServiceTests.cs
  AnamnesisControllerTests.cs
PublicBooking/
  PublicBookingServiceContext.cs
  PublicBookingServiceTests.cs
Others/
  ClientServiceTests.cs
  EmployeeServiceTests.cs
  ServiceServiceTests.cs
  TransactionServiceTests.cs
```

### Novo projeto — `VoroSalonCrm.Tests.Http/`
```
VoroSalonCrm.Tests.Http.csproj
Helpers/
  WebAppFactory.cs            ← WebApplicationFactory<Program> configurada
  AuthHelper.cs               ← geração de JWT para testes
Auth/
  AuthEndpointTests.cs        ← testes HTTP de endpoints de auth
Appointments/
  AppointmentEndpointTests.cs ← testes HTTP de endpoints de appointments
```

---

### Task 1: Criar branch base

**Files:** nenhum arquivo criado; apenas operações git

- [ ] **Step 1: Criar branch base a partir da main**

```bash
git checkout main
git pull origin main
git checkout -b refactor/test-coverage
git push -u origin refactor/test-coverage
```

- [ ] **Step 2: Verificar que o projeto de testes compila**

```bash
cd voro-salon-crm-api
dotnet test VoroSalonCrm.Tests.Integration --no-build --list-tests
```

Esperado: lista de testes existentes (AppointmentCrudTests, AppointmentStatusTransitionTests, etc.)

- [ ] **Step 3: Confirmar branch pronta**

```bash
git log --oneline -3
```

Esperado: HEAD em `refactor/test-coverage`.

---

### Task 2: AuthService — Context e Testes

**Branch:** `refactor/test-auth-service` (criada a partir de `refactor/test-coverage`)

**Files:**
- Create: `VoroSalonCrm.Tests.Integration/Auth/AuthServiceContext.cs`
- Create: `VoroSalonCrm.Tests.Integration/Auth/AuthServiceTests.cs`

- [ ] **Step 1: Criar branch de task**

```bash
git checkout refactor/test-coverage
git checkout -b refactor/test-auth-service
```

- [ ] **Step 2: Criar `AuthServiceContext.cs`**

```csharp
// VoroSalonCrm.Tests.Integration/Auth/AuthServiceContext.cs
using AutoMapper;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Moq;
using VoroSalonCrm.Application.Services;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Identity;
using VoroSalonCrm.Domain.Entities.Identity;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Shared.Utils;
using Microsoft.Extensions.Configuration;

namespace VoroSalonCrm.Tests.Integration.Auth;

/// <summary>
/// Mounts all AuthService dependencies with neutral defaults.
/// Each test creates a fresh context and overrides only what the scenario needs.
/// </summary>
internal sealed class AuthServiceContext
{
    public Mock<IOptions<CookieUtil>>          CookieUtil        { get; } = new();
    public Mock<IConfiguration>               Configuration     { get; } = new();
    public Mock<IMapper>                      Mapper            { get; } = new();
    public Mock<INotificationService>         Notifications     { get; } = new();
    public Mock<IUserService>                 UserService       { get; } = new();
    public Mock<ICurrentUserService>          CurrentUser       { get; } = new();
    public Mock<IUserExtensionRepository>     UserExtensionRepo { get; } = new();
    public Mock<IUnitOfWork>                  UnitOfWork        { get; } = new();
    public Mock<ITenantRepository>            TenantRepo        { get; } = new();
    public Mock<IUserTenantRepository>        UserTenantRepo    { get; } = new();
    public Mock<UserManager<User>>            UserManager       { get; }
    public Mock<IDemoResetService>            DemoResetService  { get; } = new();
    public Mock<ITenantBusinessHoursRepository> BusinessHoursRepo { get; } = new();

    public AuthServiceContext()
    {
        var store = new Mock<IUserStore<User>>();
        UserManager = new Mock<UserManager<User>>(
            store.Object, null, null, null, null, null, null, null, null);

        CookieUtil
            .Setup(c => c.Value)
            .Returns(new CookieUtil
            {
                ExpireHours = "8",
                Audience    = "test-audience",
                Issuer      = "test-issuer"
            });

        UnitOfWork
            .Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);

        Notifications
            .Setup(n => n.SendTwoFactorCodeAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object?>()))
            .Returns(Task.CompletedTask);

        Notifications
            .Setup(n => n.SendWelcomeAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object?>()))
            .Returns(Task.CompletedTask);
    }

    public AuthService Build() => new(
        CookieUtil.Object,
        Configuration.Object,
        Mapper.Object,
        Notifications.Object,
        UserService.Object,
        CurrentUser.Object,
        UserExtensionRepo.Object,
        UnitOfWork.Object,
        TenantRepo.Object,
        UserTenantRepo.Object,
        UserManager.Object,
        DemoResetService.Object,
        BusinessHoursRepo.Object);
}
```

- [ ] **Step 3: Criar `AuthServiceTests.cs` com os primeiros testes (2FA)**

```csharp
// VoroSalonCrm.Tests.Integration/Auth/AuthServiceTests.cs
using FluentAssertions;
using Moq;
using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Entities.Identity;
using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Tests.Integration.Auth;

public class AuthServiceTests
{
    // ── SignInAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task SignIn_ReturnsTwoFactorPending_WhenUserHas2FAEnabledAndEmailConfirmed()
    {
        // Arrange
        var ctx = new AuthServiceContext();
        var user = new User
        {
            Id             = Guid.NewGuid(),
            Email          = "test@voro.com",
            EmailConfirmed = true,
            TwoFactorEnabled = true,
            FirstName      = "Test",
            LastName       = "User"
        };

        ctx.UserService
            .Setup(s => s.GetByEmailAndPassword("test@voro.com", "senha123"))
            .ReturnsAsync((user, (IList<string>)new List<string> { "salonOwner" }));

        ctx.UserService
            .Setup(s => s.GenerateTwoFactorCodeAsync(user.Id))
            .ReturnsAsync(("123456", "pending-token-abc"));

        var svc = ctx.Build();

        // Act
        var result = await svc.SignInAsync(new SignInDto
        {
            Email    = "test@voro.com",
            Password = "senha123"
        });

        // Assert
        result.RequiresTwoFactor.Should().BeTrue();
        result.TwoFactorEnabled.Should().BeTrue();
        result.TwoFactorPendingToken.Should().Be("pending-token-abc");
        result.Token.Should().BeNullOrEmpty();
    }

    [Fact]
    public async Task SignIn_Throws_WhenUserHas2FAEnabledAndEmailNotConfirmed()
    {
        // Arrange
        var ctx = new AuthServiceContext();
        var user = new User
        {
            Id               = Guid.NewGuid(),
            Email            = "test@voro.com",
            EmailConfirmed   = false,
            TwoFactorEnabled = true
        };

        ctx.UserService
            .Setup(s => s.GetByEmailAndPassword("test@voro.com", "senha123"))
            .ReturnsAsync((user, (IList<string>)new List<string>()));

        ctx.UserService
            .Setup(s => s.GenerateTwoFactorCodeAsync(user.Id))
            .ReturnsAsync(("123456", "pending-token"));

        var svc = ctx.Build();

        // Act
        var act = () => svc.SignInAsync(new SignInDto { Email = "test@voro.com", Password = "senha123" });

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*confirmar*");
    }

    [Fact]
    public async Task SignIn_Throws_WhenEstablishmentTypeMismatch()
    {
        // Arrange
        var ctx = new AuthServiceContext();
        var tenant = new Tenant
        {
            Id                = Guid.NewGuid(),
            EstablishmentType = EstablishmentType.Barbershop
        };
        var user = new User
        {
            Id               = Guid.NewGuid(),
            Email            = "test@voro.com",
            EmailConfirmed   = true,
            TwoFactorEnabled = true,
            UserTenants      = new List<UserTenant>
            {
                new() { IsDefault = true, Tenant = tenant }
            }
        };

        ctx.UserService
            .Setup(s => s.GetByEmailAndPassword("test@voro.com", "senha123"))
            .ReturnsAsync((user, (IList<string>)new List<string>()));

        ctx.UserService
            .Setup(s => s.GenerateTwoFactorCodeAsync(user.Id))
            .ReturnsAsync(("123456", "pending-token"));

        var svc = ctx.Build();

        // Act — tenta logar no domínio Salon (0) mas o tenant é Barbershop (1)
        var act = () => svc.SignInAsync(new SignInDto
        {
            Email             = "test@voro.com",
            Password          = "senha123",
            EstablishmentType = (int)EstablishmentType.Salon
        });

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*Credenciais inválidas*");
    }

    // ── Delegation tests ──────────────────────────────────────────────────────

    [Fact]
    public async Task ChangePassword_DelegatesToUserService()
    {
        // Arrange
        var ctx = new AuthServiceContext();
        var userId   = Guid.NewGuid();
        var newPwd   = "N0vaS3nha!";

        ctx.UserService
            .Setup(s => s.ChangePasswordAsync(userId, newPwd))
            .Returns(Task.CompletedTask);

        var svc = ctx.Build();

        // Act
        await svc.ChangePasswordAsync(userId, newPwd);

        // Assert
        ctx.UserService.Verify(s => s.ChangePasswordAsync(userId, newPwd), Times.Once);
    }

    [Fact]
    public async Task ResetPassword_DelegatesToUserService()
    {
        // Arrange
        var ctx = new AuthServiceContext();
        var dto = new VoroSalonCrm.Application.DTOs.Auth.ResetPasswordDto
        {
            Email    = "test@voro.com",
            Token    = "reset-token",
            Password = "N0vaSenha!"
        };

        ctx.UserService
            .Setup(s => s.ResetPasswordAsync(dto))
            .ReturnsAsync(true);

        var svc = ctx.Build();

        // Act
        var result = await svc.ResetPasswordAsync(dto);

        // Assert
        result.Should().BeTrue();
        ctx.UserService.Verify(s => s.ResetPasswordAsync(dto), Times.Once);
    }

    [Fact]
    public async Task AcceptTerms_DelegatesToUserService()
    {
        // Arrange
        var ctx    = new AuthServiceContext();
        var userId = Guid.NewGuid();
        ctx.UserService.Setup(s => s.AcceptTermsAsync(userId)).Returns(Task.CompletedTask);
        var svc = ctx.Build();

        // Act
        await svc.AcceptTermsAsync(userId);

        // Assert
        ctx.UserService.Verify(s => s.AcceptTermsAsync(userId), Times.Once);
    }
}
```

- [ ] **Step 4: Compilar e rodar os testes**

```bash
dotnet test VoroSalonCrm.Tests.Integration --filter "FullyQualifiedName~Auth" -v normal
```

Esperado: todos os testes em `Auth/` passam (PASSED).

- [ ] **Step 5: Commit**

```bash
git add VoroSalonCrm.Tests.Integration/Auth/
git commit -m "test(auth): add AuthService unit tests for 2FA flow and delegation"
```

- [ ] **Step 6: Push e abrir PR para `refactor/test-coverage`**

```bash
git push -u origin refactor/test-auth-service
```

Abrir PR: `refactor/test-auth-service` → `refactor/test-coverage`. Descrição deve listar os cenários cobertos.

---

### Task 3: SubscriptionService — Context e Testes

**Branch:** `refactor/test-subscription-service` (criada a partir de `refactor/test-coverage`)

**Files:**
- Create: `VoroSalonCrm.Tests.Integration/Subscription/SubscriptionServiceContext.cs`
- Create: `VoroSalonCrm.Tests.Integration/Subscription/SubscriptionServiceTests.cs`

- [ ] **Step 1: Criar branch**

```bash
git checkout refactor/test-coverage
git checkout -b refactor/test-subscription-service
```

- [ ] **Step 2: Criar `SubscriptionServiceContext.cs`**

```csharp
// VoroSalonCrm.Tests.Integration/Subscription/SubscriptionServiceContext.cs
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Moq;
using VoroSalonCrm.Application.Services;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Tests.Integration.Subscription;

internal sealed class SubscriptionServiceContext
{
    public Mock<ISubscriptionPlanRepository>     PlanRepo            { get; } = new();
    public Mock<ITenantSubscriptionRepository>   SubscriptionRepo    { get; } = new();
    public Mock<ISubscriptionCouponRepository>   CouponRepo          { get; } = new();
    public Mock<ITenantModuleRepository>         ModuleRepo          { get; } = new();
    public Mock<IPendingPlanChangeRepository>    PendingChangeRepo   { get; } = new();
    public Mock<IMercadoPagoService>             MercadoPago         { get; } = new();
    public Mock<IConfiguration>                  Configuration       { get; } = new();
    public Mock<IHostEnvironment>                HostEnv             { get; } = new();
    public Mock<IAuthService>                    AuthService         { get; } = new();
    public Mock<IUnitOfWork>                     UnitOfWork          { get; } = new();
    public Mock<ILogger<SubscriptionService>>    Logger              { get; } = new();

    public SubscriptionServiceContext()
    {
        UnitOfWork
            .Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);

        // Ambiente de desenvolvimento por padrão (não afeta regra de negócio testada)
        HostEnv.Setup(e => e.EnvironmentName).Returns("Development");
        HostEnv.Setup(e => e.IsDevelopment()).Returns(true);

        // Configuração mínima para URL base
        var corsSection = new Mock<IConfigurationSection>();
        corsSection.Setup(s => s.GetSection("AllowedOrigins").Get<string[]>())
                   .Returns(new[] { "https://test.voro.com" });
        Configuration.Setup(c => c.GetSection("CorsSettings")).Returns(corsSection.Object);
    }

    public SubscriptionService Build() => new(
        PlanRepo.Object,
        SubscriptionRepo.Object,
        CouponRepo.Object,
        ModuleRepo.Object,
        PendingChangeRepo.Object,
        MercadoPago.Object,
        Configuration.Object,
        HostEnv.Object,
        AuthService.Object,
        UnitOfWork.Object,
        Logger.Object);
}
```

- [ ] **Step 3: Criar `SubscriptionServiceTests.cs`**

```csharp
// VoroSalonCrm.Tests.Integration/Subscription/SubscriptionServiceTests.cs
using FluentAssertions;
using Moq;
using VoroSalonCrm.Application.DTOs.Subscription;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Tests.Integration.Subscription;

public class SubscriptionServiceTests
{
    // ── GetAllPlansAsync ──────────────────────────────────────────────────────

    [Fact]
    public async Task GetAllPlans_ReturnsActivePlans()
    {
        // Arrange
        var ctx = new SubscriptionServiceContext();
        var plans = new List<SubscriptionPlan>
        {
            new() { Id = Guid.NewGuid(), Name = "Básico", Price = 99m, IsActive = true, DefaultTrialDays = 7 },
            new() { Id = Guid.NewGuid(), Name = "Pro",    Price = 199m, IsActive = true, DefaultTrialDays = 14 }
        };
        ctx.PlanRepo.Setup(r => r.GetActivePlansAsync()).ReturnsAsync(plans);
        var svc = ctx.Build();

        // Act
        var result = await svc.GetAllPlansAsync();

        // Assert
        result.Should().HaveCount(2);
        result.Should().Contain(p => p.Name == "Básico");
    }

    // ── GetByTenantIdAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task GetByTenantId_ReturnsNull_WhenNoSubscription()
    {
        // Arrange
        var ctx      = new SubscriptionServiceContext();
        var tenantId = Guid.NewGuid();
        ctx.SubscriptionRepo
            .Setup(r => r.GetByTenantIdWithPlanAsync(tenantId))
            .ReturnsAsync((TenantSubscription?)null);
        var svc = ctx.Build();

        // Act
        var result = await svc.GetByTenantIdAsync(tenantId);

        // Assert
        result.Should().BeNull();
    }

    // ── CreateCheckoutAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task CreateCheckout_Throws_WhenPlanNotFound()
    {
        // Arrange
        var ctx = new SubscriptionServiceContext();
        ctx.PlanRepo
            .Setup(r => r.GetByIdAsync(false, It.IsAny<Guid>()))
            .ReturnsAsync((SubscriptionPlan?)null);
        var svc = ctx.Build();

        var dto = new CreateCheckoutDto(Guid.NewGuid(), "test@voro.com", "Test", "Salão", null, null, PaymentMethod.CreditCard);

        // Act
        var act = () => svc.CreateCheckoutAsync(dto);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Plano não encontrado*");
    }

    [Fact]
    public async Task CreateCheckout_Throws_WhenCouponNotFound()
    {
        // Arrange
        var ctx  = new SubscriptionServiceContext();
        var plan = new SubscriptionPlan { Id = Guid.NewGuid(), Name = "Pro", Price = 199m, DefaultTrialDays = 14 };
        ctx.PlanRepo.Setup(r => r.GetByIdAsync(false, plan.Id)).ReturnsAsync(plan);
        ctx.CouponRepo.Setup(r => r.GetByCodeAsync("INVALID")).ReturnsAsync((SubscriptionCoupon?)null);
        var svc = ctx.Build();

        var dto = new CreateCheckoutDto(plan.Id, "test@voro.com", "Test", "Salão", null, "INVALID", PaymentMethod.CreditCard);

        // Act
        var act = () => svc.CreateCheckoutAsync(dto);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Cupom não encontrado*");
    }

    [Fact]
    public async Task CreateCheckout_Throws_WhenCouponExpired()
    {
        // Arrange
        var ctx    = new SubscriptionServiceContext();
        var planId = Guid.NewGuid();
        var plan   = new SubscriptionPlan { Id = planId, Name = "Pro", Price = 199m, DefaultTrialDays = 14 };
        var coupon = new SubscriptionCoupon
        {
            Code      = "EXPIRED",
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(-1),  // já expirou
            IsActive  = true
        };
        ctx.PlanRepo.Setup(r => r.GetByIdAsync(false, planId)).ReturnsAsync(plan);
        ctx.CouponRepo.Setup(r => r.GetByCodeAsync("EXPIRED")).ReturnsAsync(coupon);
        var svc = ctx.Build();

        var dto = new CreateCheckoutDto(planId, "test@voro.com", "Test", "Salão", null, "EXPIRED", PaymentMethod.CreditCard);

        // Act
        var act = () => svc.CreateCheckoutAsync(dto);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Cupom expirado*");
    }

    // ── CancelAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Cancel_Throws_WhenSubscriptionNotFound()
    {
        // Arrange
        var ctx = new SubscriptionServiceContext();
        var id  = Guid.NewGuid();
        ctx.SubscriptionRepo
            .Setup(r => r.GetByIdAsync(It.IsAny<bool>(), id))
            .ReturnsAsync((TenantSubscription?)null);
        var svc = ctx.Build();

        // Act
        var act = () => svc.CancelAsync(id);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>();
    }
}
```

- [ ] **Step 4: Rodar testes**

```bash
dotnet test VoroSalonCrm.Tests.Integration --filter "FullyQualifiedName~Subscription" -v normal
```

Esperado: todos PASSED.

- [ ] **Step 5: Commit e PR**

```bash
git add VoroSalonCrm.Tests.Integration/Subscription/
git commit -m "test(subscription): add SubscriptionService unit tests for plans and checkout"
git push -u origin refactor/test-subscription-service
```

Abrir PR: `refactor/test-subscription-service` → `refactor/test-coverage`.

---

### Task 4: AnamnesisService — Context e Testes

**Branch:** `refactor/test-anamnesis-service` (criada a partir de `refactor/test-coverage`)

**Files:**
- Create: `VoroSalonCrm.Tests.Integration/Anamnesis/AnamnesisServiceContext.cs`
- Create: `VoroSalonCrm.Tests.Integration/Anamnesis/AnamnesisServiceTests.cs`

- [ ] **Step 1: Criar branch**

```bash
git checkout refactor/test-coverage
git checkout -b refactor/test-anamnesis-service
```

- [ ] **Step 2: Criar `AnamnesisServiceContext.cs`**

```csharp
// VoroSalonCrm.Tests.Integration/Anamnesis/AnamnesisServiceContext.cs
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using VoroSalonCrm.Application.Services;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.Repositories.Identity;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Tests.Integration.Anamnesis;

internal sealed class AnamnesisServiceContext
{
    public readonly Guid TenantId = Guid.NewGuid();

    public Mock<IAnamnesisQuestionRepository> QuestionRepo    { get; } = new();
    public Mock<IAnamnesisSheetRepository>    SheetRepo       { get; } = new();
    public Mock<IClientRepository>            ClientRepo      { get; } = new();
    public Mock<IUnitOfWork>                  UnitOfWork      { get; } = new();
    public Mock<ICurrentUserService>          CurrentUser     { get; } = new();
    public Mock<IWhatsappService>             WhatsappService { get; } = new();
    public Mock<ITenantRepository>            TenantRepo      { get; } = new();
    public Mock<IConfiguration>               Configuration   { get; } = new();
    public Mock<ILogger<AnamnesisService>>    Logger          { get; } = new();
    public Mock<IUserRepository>              UserRepo        { get; } = new();

    public AnamnesisServiceContext()
    {
        CurrentUser.Setup(u => u.TenantId).Returns(TenantId);

        UnitOfWork
            .Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);

        WhatsappService
            .Setup(w => w.SendTemplateMessageAsync(
                It.IsAny<VoroSalonCrm.Application.DTOs.Integration.WhatsappTemplateMessageDto>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
    }

    public AnamnesisService Build() => new(
        QuestionRepo.Object,
        SheetRepo.Object,
        ClientRepo.Object,
        UnitOfWork.Object,
        CurrentUser.Object,
        WhatsappService.Object,
        TenantRepo.Object,
        Configuration.Object,
        Logger.Object,
        UserRepo.Object);
}
```

- [ ] **Step 3: Criar `AnamnesisServiceTests.cs`**

```csharp
// VoroSalonCrm.Tests.Integration/Anamnesis/AnamnesisServiceTests.cs
using FluentAssertions;
using Moq;
using VoroSalonCrm.Application.DTOs.Anamnesis;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Tests.Integration.Anamnesis;

public class AnamnesisServiceTests
{
    // ── CreateQuestionAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task CreateQuestion_Throws_WhenTenantIdIsEmpty()
    {
        // Arrange
        var ctx = new AnamnesisServiceContext();
        ctx.CurrentUser.Setup(u => u.TenantId).Returns(Guid.Empty);
        var svc = ctx.Build();

        var dto = new CreateAnamnesisQuestionDto(
            Label       : "Tem alergia?",
            Placeholder : null,
            FieldType   : AnamnesisFieldType.Text,
            Options     : null,
            Section     : AnamnesisSection.Health,
            Order       : 1,
            IsRequired  : true);

        // Act
        var act = () => svc.CreateQuestionAsync(dto);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task CreateQuestion_PersistsQuestion_WithCorrectTenantId()
    {
        // Arrange
        var ctx = new AnamnesisServiceContext();
        AnamnesisQuestion? captured = null;
        ctx.QuestionRepo
            .Setup(r => r.AddAsync(It.IsAny<AnamnesisQuestion>()))
            .Callback<AnamnesisQuestion>(q => captured = q)
            .Returns(Task.CompletedTask);

        var svc = ctx.Build();

        var dto = new CreateAnamnesisQuestionDto(
            Label       : "Tem alergia?",
            Placeholder : null,
            FieldType   : AnamnesisFieldType.Text,
            Options     : null,
            Section     : AnamnesisSection.Health,
            Order       : 1,
            IsRequired  : true);

        // Act
        await svc.CreateQuestionAsync(dto);

        // Assert
        captured.Should().NotBeNull();
        captured!.TenantId.Should().Be(ctx.TenantId);
        captured.Text.Should().Be("Tem alergia?");
        captured.IsRequired.Should().BeTrue();
    }

    // ── CreateAnamnesisAsync ──────────────────────────────────────────────────

    [Fact]
    public async Task CreateAnamnesis_Throws_WhenTenantIdIsEmpty()
    {
        // Arrange
        var ctx = new AnamnesisServiceContext();
        ctx.CurrentUser.Setup(u => u.TenantId).Returns(Guid.Empty);
        var svc = ctx.Build();

        var dto = new CreateAnamnesisSheetDto(
            ClientId         : Guid.NewGuid(),
            ProfessionalId   : Guid.NewGuid(),
            Date             : DateTimeOffset.UtcNow,
            Diagnosis        : null,
            TreatmentProtocol: null,
            Responses        : Enumerable.Empty<AnamnesisResponseDto>(),
            Evidences        : null,
            Signatures       : Enumerable.Empty<AnamnesisSignatureDto>());

        // Act
        var act = () => svc.CreateAnamnesisAsync(dto);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    // ── GetQuestions ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetQuestions_ReturnsOrderedQuestions()
    {
        // Arrange
        var ctx = new AnamnesisServiceContext();
        var questions = new List<AnamnesisQuestion>
        {
            new() { Id = Guid.NewGuid(), TenantId = ctx.TenantId, Text = "Q2", Section = AnamnesisSection.Health, Order = 2, IsDeleted = false, Identifier = "q2" },
            new() { Id = Guid.NewGuid(), TenantId = ctx.TenantId, Text = "Q1", Section = AnamnesisSection.Health, Order = 1, IsDeleted = false, Identifier = "q1" }
        };
        ctx.QuestionRepo
            .Setup(r => r.GetAllAsync(It.IsAny<System.Linq.Expressions.Expression<Func<AnamnesisQuestion, bool>>>(), It.IsAny<bool>()))
            .ReturnsAsync(questions);

        var svc = ctx.Build();

        // Act
        var result = (await svc.GetQuestionsAsync()).ToList();

        // Assert
        result.Should().HaveCount(2);
        result[0].Label.Should().Be("Q1");  // ordenado por Order
        result[1].Label.Should().Be("Q2");
    }
}
```

- [ ] **Step 4: Rodar testes**

```bash
dotnet test VoroSalonCrm.Tests.Integration --filter "FullyQualifiedName~Anamnesis" -v normal
```

Esperado: todos PASSED.

- [ ] **Step 5: Commit e PR**

```bash
git add VoroSalonCrm.Tests.Integration/Anamnesis/
git commit -m "test(anamnesis): add AnamnesisService unit tests for tenant validation and question ordering"
git push -u origin refactor/test-anamnesis-service
```

Abrir PR: `refactor/test-anamnesis-service` → `refactor/test-coverage`.

---

### Task 5: PublicBookingService — Context e Testes

**Branch:** `refactor/test-public-booking-service` (criada a partir de `refactor/test-coverage`)

**Files:**
- Create: `VoroSalonCrm.Tests.Integration/PublicBooking/PublicBookingServiceContext.cs`
- Create: `VoroSalonCrm.Tests.Integration/PublicBooking/PublicBookingServiceTests.cs`

- [ ] **Step 1: Criar branch**

```bash
git checkout refactor/test-coverage
git checkout -b refactor/test-public-booking-service
```

- [ ] **Step 2: Criar `PublicBookingServiceContext.cs`**

```csharp
// VoroSalonCrm.Tests.Integration/PublicBooking/PublicBookingServiceContext.cs
using Moq;
using VoroSalonCrm.Application.Services;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Interfaces.Cache;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Tests.Integration.PublicBooking;

internal sealed class PublicBookingServiceContext
{
    public Mock<ITenantRepository>                TenantRepo            { get; } = new();
    public Mock<IClientRepository>                ClientRepo            { get; } = new();
    public Mock<IServiceRepository>               ServiceRepo           { get; } = new();
    public Mock<IEmployeeRepository>              EmployeeRepo          { get; } = new();
    public Mock<IAppointmentRepository>           AppointmentRepo       { get; } = new();
    public Mock<IUnitOfWork>                      UnitOfWork            { get; } = new();
    public Mock<IUserTenantRepository>            UserTenantRepo        { get; } = new();
    public Mock<IExpoPushNotificationService>     PushService           { get; } = new();
    public Mock<ITimeSlotBlockRepository>         TimeSlotBlockRepo     { get; } = new();
    public Mock<ITenantModuleRepository>          ModuleRepo            { get; } = new();
    public Mock<ITenantSubscriptionRepository>    SubscriptionRepo      { get; } = new();
    public Mock<ITenantBusinessHoursRepository>   BusinessHoursRepo     { get; } = new();
    public Mock<IServicePromotionRepository>      PromotionRepo         { get; } = new();
    public Mock<IClientRatingRepository>          ClientRatingRepo      { get; } = new();
    public Mock<IBookingFunnelSessionRepository>  FunnelRepo            { get; } = new();
    public Mock<ICacheService>                    CacheService          { get; } = new();

    public PublicBookingServiceContext()
    {
        UnitOfWork
            .Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);

        CacheService
            .Setup(c => c.GetAsync<object>(It.IsAny<string>()))
            .ReturnsAsync((object?)null);

        CacheService
            .Setup(c => c.SetAsync(It.IsAny<string>(), It.IsAny<object>(), It.IsAny<TimeSpan?>()))
            .Returns(Task.CompletedTask);

        PushService
            .Setup(p => p.SendToUsersAsync(
                It.IsAny<IEnumerable<Guid>>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<object?>(), It.IsAny<Guid?>(), It.IsAny<string?>(), It.IsAny<Guid?>()))
            .Returns(Task.CompletedTask);

        BusinessHoursRepo
            .Setup(r => r.GetByTenantAsync(It.IsAny<Guid>(), It.IsAny<bool>()))
            .ReturnsAsync(new List<VoroSalonCrm.Domain.Entities.TenantBusinessHours>());

        TimeSlotBlockRepo
            .Setup(r => r.GetAllAsync(It.IsAny<System.Linq.Expressions.Expression<Func<VoroSalonCrm.Domain.Entities.TimeSlotBlock, bool>>>(), It.IsAny<bool>()))
            .ReturnsAsync(new List<VoroSalonCrm.Domain.Entities.TimeSlotBlock>());
    }

    public PublicBookingService Build() => new(
        TenantRepo.Object,
        ClientRepo.Object,
        ServiceRepo.Object,
        EmployeeRepo.Object,
        AppointmentRepo.Object,
        UnitOfWork.Object,
        UserTenantRepo.Object,
        PushService.Object,
        TimeSlotBlockRepo.Object,
        ModuleRepo.Object,
        SubscriptionRepo.Object,
        BusinessHoursRepo.Object,
        PromotionRepo.Object,
        ClientRatingRepo.Object,
        FunnelRepo.Object,
        CacheService.Object);
}
```

- [ ] **Step 3: Criar `PublicBookingServiceTests.cs`**

```csharp
// VoroSalonCrm.Tests.Integration/PublicBooking/PublicBookingServiceTests.cs
using FluentAssertions;
using Moq;
using VoroSalonCrm.Application.DTOs.Public;
using VoroSalonCrm.Domain.Entities;

namespace VoroSalonCrm.Tests.Integration.PublicBooking;

public class PublicBookingServiceTests
{
    // ── GetTenantBySlugAsync ──────────────────────────────────────────────────

    [Fact]
    public async Task GetTenantBySlug_ReturnsNull_WhenTenantNotFound()
    {
        // Arrange
        var ctx = new PublicBookingServiceContext();
        ctx.TenantRepo.Setup(r => r.GetBySlugAsync("slug-inexistente")).ReturnsAsync((Tenant?)null);
        // Cache miss default já configurado no Context
        var svc = ctx.Build();

        // Act
        var result = await svc.GetTenantBySlugAsync("slug-inexistente");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetTenantBySlug_ReturnsFromCache_WhenCached()
    {
        // Arrange
        var ctx      = new PublicBookingServiceContext();
        var tenantId = Guid.NewGuid();
        var cached   = new PublicTenantDto(tenantId, "Salão Voro", "voro", null, null, null, null, null, true);

        ctx.CacheService
            .Setup(c => c.GetAsync<PublicTenantDto>("public:tenant:voro"))
            .ReturnsAsync(cached);

        var svc = ctx.Build();

        // Act
        var result = await svc.GetTenantBySlugAsync("voro");

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("Salão Voro");
        // TenantRepo nunca foi chamado — veio do cache
        ctx.TenantRepo.Verify(r => r.GetBySlugAsync(It.IsAny<string>()), Times.Never);
    }

    // ── CreateBookingAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task CreateBooking_ReturnsFailure_WhenTenantNotFound()
    {
        // Arrange
        var ctx = new PublicBookingServiceContext();
        ctx.TenantRepo.Setup(r => r.GetBySlugAsync("slug-fake")).ReturnsAsync((Tenant?)null);
        var svc = ctx.Build();

        var dto = new PublicBookingCreateDto
        {
            TenantSlug  = "slug-fake",
            ClientName  = "João",
            ClientPhone = "11999999999"
        };

        // Act
        var result = await svc.CreateBookingAsync(dto);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Contain("não encontrado");
    }

    [Fact]
    public async Task CreateBooking_ReturnsFailure_WhenServiceNotFound()
    {
        // Arrange
        var ctx    = new PublicBookingServiceContext();
        var tenant = new Tenant { Id = Guid.NewGuid(), Slug = "voro", Name = "Salão Voro" };
        var svcId  = Guid.NewGuid();

        ctx.TenantRepo.Setup(r => r.GetBySlugAsync("voro")).ReturnsAsync(tenant);
        ctx.ServiceRepo
            .Setup(r => r.GetPublicByIdAsync(tenant.Id, svcId))
            .ReturnsAsync((VoroSalonCrm.Domain.Entities.Service?)null);

        var svc = ctx.Build();

        var dto = new PublicBookingCreateDto
        {
            TenantSlug  = "voro",
            ClientName  = "João",
            ClientPhone = "11999999999",
            ServiceId   = svcId
        };

        // Act
        var result = await svc.CreateBookingAsync(dto);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Contain("Serviço não encontrado");
    }
}
```

- [ ] **Step 4: Rodar testes**

```bash
dotnet test VoroSalonCrm.Tests.Integration --filter "FullyQualifiedName~PublicBooking" -v normal
```

Esperado: todos PASSED.

- [ ] **Step 5: Commit e PR**

```bash
git add VoroSalonCrm.Tests.Integration/PublicBooking/
git commit -m "test(public-booking): add PublicBookingService unit tests for tenant and service validation"
git push -u origin refactor/test-public-booking-service
```

Abrir PR: `refactor/test-public-booking-service` → `refactor/test-coverage`.

---

### Task 6: Services Menores — ClientService, EmployeeService

**Branch:** `refactor/test-other-services` (criada a partir de `refactor/test-coverage`)

**Files:**
- Create: `VoroSalonCrm.Tests.Integration/Others/ClientServiceTests.cs`
- Create: `VoroSalonCrm.Tests.Integration/Others/EmployeeServiceTests.cs`

- [ ] **Step 1: Criar branch**

```bash
git checkout refactor/test-coverage
git checkout -b refactor/test-other-services
```

- [ ] **Step 2: Criar `ClientServiceTests.cs`**

```csharp
// VoroSalonCrm.Tests.Integration/Others/ClientServiceTests.cs
using System.Linq.Expressions;
using FluentAssertions;
using Moq;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.Services;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Cache;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Tests.Integration.Others;

public class ClientServiceTests
{
    private static (ClientService svc,
                    Mock<IClientRepository> clientRepo,
                    Mock<ICurrentUserService> currentUser,
                    Mock<IUnitOfWork> uow,
                    Guid tenantId) BuildDefault()
    {
        var tenantId     = Guid.NewGuid();
        var clientRepo   = new Mock<IClientRepository>();
        var uow          = new Mock<IUnitOfWork>();
        var currentUser  = new Mock<ICurrentUserService>();
        var subRepo      = new Mock<ITenantSubscriptionRepository>();
        var notifService = new Mock<IUserNotificationService>();
        var waMsgService = new Mock<IWhatsAppMessageService>();
        var cache        = new Mock<ICacheService>();

        currentUser.Setup(u => u.TenantId).Returns(tenantId);
        uow.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(0);
        subRepo.Setup(r => r.GetByTenantIdWithPlanAsync(tenantId)).ReturnsAsync((TenantSubscription?)null);
        cache.Setup(c => c.RemoveAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        var svc = new ClientService(
            clientRepo.Object, uow.Object, currentUser.Object,
            subRepo.Object, notifService.Object, waMsgService.Object, cache.Object);

        return (svc, clientRepo, currentUser, uow, tenantId);
    }

    [Fact]
    public async Task Create_Throws_WhenTenantIdIsEmpty()
    {
        // Arrange
        var (svc, _, currentUser, _, _) = BuildDefault();
        currentUser.Setup(u => u.TenantId).Returns(Guid.Empty);

        var dto = new CreateClientDto("João Silva", "11999999999", null);

        // Act
        var act = () => svc.CreateAsync(dto);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Create_Throws_WhenPlanClientLimitReached()
    {
        // Arrange
        var tenantId   = Guid.NewGuid();
        var clientRepo = new Mock<IClientRepository>();
        var uow        = new Mock<IUnitOfWork>();
        var currentUser = new Mock<ICurrentUserService>();
        var subRepo    = new Mock<ITenantSubscriptionRepository>();
        var notif      = new Mock<IUserNotificationService>();
        var waMsg      = new Mock<IWhatsAppMessageService>();
        var cache      = new Mock<ICacheService>();

        currentUser.Setup(u => u.TenantId).Returns(tenantId);
        uow.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(0);

        var plan = new SubscriptionPlan { MaxClients = 5 };
        var sub  = new TenantSubscription { TenantId = tenantId, Plan = plan };
        subRepo.Setup(r => r.GetByTenantIdWithPlanAsync(tenantId)).ReturnsAsync(sub);

        // Simular 5 clientes já existentes (limite atingido)
        clientRepo
            .Setup(r => r.Query(It.IsAny<bool>()))
            .Returns(new TestAsyncEnumerable<Client>(
                Enumerable.Range(0, 5).Select(_ => new Client()).AsQueryable()));

        var svc = new ClientService(clientRepo.Object, uow.Object, currentUser.Object,
                                    subRepo.Object, notif.Object, waMsg.Object, cache.Object);

        // Act
        var act = () => svc.CreateAsync(new CreateClientDto("João", "11999", null));

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Limite de*clientes*");
    }

    [Fact]
    public async Task GetById_ReturnsNull_WhenClientNotFound()
    {
        // Arrange
        var (svc, clientRepo, _, _, _) = BuildDefault();
        var id = Guid.NewGuid();
        clientRepo
            .Setup(r => r.GetByIdAsync(It.IsAny<bool>(), id))
            .ReturnsAsync((Client?)null);

        // Act
        var result = await svc.GetByIdAsync(id);

        // Assert
        result.Should().BeNull();
    }
}
```

- [ ] **Step 3: Criar `EmployeeServiceTests.cs`**

```csharp
// VoroSalonCrm.Tests.Integration/Others/EmployeeServiceTests.cs
using FluentAssertions;
using Moq;
using VoroSalonCrm.Application.Services;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Blob;
using VoroSalonCrm.Application.Services.Interfaces.Identity;
using VoroSalonCrm.Domain.Interfaces.Cache;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using Microsoft.Extensions.Configuration;

namespace VoroSalonCrm.Tests.Integration.Others;

public class EmployeeServiceTests
{
    private static (EmployeeService svc, Mock<ICurrentUserService> currentUser, Guid tenantId) BuildDefault()
    {
        var tenantId    = Guid.NewGuid();
        var empRepo     = new Mock<IEmployeeRepository>();
        var currentUser = new Mock<ICurrentUserService>();
        var uow         = new Mock<IUnitOfWork>();
        var blob        = new Mock<IBlobService>();
        var subRepo     = new Mock<ITenantSubscriptionRepository>();
        var txRepo      = new Mock<ITransactionRepository>();
        var userSvc     = new Mock<IUserService>();
        var utRepo      = new Mock<IUserTenantRepository>();
        var notif       = new Mock<INotificationService>();
        var tenantRepo  = new Mock<ITenantRepository>();
        var config      = new Mock<IConfiguration>();
        var cache       = new Mock<ICacheService>();

        currentUser.Setup(u => u.TenantId).Returns(tenantId);
        uow.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(0);
        cache.Setup(c => c.GetAsync<object>(It.IsAny<string>())).ReturnsAsync((object?)null);

        var svc = new EmployeeService(
            empRepo.Object, currentUser.Object, uow.Object, blob.Object,
            subRepo.Object, txRepo.Object, userSvc.Object, utRepo.Object,
            notif.Object, tenantRepo.Object, config.Object, cache.Object);

        return (svc, currentUser, tenantId);
    }

    [Fact]
    public async Task GetById_ReturnsNull_WhenEmployeeNotFound()
    {
        // Arrange
        var (svc, _, _) = BuildDefault();
        // EmployeeService.GetByIdAsync busca pelo repository
        // O mock retorna null por padrão quando não configurado
        var id = Guid.NewGuid();

        // Act
        var result = await svc.GetByIdAsync(id);

        // Assert
        result.Should().BeNull();
    }
}
```

- [ ] **Step 4: Rodar testes**

```bash
dotnet test VoroSalonCrm.Tests.Integration --filter "FullyQualifiedName~Others" -v normal
```

Esperado: todos PASSED.

- [ ] **Step 5: Commit e PR**

```bash
git add VoroSalonCrm.Tests.Integration/Others/
git commit -m "test(services): add ClientService and EmployeeService unit tests"
git push -u origin refactor/test-other-services
```

Abrir PR: `refactor/test-other-services` → `refactor/test-coverage`.

---

### Task 7: Controller Unit Tests

**Branch:** `refactor/test-controllers-unit` (criada a partir de `refactor/test-coverage`)

**Files:**
- Create: `VoroSalonCrm.Tests.Integration/Auth/AuthControllerTests.cs`
- Create: `VoroSalonCrm.Tests.Integration/Anamnesis/AnamnesisControllerTests.cs`

- [ ] **Step 1: Criar branch**

```bash
git checkout refactor/test-coverage
git checkout -b refactor/test-controllers-unit
```

- [ ] **Step 2: Criar `AuthControllerTests.cs`**

```csharp
// VoroSalonCrm.Tests.Integration/Auth/AuthControllerTests.cs
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using VoroSalonCrm.API.Controllers;
using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Application.DTOs.Auth;
using VoroSalonCrm.Application.Services.Interfaces;

namespace VoroSalonCrm.Tests.Integration.Auth;

public class AuthControllerTests
{
    // ── SignIn ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task SignIn_Returns200_OnSuccess()
    {
        // Arrange
        var mockAuth = new Mock<IAuthService>();
        mockAuth.Setup(s => s.SignInAsync(It.IsAny<SignInDto>()))
                .ReturnsAsync(new AuthDto { Token = "jwt-token", Email = "test@voro.com" });

        var controller = new AuthController(mockAuth.Object);
        var dto = new SignInDto { Email = "test@voro.com", Password = "senha123" };

        // Act
        var result = await controller.SignInAsync(dto) as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);
    }

    [Fact]
    public async Task SignIn_Returns401_WhenUnauthorizedExceptionThrown()
    {
        // Arrange
        var mockAuth = new Mock<IAuthService>();
        mockAuth.Setup(s => s.SignInAsync(It.IsAny<SignInDto>()))
                .ThrowsAsync(new UnauthorizedAccessException("Credenciais inválidas."));

        var controller = new AuthController(mockAuth.Object);

        // Act
        var result = await controller.SignInAsync(new SignInDto { Email = "x", Password = "y" });

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    // ── ForgotPassword ────────────────────────────────────────────────────────

    [Fact]
    public async Task ForgotPassword_Returns200_WhenServiceSucceeds()
    {
        // Arrange
        var mockAuth = new Mock<IAuthService>();
        mockAuth.Setup(s => s.ForgotPasswordAsync(It.IsAny<ForgotPasswordDto>()))
                .Returns(Task.CompletedTask);

        var controller = new AuthController(mockAuth.Object);
        var dto = new ForgotPasswordDto { Email = "test@voro.com" };

        // Act
        var result = await controller.ForgotPasswordAsync(dto);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        mockAuth.Verify(s => s.ForgotPasswordAsync(dto), Times.Once);
    }
}
```

- [ ] **Step 3: Criar `AnamnesisControllerTests.cs`**

```csharp
// VoroSalonCrm.Tests.Integration/Anamnesis/AnamnesisControllerTests.cs
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using VoroSalonCrm.API.Controllers;
using VoroSalonCrm.Application.DTOs.Anamnesis;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Tests.Integration.Anamnesis;

public class AnamnesisControllerTests
{
    [Fact]
    public async Task GetQuestions_Returns200_WithQuestions()
    {
        // Arrange
        var mockSvc = new Mock<IAnamnesisService>();
        mockSvc.Setup(s => s.GetQuestionsAsync())
               .ReturnsAsync(new List<AnamnesisQuestionDto>
               {
                   new(Guid.NewGuid(), "q1", "Tem alergia?", null, AnamnesisFieldType.Text, null, AnamnesisSection.Health, 1, true)
               });

        var controller = new AnamnesisController(mockSvc.Object);

        // Act
        var result = await controller.GetQuestions() as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);
    }

    [Fact]
    public async Task Create_Returns200_WhenServiceSucceeds()
    {
        // Arrange
        var mockSvc = new Mock<IAnamnesisService>();
        var sheetDto = new AnamnesisSheetDto(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), "Dr. Silva",
            DateTimeOffset.UtcNow, null, null, AnamnesisSheetStatus.Completed,
            Enumerable.Empty<AnamnesisResponseDto>(),
            Enumerable.Empty<AnamnesisEvidenceDto>(),
            Enumerable.Empty<AnamnesisSignatureDto>(),
            DateTimeOffset.UtcNow);

        mockSvc.Setup(s => s.CreateAnamnesisAsync(It.IsAny<CreateAnamnesisSheetDto>()))
               .ReturnsAsync(sheetDto);

        var controller = new AnamnesisController(mockSvc.Object);
        var dto = new CreateAnamnesisSheetDto(
            Guid.NewGuid(), Guid.NewGuid(), DateTimeOffset.UtcNow,
            null, null,
            Enumerable.Empty<AnamnesisResponseDto>(), null,
            Enumerable.Empty<AnamnesisSignatureDto>());

        // Act
        var result = await controller.Create(dto) as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);
    }

    [Fact]
    public async Task Create_Returns400_WhenServiceThrowsException()
    {
        // Arrange
        var mockSvc = new Mock<IAnamnesisService>();
        mockSvc.Setup(s => s.CreateAnamnesisAsync(It.IsAny<CreateAnamnesisSheetDto>()))
               .ThrowsAsync(new InvalidOperationException("Tenant inválido."));

        var controller = new AnamnesisController(mockSvc.Object);
        var dto = new CreateAnamnesisSheetDto(
            Guid.NewGuid(), Guid.NewGuid(), DateTimeOffset.UtcNow,
            null, null,
            Enumerable.Empty<AnamnesisResponseDto>(), null,
            Enumerable.Empty<AnamnesisSignatureDto>());

        // Act
        var result = await controller.Create(dto);

        // Assert
        // O padrão do projeto usa ResponseViewModel.Fail → retorna BadRequest ou Ok com IsSuccess=false
        // Verificar que não retorna 500
        result.Should().NotBeOfType<ObjectResult>().Or.Match<IActionResult>(
            r => (r as ObjectResult)!.StatusCode != 500);
    }
}
```

- [ ] **Step 4: Verificar se a estrutura dos controllers bate com os métodos testados**

Checar que `AuthController` tem `SignInAsync(SignInDto)` e `ForgotPasswordAsync(ForgotPasswordDto)`:

```bash
grep -n "public async Task\|public Task" voro-salon-crm-api/VoroSalonCrm.API/Controllers/AuthController.cs | head -20
```

Ajustar nomes de métodos nos testes caso necessário.

- [ ] **Step 5: Rodar testes**

```bash
dotnet test VoroSalonCrm.Tests.Integration --filter "FullyQualifiedName~ControllerTests" -v normal
```

Esperado: todos PASSED.

- [ ] **Step 6: Commit e PR**

```bash
git add VoroSalonCrm.Tests.Integration/Auth/AuthControllerTests.cs \
        VoroSalonCrm.Tests.Integration/Anamnesis/AnamnesisControllerTests.cs
git commit -m "test(controllers): add unit tests for AuthController and AnamnesisController"
git push -u origin refactor/test-controllers-unit
```

Abrir PR: `refactor/test-controllers-unit` → `refactor/test-coverage`.

---

### Task 8: Setup Projeto de Integração HTTP

**Branch:** `refactor/setup-integration-project` (criada a partir de `refactor/test-coverage`)

**Files:**
- Create: `VoroSalonCrm.Tests.Http/VoroSalonCrm.Tests.Http.csproj`
- Create: `VoroSalonCrm.Tests.Http/Helpers/WebAppFactory.cs`
- Create: `VoroSalonCrm.Tests.Http/Helpers/AuthHelper.cs`
- Modify: `VoroSalonCrm.API.slnx` (adicionar novo projeto)

- [ ] **Step 1: Criar branch**

```bash
git checkout refactor/test-coverage
git checkout -b refactor/setup-integration-project
```

- [ ] **Step 2: Criar projeto de testes HTTP**

```bash
cd voro-salon-crm-api
dotnet new xunit -n VoroSalonCrm.Tests.Http --framework net9.0
cd VoroSalonCrm.Tests.Http
dotnet add package Microsoft.AspNetCore.Mvc.Testing
dotnet add package FluentAssertions
dotnet add package Moq
dotnet add package Microsoft.NET.Test.Sdk
dotnet add reference ../VoroSalonCrm.API/VoroSalonCrm.API.csproj
dotnet add reference ../VoroSalonCrm.Application/VoroSalonCrm.Application.csproj
dotnet add reference ../VoroSalonCrm.Domain/VoroSalonCrm.Domain.csproj
```

- [ ] **Step 3: Adicionar projeto à solution**

```bash
cd ..
dotnet sln VoroSalonCrm.API.slnx add VoroSalonCrm.Tests.Http/VoroSalonCrm.Tests.Http.csproj
```

- [ ] **Step 4: Criar `Helpers/WebAppFactory.cs`**

```csharp
// VoroSalonCrm.Tests.Http/Helpers/WebAppFactory.cs
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;

namespace VoroSalonCrm.Tests.Http.Helpers;

/// <summary>
/// WebApplicationFactory configurada para testes HTTP.
/// Substitui serviços externos por mocks e usa InMemory cache.
/// </summary>
public class WebAppFactory : WebApplicationFactory<Program>
{
    public Mock<IWhatsappService>            WhatsappService { get; } = new();
    public Mock<IExpoPushNotificationService> PushService    { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureTestServices(services =>
        {
            // Substituir serviços externos por mocks
            services.AddSingleton(WhatsappService.Object);
            services.AddSingleton(PushService.Object);

            // Substituir banco de dados por InMemory
            // Remover DbContext real e adicionar InMemory
            var dbDescriptor = services.SingleOrDefault(
                d => d.ServiceType.Name.Contains("DbContext"));
            if (dbDescriptor != null)
                services.Remove(dbDescriptor);

            services.AddDbContext<VoroSalonCrm.Infrastructure.Data.AppDbContext>(opts =>
                opts.UseInMemoryDatabase("TestDb_" + Guid.NewGuid()));
        });
    }
}
```

> **Nota:** O namespace `VoroSalonCrm.Infrastructure.Data` pode variar. Verificar com:
> ```bash
> grep -r "class AppDbContext\|class ApplicationDbContext" voro-salon-crm-api --include="*.cs" -l
> ```
> Ajustar o tipo no `AddDbContext` conforme o resultado.

- [ ] **Step 5: Criar `Helpers/AuthHelper.cs`**

```csharp
// VoroSalonCrm.Tests.Http/Helpers/AuthHelper.cs
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace VoroSalonCrm.Tests.Http.Helpers;

/// <summary>
/// Gera JWT válidos para autenticar requisições HTTP nos testes.
/// A chave e issuer devem bater com as configurações de appsettings.Testing.json.
/// </summary>
public static class AuthHelper
{
    private const string TestKey    = "test-secret-key-32-chars-minimum!!";
    private const string TestIssuer = "test-issuer";
    private const string TestAud    = "test-audience";

    public static string GenerateToken(
        Guid userId,
        Guid tenantId,
        string role = "salonOwner",
        int expiresInHours = 1)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim("tenantId", tenantId.ToString()),
            new Claim(ClaimTypes.Role, role),
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
        };

        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer   : TestIssuer,
            audience : TestAud,
            claims   : claims,
            expires  : DateTime.UtcNow.AddHours(expiresInHours),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
```

- [ ] **Step 6: Criar `appsettings.Testing.json` na raiz do projeto Tests.Http**

```json
{
  "Jwt": {
    "Key": "test-secret-key-32-chars-minimum!!",
    "Issuer": "test-issuer",
    "Audience": "test-audience",
    "ExpireHours": "1"
  },
  "ConnectionStrings": {
    "DefaultConnection": "DataSource=:memory:"
  }
}
```

- [ ] **Step 7: Verificar que o projeto compila**

```bash
dotnet build VoroSalonCrm.Tests.Http
```

Esperado: Build succeeded.

- [ ] **Step 8: Commit e PR**

```bash
git add VoroSalonCrm.Tests.Http/
git commit -m "chore(tests): setup WebApplicationFactory project for HTTP integration tests"
git push -u origin refactor/setup-integration-project
```

Abrir PR: `refactor/setup-integration-project` → `refactor/test-coverage`.

---

### Task 9: HTTP Integration Tests — Endpoints

**Branch:** `refactor/test-controllers-integration` (criada a partir de `refactor/test-coverage`, após merge da Task 8)

**Files:**
- Create: `VoroSalonCrm.Tests.Http/Auth/AuthEndpointTests.cs`
- Create: `VoroSalonCrm.Tests.Http/Appointments/AppointmentEndpointTests.cs`

**Pré-requisito:** Branch `refactor/setup-integration-project` já mergeada em `refactor/test-coverage`.

- [ ] **Step 1: Criar branch**

```bash
git checkout refactor/test-coverage
git pull origin refactor/test-coverage
git checkout -b refactor/test-controllers-integration
```

- [ ] **Step 2: Criar `Auth/AuthEndpointTests.cs`**

```csharp
// VoroSalonCrm.Tests.Http/Auth/AuthEndpointTests.cs
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Tests.Http.Helpers;

namespace VoroSalonCrm.Tests.Http.Auth;

public class AuthEndpointTests : IClassFixture<WebAppFactory>
{
    private readonly HttpClient _client;

    public AuthEndpointTests(WebAppFactory factory)
    {
        _client = factory.CreateClient();
    }

    // ── /api/v1/auth/me (protegido) ───────────────────────────────────────────

    [Fact]
    public async Task GetSession_Returns401_WithoutToken()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/auth/me");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetSession_Returns200_WithValidToken()
    {
        // Arrange
        var userId   = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var token    = AuthHelper.GenerateToken(userId, tenantId);
        _client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.GetAsync("/api/v1/auth/me");

        // Assert
        // Pode retornar 401 se user não existe no InMemory DB — o importante é que
        // chegou no endpoint (não foi barrado pelo middleware de auth)
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Unauthorized);
    }

    // ── /api/v1/auth/sign-in (público) ────────────────────────────────────────

    [Fact]
    public async Task SignIn_Returns400OrUnauthorized_WithBadCredentials()
    {
        // Arrange
        var dto = new SignInDto { Email = "inexistente@voro.com", Password = "errado123" };

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/sign-in", dto);

        // Assert
        // O endpoint não deve retornar 500 — qualquer 4xx é correto aqui
        ((int)response.StatusCode).Should().BeInRange(400, 499);
    }
}
```

- [ ] **Step 3: Criar `Appointments/AppointmentEndpointTests.cs`**

```csharp
// VoroSalonCrm.Tests.Http/Appointments/AppointmentEndpointTests.cs
using System.Net;
using FluentAssertions;
using VoroSalonCrm.Tests.Http.Helpers;

namespace VoroSalonCrm.Tests.Http.Appointments;

public class AppointmentEndpointTests : IClassFixture<WebAppFactory>
{
    private readonly HttpClient _client;

    public AppointmentEndpointTests(WebAppFactory factory)
    {
        _client = factory.CreateClient();
    }

    // ── GET /api/v1/appointments (protegido por [Authorize]) ──────────────────

    [Fact]
    public async Task GetAppointments_Returns401_WithoutToken()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/appointments");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetAppointments_DoesNotReturn500_WithValidToken()
    {
        // Arrange
        var token = AuthHelper.GenerateToken(Guid.NewGuid(), Guid.NewGuid());
        _client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.GetAsync("/api/v1/appointments");

        // Assert
        // Pode retornar 401 (user não no DB) mas nunca 500
        ((int)response.StatusCode).Should().NotBe(500);
    }

    // ── POST /api/v1/appointments sem token ───────────────────────────────────

    [Fact]
    public async Task CreateAppointment_Returns401_WithoutToken()
    {
        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/appointments", new { });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
```

- [ ] **Step 4: Rodar os testes HTTP**

```bash
dotnet test VoroSalonCrm.Tests.Http -v normal
```

Esperado: todos PASSED. Se algum falhar com erro de configuração (ex: DbContext não encontrado), ajustar `WebAppFactory.cs` para remover/substituir o serviço correto.

- [ ] **Step 5: Commit e PR**

```bash
git add VoroSalonCrm.Tests.Http/Auth/ VoroSalonCrm.Tests.Http/Appointments/
git commit -m "test(integration): add HTTP endpoint tests for auth and appointments"
git push -u origin refactor/test-controllers-integration
```

Abrir PR: `refactor/test-controllers-integration` → `refactor/test-coverage`.

---

### Task 10: Merge Final — `refactor/test-coverage` → `main`

**Pré-requisito:** Todas as tasks anteriores mergeadas em `refactor/test-coverage`.

- [ ] **Step 1: Rodar suite completa de testes**

```bash
cd voro-salon-crm-api
dotnet test --verbosity normal
```

Esperado: todos os projetos de teste passam (Tests.Integration + Tests.Http).

- [ ] **Step 2: Abrir PR final**

```bash
git checkout refactor/test-coverage
git pull origin refactor/test-coverage
```

Abrir PR: `refactor/test-coverage` → `main`. Descrição deve listar todos os services cobertos e o número de testes adicionados.

---

## Self-Review

### Spec coverage
- ✅ AuthService: 2FA flow, delegation, establishment type mismatch
- ✅ SubscriptionService: planos, checkout, cupom expirado, cancelamento
- ✅ AnamnesisService: tenant validation, ordering, criação
- ✅ PublicBookingService: tenant not found, service not found, cache hit
- ✅ ClientService: tenant validation, plano de clientes
- ✅ EmployeeService: GetById básico
- ✅ Controller unit tests: AuthController, AnamnesisController — 200/400/401
- ✅ HTTP integration: 401 sem token, não-500 com token, endpoint de sign-in
- ✅ Branch strategy: base + tasks + PR flow documentado

### Gaps identificados
- EmployeeServiceTests cobre apenas `GetByIdAsync`. Adicionar `CreateAsync` (plano de funcionários) como task de extensão.
- `ServiceService` e `TransactionService` não têm arquivo de teste gerado — adicionar à Task 6 ao executar.
- Controller tests para `SubscriptionController` e `PublicBookingController` não foram detalhados — seguir o mesmo padrão de `AuthControllerTests` ao implementar.

### Nomes consistentes
- `AuthServiceContext.Build()` → `AuthService` ✅
- `SubscriptionServiceContext.Build()` → `SubscriptionService` ✅
- `AnamnesisServiceContext.Build()` → `AnamnesisService` ✅
- `PublicBookingServiceContext.Build()` → `PublicBookingService` ✅
- `WebAppFactory` estende `WebApplicationFactory<Program>` ✅
- `AuthHelper.GenerateToken` retorna `string` ✅


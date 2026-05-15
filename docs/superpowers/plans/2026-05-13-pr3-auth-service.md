# PR #3 — AuthService Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Pré-requisito:** PR #1 (`refactor/mediatr-setup`) mergeado em `improvement/api-refactor`.

**Goal:** Extrair a lógica do `AuthService` (698 linhas) para Handlers MediatR isolados e testáveis — SignIn, VerifyTwoFactor, RefreshToken, SignUp, ForgotPassword, ResetPassword.

**Architecture:** `AuthService` mantido como façade que injeta `IMediator`. Cada operação de autenticação vira um `IRequestHandler`. Controllers não são alterados.

**Tech Stack:** .NET 9, ASP.NET Core Identity, MediatR 12, xUnit, Moq, FluentAssertions

---

## File Structure

```
VoroSalonCrm.Application/
  Features/
    Auth/
      Commands/
        SignInCommand.cs                      ← CREATE
        SignInCommandHandler.cs               ← CREATE
        VerifyTwoFactorCommand.cs             ← CREATE
        VerifyTwoFactorCommandHandler.cs      ← CREATE
        RefreshTokenCommand.cs                ← CREATE
        RefreshTokenCommandHandler.cs         ← CREATE
        SignUpCommand.cs                      ← CREATE
        SignUpCommandHandler.cs               ← CREATE
        ForgotPasswordCommand.cs              ← CREATE
        ForgotPasswordCommandHandler.cs       ← CREATE
        ResetPasswordCommand.cs               ← CREATE
        ResetPasswordCommandHandler.cs        ← CREATE
  Services/
    AuthService.cs                            ← MODIFY: virar façade

VoroSalonCrm.Tests.Integration/
  Auth/
    Commands/
      SignInCommandHandlerTests.cs            ← CREATE
      VerifyTwoFactorCommandHandlerTests.cs   ← CREATE
    AuthServiceContext.cs                     ← KEEP (mantido sem mudança)
```

---

### Task 1: Criar branch

- [ ] **Step 1: Criar branch a partir de `improvement/api-refactor`**

```bash
cd voro-salon-crm-api
git checkout improvement/api-refactor
git pull origin improvement/api-refactor
git checkout -b refactor/auth-service
```

---

### Task 2: Criar SignInCommandHandler

**Files:**
- Create: `VoroSalonCrm.Application/Features/Auth/Commands/SignInCommand.cs`
- Create: `VoroSalonCrm.Application/Features/Auth/Commands/SignInCommandHandler.cs`
- Create: `VoroSalonCrm.Tests.Integration/Auth/Commands/SignInCommandHandlerTests.cs`

- [ ] **Step 1: Criar testes falhando**

Criar `VoroSalonCrm.Tests.Integration/Auth/Commands/SignInCommandHandlerTests.cs`:

```csharp
using FluentAssertions;
using Moq;
using VoroSalonCrm.Application.DTOs.Auth;
using VoroSalonCrm.Application.Features.Auth.Commands;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Identity;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Entities.Identity;

namespace VoroSalonCrm.Tests.Integration.Auth.Commands;

public class SignInCommandHandlerTests
{
    private readonly Mock<IUserService>          _userService         = new();
    private readonly Mock<INotificationService>  _notificationService = new();

    private SignInCommandHandler Build() => new(
        _userService.Object,
        _notificationService.Object);

    [Fact]
    public async Task Handle_WhenCredentialsInvalid_ThrowsUnauthorized()
    {
        // Arrange
        _userService
            .Setup(u => u.GetByEmailAndPassword(It.IsAny<string>(), It.IsAny<string>()))
            .ThrowsAsync(new UnauthorizedAccessException("Credenciais inválidas."));

        var handler = Build();
        var command = new SignInCommand(new SignInDto("test@test.com", "wrong", null));

        // Act
        var act = () => handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Credenciais inválidas.");
    }

    [Fact]
    public async Task Handle_WhenTwoFactorEnabled_Returns2FaPendingToken()
    {
        // Arrange
        var user = new User
        {
            Id              = Guid.NewGuid(),
            Email           = "user@test.com",
            EmailConfirmed  = true,
            TwoFactorEnabled = true,
            UserTenants     = new List<UserTenant>()
        };

        _userService
            .Setup(u => u.GetByEmailAndPassword("user@test.com", "pass"))
            .ReturnsAsync((user, new List<string>()));

        _userService
            .Setup(u => u.GenerateTwoFactorCodeAsync(user.Id))
            .ReturnsAsync(("123456", "pending-token-abc"));

        _notificationService
            .Setup(n => n.SendTwoFactorCodeAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Tenant?>()))
            .Returns(Task.CompletedTask);

        var handler = Build();
        var command = new SignInCommand(new SignInDto("user@test.com", "pass", null));

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.RequiresTwoFactor.Should().BeTrue();
        result.PendingToken.Should().Be("pending-token-abc");
        result.Token.Should().BeNullOrEmpty();
    }

    [Fact]
    public async Task Handle_WhenEstablishmentTypeMismatch_ThrowsUnauthorized()
    {
        // Arrange
        var tenant = new Tenant { Id = Guid.NewGuid(), EstablishmentType = Domain.Enums.EstablishmentType.Salon };
        var user = new User
        {
            Id               = Guid.NewGuid(),
            Email            = "user@test.com",
            TwoFactorEnabled = true,
            UserTenants      = new List<UserTenant>
            {
                new() { IsDefault = true, Tenant = tenant }
            }
        };

        _userService
            .Setup(u => u.GetByEmailAndPassword(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync((user, new List<string>()));

        _userService
            .Setup(u => u.GenerateTwoFactorCodeAsync(user.Id))
            .ReturnsAsync(("code", "token"));

        var handler = Build();
        // EstablishmentType = 99 não bate com Salon (valor numérico diferente)
        var command = new SignInCommand(new SignInDto("user@test.com", "pass", 99));

        // Act
        var act = () => handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*endereço de acesso*");
    }
}
```

- [ ] **Step 2: Rodar para confirmar que falha**

```bash
dotnet test VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj \
  --filter "SignInCommandHandlerTests" --verbosity normal
```

Expected: FAIL — tipos não existem.

- [ ] **Step 3: Criar `SignInCommand`**

Criar `VoroSalonCrm.Application/Features/Auth/Commands/SignInCommand.cs`:

```csharp
using MediatR;
using VoroSalonCrm.Application.DTOs.Auth;

namespace VoroSalonCrm.Application.Features.Auth.Commands;

public record SignInCommand(SignInDto Dto) : IRequest<AuthDto>;
```

- [ ] **Step 4: Criar `SignInCommandHandler`**

Criar `VoroSalonCrm.Application/Features/Auth/Commands/SignInCommandHandler.cs`:

```csharp
using MediatR;
using VoroSalonCrm.Application.DTOs.Auth;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Identity;
using VoroSalonCrm.Shared.Constants;

namespace VoroSalonCrm.Application.Features.Auth.Commands;

public class SignInCommandHandler(
    IUserService         userService,
    INotificationService notificationService)
    : IRequestHandler<SignInCommand, AuthDto>
{
    public async Task<AuthDto> Handle(SignInCommand request, CancellationToken cancellationToken)
    {
        var dto = request.Dto;
        var (user, rolesNames) = await userService.GetByEmailAndPassword(dto.Email, dto.Password);

        if (!user.TwoFactorEnabled)
            return new AuthDto(RequiresTwoFactor: false, PendingToken: null, Token: null, User: null);

        var (code, pendingToken) = await userService.GenerateTwoFactorCodeAsync(user.Id);

        var userName = !string.IsNullOrEmpty(user.FirstName)
            ? $"{user.FirstName} {user.LastName}".Trim()
            : user.UserName ?? string.Empty;

        var primaryTenant = user.UserTenants?.FirstOrDefault(ut => ut.IsDefault)?.Tenant
                         ?? user.UserTenants?.FirstOrDefault()?.Tenant;

        if (dto.EstablishmentType.HasValue && primaryTenant != null &&
            (int)primaryTenant.EstablishmentType != dto.EstablishmentType.Value)
            throw new UnauthorizedAccessException(
                "Credenciais inválidas para este endereço de acesso.");

        if (user.EmailConfirmed && !ReviewerConstants.IsReviewer(user.Email))
            await notificationService.SendTwoFactorCodeAsync(user.Email!, userName, code, primaryTenant);

        return new AuthDto(RequiresTwoFactor: true, PendingToken: pendingToken, Token: null, User: null);
    }
}
```

- [ ] **Step 5: Rodar testes para confirmar que passam**

```bash
dotnet test VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj \
  --filter "SignInCommandHandlerTests" --verbosity normal
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add VoroSalonCrm.Application/Features/Auth/Commands/SignInCommand.cs
git add VoroSalonCrm.Application/Features/Auth/Commands/SignInCommandHandler.cs
git add VoroSalonCrm.Tests.Integration/Auth/Commands/SignInCommandHandlerTests.cs
git commit -m "feat(auth): criar SignInCommandHandler com testes"
```

---

### Task 3: Criar VerifyTwoFactorCommandHandler

**Files:**
- Create: `VoroSalonCrm.Application/Features/Auth/Commands/VerifyTwoFactorCommand.cs`
- Create: `VoroSalonCrm.Application/Features/Auth/Commands/VerifyTwoFactorCommandHandler.cs`
- Create: `VoroSalonCrm.Tests.Integration/Auth/Commands/VerifyTwoFactorCommandHandlerTests.cs`

- [ ] **Step 1: Criar testes falhando**

Criar `VoroSalonCrm.Tests.Integration/Auth/Commands/VerifyTwoFactorCommandHandlerTests.cs`:

```csharp
using FluentAssertions;
using Moq;
using VoroSalonCrm.Application.DTOs.Auth;
using VoroSalonCrm.Application.Features.Auth.Commands;
using VoroSalonCrm.Application.Services.Interfaces.Identity;

namespace VoroSalonCrm.Tests.Integration.Auth.Commands;

public class VerifyTwoFactorCommandHandlerTests
{
    private readonly Mock<IUserService> _userService = new();

    private VerifyTwoFactorCommandHandler Build() => new(_userService.Object);

    [Fact]
    public async Task Handle_WhenCodeIsInvalid_ThrowsUnauthorized()
    {
        // Arrange
        _userService
            .Setup(u => u.VerifyTwoFactorCodeAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync((false, null));

        var handler = Build();
        var command = new VerifyTwoFactorCommand(new VerifyTwoFactorDto("pending-token", "wrong-code"));

        // Act
        var act = () => handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Handle_WhenCodeIsValid_ReturnsAuthDtoWithToken()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _userService
            .Setup(u => u.VerifyTwoFactorCodeAsync("pending-token", "123456"))
            .ReturnsAsync((true, userId));

        _userService
            .Setup(u => u.GenerateJwtAsync(userId))
            .ReturnsAsync("jwt-token-xyz");

        var handler = Build();
        var command = new VerifyTwoFactorCommand(new VerifyTwoFactorDto("pending-token", "123456"));

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Token.Should().Be("jwt-token-xyz");
        result.RequiresTwoFactor.Should().BeFalse();
    }
}
```

- [ ] **Step 2: Rodar para confirmar que falha**

```bash
dotnet test VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj \
  --filter "VerifyTwoFactorCommandHandlerTests" --verbosity normal
```

Expected: FAIL

- [ ] **Step 3: Criar `VerifyTwoFactorCommand`**

Criar `VoroSalonCrm.Application/Features/Auth/Commands/VerifyTwoFactorCommand.cs`:

```csharp
using MediatR;
using VoroSalonCrm.Application.DTOs.Auth;

namespace VoroSalonCrm.Application.Features.Auth.Commands;

public record VerifyTwoFactorCommand(VerifyTwoFactorDto Dto) : IRequest<AuthDto>;
```

- [ ] **Step 4: Criar `VerifyTwoFactorCommandHandler`**

Criar `VoroSalonCrm.Application/Features/Auth/Commands/VerifyTwoFactorCommandHandler.cs`:

```csharp
using MediatR;
using VoroSalonCrm.Application.DTOs.Auth;
using VoroSalonCrm.Application.Services.Interfaces.Identity;

namespace VoroSalonCrm.Application.Features.Auth.Commands;

public class VerifyTwoFactorCommandHandler(IUserService userService)
    : IRequestHandler<VerifyTwoFactorCommand, AuthDto>
{
    public async Task<AuthDto> Handle(VerifyTwoFactorCommand request, CancellationToken cancellationToken)
    {
        var (isValid, userId) = await userService.VerifyTwoFactorCodeAsync(
            request.Dto.PendingToken, request.Dto.Code);

        if (!isValid || userId is null)
            throw new UnauthorizedAccessException("Código 2FA inválido ou expirado.");

        var token = await userService.GenerateJwtAsync(userId.Value);

        return new AuthDto(RequiresTwoFactor: false, PendingToken: null, Token: token, User: null);
    }
}
```

- [ ] **Step 5: Rodar testes para confirmar que passam**

```bash
dotnet test VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj \
  --filter "VerifyTwoFactorCommandHandlerTests" --verbosity normal
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add VoroSalonCrm.Application/Features/Auth/Commands/VerifyTwoFactorCommand.cs
git add VoroSalonCrm.Application/Features/Auth/Commands/VerifyTwoFactorCommandHandler.cs
git add VoroSalonCrm.Tests.Integration/Auth/Commands/VerifyTwoFactorCommandHandlerTests.cs
git commit -m "feat(auth): criar VerifyTwoFactorCommandHandler com testes"
```

---

### Task 4: Criar handlers restantes (RefreshToken, SignUp, ForgotPassword, ResetPassword)

**Files:**
- Create: `VoroSalonCrm.Application/Features/Auth/Commands/RefreshTokenCommand.cs`
- Create: `VoroSalonCrm.Application/Features/Auth/Commands/RefreshTokenCommandHandler.cs`
- Create: `VoroSalonCrm.Application/Features/Auth/Commands/SignUpCommand.cs`
- Create: `VoroSalonCrm.Application/Features/Auth/Commands/SignUpCommandHandler.cs`
- Create: `VoroSalonCrm.Application/Features/Auth/Commands/ForgotPasswordCommand.cs`
- Create: `VoroSalonCrm.Application/Features/Auth/Commands/ForgotPasswordCommandHandler.cs`
- Create: `VoroSalonCrm.Application/Features/Auth/Commands/ResetPasswordCommand.cs`
- Create: `VoroSalonCrm.Application/Features/Auth/Commands/ResetPasswordCommandHandler.cs`

- [ ] **Step 1: Criar `RefreshTokenCommand` e handler**

Criar `VoroSalonCrm.Application/Features/Auth/Commands/RefreshTokenCommand.cs`:
```csharp
using MediatR;
using VoroSalonCrm.Application.DTOs.Auth;

namespace VoroSalonCrm.Application.Features.Auth.Commands;

public record RefreshTokenCommand(string RefreshToken) : IRequest<AuthDto>;
```

Criar `VoroSalonCrm.Application/Features/Auth/Commands/RefreshTokenCommandHandler.cs`:
```csharp
using MediatR;
using VoroSalonCrm.Application.DTOs.Auth;
using VoroSalonCrm.Application.Services.Interfaces.Identity;

namespace VoroSalonCrm.Application.Features.Auth.Commands;

public class RefreshTokenCommandHandler(IUserService userService)
    : IRequestHandler<RefreshTokenCommand, AuthDto>
{
    public async Task<AuthDto> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        var token = await userService.RefreshTokenAsync(request.RefreshToken);
        return new AuthDto(RequiresTwoFactor: false, PendingToken: null, Token: token, User: null);
    }
}
```

- [ ] **Step 2: Criar `SignUpCommand` e handler**

Criar `VoroSalonCrm.Application/Features/Auth/Commands/SignUpCommand.cs`:
```csharp
using MediatR;
using VoroSalonCrm.Application.DTOs.Auth;

namespace VoroSalonCrm.Application.Features.Auth.Commands;

public record SignUpCommand(SignUpDto Dto) : IRequest<AuthDto>;
```

Criar `VoroSalonCrm.Application/Features/Auth/Commands/SignUpCommandHandler.cs`:
```csharp
using MediatR;
using VoroSalonCrm.Application.DTOs.Auth;
using VoroSalonCrm.Application.Services.Interfaces.Identity;

namespace VoroSalonCrm.Application.Features.Auth.Commands;

public class SignUpCommandHandler(IUserService userService)
    : IRequestHandler<SignUpCommand, AuthDto>
{
    public async Task<AuthDto> Handle(SignUpCommand request, CancellationToken cancellationToken)
    {
        var result = await userService.SignUpAsync(request.Dto);
        return result;
    }
}
```

- [ ] **Step 3: Criar `ForgotPasswordCommand` e handler**

Criar `VoroSalonCrm.Application/Features/Auth/Commands/ForgotPasswordCommand.cs`:
```csharp
using MediatR;

namespace VoroSalonCrm.Application.Features.Auth.Commands;

public record ForgotPasswordCommand(string Email) : IRequest;
```

Criar `VoroSalonCrm.Application/Features/Auth/Commands/ForgotPasswordCommandHandler.cs`:
```csharp
using MediatR;
using VoroSalonCrm.Application.Services.Interfaces.Identity;

namespace VoroSalonCrm.Application.Features.Auth.Commands;

public class ForgotPasswordCommandHandler(IUserService userService)
    : IRequestHandler<ForgotPasswordCommand>
{
    public async Task Handle(ForgotPasswordCommand request, CancellationToken cancellationToken)
        => await userService.SendPasswordResetEmailAsync(request.Email);
}
```

- [ ] **Step 4: Criar `ResetPasswordCommand` e handler**

Criar `VoroSalonCrm.Application/Features/Auth/Commands/ResetPasswordCommand.cs`:
```csharp
using MediatR;
using VoroSalonCrm.Application.DTOs.Auth;

namespace VoroSalonCrm.Application.Features.Auth.Commands;

public record ResetPasswordCommand(ResetPasswordDto Dto) : IRequest;
```

Criar `VoroSalonCrm.Application/Features/Auth/Commands/ResetPasswordCommandHandler.cs`:
```csharp
using MediatR;
using VoroSalonCrm.Application.Services.Interfaces.Identity;

namespace VoroSalonCrm.Application.Features.Auth.Commands;

public class ResetPasswordCommandHandler(IUserService userService)
    : IRequestHandler<ResetPasswordCommand>
{
    public async Task Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
        => await userService.ResetPasswordAsync(request.Dto);
}
```

- [ ] **Step 5: Build**

```bash
dotnet build VoroSalonCrm.API/VoroSalonCrm.API.csproj
```

Expected: `Build succeeded.`

- [ ] **Step 6: Commit**

```bash
git add VoroSalonCrm.Application/Features/Auth/Commands/
git commit -m "feat(auth): criar handlers RefreshToken, SignUp, ForgotPassword, ResetPassword"
```

---

### Task 5: Converter AuthService em façade

**Files:**
- Modify: `VoroSalonCrm.Application/Services/AuthService.cs`

- [ ] **Step 1: Adicionar `IMediator` ao constructor e substituir operações**

Adicionar `IMediator mediator` ao primary constructor do `AuthService`:

```csharp
public class AuthService(IOptions<CookieUtil> cookieUtil, IConfiguration configuration,
    IMapper mapper, INotificationService notificationService, IUserService userService,
    ICurrentUserService currentUserService, ..., IMediator mediator) : IAuthService
{
    private readonly IMediator _mediator = mediator;
    // ... demais campos mantidos
}
```

Substituir os métodos principais por dispatches:

```csharp
public async Task<AuthDto> SignInAsync(SignInDto signInDto)
    => await _mediator.Send(new SignInCommand(signInDto));

public async Task<AuthDto> VerifyTwoFactorAsync(VerifyTwoFactorDto dto)
    => await _mediator.Send(new VerifyTwoFactorCommand(dto));

public async Task<AuthDto> RefreshTokenAsync(string refreshToken)
    => await _mediator.Send(new RefreshTokenCommand(refreshToken));

public async Task<AuthDto> SignUpAsync(SignUpDto dto)
    => await _mediator.Send(new SignUpCommand(dto));

public async Task ForgotPasswordAsync(string email)
    => await _mediator.Send(new ForgotPasswordCommand(email));

public async Task ResetPasswordAsync(ResetPasswordDto dto)
    => await _mediator.Send(new ResetPasswordCommand(dto));
```

Adicionar usings:
```csharp
using MediatR;
using VoroSalonCrm.Application.Features.Auth.Commands;
```

- [ ] **Step 2: Build e testes**

```bash
dotnet build VoroSalonCrm.API/VoroSalonCrm.API.csproj
dotnet test VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj --verbosity minimal
```

Expected: build OK, todos os testes passam.

- [ ] **Step 3: Commit**

```bash
git add VoroSalonCrm.Application/Services/AuthService.cs
git commit -m "refactor(auth): converter AuthService em façade MediatR"
```

---

### Task 6: Abrir PR para `improvement/api-refactor`

- [ ] **Step 1: Push**

```bash
git push -u origin refactor/auth-service
```

- [ ] **Step 2: Criar PR**

```bash
gh pr create \
  --base improvement/api-refactor \
  --title "refactor(auth): extrair handlers MediatR + testes" \
  --body "$(cat <<'EOF'
## O que muda
- `SignInCommandHandler` com testes: credenciais inválidas, 2FA ativado, mismatch de estabelecimento
- `VerifyTwoFactorCommandHandler` com testes: código inválido, código válido retorna token
- Handlers sem testes (baixo risco, delegam direto para IUserService): RefreshToken, SignUp, ForgotPassword, ResetPassword
- `AuthService` convertido em façade

## Impacto
- Nenhum Controller alterado
- Todos os testes existentes passam

## Como testar
dotnet test --filter "SignInCommandHandlerTests|VerifyTwoFactorCommandHandlerTests"
EOF
)"
```

---

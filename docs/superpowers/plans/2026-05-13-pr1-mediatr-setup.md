# PR #1 — MediatR Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Instalar MediatR, criar estrutura de pastas `Features/`, registrar o pipeline e corrigir o `ExceptionHandlingMiddleware` para usar `ResponseViewModel`.

**Architecture:** PR de infraestrutura pura — nenhum service existente é alterado. Cria apenas a base que os PRs #2–#5 vão utilizar. A branch `refactor/mediatr-setup` mergea em `improvement/api-refactor` antes das demais.

**Tech Stack:** .NET 9, MediatR 12, xUnit, Moq, FluentAssertions

---

## File Structure

```
VoroSalonCrm.Application/
  VoroSalonCrm.Application.csproj              ← MODIFY: adicionar MediatR
  Features/
    Appointments/
      Commands/                                 ← CREATE (pasta vazia — preenchida no PR #2)
      Queries/                                  ← CREATE (pasta vazia)
      Notifications/                            ← CREATE (pasta vazia)
    Auth/
      Commands/                                 ← CREATE (pasta vazia — preenchida no PR #3)
    Subscription/
      Commands/                                 ← CREATE (pasta vazia — preenchida no PR #4)
      Queries/                                  ← CREATE (pasta vazia)
    PublicBooking/
      Commands/                                 ← CREATE (pasta vazia — preenchida no PR #5)
      Queries/                                  ← CREATE (pasta vazia)

VoroSalonCrm.Contract/
  Extensions/
    Configurations/
      AddAppServicesExtension.cs                ← MODIFY: registrar AddMediatR

VoroSalonCrm.API/
  Middlewares/
    ExceptionHandlingMiddleware.cs              ← MODIFY: usar ResponseViewModel

VoroSalonCrm.Tests.Integration/
  VoroSalonCrm.Tests.Integration.csproj        ← MODIFY: adicionar MediatR (para testes dos PRs futuros)
  Infrastructure/
    ExceptionHandlingMiddlewareTests.cs         ← CREATE
```

---

### Task 1: Criar branch e adicionar MediatR

**Files:**
- Modify: `VoroSalonCrm.Application/VoroSalonCrm.Application.csproj`
- Modify: `VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj`

- [ ] **Step 1: Criar branch a partir de `improvement/api-refactor`**

```bash
cd voro-salon-crm-api
git checkout improvement/api-refactor 2>/dev/null || git checkout -b improvement/api-refactor
git checkout -b refactor/mediatr-setup
```

- [ ] **Step 2: Adicionar MediatR ao projeto Application**

```bash
cd VoroSalonCrm.Application
dotnet add package MediatR --version 12.4.1
```

Verificar que o `VoroSalonCrm.Application.csproj` agora contém:
```xml
<PackageReference Include="MediatR" Version="12.4.1" />
```

- [ ] **Step 3: Adicionar MediatR ao projeto de testes**

```bash
cd ../VoroSalonCrm.Tests.Integration
dotnet add package MediatR --version 12.4.1
```

- [ ] **Step 4: Build para confirmar sem erros**

```bash
cd ..
dotnet build VoroSalonCrm.API/VoroSalonCrm.API.csproj
```

Expected: `Build succeeded.`

- [ ] **Step 5: Commit**

```bash
git add VoroSalonCrm.Application/VoroSalonCrm.Application.csproj
git add VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj
git commit -m "chore(mediatr): adicionar pacote MediatR 12.4.1"
```

---

### Task 2: Criar estrutura de pastas Features/

**Files:**
- Create: `VoroSalonCrm.Application/Features/Appointments/Commands/.gitkeep`
- Create: `VoroSalonCrm.Application/Features/Appointments/Queries/.gitkeep`
- Create: `VoroSalonCrm.Application/Features/Appointments/Notifications/.gitkeep`
- Create: `VoroSalonCrm.Application/Features/Auth/Commands/.gitkeep`
- Create: `VoroSalonCrm.Application/Features/Subscription/Commands/.gitkeep`
- Create: `VoroSalonCrm.Application/Features/Subscription/Queries/.gitkeep`
- Create: `VoroSalonCrm.Application/Features/PublicBooking/Commands/.gitkeep`
- Create: `VoroSalonCrm.Application/Features/PublicBooking/Queries/.gitkeep`

- [ ] **Step 1: Criar as pastas com .gitkeep**

```bash
mkdir -p VoroSalonCrm.Application/Features/Appointments/Commands
mkdir -p VoroSalonCrm.Application/Features/Appointments/Queries
mkdir -p VoroSalonCrm.Application/Features/Appointments/Notifications
mkdir -p VoroSalonCrm.Application/Features/Auth/Commands
mkdir -p VoroSalonCrm.Application/Features/Subscription/Commands
mkdir -p VoroSalonCrm.Application/Features/Subscription/Queries
mkdir -p VoroSalonCrm.Application/Features/PublicBooking/Commands
mkdir -p VoroSalonCrm.Application/Features/PublicBooking/Queries
touch VoroSalonCrm.Application/Features/Appointments/Commands/.gitkeep
touch VoroSalonCrm.Application/Features/Appointments/Queries/.gitkeep
touch VoroSalonCrm.Application/Features/Appointments/Notifications/.gitkeep
touch VoroSalonCrm.Application/Features/Auth/Commands/.gitkeep
touch VoroSalonCrm.Application/Features/Subscription/Commands/.gitkeep
touch VoroSalonCrm.Application/Features/Subscription/Queries/.gitkeep
touch VoroSalonCrm.Application/Features/PublicBooking/Commands/.gitkeep
touch VoroSalonCrm.Application/Features/PublicBooking/Queries/.gitkeep
```

- [ ] **Step 2: Commit**

```bash
git add VoroSalonCrm.Application/Features/
git commit -m "chore(mediatr): criar estrutura de pastas Features/"
```

---

### Task 3: Registrar MediatR no container de DI

**Files:**
- Modify: `VoroSalonCrm.Contract/Extensions/Configurations/AddAppServicesExtension.cs`

- [ ] **Step 1: Adicionar `using MediatR;` e registrar no método `AddApplicationServices`**

Abrir `VoroSalonCrm.Contract/Extensions/Configurations/AddAppServicesExtension.cs` e adicionar no topo:

```csharp
using MediatR;
using VoroSalonCrm.Application.Features.Appointments.Commands; // namespace marcador — adicionar quando PR #2 existir
```

Dentro do método `AddApplicationServices`, adicionar **antes** do `return services;`:

```csharp
services.AddMediatR(cfg =>
    cfg.RegisterServicesFromAssembly(
        typeof(VoroSalonCrm.Application.Services.AppointmentService).Assembly));
```

> **Nota:** `AppointmentService` é usado apenas como âncora para o assembly `VoroSalonCrm.Application`. Qualquer tipo público desse assembly serve.

- [ ] **Step 2: Build para confirmar sem erros**

```bash
dotnet build VoroSalonCrm.API/VoroSalonCrm.API.csproj
```

Expected: `Build succeeded.`

- [ ] **Step 3: Rodar todos os testes para confirmar que nada quebrou**

```bash
dotnet test VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj --verbosity minimal
```

Expected: todos os testes existentes passam.

- [ ] **Step 4: Commit**

```bash
git add VoroSalonCrm.Contract/Extensions/Configurations/AddAppServicesExtension.cs
git commit -m "chore(mediatr): registrar MediatR no container de DI"
```

---

### Task 4: Corrigir ExceptionHandlingMiddleware

**Files:**
- Modify: `VoroSalonCrm.API/Middlewares/ExceptionHandlingMiddleware.cs`
- Create: `VoroSalonCrm.Tests.Integration/Infrastructure/ExceptionHandlingMiddlewareTests.cs`

- [ ] **Step 1: Escrever teste falhando para a resposta em português**

Criar `VoroSalonCrm.Tests.Integration/Infrastructure/ExceptionHandlingMiddlewareTests.cs`:

```csharp
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using System.Text.Json;
using VoroSalonCrm.API.Middlewares;
using VoroSalonCrm.Shared.ViewModels;

namespace VoroSalonCrm.Tests.Integration.Infrastructure;

public class ExceptionHandlingMiddlewareTests
{
    [Fact]
    public async Task Invoke_WhenExceptionThrown_Returns500WithPortugueseMessage()
    {
        // Arrange
        var logger = new Mock<ILogger<ExceptionHandlingMiddleware>>();
        var middleware = new ExceptionHandlingMiddleware(
            next: _ => throw new InvalidOperationException("boom"),
            logger: logger.Object);

        var context = new DefaultHttpContext();
        var responseBody = new MemoryStream();
        context.Response.Body = responseBody;

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.StatusCode.Should().Be(500);

        responseBody.Position = 0;
        var json = await new StreamReader(responseBody).ReadToEndAsync();
        var response = JsonSerializer.Deserialize<ResponseViewModel<object>>(json,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        response.Should().NotBeNull();
        response!.Success.Should().BeFalse();
        response.Message.Should().Be("Ocorreu um erro inesperado.");
    }
}
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

```bash
dotnet test VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj \
  --filter "ExceptionHandlingMiddlewareTests" --verbosity normal
```

Expected: FAIL — o middleware atual retorna `{ "message": "An unexpected error occurred." }` e não usa `ResponseViewModel`.

- [ ] **Step 3: Implementar a correção no middleware**

Substituir o bloco `catch` em `VoroSalonCrm.API/Middlewares/ExceptionHandlingMiddleware.cs`:

```csharp
catch (Exception ex)
{
    _logger.LogError(ex, "Unhandled exception");

    _ = Task.Run(async () =>
    {
        try
        {
            var emailService = context.RequestServices.GetService<IMailKitEmailService>();
            if (emailService is null) return;

            var method = context.Request.Method;
            var path = context.Request.Path;
            var query = context.Request.QueryString;
            var timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss UTC");

            var subject = $"[Jasmim] Erro: {ex.GetType().Name} em {method} {path}";

            var body = $@"
<h2 style='color:#d32f2f;'>Erro no sistema Jasmim</h2>
<table style='border-collapse:collapse; font-family:monospace; font-size:13px;'>
  <tr><td style='padding:4px 12px 4px 0; font-weight:bold;'>Timestamp</td><td>{timestamp}</td></tr>
  <tr><td style='padding:4px 12px 4px 0; font-weight:bold;'>Rota</td><td>{method} {path}{query}</td></tr>
  <tr><td style='padding:4px 12px 4px 0; font-weight:bold;'>Exceção</td><td>{ex.GetType().FullName}</td></tr>
  <tr><td style='padding:4px 12px 4px 0; font-weight:bold;'>Mensagem</td><td>{ex.Message}</td></tr>
</table>
<h3>Stack Trace</h3>
<pre style='background:#f5f5f5; padding:12px; border-radius:4px; font-size:12px; overflow-x:auto;'>{ex.StackTrace}</pre>
{(ex.InnerException is not null ? $@"
<h3>Inner Exception</h3>
<p><strong>{ex.InnerException.GetType().FullName}:</strong> {ex.InnerException.Message}</p>
<pre style='background:#f5f5f5; padding:12px; border-radius:4px; font-size:12px; overflow-x:auto;'>{ex.InnerException.StackTrace}</pre>
" : "")}";

            await emailService.SendAsync("log@vorolabs.app", subject, body);
        }
        catch (Exception emailEx)
        {
            _logger.LogError(emailEx, "Failed to send error notification email");
        }
    });

    context.Response.StatusCode = 500;
    context.Response.ContentType = "application/json";
    var errorResponse = ResponseViewModel<object>.Fail("Ocorreu um erro inesperado.", status: 500);
    await context.Response.WriteAsJsonAsync(errorResponse);
}
```

Adicionar `using VoroSalonCrm.Shared.ViewModels;` no topo do arquivo.

- [ ] **Step 4: Rodar o teste para confirmar que passa**

```bash
dotnet test VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj \
  --filter "ExceptionHandlingMiddlewareTests" --verbosity normal
```

Expected: PASS

- [ ] **Step 5: Rodar todos os testes para confirmar que nada quebrou**

```bash
dotnet test VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj --verbosity minimal
```

Expected: todos passam.

- [ ] **Step 6: Commit**

```bash
git add VoroSalonCrm.API/Middlewares/ExceptionHandlingMiddleware.cs
git add VoroSalonCrm.Tests.Integration/Infrastructure/ExceptionHandlingMiddlewareTests.cs
git commit -m "fix(middleware): usar ResponseViewModel em português no ExceptionHandlingMiddleware"
```

---

### Task 5: Abrir PR para `improvement/api-refactor`

- [ ] **Step 1: Push da branch**

```bash
git push -u origin refactor/mediatr-setup
```

- [ ] **Step 2: Criar PR via gh**

```bash
gh pr create \
  --base improvement/api-refactor \
  --title "chore(mediatr): setup MediatR + fix middleware" \
  --body "$(cat <<'EOF'
## O que muda
- Pacote MediatR 12.4.1 adicionado ao Application e Tests
- Estrutura de pastas `Features/` criada (vazia — preenchida nos PRs #2–#5)
- MediatR registrado no container de DI via `AddApplicationServices`
- `ExceptionHandlingMiddleware` corrigido: resposta em português usando `ResponseViewModel`

## Impacto
- Zero breaking changes — nenhum service existente foi alterado
- Todos os testes existentes continuam passando

## Como testar
dotnet test --filter "ExceptionHandlingMiddlewareTests"
EOF
)"
```

---

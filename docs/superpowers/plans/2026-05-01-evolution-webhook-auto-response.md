# Evolution Webhook Auto-Response Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar resposta automática inteligente ao webhook Evolution Go, usando keyword-matching em templates e fallback para IA (Gemini) com contexto completo do tenant.

**Architecture:** Um `BackgroundService` (`EvolutionResponseWorker`) faz polling a cada 5 segundos em `WhatsAppMessages` inbound não processadas de tenants Evolution conectados. Para cada mensagem, um `EvolutionResponseService` orquestra: tenta match de keyword em templates via `EvolutionRulesEngine` (cache 5 min) e, sem match, chama `EvolutionAIResponder` que monta system prompt com contexto do tenant e chama Gemini. A resposta é enviada via `IEvolutionService` e gravada como mensagem outbound.

**Tech Stack:** .NET 9 / ASP.NET Core, Entity Framework Core (PostgreSQL), xUnit + Moq, IMemoryCache, IHostedService/BackgroundService.

---

## Mapa de Arquivos

### Modificados
| Arquivo | O que muda |
|---|---|
| `VoroSalonCrm.Domain/Entities/EvolutionTemplate.cs` | Adiciona campo `Keywords` |
| `VoroSalonCrm.Domain/Entities/WhatsAppMessage.cs` | Adiciona campo `ProcessedByBotAt` |
| `VoroSalonCrm.Application/DTOs/Integration/EvolutionTemplateDtos.cs` | Expõe `Keywords` em todos os records |
| `VoroSalonCrm.Application/Services/EvolutionTemplateService.cs` | Mapeia `Keywords` em `ToDto`, `CreateAsync`, `UpdateAsync` |
| `VoroSalonCrm.Application/Services/Interfaces/Integration/IAIConversationService.cs` | Adiciona `RespondWithContextAsync` |
| `VoroSalonCrm.Infrastructure/Integration/AIConversationService.cs` | Implementa `RespondWithContextAsync` |
| `VoroSalonCrm.Contract/Extensions/Configurations/AddAppServicesExtension.cs` | Registra novos serviços + `EvolutionResponseWorker` |
| `VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj` | Adiciona pacote `Moq` |

### Criados
| Arquivo | Responsabilidade |
|---|---|
| `VoroSalonCrm.Application/Services/Interfaces/Integration/IEvolutionRulesEngine.cs` | Interface: keyword match → template |
| `VoroSalonCrm.Application/Services/Interfaces/Integration/IEvolutionAIResponder.cs` | Interface: resposta IA com contexto de tenant |
| `VoroSalonCrm.Application/Services/Interfaces/Integration/IEvolutionResponseService.cs` | Interface: orquestração por mensagem |
| `VoroSalonCrm.Infrastructure/Integration/EvolutionRulesEngine.cs` | Implementação com cache IMemoryCache |
| `VoroSalonCrm.Infrastructure/Integration/EvolutionAIResponder.cs` | Monta system prompt + chama IAIConversationService |
| `VoroSalonCrm.Infrastructure/Integration/EvolutionResponseService.cs` | Orquestra fluxo completo por mensagem |
| `VoroSalonCrm.Infrastructure/Integration/EvolutionResponseWorker.cs` | BackgroundService polling 5s |
| `VoroSalonCrm.Tests.Integration/Evolution/EvolutionRulesEngineTests.cs` | Testes de keyword matching |
| `VoroSalonCrm.Tests.Integration/Evolution/EvolutionAIResponderTests.cs` | Testes de construção do system prompt |
| `VoroSalonCrm.Tests.Integration/Evolution/EvolutionResponseServiceTests.cs` | Testes de orquestração |
| Migrations geradas automaticamente via `dotnet ef` | `AddEvolutionTemplateKeywords` + `AddWhatsAppMessageProcessedByBotAt` |

---

## Task 1: Adicionar `Keywords` a `EvolutionTemplate` — entidade, DTOs, service e migration

**Files:**
- Modify: `voro-salon-crm-api/VoroSalonCrm.Domain/Entities/EvolutionTemplate.cs`
- Modify: `voro-salon-crm-api/VoroSalonCrm.Application/DTOs/Integration/EvolutionTemplateDtos.cs`
- Modify: `voro-salon-crm-api/VoroSalonCrm.Application/Services/EvolutionTemplateService.cs`
- Migration: gerada pelo EF CLI

- [ ] **Step 1: Adicionar campo `Keywords` à entidade**

Abrir `VoroSalonCrm.Domain/Entities/EvolutionTemplate.cs` e adicionar após `ParamLabels`:

```csharp
/// <summary>JSON serializado de palavras-chave que ativam este template (ex: ["oi","olá","bom dia"]).
/// Null = template não é ativado por regras automáticas.</summary>
public string? Keywords { get; set; }
```

Resultado esperado do arquivo completo:
```csharp
namespace VoroSalonCrm.Domain.Entities
{
    public class EvolutionTemplate
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public int ParamsCount { get; set; }
        public string? ParamLabels { get; set; }
        /// <summary>JSON serializado de palavras-chave que ativam este template (ex: ["oi","olá","bom dia"]).
        /// Null = template não é ativado por regras automáticas.</summary>
        public string? Keywords { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? UpdatedAt { get; set; }
    }
}
```

- [ ] **Step 2: Atualizar DTOs para expor `Keywords`**

Substituir todo o conteúdo de `EvolutionTemplateDtos.cs`:

```csharp
using System.ComponentModel.DataAnnotations;

namespace VoroSalonCrm.Application.DTOs.Integration
{
    public record EvolutionTemplateDto(
        Guid Id,
        string Name,
        string Label,
        string Body,
        int ParamsCount,
        string[]? ParamLabels,
        string[]? Keywords,
        bool IsActive,
        DateTimeOffset CreatedAt
    );

    public record CreateEvolutionTemplateDto(
        [Required][StringLength(200)] string Name,
        [Required][StringLength(200)] string Label,
        [Required] string Body,
        int ParamsCount,
        string[]? ParamLabels,
        string[]? Keywords,
        bool IsActive = true
    );

    public record UpdateEvolutionTemplateDto(
        [StringLength(200)] string? Name,
        [StringLength(200)] string? Label,
        string? Body,
        int? ParamsCount,
        string[]? ParamLabels,
        string[]? Keywords,
        bool? IsActive
    );

    public record EvolutionSendDto(
        [Required] string InstanceId,
        [Required] string To,
        [Required] Guid TemplateId,
        [Required] string[] Params
    );
}
```

- [ ] **Step 3: Atualizar `EvolutionTemplateService` para mapear `Keywords`**

Em `EvolutionTemplateService.cs`, alterar o método estático `ToDto`:

```csharp
private static EvolutionTemplateDto ToDto(EvolutionTemplate t) => new(
    t.Id, t.Name, t.Label, t.Body, t.ParamsCount,
    t.ParamLabels != null ? JsonSerializer.Deserialize<string[]>(t.ParamLabels) : null,
    t.Keywords  != null ? JsonSerializer.Deserialize<string[]>(t.Keywords)  : null,
    t.IsActive, t.CreatedAt);
```

No método `CreateAsync`, adicionar mapeamento de `Keywords` no inicializador de `EvolutionTemplate`:

```csharp
Keywords = dto.Keywords != null ? JsonSerializer.Serialize(dto.Keywords) : null,
```

No método `UpdateAsync`, adicionar após o bloco de `ParamLabels`:

```csharp
if (dto.Keywords is not null) template.Keywords = JsonSerializer.Serialize(dto.Keywords);
```

- [ ] **Step 4: Gerar a migration**

```bash
cd voro-salon-crm-api
dotnet ef migrations add AddEvolutionTemplateKeywords \
    --project VoroSalonCrm.Infrastructure \
    --startup-project VoroSalonCrm.API
```

Verificar que o arquivo gerado contém:
```csharp
migrationBuilder.AddColumn<string>(
    name: "Keywords",
    table: "EvolutionTemplates",
    type: "character varying(2000)",
    maxLength: 2000,
    nullable: true);
```

Se o tipo gerado for `text` em vez de `varchar(2000)`, adicionar configuração no `JasmimDbContext` antes de gerar:

```csharp
// Em JasmimDbContext, dentro do builder.Entity<EvolutionTemplate>:
b.Property(e => e.Keywords).HasMaxLength(2000);
```

- [ ] **Step 5: Aplicar a migration**

```bash
dotnet ef database update \
    --project VoroSalonCrm.Infrastructure \
    --startup-project VoroSalonCrm.API
```

Resultado esperado: `Done.` ou `Build succeeded.`

- [ ] **Step 6: Build para verificar**

```bash
dotnet build VoroSalonCrm.sln
```

Resultado esperado: `Build succeeded. 0 Error(s)`

- [ ] **Step 7: Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.Domain/Entities/EvolutionTemplate.cs \
        voro-salon-crm-api/VoroSalonCrm.Application/DTOs/Integration/EvolutionTemplateDtos.cs \
        voro-salon-crm-api/VoroSalonCrm.Application/Services/EvolutionTemplateService.cs \
        voro-salon-crm-api/VoroSalonCrm.Infrastructure/Migrations/
git commit -m "feat(evolution): add Keywords field to EvolutionTemplate entity and DTOs"
```

---

## Task 2: Adicionar `ProcessedByBotAt` a `WhatsAppMessage` + migration

**Files:**
- Modify: `voro-salon-crm-api/VoroSalonCrm.Domain/Entities/WhatsAppMessage.cs`
- Migration: gerada pelo EF CLI

- [ ] **Step 1: Adicionar campo `ProcessedByBotAt` à entidade**

Abrir `WhatsAppMessage.cs` e adicionar ao final da classe, antes do fechamento `}`:

```csharp
/// <summary>Preenchido após processamento pelo bot (mesmo em caso de erro).
/// Null = pendente de processamento automático.</summary>
public DateTimeOffset? ProcessedByBotAt { get; set; }
```

Arquivo completo resultante:
```csharp
using VoroSalonCrm.Domain.Interfaces.Entities;

namespace VoroSalonCrm.Domain.Entities
{
    public class WhatsAppMessage : ITenantEntity
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Tenant Tenant { get; set; } = null!;
        public string Direction { get; set; } = "inbound";
        public string From { get; set; } = string.Empty;
        public string To { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public string? WhatsAppMessageId { get; set; }
        public string Status { get; set; } = "received";
        public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;
        /// <summary>Preenchido após processamento pelo bot (mesmo em caso de erro).
        /// Null = pendente de processamento automático.</summary>
        public DateTimeOffset? ProcessedByBotAt { get; set; }
    }
}
```

- [ ] **Step 2: Gerar a migration**

```bash
cd voro-salon-crm-api
dotnet ef migrations add AddWhatsAppMessageProcessedByBotAt \
    --project VoroSalonCrm.Infrastructure \
    --startup-project VoroSalonCrm.API
```

Verificar que o arquivo gerado contém:
```csharp
migrationBuilder.AddColumn<DateTimeOffset>(
    name: "ProcessedByBotAt",
    table: "WhatsAppMessages",
    type: "timestamp with time zone",
    nullable: true);
```

- [ ] **Step 3: Aplicar a migration**

```bash
dotnet ef database update \
    --project VoroSalonCrm.Infrastructure \
    --startup-project VoroSalonCrm.API
```

Resultado esperado: `Done.`

- [ ] **Step 4: Build**

```bash
dotnet build VoroSalonCrm.sln
```

Resultado esperado: `Build succeeded. 0 Error(s)`

- [ ] **Step 5: Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.Domain/Entities/WhatsAppMessage.cs \
        voro-salon-crm-api/VoroSalonCrm.Infrastructure/Migrations/
git commit -m "feat(evolution): add ProcessedByBotAt to WhatsAppMessage for bot tracking"
```

---

## Task 3: Estender `IAIConversationService` com `RespondWithContextAsync`

**Context:** O `AIConversationService.RespondAsync` existente usa um system prompt fixo. O `EvolutionAIResponder` precisa passar um system prompt rico (serviços, agendamentos). A solução é adicionar um novo método `RespondWithContextAsync` que aceita o system prompt externamente, sem quebrar o método existente.

**Files:**
- Modify: `voro-salon-crm-api/VoroSalonCrm.Application/Services/Interfaces/Integration/IAIConversationService.cs`
- Modify: `voro-salon-crm-api/VoroSalonCrm.Infrastructure/Integration/AIConversationService.cs`

- [ ] **Step 1: Adicionar método à interface**

Substituir o conteúdo de `IAIConversationService.cs`:

```csharp
using VoroSalonCrm.Domain.Entities;

namespace VoroSalonCrm.Application.Services.Interfaces.Integration
{
    public interface IAIConversationService
    {
        Task<string> RespondAsync(Guid tenantId, string tenantName, string phoneNumber, string userMessage);
        /// <summary>Igual a RespondAsync, mas usa o systemPrompt fornecido pelo chamador em vez do padrão.</summary>
        Task<string> RespondWithContextAsync(Guid tenantId, string phoneNumber, string systemPrompt, string userMessage);
        Task<List<AIConversationMessage>> GetHistoryAsync(Guid tenantId, string phoneNumber);
        Task ClearHistoryAsync(Guid tenantId, string phoneNumber);
    }
}
```

- [ ] **Step 2: Implementar o novo método em `AIConversationService`**

Em `AIConversationService.cs`, adicionar após o método `RespondAsync` existente (antes do método `GetHistoryAsync`):

```csharp
public async Task<string> RespondWithContextAsync(
    Guid tenantId,
    string phoneNumber,
    string systemPrompt,
    string userMessage)
{
    var recentMessages = await _repository.GetRecentAsync(tenantId, phoneNumber, count: 10);

    var history = recentMessages
        .Select(m => (m.Role, m.Content))
        .ToList();

    var aiResponse = await _geminiService.GenerateResponseAsync(systemPrompt, history, userMessage);

    try
    {
        var userMsg = AIConversationMessage.Create(tenantId, phoneNumber, "user", Truncate(userMessage, 4000));
        await _repository.AddAsync(userMsg);

        var assistantMsg = AIConversationMessage.Create(tenantId, phoneNumber, "assistant", Truncate(aiResponse, 4000));
        await _repository.AddAsync(assistantMsg);

        await _repository.SaveChangesAsync();
    }
    catch (Exception ex)
    {
        _logger.LogWarning(ex, "Failed to persist AI conversation messages for {PhoneNumber}.", phoneNumber);
    }

    return aiResponse;
}
```

- [ ] **Step 3: Build**

```bash
dotnet build VoroSalonCrm.sln
```

Resultado esperado: `Build succeeded. 0 Error(s)`

- [ ] **Step 4: Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.Application/Services/Interfaces/Integration/IAIConversationService.cs \
        voro-salon-crm-api/VoroSalonCrm.Infrastructure/Integration/AIConversationService.cs
git commit -m "feat(evolution): add RespondWithContextAsync to IAIConversationService"
```

---

## Task 4: Adicionar Moq ao projeto de testes

**Files:**
- Modify: `voro-salon-crm-api/VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj`

- [ ] **Step 1: Adicionar `Moq` ao csproj**

Abrir `VoroSalonCrm.Tests.Integration.csproj` e adicionar dentro de `<ItemGroup>` de PackageReferences:

```xml
<PackageReference Include="Moq" Version="4.20.72" />
```

Arquivo completo resultante:
```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <IsPackable>false</IsPackable>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="coverlet.collector" Version="6.0.2" />
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.12.0" />
    <PackageReference Include="Moq" Version="4.20.72" />
    <PackageReference Include="xunit" Version="2.9.2" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.8.2" />
  </ItemGroup>

  <ItemGroup>
    <Using Include="Xunit" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\VoroSalonCrm.API\VoroSalonCrm.API.csproj" />
    <ProjectReference Include="..\VoroSalonCrm.Application\VoroSalonCrm.Application.csproj" />
    <ProjectReference Include="..\VoroSalonCrm.Domain\VoroSalonCrm.Domain.csproj" />
    <ProjectReference Include="..\VoroSalonCrm.Shared\VoroSalonCrm.Shared.csproj" />
  </ItemGroup>

</Project>
```

- [ ] **Step 2: Restaurar pacotes**

```bash
cd voro-salon-crm-api
dotnet restore VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj
```

Resultado esperado: `Restore completed`

- [ ] **Step 3: Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj
git commit -m "test(evolution): add Moq package to test project"
```

---

## Task 5: Criar `IEvolutionRulesEngine` + `EvolutionRulesEngine` com testes

**Files:**
- Create: `voro-salon-crm-api/VoroSalonCrm.Application/Services/Interfaces/Integration/IEvolutionRulesEngine.cs`
- Create: `voro-salon-crm-api/VoroSalonCrm.Infrastructure/Integration/EvolutionRulesEngine.cs`
- Create: `voro-salon-crm-api/VoroSalonCrm.Tests.Integration/Evolution/EvolutionRulesEngineTests.cs`

- [ ] **Step 1: Criar a interface**

Criar `IEvolutionRulesEngine.cs`:

```csharp
using VoroSalonCrm.Domain.Entities;

namespace VoroSalonCrm.Application.Services.Interfaces.Integration
{
    public interface IEvolutionRulesEngine
    {
        /// <summary>
        /// Verifica se bodyText contém alguma keyword de template ativo.
        /// Retorna o primeiro template com match (por CreatedAt ASC) ou null.
        /// </summary>
        Task<EvolutionTemplate?> MatchAsync(string bodyText, CancellationToken ct = default);
    }
}
```

- [ ] **Step 2: Escrever os testes (antes da implementação)**

Criar pasta `voro-salon-crm-api/VoroSalonCrm.Tests.Integration/Evolution/` e o arquivo `EvolutionRulesEngineTests.cs`:

```csharp
using Microsoft.Extensions.Caching.Memory;
using Moq;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Infrastructure.Integration;

namespace VoroSalonCrm.Tests.Integration.Evolution;

public class EvolutionRulesEngineTests
{
    private static IMemoryCache CreateCache() =>
        new MemoryCache(new MemoryCacheOptions());

    private static EvolutionTemplate MakeTemplate(string keywords, DateTimeOffset createdAt) => new()
    {
        Id = Guid.NewGuid(),
        Name = "test",
        Label = "Test",
        Body = "Olá!",
        IsActive = true,
        Keywords = keywords,
        CreatedAt = createdAt
    };

    [Fact]
    public async Task MatchAsync_ReturnsTemplate_WhenBodyContainsKeyword()
    {
        var template = MakeTemplate("[\"oi\",\"olá\"]", DateTimeOffset.UtcNow);
        var repo = new Mock<IEvolutionTemplateRepository>();
        repo.Setup(r => r.GetAllAsync(
                It.IsAny<System.Linq.Expressions.Expression<Func<EvolutionTemplate, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<EvolutionTemplate>, IQueryable<EvolutionTemplate>>[]>()))
            .ReturnsAsync(new List<EvolutionTemplate> { template });

        var engine = new EvolutionRulesEngine(repo.Object, CreateCache());

        var result = await engine.MatchAsync("Oi, tudo bem?");

        Assert.NotNull(result);
        Assert.Equal(template.Id, result.Id);
    }

    [Fact]
    public async Task MatchAsync_ReturnsNull_WhenNoKeywordMatches()
    {
        var template = MakeTemplate("[\"oi\",\"olá\"]", DateTimeOffset.UtcNow);
        var repo = new Mock<IEvolutionTemplateRepository>();
        repo.Setup(r => r.GetAllAsync(
                It.IsAny<System.Linq.Expressions.Expression<Func<EvolutionTemplate, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<EvolutionTemplate>, IQueryable<EvolutionTemplate>>[]>()))
            .ReturnsAsync(new List<EvolutionTemplate> { template });

        var engine = new EvolutionRulesEngine(repo.Object, CreateCache());

        var result = await engine.MatchAsync("Quero agendar um horário");

        Assert.Null(result);
    }

    [Fact]
    public async Task MatchAsync_IsCaseInsensitive()
    {
        var template = MakeTemplate("[\"bom dia\"]", DateTimeOffset.UtcNow);
        var repo = new Mock<IEvolutionTemplateRepository>();
        repo.Setup(r => r.GetAllAsync(
                It.IsAny<System.Linq.Expressions.Expression<Func<EvolutionTemplate, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<EvolutionTemplate>, IQueryable<EvolutionTemplate>>[]>()))
            .ReturnsAsync(new List<EvolutionTemplate> { template });

        var engine = new EvolutionRulesEngine(repo.Object, CreateCache());

        var result = await engine.MatchAsync("BOM DIA! Como posso ajudar?");

        Assert.NotNull(result);
    }

    [Fact]
    public async Task MatchAsync_ReturnsFirstByCreatedAt_WhenMultipleMatch()
    {
        var older = MakeTemplate("[\"oi\"]", DateTimeOffset.UtcNow.AddDays(-2));
        var newer = MakeTemplate("[\"oi\"]", DateTimeOffset.UtcNow.AddDays(-1));
        var repo = new Mock<IEvolutionTemplateRepository>();
        repo.Setup(r => r.GetAllAsync(
                It.IsAny<System.Linq.Expressions.Expression<Func<EvolutionTemplate, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<EvolutionTemplate>, IQueryable<EvolutionTemplate>>[]>()))
            .ReturnsAsync(new List<EvolutionTemplate> { newer, older }); // desordenado de propósito

        var engine = new EvolutionRulesEngine(repo.Object, CreateCache());

        var result = await engine.MatchAsync("oi");

        Assert.Equal(older.Id, result!.Id);
    }

    [Fact]
    public async Task MatchAsync_UsesCache_AndDoesNotCallRepoTwice()
    {
        var template = MakeTemplate("[\"oi\"]", DateTimeOffset.UtcNow);
        var repo = new Mock<IEvolutionTemplateRepository>();
        repo.Setup(r => r.GetAllAsync(
                It.IsAny<System.Linq.Expressions.Expression<Func<EvolutionTemplate, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<EvolutionTemplate>, IQueryable<EvolutionTemplate>>[]>()))
            .ReturnsAsync(new List<EvolutionTemplate> { template });

        var engine = new EvolutionRulesEngine(repo.Object, CreateCache());

        await engine.MatchAsync("oi");
        await engine.MatchAsync("oi");

        repo.Verify(r => r.GetAllAsync(
            It.IsAny<System.Linq.Expressions.Expression<Func<EvolutionTemplate, bool>>>(),
            It.IsAny<bool>(),
            It.IsAny<Func<IQueryable<EvolutionTemplate>, IQueryable<EvolutionTemplate>>[]>()),
            Times.Once);
    }
}
```

- [ ] **Step 3: Rodar os testes — verificar que FALHAM (sem implementação)**

```bash
cd voro-salon-crm-api
dotnet test VoroSalonCrm.Tests.Integration \
    --filter "FullyQualifiedName~EvolutionRulesEngineTests"
```

Resultado esperado: falha de compilação (`EvolutionRulesEngine` não existe ainda).

- [ ] **Step 4: Criar a implementação `EvolutionRulesEngine.cs`**

Criar `voro-salon-crm-api/VoroSalonCrm.Infrastructure/Integration/EvolutionRulesEngine.cs`:

```csharp
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;

namespace VoroSalonCrm.Infrastructure.Integration
{
    public class EvolutionRulesEngine(
        IEvolutionTemplateRepository repository,
        IMemoryCache cache) : IEvolutionRulesEngine
    {
        private const string CacheKey = "evolution_rules_templates";
        private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

        public async Task<EvolutionTemplate?> MatchAsync(string bodyText, CancellationToken ct = default)
        {
            if (!cache.TryGetValue(CacheKey, out List<EvolutionTemplate>? templates))
            {
                var all = await repository.GetAllAsync(
                    t => t.IsActive && t.Keywords != null);

                templates = all.OrderBy(t => t.CreatedAt).ToList();
                cache.Set(CacheKey, templates, CacheTtl);
            }

            var lower = bodyText.ToLowerInvariant();

            foreach (var template in templates!)
            {
                var keywords = JsonSerializer.Deserialize<string[]>(template.Keywords!) ?? [];
                if (keywords.Any(kw => lower.Contains(kw.ToLowerInvariant())))
                    return template;
            }

            return null;
        }
    }
}
```

- [ ] **Step 5: Rodar os testes — verificar que PASSAM**

```bash
dotnet test VoroSalonCrm.Tests.Integration \
    --filter "FullyQualifiedName~EvolutionRulesEngineTests"
```

Resultado esperado:
```
Passed! - Failed: 0, Passed: 5, Skipped: 0
```

- [ ] **Step 6: Build geral**

```bash
dotnet build VoroSalonCrm.sln
```

Resultado esperado: `Build succeeded. 0 Error(s)`

- [ ] **Step 7: Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.Application/Services/Interfaces/Integration/IEvolutionRulesEngine.cs \
        voro-salon-crm-api/VoroSalonCrm.Infrastructure/Integration/EvolutionRulesEngine.cs \
        voro-salon-crm-api/VoroSalonCrm.Tests.Integration/Evolution/EvolutionRulesEngineTests.cs
git commit -m "feat(evolution): add EvolutionRulesEngine with keyword matching and 5-min cache"
```

---

## Task 6: Criar `IEvolutionAIResponder` + `EvolutionAIResponder` com testes

**Files:**
- Create: `voro-salon-crm-api/VoroSalonCrm.Application/Services/Interfaces/Integration/IEvolutionAIResponder.cs`
- Create: `voro-salon-crm-api/VoroSalonCrm.Infrastructure/Integration/EvolutionAIResponder.cs`
- Create: `voro-salon-crm-api/VoroSalonCrm.Tests.Integration/Evolution/EvolutionAIResponderTests.cs`

- [ ] **Step 1: Criar a interface**

Criar `IEvolutionAIResponder.cs`:

```csharp
namespace VoroSalonCrm.Application.Services.Interfaces.Integration
{
    public interface IEvolutionAIResponder
    {
        /// <summary>
        /// Monta system prompt com contexto do tenant (serviços + agendamentos ativos do cliente)
        /// e chama IAIConversationService.RespondWithContextAsync.
        /// </summary>
        Task<string> RespondAsync(Guid tenantId, string from, string bodyText, CancellationToken ct = default);
    }
}
```

- [ ] **Step 2: Escrever os testes**

Criar `voro-salon-crm-api/VoroSalonCrm.Tests.Integration/Evolution/EvolutionAIResponderTests.cs`:

```csharp
using Moq;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Infrastructure.Integration;

namespace VoroSalonCrm.Tests.Integration.Evolution;

public class EvolutionAIResponderTests
{
    private static Tenant MakeTenant(Guid id, string name) => new()
    {
        Id = id,
        Name = name,
        Slug = "slug"
    };

    [Fact]
    public async Task RespondAsync_CallsRespondWithContextAsync_WithTenantNameInPrompt()
    {
        var tenantId = Guid.NewGuid();
        var from = "5511999990000";
        var body = "Quero agendar";

        var tenantService = new Mock<ITenantService>();
        tenantService.Setup(s => s.GetByIdAsync(tenantId))
            .ReturnsAsync(MakeTenant(tenantId, "Salão Voro"));

        var serviceRepo = new Mock<IServiceRepository>();
        serviceRepo.Setup(r => r.GetAllAsync(
                It.IsAny<System.Linq.Expressions.Expression<Func<Service, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<Service>, IQueryable<Service>>[]>()))
            .ReturnsAsync(new List<Service>
            {
                new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Corte", Price = 60m }
            });

        var appointmentRepo = new Mock<IAppointmentRepository>();
        appointmentRepo.Setup(r => r.GetAllAsync(
                It.IsAny<System.Linq.Expressions.Expression<Func<Appointment, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<Appointment>, IQueryable<Appointment>>[]>()))
            .ReturnsAsync(new List<Appointment>());

        string? capturedPrompt = null;
        var aiService = new Mock<IAIConversationService>();
        aiService.Setup(s => s.RespondWithContextAsync(tenantId, from, It.IsAny<string>(), body))
            .Callback<Guid, string, string, string>((_, _, prompt, _) => capturedPrompt = prompt)
            .ReturnsAsync("Olá! Posso ajudar.");

        var responder = new EvolutionAIResponder(tenantService.Object, serviceRepo.Object, appointmentRepo.Object, aiService.Object);

        var result = await responder.RespondAsync(tenantId, from, body);

        Assert.Equal("Olá! Posso ajudar.", result);
        Assert.Contains("Salão Voro", capturedPrompt);
        Assert.Contains("Corte", capturedPrompt);
        Assert.Contains("R$60", capturedPrompt);
    }

    [Fact]
    public async Task RespondAsync_IncludesAppointmentInfo_WhenClientHasActiveAppointment()
    {
        var tenantId = Guid.NewGuid();
        var from = "5511999990000";

        var tenantService = new Mock<ITenantService>();
        tenantService.Setup(s => s.GetByIdAsync(tenantId))
            .ReturnsAsync(MakeTenant(tenantId, "Salão"));

        var serviceRepo = new Mock<IServiceRepository>();
        serviceRepo.Setup(r => r.GetAllAsync(
                It.IsAny<System.Linq.Expressions.Expression<Func<Service, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<Service>, IQueryable<Service>>[]>()))
            .ReturnsAsync(new List<Service>());

        var scheduledAt = new DateTimeOffset(2026, 5, 10, 14, 30, 0, TimeSpan.Zero);
        var appointment = new Appointment
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ScheduledDateTime = scheduledAt,
            Status = VoroSalonCrm.Domain.Enums.AppointmentStatus.Confirmed,
            Client = new Client { Phone = from },
            Service = new Service { Name = "Coloração" }
        };

        var appointmentRepo = new Mock<IAppointmentRepository>();
        appointmentRepo.Setup(r => r.GetAllAsync(
                It.IsAny<System.Linq.Expressions.Expression<Func<Appointment, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<Appointment>, IQueryable<Appointment>>[]>()))
            .ReturnsAsync(new List<Appointment> { appointment });

        string? capturedPrompt = null;
        var aiService = new Mock<IAIConversationService>();
        aiService.Setup(s => s.RespondWithContextAsync(tenantId, from, It.IsAny<string>(), It.IsAny<string>()))
            .Callback<Guid, string, string, string>((_, _, prompt, _) => capturedPrompt = prompt)
            .ReturnsAsync("Ok!");

        var responder = new EvolutionAIResponder(tenantService.Object, serviceRepo.Object, appointmentRepo.Object, aiService.Object);

        await responder.RespondAsync(tenantId, from, "oi");

        Assert.Contains("Coloração", capturedPrompt);
        Assert.Contains("10/05/2026", capturedPrompt);
    }

    [Fact]
    public async Task RespondAsync_ShowsNenhumAgendamento_WhenNoActiveAppointments()
    {
        var tenantId = Guid.NewGuid();
        var from = "5511999990000";

        var tenantService = new Mock<ITenantService>();
        tenantService.Setup(s => s.GetByIdAsync(tenantId))
            .ReturnsAsync(MakeTenant(tenantId, "Salão"));

        var serviceRepo = new Mock<IServiceRepository>();
        serviceRepo.Setup(r => r.GetAllAsync(
                It.IsAny<System.Linq.Expressions.Expression<Func<Service, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<Service>, IQueryable<Service>>[]>()))
            .ReturnsAsync(new List<Service>());

        var appointmentRepo = new Mock<IAppointmentRepository>();
        appointmentRepo.Setup(r => r.GetAllAsync(
                It.IsAny<System.Linq.Expressions.Expression<Func<Appointment, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<Appointment>, IQueryable<Appointment>>[]>()))
            .ReturnsAsync(new List<Appointment>());

        string? capturedPrompt = null;
        var aiService = new Mock<IAIConversationService>();
        aiService.Setup(s => s.RespondWithContextAsync(tenantId, from, It.IsAny<string>(), It.IsAny<string>()))
            .Callback<Guid, string, string, string>((_, _, prompt, _) => capturedPrompt = prompt)
            .ReturnsAsync("Ok!");

        var responder = new EvolutionAIResponder(tenantService.Object, serviceRepo.Object, appointmentRepo.Object, aiService.Object);

        await responder.RespondAsync(tenantId, from, "oi");

        Assert.Contains("nenhum agendamento ativo", capturedPrompt);
    }
}
```

- [ ] **Step 3: Rodar os testes — verificar que FALHAM**

```bash
dotnet test VoroSalonCrm.Tests.Integration \
    --filter "FullyQualifiedName~EvolutionAIResponderTests"
```

Resultado esperado: falha de compilação (`EvolutionAIResponder` não existe).

- [ ] **Step 4: Criar a implementação `EvolutionAIResponder.cs`**

Criar `voro-salon-crm-api/VoroSalonCrm.Infrastructure/Integration/EvolutionAIResponder.cs`:

```csharp
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;

namespace VoroSalonCrm.Infrastructure.Integration
{
    public class EvolutionAIResponder(
        ITenantService tenantService,
        IServiceRepository serviceRepository,
        IAppointmentRepository appointmentRepository,
        IAIConversationService aiConversationService) : IEvolutionAIResponder
    {
        public async Task<string> RespondAsync(Guid tenantId, string from, string bodyText, CancellationToken ct = default)
        {
            var tenant = await tenantService.GetByIdAsync(tenantId)
                ?? throw new InvalidOperationException($"Tenant {tenantId} not found.");

            var services = await serviceRepository.GetAllAsync(
                s => s.TenantId == tenantId && !s.IsDeleted);

            var now = DateTimeOffset.UtcNow;
            var appointments = await appointmentRepository.GetAllAsync(
                a => a.TenantId == tenantId
                     && !a.IsDeleted
                     && a.Client.Phone == from
                     && a.ScheduledDateTime > now
                     && (a.Status == AppointmentStatus.Pending || a.Status == AppointmentStatus.Confirmed),
                asNoTracking: true,
                q => q.Include(a => a.Client),
                q => q.Include(a => a.Service));

            var servicesText = services.Any()
                ? string.Join(", ", services.Select(s => $"{s.Name} - R${s.Price:F0}"))
                : "não informados";

            var appointmentsText = appointments.Any()
                ? string.Join("; ", appointments.Select(a =>
                    $"{a.Service?.Name ?? "Serviço"} em {a.ScheduledDateTime:dd/MM/yyyy} às {a.ScheduledDateTime:HH:mm}"))
                : "nenhum agendamento ativo";

            var systemPrompt =
                $"Você é o assistente virtual de {tenant.Name}. " +
                $"Serviços disponíveis: [{servicesText}]. " +
                "Responda em português, de forma amigável e concisa. Máximo 600 caracteres. " +
                $"Agendamentos ativos do cliente: [{appointmentsText}].";

            return await aiConversationService.RespondWithContextAsync(tenantId, from, systemPrompt, bodyText);
        }
    }
}
```

> **Nota sobre `includes`:** O `IRepositoryBase.GetAllAsync` aceita `params Func<IQueryable<T>, IQueryable<T>>[]`. Para includes encadeados, use lambdas separadas:
> ```csharp
> q => q.Include(a => a.Client),
> q => q.Include(a => a.Service)
> ```

- [ ] **Step 5: Rodar os testes — verificar que PASSAM**

```bash
dotnet test VoroSalonCrm.Tests.Integration \
    --filter "FullyQualifiedName~EvolutionAIResponderTests"
```

Resultado esperado: `Passed! - Failed: 0, Passed: 3`

- [ ] **Step 6: Build geral**

```bash
dotnet build VoroSalonCrm.sln
```

Resultado esperado: `Build succeeded. 0 Error(s)`

- [ ] **Step 7: Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.Application/Services/Interfaces/Integration/IEvolutionAIResponder.cs \
        voro-salon-crm-api/VoroSalonCrm.Infrastructure/Integration/EvolutionAIResponder.cs \
        voro-salon-crm-api/VoroSalonCrm.Tests.Integration/Evolution/EvolutionAIResponderTests.cs
git commit -m "feat(evolution): add EvolutionAIResponder with tenant context system prompt"
```

---

## Task 7: Criar `IEvolutionResponseService` + `EvolutionResponseService` com testes

**Files:**
- Create: `voro-salon-crm-api/VoroSalonCrm.Application/Services/Interfaces/Integration/IEvolutionResponseService.cs`
- Create: `voro-salon-crm-api/VoroSalonCrm.Infrastructure/Integration/EvolutionResponseService.cs`
- Create: `voro-salon-crm-api/VoroSalonCrm.Tests.Integration/Evolution/EvolutionResponseServiceTests.cs`

- [ ] **Step 1: Criar a interface**

Criar `IEvolutionResponseService.cs`:

```csharp
using VoroSalonCrm.Domain.Entities;

namespace VoroSalonCrm.Application.Services.Interfaces.Integration
{
    public interface IEvolutionResponseService
    {
        /// <summary>
        /// Processa uma mensagem inbound: tenta keyword-match, cai para IA se não houver match,
        /// envia a resposta e define msg.ProcessedByBotAt = UtcNow.
        /// Não lança exceções — erros são logados internamente.
        /// </summary>
        Task ProcessAsync(WhatsAppMessage msg, CancellationToken ct = default);
    }
}
```

- [ ] **Step 2: Escrever os testes**

Criar `voro-salon-crm-api/VoroSalonCrm.Tests.Integration/Evolution/EvolutionResponseServiceTests.cs`:

```csharp
using Moq;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Infrastructure.Integration;
using Microsoft.Extensions.Logging.Abstractions;

namespace VoroSalonCrm.Tests.Integration.Evolution;

public class EvolutionResponseServiceTests
{
    private static TenantEvolutionInstance MakeInstance(Guid tenantId) => new()
    {
        Id = Guid.NewGuid(),
        TenantId = tenantId,
        InstanceId = "instance-001",
        InstanceToken = "token-abc",
        Status = EvolutionInstanceStatus.Connected
    };

    private static WhatsAppMessage MakeInboundMsg(Guid tenantId, string body = "oi") => new()
    {
        Id = Guid.NewGuid(),
        TenantId = tenantId,
        Direction = "inbound",
        From = "5511999990000",
        To = "instance-001",
        Body = body,
        Timestamp = DateTimeOffset.UtcNow
    };

    [Fact]
    public async Task ProcessAsync_SendsTemplateResponse_WhenRulesEngineMatches()
    {
        var tenantId = Guid.NewGuid();
        var msg = MakeInboundMsg(tenantId, "oi tudo bem");
        var template = new EvolutionTemplate { Id = Guid.NewGuid(), Body = "Olá! Como posso ajudar?" };

        var instanceRepo = new Mock<ITenantEvolutionInstanceRepository>();
        instanceRepo.Setup(r => r.GetByTenantIdAsync(tenantId))
            .ReturnsAsync(MakeInstance(tenantId));

        var rulesEngine = new Mock<IEvolutionRulesEngine>();
        rulesEngine.Setup(r => r.MatchAsync(msg.Body, It.IsAny<CancellationToken>()))
            .ReturnsAsync(template);

        var templateService = new Mock<IEvolutionTemplateService>();
        templateService.Setup(s => s.RenderAsync(template.Id, Array.Empty<string>()))
            .ReturnsAsync("Olá! Como posso ajudar?");

        var aiResponder = new Mock<IEvolutionAIResponder>();
        var evolutionService = new Mock<IEvolutionService>();
        evolutionService.Setup(s => s.SendTextAsync("instance-001", msg.From, "Olá! Como posso ajudar?", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var whatsAppMsgService = new Mock<IWhatsAppMessageService>();

        var service = new EvolutionResponseService(
            instanceRepo.Object, rulesEngine.Object, templateService.Object,
            aiResponder.Object, evolutionService.Object, whatsAppMsgService.Object,
            NullLogger<EvolutionResponseService>.Instance);

        await service.ProcessAsync(msg);

        aiResponder.Verify(a => a.RespondAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        whatsAppMsgService.Verify(s => s.SaveOutboundAsync(tenantId, "instance-001", msg.From, "Olá! Como posso ajudar?", null), Times.Once);
        Assert.NotNull(msg.ProcessedByBotAt);
    }

    [Fact]
    public async Task ProcessAsync_CallsAIResponder_WhenNoRuleMatch()
    {
        var tenantId = Guid.NewGuid();
        var msg = MakeInboundMsg(tenantId, "quero agendar");

        var instanceRepo = new Mock<ITenantEvolutionInstanceRepository>();
        instanceRepo.Setup(r => r.GetByTenantIdAsync(tenantId))
            .ReturnsAsync(MakeInstance(tenantId));

        var rulesEngine = new Mock<IEvolutionRulesEngine>();
        rulesEngine.Setup(r => r.MatchAsync(msg.Body, It.IsAny<CancellationToken>()))
            .ReturnsAsync((EvolutionTemplate?)null);

        var aiResponder = new Mock<IEvolutionAIResponder>();
        aiResponder.Setup(a => a.RespondAsync(tenantId, msg.From, msg.Body, It.IsAny<CancellationToken>()))
            .ReturnsAsync("Claro! Qual serviço você deseja?");

        var templateService = new Mock<IEvolutionTemplateService>();
        var evolutionService = new Mock<IEvolutionService>();
        evolutionService.Setup(s => s.SendTextAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var whatsAppMsgService = new Mock<IWhatsAppMessageService>();

        var service = new EvolutionResponseService(
            instanceRepo.Object, rulesEngine.Object, templateService.Object,
            aiResponder.Object, evolutionService.Object, whatsAppMsgService.Object,
            NullLogger<EvolutionResponseService>.Instance);

        await service.ProcessAsync(msg);

        templateService.Verify(s => s.RenderAsync(It.IsAny<Guid>(), It.IsAny<string[]>()), Times.Never);
        whatsAppMsgService.Verify(s => s.SaveOutboundAsync(tenantId, "instance-001", msg.From, "Claro! Qual serviço você deseja?", null), Times.Once);
        Assert.NotNull(msg.ProcessedByBotAt);
    }

    [Fact]
    public async Task ProcessAsync_SetsProcessedByBotAt_EvenWhenBodyIsEmpty()
    {
        var tenantId = Guid.NewGuid();
        var msg = MakeInboundMsg(tenantId, body: "");

        var instanceRepo = new Mock<ITenantEvolutionInstanceRepository>();
        instanceRepo.Setup(r => r.GetByTenantIdAsync(tenantId))
            .ReturnsAsync(MakeInstance(tenantId));

        var rulesEngine = new Mock<IEvolutionRulesEngine>();
        var templateService = new Mock<IEvolutionTemplateService>();
        var aiResponder = new Mock<IEvolutionAIResponder>();
        var evolutionService = new Mock<IEvolutionService>();
        var whatsAppMsgService = new Mock<IWhatsAppMessageService>();

        var service = new EvolutionResponseService(
            instanceRepo.Object, rulesEngine.Object, templateService.Object,
            aiResponder.Object, evolutionService.Object, whatsAppMsgService.Object,
            NullLogger<EvolutionResponseService>.Instance);

        await service.ProcessAsync(msg);

        evolutionService.Verify(s => s.SendTextAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        Assert.NotNull(msg.ProcessedByBotAt);
    }

    [Fact]
    public async Task ProcessAsync_DoesNotSendResponse_WhenInstanceIsDisconnected()
    {
        var tenantId = Guid.NewGuid();
        var msg = MakeInboundMsg(tenantId);

        var disconnectedInstance = new TenantEvolutionInstance
        {
            TenantId = tenantId,
            InstanceId = "inst",
            Status = EvolutionInstanceStatus.Disconnected
        };

        var instanceRepo = new Mock<ITenantEvolutionInstanceRepository>();
        instanceRepo.Setup(r => r.GetByTenantIdAsync(tenantId))
            .ReturnsAsync(disconnectedInstance);

        var rulesEngine = new Mock<IEvolutionRulesEngine>();
        var templateService = new Mock<IEvolutionTemplateService>();
        var aiResponder = new Mock<IEvolutionAIResponder>();
        var evolutionService = new Mock<IEvolutionService>();
        var whatsAppMsgService = new Mock<IWhatsAppMessageService>();

        var service = new EvolutionResponseService(
            instanceRepo.Object, rulesEngine.Object, templateService.Object,
            aiResponder.Object, evolutionService.Object, whatsAppMsgService.Object,
            NullLogger<EvolutionResponseService>.Instance);

        await service.ProcessAsync(msg);

        evolutionService.Verify(s => s.SendTextAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
```

- [ ] **Step 3: Rodar os testes — verificar que FALHAM**

```bash
dotnet test VoroSalonCrm.Tests.Integration \
    --filter "FullyQualifiedName~EvolutionResponseServiceTests"
```

Resultado esperado: falha de compilação (`EvolutionResponseService` não existe).

- [ ] **Step 4: Criar `EvolutionResponseService.cs`**

Criar `voro-salon-crm-api/VoroSalonCrm.Infrastructure/Integration/EvolutionResponseService.cs`:

```csharp
using Microsoft.Extensions.Logging;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;

namespace VoroSalonCrm.Infrastructure.Integration
{
    public class EvolutionResponseService(
        ITenantEvolutionInstanceRepository instanceRepository,
        IEvolutionRulesEngine rulesEngine,
        IEvolutionTemplateService templateService,
        IEvolutionAIResponder aiResponder,
        IEvolutionService evolutionService,
        IWhatsAppMessageService whatsAppMessageService,
        ILogger<EvolutionResponseService> logger) : IEvolutionResponseService
    {
        public async Task ProcessAsync(WhatsAppMessage msg, CancellationToken ct = default)
        {
            try
            {
                var instance = await instanceRepository.GetByTenantIdAsync(msg.TenantId);
                if (instance == null || instance.Status != EvolutionInstanceStatus.Connected)
                    return;

                if (string.IsNullOrWhiteSpace(msg.Body))
                    return;

                var matchedTemplate = await rulesEngine.MatchAsync(msg.Body, ct);
                string responseText;

                if (matchedTemplate != null)
                {
                    responseText = await templateService.RenderAsync(matchedTemplate.Id, []);
                }
                else
                {
                    responseText = await aiResponder.RespondAsync(msg.TenantId, msg.From, msg.Body, ct);
                }

                var sent = await evolutionService.SendTextAsync(instance.InstanceId, msg.From, responseText, ct);
                if (!sent)
                {
                    logger.LogWarning("Evolution send failed for message {MessageId}.", msg.Id);
                    return;
                }

                await whatsAppMessageService.SaveOutboundAsync(
                    tenantId: msg.TenantId,
                    from: instance.InstanceId,
                    to: msg.From,
                    body: responseText);

                msg.ProcessedByBotAt = DateTimeOffset.UtcNow;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error processing message {MessageId} for tenant {TenantId}.", msg.Id, msg.TenantId);
            }
            finally
            {
                msg.ProcessedByBotAt ??= DateTimeOffset.UtcNow;
            }
        }
    }
}
```

- [ ] **Step 5: Rodar os testes — verificar que PASSAM**

```bash
dotnet test VoroSalonCrm.Tests.Integration \
    --filter "FullyQualifiedName~EvolutionResponseServiceTests"
```

Resultado esperado: `Passed! - Failed: 0, Passed: 4`

- [ ] **Step 6: Rodar todos os testes Evolution**

```bash
dotnet test VoroSalonCrm.Tests.Integration \
    --filter "FullyQualifiedName~Evolution"
```

Resultado esperado: todos os testes passando.

- [ ] **Step 7: Build geral**

```bash
dotnet build VoroSalonCrm.sln
```

Resultado esperado: `Build succeeded. 0 Error(s)`

- [ ] **Step 8: Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.Application/Services/Interfaces/Integration/IEvolutionResponseService.cs \
        voro-salon-crm-api/VoroSalonCrm.Infrastructure/Integration/EvolutionResponseService.cs \
        voro-salon-crm-api/VoroSalonCrm.Tests.Integration/Evolution/EvolutionResponseServiceTests.cs
git commit -m "feat(evolution): add EvolutionResponseService with template/AI orchestration"
```

---

## Task 8: Criar `EvolutionResponseWorker` + registrar todos os serviços

**Files:**
- Create: `voro-salon-crm-api/VoroSalonCrm.Infrastructure/Integration/EvolutionResponseWorker.cs`
- Modify: `voro-salon-crm-api/VoroSalonCrm.Contract/Extensions/Configurations/AddAppServicesExtension.cs`

- [ ] **Step 1: Criar `EvolutionResponseWorker.cs`**

Criar `voro-salon-crm-api/VoroSalonCrm.Infrastructure/Integration/EvolutionResponseWorker.cs`:

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Infrastructure.Factories;

namespace VoroSalonCrm.Infrastructure.Integration
{
    public class EvolutionResponseWorker(
        IServiceScopeFactory scopeFactory,
        IMemoryCache cache,
        ILogger<EvolutionResponseWorker> logger) : BackgroundService
    {
        private static readonly TimeSpan Interval = TimeSpan.FromSeconds(5);
        private const string ConnectedTenantsCacheKey = "evolution_connected_tenant_ids";
        private static readonly TimeSpan TenantCacheTtl = TimeSpan.FromSeconds(60);

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            logger.LogInformation("EvolutionResponseWorker started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessPendingMessagesAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Unhandled error in EvolutionResponseWorker cycle.");
                }

                await Task.Delay(Interval, stoppingToken);
            }
        }

        private async Task ProcessPendingMessagesAsync(CancellationToken ct)
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<JasmimDbContext>();
            var responseService = scope.ServiceProvider.GetRequiredService<IEvolutionResponseService>();

            var connectedTenantIds = await GetConnectedTenantIdsAsync(db, ct);
            if (connectedTenantIds.Count == 0) return;

            var cutoff = DateTimeOffset.UtcNow.AddHours(-24);

            var messages = await db.WhatsAppMessages
                .Where(m =>
                    m.ProcessedByBotAt == null &&
                    m.Direction == "inbound" &&
                    connectedTenantIds.Contains(m.TenantId) &&
                    m.Timestamp > cutoff)
                .OrderBy(m => m.Timestamp)
                .Take(20)
                .ToListAsync(ct);

            foreach (var msg in messages)
            {
                await responseService.ProcessAsync(msg, ct);
                await db.SaveChangesAsync(ct);
            }
        }

        private async Task<List<Guid>> GetConnectedTenantIdsAsync(JasmimDbContext db, CancellationToken ct)
        {
            if (cache.TryGetValue(ConnectedTenantsCacheKey, out List<Guid>? cached))
                return cached!;

            var ids = await db.TenantEvolutionInstances
                .Where(i => i.Status == EvolutionInstanceStatus.Connected)
                .Select(i => i.TenantId)
                .ToListAsync(ct);

            cache.Set(ConnectedTenantsCacheKey, ids, TenantCacheTtl);
            return ids;
        }
    }
}
```

- [ ] **Step 2: Registrar novos serviços em `AddAppServicesExtension.cs`**

Localizar o bloco `#region Identity Services` em `AddAppServicesExtension.cs` e, após a linha `services.AddScoped<IEvolutionService, EvolutionService>();`, adicionar:

```csharp
services.AddScoped<IEvolutionRulesEngine, EvolutionRulesEngine>();
services.AddScoped<IEvolutionAIResponder, EvolutionAIResponder>();
services.AddScoped<IEvolutionResponseService, EvolutionResponseService>();
```

Localizar o bloco de `AddHostedService` e adicionar após os existentes:

```csharp
services.AddHostedService<EvolutionResponseWorker>();
```

Adicionar os `using` necessários no topo do arquivo (se ainda não existirem — verificar que `VoroSalonCrm.Infrastructure.Integration` já está importado):
```csharp
using VoroSalonCrm.Application.Services.Interfaces.Integration;
```

- [ ] **Step 3: Build geral**

```bash
dotnet build VoroSalonCrm.sln
```

Resultado esperado: `Build succeeded. 0 Error(s)`

- [ ] **Step 4: Rodar todos os testes**

```bash
dotnet test VoroSalonCrm.sln
```

Resultado esperado: todos os testes passando.

- [ ] **Step 5: Iniciar a aplicação e verificar worker nos logs**

```bash
cd voro-salon-crm-api
dotnet run --project VoroSalonCrm.API
```

Resultado esperado nos logs de startup:
```
info: VoroSalonCrm.Infrastructure.Integration.EvolutionResponseWorker[0]
      EvolutionResponseWorker started.
```

- [ ] **Step 6: Commit final**

```bash
git add voro-salon-crm-api/VoroSalonCrm.Infrastructure/Integration/EvolutionResponseWorker.cs \
        voro-salon-crm-api/VoroSalonCrm.Contract/Extensions/Configurations/AddAppServicesExtension.cs
git commit -m "feat(evolution): add EvolutionResponseWorker background service and register all services"
```

---

## Checklist de Revisão (pós-implementação)

- [ ] Mensagens de texto recebem resposta automática via keyword match
- [ ] Mensagens sem keyword recebem resposta via IA com serviços e agendamentos no contexto
- [ ] Mensagens de áudio/imagem (body vazio) são marcadas como processadas sem resposta
- [ ] Mensagens com mais de 24h são ignoradas pelo worker
- [ ] Falha no envio Evolution → mensagem marcada como processada, sem reprocessamento
- [ ] Worker não derruba a aplicação em caso de exceção
- [ ] Todos os testes passando: `dotnet test VoroSalonCrm.sln`

# Evolution Templates & Conversation Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar rastreamento de conversas no evolution-webhook e criar sistema de templates globais para a IA enviar mensagens via Evolution Go.

**Architecture:** Nova entidade `EvolutionTemplate` (global, sem TenantId) com corpo parametrizado `{{1}}`, `{{2}}`; serviço de render que substitui placeholders; serviço de envio `IEvolutionService` que chama a REST API Evolution Go diretamente com instanceId + token do banco.

**Tech Stack:** .NET 8, Entity Framework Core (PostgreSQL), Clean Architecture, HttpClient (named "evolution-go")

---

## Mapa de Arquivos

| Ação | Arquivo |
|---|---|
| Criar | `VoroSalonCrm.Domain/Entities/EvolutionTemplate.cs` |
| Criar | `VoroSalonCrm.Domain/Interfaces/Repositories/IEvolutionTemplateRepository.cs` |
| Criar | `VoroSalonCrm.Application/DTOs/Integration/EvolutionTemplateDtos.cs` |
| Criar | `VoroSalonCrm.Application/Services/Interfaces/Integration/IEvolutionTemplateService.cs` |
| Criar | `VoroSalonCrm.Application/Services/Interfaces/Integration/IEvolutionService.cs` |
| Criar | `VoroSalonCrm.Application/Services/EvolutionTemplateService.cs` |
| Criar | `VoroSalonCrm.Infrastructure/Repositories/EvolutionTemplateRepository.cs` |
| Criar | `VoroSalonCrm.Infrastructure/Integration/EvolutionService.cs` |
| Modificar | `VoroSalonCrm.Infrastructure/Factories/JasmimDbContext.cs` |
| Modificar | `VoroSalonCrm.Contract/Extensions/Configurations/AddAppServicesExtension.cs` |
| Modificar | `VoroSalonCrm.API/Controllers/WhatsappController.cs` |
| Gerar | Migration `AddEvolutionTemplates` |

---

### Task 1: Entidade e Interface de Repositório (Domain)

**Files:**
- Create: `voro-salon-crm-api/VoroSalonCrm.Domain/Entities/EvolutionTemplate.cs`
- Create: `voro-salon-crm-api/VoroSalonCrm.Domain/Interfaces/Repositories/IEvolutionTemplateRepository.cs`

- [ ] **Step 1: Criar a entidade EvolutionTemplate**

```csharp
// VoroSalonCrm.Domain/Entities/EvolutionTemplate.cs
namespace VoroSalonCrm.Domain.Entities
{
    /// <summary>Template global de mensagem para Evolution Go. Sem TenantId — compartilhado entre todos os tenants.</summary>
    public class EvolutionTemplate
    {
        public Guid Id { get; set; }

        /// <summary>Chave técnica (ex: boas_vindas, lembrete_agendamento).</summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>Rótulo legível exibido no front.</summary>
        public string Label { get; set; } = string.Empty;

        /// <summary>Corpo da mensagem com placeholders {{1}}, {{2}}, etc.</summary>
        public string Body { get; set; } = string.Empty;

        public int ParamsCount { get; set; }

        /// <summary>JSON serializado dos labels dos parâmetros (ex: ["Nome", "Data"]).</summary>
        public string? ParamLabels { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? UpdatedAt { get; set; }
    }
}
```

- [ ] **Step 2: Criar a interface do repositório**

```csharp
// VoroSalonCrm.Domain/Interfaces/Repositories/IEvolutionTemplateRepository.cs
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories.Base;

namespace VoroSalonCrm.Domain.Interfaces.Repositories
{
    public interface IEvolutionTemplateRepository : IRepositoryBase<EvolutionTemplate>
    {
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.Domain/
git commit -m "feat(evolution): add EvolutionTemplate entity and repository interface"
```

---

### Task 2: DTOs e Interfaces de Serviço (Application)

**Files:**
- Create: `voro-salon-crm-api/VoroSalonCrm.Application/DTOs/Integration/EvolutionTemplateDtos.cs`
- Create: `voro-salon-crm-api/VoroSalonCrm.Application/Services/Interfaces/Integration/IEvolutionTemplateService.cs`
- Create: `voro-salon-crm-api/VoroSalonCrm.Application/Services/Interfaces/Integration/IEvolutionService.cs`

- [ ] **Step 1: Criar os DTOs**

```csharp
// VoroSalonCrm.Application/DTOs/Integration/EvolutionTemplateDtos.cs
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
        bool IsActive,
        DateTimeOffset CreatedAt);

    public record CreateEvolutionTemplateDto(
        [Required][StringLength(200)] string Name,
        [Required][StringLength(200)] string Label,
        [Required] string Body,
        int ParamsCount,
        string[]? ParamLabels,
        bool IsActive = true);

    public record UpdateEvolutionTemplateDto(
        [StringLength(200)] string? Name,
        [StringLength(200)] string? Label,
        string? Body,
        int? ParamsCount,
        string[]? ParamLabels,
        bool? IsActive);

    public record EvolutionSendDto(
        [Required] string InstanceId,
        [Required] string To,
        [Required] Guid TemplateId,
        string[] Params);
}
```

- [ ] **Step 2: Criar a interface IEvolutionTemplateService**

```csharp
// VoroSalonCrm.Application/Services/Interfaces/Integration/IEvolutionTemplateService.cs
using VoroSalonCrm.Application.DTOs.Integration;

namespace VoroSalonCrm.Application.Services.Interfaces.Integration
{
    public interface IEvolutionTemplateService
    {
        Task<IEnumerable<EvolutionTemplateDto>> GetAllAsync();
        Task<EvolutionTemplateDto?> GetByIdAsync(Guid id);
        Task<EvolutionTemplateDto> CreateAsync(CreateEvolutionTemplateDto dto);
        Task<EvolutionTemplateDto> UpdateAsync(Guid id, UpdateEvolutionTemplateDto dto);
        Task<bool> DeleteAsync(Guid id);
        /// <summary>Substitui {{1}}, {{2}}, ... pelo valor correspondente em parameters.</summary>
        Task<string> RenderAsync(Guid id, string[] parameters);
    }
}
```

- [ ] **Step 3: Criar a interface IEvolutionService**

```csharp
// VoroSalonCrm.Application/Services/Interfaces/Integration/IEvolutionService.cs
namespace VoroSalonCrm.Application.Services.Interfaces.Integration
{
    public interface IEvolutionService
    {
        Task<bool> SendTextAsync(string instanceId, string to, string text, CancellationToken ct = default);
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.Application/
git commit -m "feat(evolution): add evolution template DTOs and service interfaces"
```

---

### Task 3: Implementação EvolutionTemplateService (Application)

**Files:**
- Create: `voro-salon-crm-api/VoroSalonCrm.Application/Services/EvolutionTemplateService.cs`

- [ ] **Step 1: Criar o serviço**

```csharp
// VoroSalonCrm.Application/Services/EvolutionTemplateService.cs
using System.Text.Json;
using VoroSalonCrm.Application.DTOs.Integration;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class EvolutionTemplateService(
        IEvolutionTemplateRepository repository,
        IUnitOfWork unitOfWork) : IEvolutionTemplateService
    {
        private static EvolutionTemplateDto ToDto(EvolutionTemplate t) => new(
            t.Id, t.Name, t.Label, t.Body, t.ParamsCount,
            t.ParamLabels != null ? JsonSerializer.Deserialize<string[]>(t.ParamLabels) : null,
            t.IsActive, t.CreatedAt);

        public async Task<IEnumerable<EvolutionTemplateDto>> GetAllAsync()
        {
            var templates = await repository.GetAllAsync();
            return templates.Select(ToDto);
        }

        public async Task<EvolutionTemplateDto?> GetByIdAsync(Guid id)
        {
            var template = await repository.GetByIdAsync(true, id);
            return template == null ? null : ToDto(template);
        }

        public async Task<EvolutionTemplateDto> CreateAsync(CreateEvolutionTemplateDto dto)
        {
            var template = new EvolutionTemplate
            {
                Id = Guid.NewGuid(),
                Name = dto.Name,
                Label = dto.Label,
                Body = dto.Body,
                ParamsCount = dto.ParamsCount,
                ParamLabels = dto.ParamLabels != null ? JsonSerializer.Serialize(dto.ParamLabels) : null,
                IsActive = dto.IsActive,
                CreatedAt = DateTimeOffset.UtcNow
            };
            await repository.AddAsync(template);
            await unitOfWork.SaveChangesAsync();
            return ToDto(template);
        }

        public async Task<EvolutionTemplateDto> UpdateAsync(Guid id, UpdateEvolutionTemplateDto dto)
        {
            var template = await repository.GetByIdAsync(false, id)
                ?? throw new KeyNotFoundException($"Template '{id}' not found.");

            if (dto.Name is not null) template.Name = dto.Name;
            if (dto.Label is not null) template.Label = dto.Label;
            if (dto.Body is not null) template.Body = dto.Body;
            if (dto.ParamsCount.HasValue) template.ParamsCount = dto.ParamsCount.Value;
            if (dto.ParamLabels is not null) template.ParamLabels = JsonSerializer.Serialize(dto.ParamLabels);
            if (dto.IsActive.HasValue) template.IsActive = dto.IsActive.Value;
            template.UpdatedAt = DateTimeOffset.UtcNow;

            repository.Update(template);
            await unitOfWork.SaveChangesAsync();
            return ToDto(template);
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var template = await repository.GetByIdAsync(false, id);
            if (template == null) return false;

            repository.Delete(template);
            await unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task<string> RenderAsync(Guid id, string[] parameters)
        {
            var template = await repository.GetByIdAsync(true, id)
                ?? throw new KeyNotFoundException($"Template '{id}' not found.");

            var body = template.Body;
            for (int i = 0; i < parameters.Length; i++)
                body = body.Replace($"{{{{{i + 1}}}}}", parameters[i]);

            return body;
        }
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.Application/Services/EvolutionTemplateService.cs
git commit -m "feat(evolution): implement EvolutionTemplateService with render"
```

---

### Task 4: EvolutionTemplateRepository (Infrastructure)

**Files:**
- Create: `voro-salon-crm-api/VoroSalonCrm.Infrastructure/Repositories/EvolutionTemplateRepository.cs`

- [ ] **Step 1: Criar o repositório**

```csharp
// VoroSalonCrm.Infrastructure/Repositories/EvolutionTemplateRepository.cs
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Infrastructure.Factories;
using VoroSalonCrm.Infrastructure.Repositories.Base;

namespace VoroSalonCrm.Infrastructure.Repositories
{
    public class EvolutionTemplateRepository(JasmimDbContext context, IUnitOfWork unitOfWork)
        : RepositoryBase<EvolutionTemplate>(context, unitOfWork), IEvolutionTemplateRepository
    {
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.Infrastructure/Repositories/EvolutionTemplateRepository.cs
git commit -m "feat(evolution): add EvolutionTemplateRepository"
```

---

### Task 5: EvolutionService (Infrastructure)

**Files:**
- Create: `voro-salon-crm-api/VoroSalonCrm.Infrastructure/Integration/EvolutionService.cs`

- [ ] **Step 1: Criar o serviço de envio**

```csharp
// VoroSalonCrm.Infrastructure/Integration/EvolutionService.cs
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Shared.Utils;

namespace VoroSalonCrm.Infrastructure.Integration
{
    public sealed class EvolutionService(
        IOptions<IntegrationUtil> integrationUtil,
        IHttpClientFactory httpClientFactory,
        ILogger<EvolutionService> logger,
        ITenantEvolutionInstanceRepository instanceRepository) : IEvolutionService
    {
        private readonly WhatsappUtil _config = integrationUtil.Value.Whatsapp;
        private readonly HttpClient _http = httpClientFactory.CreateClient("evolution-go");

        private static readonly JsonSerializerOptions _jsonOptions = new()
        {
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };

        public async Task<bool> SendTextAsync(string instanceId, string to, string text, CancellationToken ct = default)
        {
            var instance = await instanceRepository.GetByInstanceIdAsync(instanceId);
            if (instance == null)
            {
                logger.LogWarning("Instância Evolution Go não encontrada: {InstanceId}", instanceId);
                return false;
            }

            var payload = new { number = NormalizeNumber(to), text, delay = 500 };
            var url = $"{_config.EvolutionUrl.TrimEnd('/')}/send/text";

            using var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Headers.Add("apikey", instance.InstanceToken);
            request.Content = new StringContent(
                JsonSerializer.Serialize(payload, _jsonOptions),
                Encoding.UTF8,
                "application/json");

            var response = await _http.SendAsync(request, ct);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(ct);
                logger.LogError("Evolution Go falhou ({StatusCode}) ao enviar para {To}: {Body}",
                    (int)response.StatusCode, to, body);
                return false;
            }

            return true;
        }

        private static string NormalizeNumber(string number)
            => new string(number.Where(char.IsDigit).ToArray());
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.Infrastructure/Integration/EvolutionService.cs
git commit -m "feat(evolution): implement EvolutionService for sending plain text via Evolution Go"
```

---

### Task 6: DbContext + Migration

**Files:**
- Modify: `voro-salon-crm-api/VoroSalonCrm.Infrastructure/Factories/JasmimDbContext.cs`

- [ ] **Step 1: Adicionar DbSet ao JasmimDbContext**

Adicionar a linha abaixo logo após `public DbSet<TenantEvolutionInstance> TenantEvolutionInstances { get; set; }` (linha ~80):

```csharp
public DbSet<EvolutionTemplate> EvolutionTemplates { get; set; }
```

- [ ] **Step 2: Gerar a migration**

```bash
cd voro-salon-crm-api
dotnet ef migrations add AddEvolutionTemplates --project VoroSalonCrm.Infrastructure --startup-project VoroSalonCrm.API
```

Esperado: nova migration gerada em `VoroSalonCrm.Infrastructure/Migrations/`.

- [ ] **Step 3: Verificar o conteúdo da migration gerada**

A migration deve conter `migrationBuilder.CreateTable("EvolutionTemplates", ...)` com as colunas: `Id`, `Name`, `Label`, `Body`, `ParamsCount`, `ParamLabels`, `IsActive`, `CreatedAt`, `UpdatedAt`.

- [ ] **Step 4: Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.Infrastructure/
git commit -m "feat(evolution): add EvolutionTemplates table migration"
```

---

### Task 7: Registro de Dependências

**Files:**
- Modify: `voro-salon-crm-api/VoroSalonCrm.Contract/Extensions/Configurations/AddAppServicesExtension.cs`

- [ ] **Step 1: Adicionar novos using**

No topo do arquivo, adicionar:

```csharp
using VoroSalonCrm.Infrastructure.Integration; // já existe, EvolutionService vai entrar aqui
```

- [ ] **Step 2: Registrar os serviços e repositório**

Dentro do método `AddApplicationServices`, adicionar após a linha `services.AddScoped<ITenantEvolutionInstanceRepository, TenantEvolutionInstanceRepository>();`:

```csharp
services.AddScoped<IEvolutionTemplateRepository, EvolutionTemplateRepository>();
services.AddScoped<IEvolutionTemplateService, EvolutionTemplateService>();
services.AddScoped<IEvolutionService, EvolutionService>();
```

- [ ] **Step 3: Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.Contract/
git commit -m "feat(evolution): register EvolutionTemplateRepository, EvolutionTemplateService, EvolutionService"
```

---

### Task 8: WhatsappController — evolution-webhook e novos endpoints

**Files:**
- Modify: `voro-salon-crm-api/VoroSalonCrm.API/Controllers/WhatsappController.cs`

- [ ] **Step 1: Atualizar evolution-webhook para persistir conversa**

Substituir o método `ReceiveEvolutionWebhook` atual pelo seguinte:

```csharp
[HttpPost("evolution-webhook")]
public async Task<IActionResult> ReceiveEvolutionWebhook(
    [FromBody] EvolutionWebhookDto webhook,
    [FromServices] ITenantEvolutionInstanceRepository evolutionInstanceRepository,
    [FromServices] IWhatsAppConversationRepository conversationRepository)
{
    Console.WriteLine("Received Evolution Webhook: " + System.Text.Json.JsonSerializer.Serialize(webhook));

    if (!string.Equals(webhook?.Event, "MESSAGE", StringComparison.OrdinalIgnoreCase) || webhook?.Data?.Info == null)
        return Ok();

    var info = webhook.Data.Info;

    if (info.IsFromMe)
        return Ok();

    var from = info.Chat.Split('@')[0];
    var contactName = info.PushName ?? "Cliente";
    var messageId = info.Id;
    var instanceId = webhook.InstanceId;
    var bodyText = webhook.Data.Message?.Conversation ?? string.Empty;

    // Resolver tenant pela instância
    Guid? tenantId = null;
    if (!string.IsNullOrEmpty(instanceId))
    {
        var evolutionInstance = await evolutionInstanceRepository.GetByInstanceIdAsync(instanceId);
        if (evolutionInstance != null)
            tenantId = evolutionInstance.TenantId;
    }

    // Salvar mensagem inbound
    if (tenantId.HasValue)
    {
        try
        {
            await _whatsAppMessageService.SaveInboundAsync(
                tenantId: tenantId.Value,
                from: from,
                to: instanceId ?? string.Empty,
                body: bodyText,
                whatsAppMessageId: messageId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao salvar mensagem inbound Evolution Go.");
        }

        // Upsert WhatsAppConversation
        try
        {
            var existing = await conversationRepository
                .Query(c => c.TenantId == tenantId.Value && c.PhoneNumber == from)
                .FirstOrDefaultAsync();

            if (existing == null)
            {
                await conversationRepository.AddAsync(new WhatsAppConversation
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId.Value,
                    PhoneNumber = from,
                    ContactName = contactName,
                    State = "ACTIVE",
                    LastMessageBody = bodyText,
                    LastMessageAt = DateTimeOffset.UtcNow,
                    CreatedAt = DateTimeOffset.UtcNow
                });
            }
            else
            {
                existing.LastMessageBody = bodyText;
                existing.LastMessageAt = DateTimeOffset.UtcNow;
                existing.UpdatedAt = DateTimeOffset.UtcNow;
                if (!string.IsNullOrEmpty(contactName) && contactName != "Cliente")
                    existing.ContactName = contactName;
                conversationRepository.Update(existing);
            }

            await conversationRepository.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao persistir conversa Evolution Go.");
        }
    }

    return Ok();
}
```

- [ ] **Step 2: Adicionar using necessário para FirstOrDefaultAsync**

Verificar se `using Microsoft.EntityFrameworkCore;` já existe no topo do arquivo. Se não existir, adicionar.

- [ ] **Step 3: Adicionar endpoint evolution-send**

Adicionar após o método `ReceiveEvolutionWebhook`:

```csharp
[HttpPost("evolution-send")]
[AllowAnonymous]
public async Task<IActionResult> SendEvolutionTemplate(
    [FromBody] EvolutionSendDto dto,
    [FromServices] IEvolutionTemplateService evolutionTemplateService,
    [FromServices] IEvolutionService evolutionService)
{
    try
    {
        var renderedText = await evolutionTemplateService.RenderAsync(dto.TemplateId, dto.Params);
        var success = await evolutionService.SendTextAsync(dto.InstanceId, dto.To, renderedText);

        if (success)
        {
            try
            {
                // Resolver tenantId pelo instanceId para salvar outbound
                // (fire-and-forget, não crítico)
            }
            catch { }
        }

        return success
            ? ResponseViewModel<object>.SuccessWithMessage("Mensagem enviada.", null).ToActionResult()
            : ResponseViewModel<object>.Fail("Falha ao enviar mensagem via Evolution Go.").ToActionResult();
    }
    catch (KeyNotFoundException ex)
    {
        return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
    }
    catch (Exception ex)
    {
        return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
    }
}
```

- [ ] **Step 4: Adicionar endpoints CRUD de evolution-templates**

Adicionar após o endpoint `evolution-send`:

```csharp
[HttpGet("evolution-templates")]
[Authorize]
public async Task<IActionResult> GetEvolutionTemplates(
    [FromServices] IEvolutionTemplateService evolutionTemplateService)
{
    try
    {
        var templates = await evolutionTemplateService.GetAllAsync();
        return ResponseViewModel<IEnumerable<EvolutionTemplateDto>>.Success(templates).ToActionResult();
    }
    catch (Exception ex)
    {
        return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
    }
}

[HttpPost("evolution-templates")]
[Authorize(Roles = "Owner,SalonOwner")]
public async Task<IActionResult> CreateEvolutionTemplate(
    [FromBody] CreateEvolutionTemplateDto dto,
    [FromServices] IEvolutionTemplateService evolutionTemplateService)
{
    try
    {
        var template = await evolutionTemplateService.CreateAsync(dto);
        return ResponseViewModel<EvolutionTemplateDto>
            .SuccessWithMessage("Template criado.", template)
            .ToActionResult();
    }
    catch (Exception ex)
    {
        return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
    }
}

[HttpPut("evolution-templates/{id:guid}")]
[Authorize(Roles = "Owner,SalonOwner")]
public async Task<IActionResult> UpdateEvolutionTemplate(
    [FromRoute] Guid id,
    [FromBody] UpdateEvolutionTemplateDto dto,
    [FromServices] IEvolutionTemplateService evolutionTemplateService)
{
    try
    {
        var template = await evolutionTemplateService.UpdateAsync(id, dto);
        return ResponseViewModel<EvolutionTemplateDto>
            .SuccessWithMessage("Template atualizado.", template)
            .ToActionResult();
    }
    catch (KeyNotFoundException ex)
    {
        return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
    }
    catch (Exception ex)
    {
        return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
    }
}

[HttpDelete("evolution-templates/{id:guid}")]
[Authorize(Roles = "Owner,SalonOwner")]
public async Task<IActionResult> DeleteEvolutionTemplate(
    [FromRoute] Guid id,
    [FromServices] IEvolutionTemplateService evolutionTemplateService)
{
    try
    {
        var deleted = await evolutionTemplateService.DeleteAsync(id);
        if (!deleted)
            return ResponseViewModel<object>.Fail("Template não encontrado.").ToActionResult();

        return ResponseViewModel<object>
            .SuccessWithMessage("Template excluído.", null)
            .ToActionResult();
    }
    catch (Exception ex)
    {
        return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
    }
}
```

- [ ] **Step 5: Adicionar usings no topo do WhatsappController**

Verificar se os seguintes namespaces estão presentes no topo do controller. Adicionar os que faltarem:

```csharp
using VoroSalonCrm.Application.DTOs.Integration;      // EvolutionSendDto, EvolutionTemplateDto, CreateEvolutionTemplateDto, UpdateEvolutionTemplateDto
using VoroSalonCrm.Application.Services.Interfaces.Integration; // IEvolutionTemplateService, IEvolutionService
using VoroSalonCrm.Domain.Entities;                   // WhatsAppConversation
using VoroSalonCrm.Domain.Interfaces.Repositories;    // IWhatsAppConversationRepository
```

- [ ] **Step 6: Build para verificar erros de compilação**

```bash
cd voro-salon-crm-api
dotnet build VoroSalonCrm.API/VoroSalonCrm.API.csproj
```

Esperado: `Build succeeded. 0 Error(s)`

- [ ] **Step 7: Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.API/Controllers/WhatsappController.cs
git commit -m "feat(evolution): add conversation upsert in webhook, evolution-send endpoint, and evolution-templates CRUD"
```

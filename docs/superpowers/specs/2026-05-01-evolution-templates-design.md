# Evolution Templates & Conversation Tracking

**Date:** 2026-05-01  
**Scope:** Evolution Go webhook — rastreamento de conversas + sistema de templates via banco de dados

---

## Contexto

A integração com Evolution Go não suporta mensagens interativas (botões, listas) da API oficial da Meta. Por isso, o fluxo de resposta é baseado em texto pleno, com a IA (Gemini Flash) decidindo qual template enviar. Os templates precisam ser armazenados no banco de dados com suporte a placeholders substituíveis em tempo de envio.

---

## 1. Nova Entidade — `EvolutionTemplate`

Tabela global (sem `TenantId`), visível para todos os tenants.

**Campos:**

| Campo | Tipo | Descrição |
|---|---|---|
| `Id` | `Guid` | PK |
| `Name` | `string(200)` | Chave técnica (ex: `boas_vindas`) |
| `Label` | `string(200)` | Nome legível para a UI |
| `Body` | `string` | Corpo da mensagem com `{{1}}`, `{{2}}` |
| `ParamsCount` | `int` | Número de parâmetros esperados |
| `ParamLabels` | `string?` | JSON com descrição de cada parâmetro |
| `IsActive` | `bool` | Controle de ativação |
| `CreatedAt` | `DateTimeOffset` | Data de criação |
| `UpdatedAt` | `DateTimeOffset?` | Data de última atualização |

**Render:** substituição sequencial de `{{1}}` → `params[0]`, `{{2}}` → `params[1]`, etc.

---

## 2. Camada de Domínio

### `EvolutionTemplate` (entity)
- Arquivo: `VoroSalonCrm.Domain/Entities/EvolutionTemplate.cs`
- Sem `TenantId` — global

### `IEvolutionTemplateRepository`
- Arquivo: `VoroSalonCrm.Domain/Interfaces/Repositories/IEvolutionTemplateRepository.cs`
- Herda `IRepositoryBase<EvolutionTemplate>`

---

## 3. Camada de Aplicação

### DTOs

**`EvolutionTemplateDto`** (record, leitura):
```csharp
record EvolutionTemplateDto(Guid Id, string Name, string Label, string Body,
    int ParamsCount, string[]? ParamLabels, bool IsActive, DateTimeOffset CreatedAt)
```

**`CreateEvolutionTemplateDto`** / **`UpdateEvolutionTemplateDto`** (input):
- Campos: `Name`, `Label`, `Body`, `ParamsCount`, `ParamLabels?`, `IsActive`

**`EvolutionSendDto`** (input do endpoint de envio):
```csharp
record EvolutionSendDto(string InstanceId, string To, Guid TemplateId, string[] Params)
```

### `IEvolutionTemplateService`

```csharp
Task<IEnumerable<EvolutionTemplateDto>> GetAllAsync();
Task<EvolutionTemplateDto?> GetByIdAsync(Guid id);
Task<EvolutionTemplateDto> CreateAsync(CreateEvolutionTemplateDto dto);
Task<EvolutionTemplateDto> UpdateAsync(Guid id, UpdateEvolutionTemplateDto dto);
Task<bool> DeleteAsync(Guid id);
Task<string> RenderAsync(Guid id, string[] parameters); // substitui {{N}}
```

---

## 4. Camada de Infraestrutura

### `IEvolutionService` (nova interface em Application)

```csharp
Task<bool> SendTextAsync(string instanceId, string to, string text, CancellationToken ct = default);
```

### `EvolutionService` (implementação em Infrastructure)

- Chama `POST /message/sendText/{instanceId}` na Evolution Go API
- Usa `HttpClient` configurado com a URL base e token da Evolution (já presente em `IntegrationUtil`)
- Retorna `true` se status HTTP 2xx

### `EvolutionTemplateRepository`
- Arquivo: `VoroSalonCrm.Infrastructure/Repositories/EvolutionTemplateRepository.cs`
- Herda `RepositoryBase<EvolutionTemplate>`

### `EvolutionTemplateService`
- Arquivo: `VoroSalonCrm.Application/Services/EvolutionTemplateService.cs`
- `RenderAsync`: itera de `{{1}}` a `{{N}}` substituindo pelos parâmetros recebidos

---

## 5. Mudanças no Controller (`WhatsappController`)

### `POST evolution-webhook` — ajustes

Remove a chamada ao `HandleMessageAsync` (depende de botões interativos).

Novo fluxo após receber mensagem:
1. Validar evento `MESSAGE` e `Info.IsFromMe == false` (já existente)
2. Salvar mensagem inbound via `IWhatsAppMessageService.SaveInboundAsync` (já existente)
3. **Novo:** criar ou atualizar `WhatsAppConversation` via upsert por `(TenantId, PhoneNumber)`
4. Retornar `Ok()` — a IA processa de forma assíncrona via seu próprio canal

### Novos endpoints

#### `POST /api/whatsapp/evolution-send` — envio de template pela IA

```
Body: EvolutionSendDto { instanceId, to, templateId, params[] }
```

1. Chama `IEvolutionTemplateService.RenderAsync(templateId, params)`
2. Chama `IEvolutionService.SendTextAsync(instanceId, to, renderedText)`
3. Salva mensagem outbound via `IWhatsAppMessageService.SaveOutboundAsync`
4. Retorna `Ok()`

**Auth:** `[AllowAnonymous]` — chamado internamente pela IA (ou proteger com token interno se necessário)

#### `GET /api/whatsapp/evolution-templates` — listagem (Authorize)
#### `POST /api/whatsapp/evolution-templates` — criação (Owner)
#### `PUT /api/whatsapp/evolution-templates/{id}` — atualização (Owner)
#### `DELETE /api/whatsapp/evolution-templates/{id}` — remoção (Owner)

---

## 6. Migration

Nova migration: `AddEvolutionTemplates`

```sql
CREATE TABLE EvolutionTemplates (
    Id          uuid PRIMARY KEY,
    Name        varchar(200) NOT NULL,
    Label       varchar(200) NOT NULL,
    Body        text NOT NULL,
    ParamsCount int NOT NULL DEFAULT 0,
    ParamLabels text NULL,
    IsActive    boolean NOT NULL DEFAULT true,
    CreatedAt   timestamptz NOT NULL,
    UpdatedAt   timestamptz NULL
);
```

---

## 7. Registro de Dependências

- `IEvolutionTemplateRepository` → `EvolutionTemplateRepository` (Scoped)
- `IEvolutionTemplateService` → `EvolutionTemplateService` (Scoped)
- `IEvolutionService` → `EvolutionService` (Scoped) + `HttpClient` nomeado
- `DbSet<EvolutionTemplate>` no `JasmimDbContext`

---

## Fluxo Completo

```
Evolution Go
    │
    ▼
POST /evolution-webhook
    ├── SaveInboundAsync (mensagem)
    ├── Upsert WhatsAppConversation
    └── Ok()

IA (Gemini Flash)
    │  decide template + parâmetros
    ▼
POST /evolution-send  { instanceId, to, templateId, params }
    ├── EvolutionTemplateService.RenderAsync → texto final
    ├── EvolutionService.SendTextAsync → Evolution Go API
    ├── SaveOutboundAsync (mensagem)
    └── Ok()
```

---

## Fora de Escopo

- Fluxo de agendamento via texto (máquina de estados sem botões) — futuro
- Autenticação do endpoint `/evolution-send` com token interno — futuro
- Sincronização de templates entre tenants — não se aplica (global)

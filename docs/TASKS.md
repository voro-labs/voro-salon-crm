# Idempotência & Cache Redis — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar idempotência em endpoints de mutação (POST/PUT/PATCH/DELETE) para evitar duplicação de requisições, e adicionar uma camada de cache distribuído com Redis para reduzir carga no PostgreSQL.

**Architecture:** Idempotência via header `Idempotency-Key` processado por um middleware ASP.NET Core que armazena respostas no Redis com TTL de 24h. Cache distribuído via `IDistributedCache` do .NET com Redis como backend, abstraído por uma interface `ICacheService` na camada Application. O middleware de idempotência intercepta requisições antes de chegarem aos controllers — se uma chave já foi processada, retorna a resposta armazenada sem executar a lógica de negócio.

**Tech Stack:** .NET 9, ASP.NET Core, Redis (StackExchange.Redis), Microsoft.Extensions.Caching.StackExchangeRedis, PostgreSQL (existente)

---

## Estrutura de Arquivos

| Ação | Arquivo | Responsabilidade |
|------|---------|-----------------|
| Criar | `VoroSalonCrm.Domain/Interfaces/Cache/ICacheService.cs` | Interface abstrata de cache |
| Criar | `VoroSalonCrm.Infrastructure/Cache/RedisCacheService.cs` | Implementação do cache com Redis |
| Criar | `VoroSalonCrm.API/Middlewares/IdempotencyMiddleware.cs` | Middleware de idempotência |
| Criar | `VoroSalonCrm.API/Attributes/IdempotentAttribute.cs` | Atributo para marcar endpoints idempotentes |
| Modificar | `VoroSalonCrm.Infrastructure/VoroSalonCrm.Infrastructure.csproj` | Adicionar pacote Redis |
| Modificar | `VoroSalonCrm.API/VoroSalonCrm.API.csproj` | Adicionar pacote Redis cache |
| Modificar | `VoroSalonCrm.Contract/Extensions/Configurations/AddAppServicesExtension.cs` | Registrar `ICacheService` |
| Criar | `VoroSalonCrm.Contract/Extensions/Configurations/AddRedisExtension.cs` | Configuração do Redis no DI |
| Modificar | `VoroSalonCrm.API/Program.cs` | Registrar middleware e Redis |
| Modificar | `VoroSalonCrm.API/Controllers/SubscriptionWebhookController.cs` | Aplicar `[Idempotent]` |
| Modificar | `VoroSalonCrm.API/Controllers/AppointmentsController.cs` | Aplicar `[Idempotent]` nos POST/PUT |
| Criar | `VoroSalonCrm.Tests.Integration/Cache/RedisCacheServiceTests.cs` | Testes de integração do cache |
| Criar | `VoroSalonCrm.Tests.Integration/Middleware/IdempotencyMiddlewareTests.cs` | Testes de integração da idempotência |

---

## Task 1: Adicionar pacotes NuGet do Redis

**Files:**
- Modify: `voro-salon-crm-api/VoroSalonCrm.Infrastructure/VoroSalonCrm.Infrastructure.csproj`
- Modify: `voro-salon-crm-api/VoroSalonCrm.API/VoroSalonCrm.API.csproj`

- [ ] **Step 1: Adicionar pacote StackExchange.Redis no Infrastructure**

```bash
cd voro-salon-crm-api && dotnet add VoroSalonCrm.Infrastructure/VoroSalonCrm.Infrastructure.csproj package Microsoft.Extensions.Caching.StackExchangeRedis
```

- [ ] **Step 2: Adicionar pacote StackExchange.Redis no API**

```bash
cd voro-salon-crm-api && dotnet add VoroSalonCrm.API/VoroSalonCrm.API.csproj package Microsoft.Extensions.Caching.StackExchangeRedis
```

- [ ] **Step 3: Verificar que o projeto compila**

Run: `cd voro-salon-crm-api && dotnet build`
Expected: Build succeeded

- [ ] **Step 4: Commit**

```bash
git add VoroSalonCrm.Infrastructure/VoroSalonCrm.Infrastructure.csproj VoroSalonCrm.API/VoroSalonCrm.API.csproj
git commit -m "chore: add StackExchange.Redis packages for cache and idempotency"
```

---

## Task 2: Criar a interface ICacheService

**Files:**
- Create: `voro-salon-crm-api/VoroSalonCrm.Domain/Interfaces/Cache/ICacheService.cs`

- [ ] **Step 1: Criar a interface**

```csharp
namespace VoroSalonCrm.Domain.Interfaces.Cache
{
    public interface ICacheService
    {
        Task<T?> GetAsync<T>(string key, CancellationToken ct = default);
        Task SetAsync<T>(string key, T value, TimeSpan? expiration = null, CancellationToken ct = default);
        Task RemoveAsync(string key, CancellationToken ct = default);
        Task<bool> ExistsAsync(string key, CancellationToken ct = default);

        // Idempotência: armazena a resposta HTTP completa
        Task<string?> GetRawAsync(string key, CancellationToken ct = default);
        Task SetRawAsync(string key, string value, TimeSpan? expiration = null, CancellationToken ct = default);
    }
}
```

- [ ] **Step 2: Verificar que o projeto compila**

Run: `cd voro-salon-crm-api && dotnet build`
Expected: Build succeeded

- [ ] **Step 3: Commit**

```bash
git add VoroSalonCrm.Domain/Interfaces/Cache/ICacheService.cs
git commit -m "feat: add ICacheService interface for distributed cache abstraction"
```

---

## Task 3: Implementar RedisCacheService

**Files:**
- Create: `voro-salon-crm-api/VoroSalonCrm.Infrastructure/Cache/RedisCacheService.cs`

- [ ] **Step 1: Implementar o serviço**

```csharp
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using VoroSalonCrm.Domain.Interfaces.Cache;

namespace VoroSalonCrm.Infrastructure.Cache
{
    public class RedisCacheService(IDistributedCache cache) : ICacheService
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true
        };

        public async Task<T?> GetAsync<T>(string key, CancellationToken ct = default)
        {
            var data = await cache.GetStringAsync(key, ct);
            if (data is null) return default;
            return JsonSerializer.Deserialize<T>(data, JsonOptions);
        }

        public async Task SetAsync<T>(string key, T value, TimeSpan? expiration = null, CancellationToken ct = default)
        {
            var options = new DistributedCacheEntryOptions();
            if (expiration.HasValue)
                options.AbsoluteExpirationRelativeToNow = expiration;

            var json = JsonSerializer.Serialize(value, JsonOptions);
            await cache.SetStringAsync(key, json, options, ct);
        }

        public async Task RemoveAsync(string key, CancellationToken ct = default)
        {
            await cache.RemoveAsync(key, ct);
        }

        public async Task<bool> ExistsAsync(string key, CancellationToken ct = default)
        {
            var data = await cache.GetStringAsync(key, ct);
            return data is not null;
        }

        public async Task<string?> GetRawAsync(string key, CancellationToken ct = default)
        {
            return await cache.GetStringAsync(key, ct);
        }

        public async Task SetRawAsync(string key, string value, TimeSpan? expiration = null, CancellationToken ct = default)
        {
            var options = new DistributedCacheEntryOptions();
            if (expiration.HasValue)
                options.AbsoluteExpirationRelativeToNow = expiration;

            await cache.SetStringAsync(key, value, options, ct);
        }
    }
}
```

- [ ] **Step 2: Verificar que o projeto compila**

Run: `cd voro-salon-crm-api && dotnet build`
Expected: Build succeeded

- [ ] **Step 3: Commit**

```bash
git add VoroSalonCrm.Infrastructure/Cache/RedisCacheService.cs
git commit -m "feat: implement RedisCacheService with IDistributedCache"
```

---

## Task 4: Criar extensão de configuração do Redis

**Files:**
- Create: `voro-salon-crm-api/VoroSalonCrm.Contract/Extensions/Configurations/AddRedisExtension.cs`

- [ ] **Step 1: Criar a extensão**

```csharp
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using VoroSalonCrm.Domain.Interfaces.Cache;
using VoroSalonCrm.Infrastructure.Cache;

namespace VoroSalonCrm.Contract.Extensions.Configurations
{
    public static class AddRedisExtension
    {
        public static IServiceCollection AddRedisCache(this IServiceCollection services, IConfiguration configuration)
        {
            var redisConnectionString = configuration.GetValue<string>("Redis:ConnectionString");

            if (string.IsNullOrEmpty(redisConnectionString))
            {
                // Fallback para cache em memória se Redis não estiver configurado
                services.AddDistributedMemoryCache();
            }
            else
            {
                services.AddStackExchangeRedisCache(options =>
                {
                    options.Configuration = redisConnectionString;
                    options.InstanceName = "jasmim:";
                });
            }

            services.AddSingleton<ICacheService, RedisCacheService>();

            return services;
        }
    }
}
```

- [ ] **Step 2: Registrar no Program.cs**

No arquivo `voro-salon-crm-api/VoroSalonCrm.API/Program.cs`, adicionar a chamada `.AddRedisCache(builder.Configuration)` na cadeia de services, logo após `.AddMemoryCache()`:

```csharp
// Antes:
.AddMemoryCache()
.AddLogging()

// Depois:
.AddMemoryCache()
.AddRedisCache(builder.Configuration)
.AddLogging()
```

- [ ] **Step 3: Verificar que o projeto compila**

Run: `cd voro-salon-crm-api && dotnet build`
Expected: Build succeeded

- [ ] **Step 4: Commit**

```bash
git add VoroSalonCrm.Contract/Extensions/Configurations/AddRedisExtension.cs VoroSalonCrm.API/Program.cs
git commit -m "feat: add Redis configuration extension with memory cache fallback"
```

---

## Task 5: Criar o atributo IdempotentAttribute

**Files:**
- Create: `voro-salon-crm-api/VoroSalonCrm.API/Attributes/IdempotentAttribute.cs`

- [ ] **Step 1: Criar o atributo**

```csharp
namespace VoroSalonCrm.API.Attributes
{
    /// <summary>
    /// Marca um endpoint como idempotente. Requisições com o mesmo header
    /// Idempotency-Key retornarão a resposta cacheada sem re-executar a lógica.
    /// </summary>
    [AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
    public class IdempotentAttribute : Attribute
    {
        /// <summary>
        /// Tempo de vida da chave de idempotência no cache. Default: 24 horas.
        /// </summary>
        public int ExpirationHours { get; set; } = 24;
    }
}
```

- [ ] **Step 2: Verificar que o projeto compila**

Run: `cd voro-salon-crm-api && dotnet build`
Expected: Build succeeded

- [ ] **Step 3: Commit**

```bash
git add VoroSalonCrm.API/Attributes/IdempotentAttribute.cs
git commit -m "feat: add IdempotentAttribute for marking idempotent endpoints"
```

---

## Task 6: Implementar o IdempotencyMiddleware

**Files:**
- Create: `voro-salon-crm-api/VoroSalonCrm.API/Middlewares/IdempotencyMiddleware.cs`

- [ ] **Step 1: Criar o middleware**

```csharp
using System.Text.Json;
using VoroSalonCrm.API.Attributes;
using VoroSalonCrm.Domain.Interfaces.Cache;

namespace VoroSalonCrm.API.Middlewares
{
    public class IdempotencyMiddleware(RequestDelegate next, ILogger<IdempotencyMiddleware> logger)
    {
        private const string IdempotencyKeyHeader = "Idempotency-Key";

        public async Task InvokeAsync(HttpContext context, ICacheService cacheService)
        {
            // Só processa métodos de mutação
            var method = context.Request.Method;
            if (method is "GET" or "HEAD" or "OPTIONS")
            {
                await next(context);
                return;
            }

            // Verifica se o endpoint tem o atributo [Idempotent]
            var endpoint = context.GetEndpoint();
            var idempotentAttr = endpoint?.Metadata.GetMetadata<IdempotentAttribute>();
            if (idempotentAttr is null)
            {
                await next(context);
                return;
            }

            // Verifica se o header Idempotency-Key foi enviado
            if (!context.Request.Headers.TryGetValue(IdempotencyKeyHeader, out var idempotencyKey) ||
                string.IsNullOrWhiteSpace(idempotencyKey))
            {
                // Sem header — processa normalmente (não bloqueia a requisição)
                await next(context);
                return;
            }

            var cacheKey = $"idempotency:{idempotencyKey}";
            var expiration = TimeSpan.FromHours(idempotentAttr.ExpirationHours);

            // Verifica se já existe resposta cacheada
            var cachedResponse = await cacheService.GetRawAsync(cacheKey);
            if (cachedResponse is not null)
            {
                logger.LogInformation("Idempotency hit for key {Key}. Returning cached response.", idempotencyKey.ToString());

                var cached = JsonSerializer.Deserialize<IdempotencyResponse>(cachedResponse);
                if (cached is not null)
                {
                    context.Response.StatusCode = cached.StatusCode;
                    context.Response.ContentType = cached.ContentType ?? "application/json";
                    if (cached.Body is not null)
                        await context.Response.WriteAsync(cached.Body);
                    return;
                }
            }

            // Marca como "em processamento" para evitar race conditions
            var lockKey = $"idempotency-lock:{idempotencyKey}";
            var lockAcquired = !(await cacheService.ExistsAsync(lockKey));

            if (!lockAcquired)
            {
                // Outra requisição com a mesma chave está em processamento
                context.Response.StatusCode = 409;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(new { message = "Requisição duplicada em processamento. Tente novamente em alguns segundos." });
                return;
            }

            // Seta lock por 30s
            await cacheService.SetRawAsync(lockKey, "processing", TimeSpan.FromSeconds(30));

            // Captura o response body
            var originalBodyStream = context.Response.Body;
            using var memoryStream = new MemoryStream();
            context.Response.Body = memoryStream;

            try
            {
                await next(context);

                // Lê o body da resposta
                memoryStream.Seek(0, SeekOrigin.Begin);
                var responseBody = await new StreamReader(memoryStream).ReadToEndAsync();

                // Armazena no cache
                var idempotencyResponse = new IdempotencyResponse
                {
                    StatusCode = context.Response.StatusCode,
                    ContentType = context.Response.ContentType,
                    Body = responseBody
                };

                var serialized = JsonSerializer.Serialize(idempotencyResponse);
                await cacheService.SetRawAsync(cacheKey, serialized, expiration);

                // Copia a resposta de volta para o stream original
                memoryStream.Seek(0, SeekOrigin.Begin);
                await memoryStream.CopyToAsync(originalBodyStream);
            }
            finally
            {
                context.Response.Body = originalBodyStream;
                await cacheService.RemoveAsync(lockKey);
            }
        }

        private sealed class IdempotencyResponse
        {
            public int StatusCode { get; set; }
            public string? ContentType { get; set; }
            public string? Body { get; set; }
        }
    }
}
```

- [ ] **Step 2: Registrar o middleware no Program.cs**

No arquivo `voro-salon-crm-api/VoroSalonCrm.API/Program.cs`, adicionar o middleware **após** `UseAuthorization()` e **antes** de `MapControllers()`:

```csharp
// Antes:
app.UseAuthorization();

app.MapControllers();

// Depois:
app.UseAuthorization();

app.UseMiddleware<IdempotencyMiddleware>();

app.MapControllers();
```

- [ ] **Step 3: Verificar que o projeto compila**

Run: `cd voro-salon-crm-api && dotnet build`
Expected: Build succeeded

- [ ] **Step 4: Commit**

```bash
git add VoroSalonCrm.API/Middlewares/IdempotencyMiddleware.cs VoroSalonCrm.API/Program.cs
git commit -m "feat: implement IdempotencyMiddleware with Redis-backed response caching"
```

---

## Task 7: Aplicar [Idempotent] nos endpoints críticos

**Files:**
- Modify: `voro-salon-crm-api/VoroSalonCrm.API/Controllers/SubscriptionWebhookController.cs`
- Modify: `voro-salon-crm-api/VoroSalonCrm.API/Controllers/AppointmentsController.cs`
- Modify: `voro-salon-crm-api/VoroSalonCrm.API/Controllers/TransactionsController.cs`
- Modify: `voro-salon-crm-api/VoroSalonCrm.API/Controllers/ServiceRecordController.cs`

- [ ] **Step 1: Aplicar no SubscriptionWebhookController**

Adicionar o using e o atributo no método `MercadoPagoWebhook`:

```csharp
using VoroSalonCrm.API.Attributes;

// No método:
[HttpPost("mercadopago")]
[AllowAnonymous]
[Idempotent(ExpirationHours = 48)]
public async Task<IActionResult> MercadoPagoWebhook()
```

- [ ] **Step 2: Aplicar no AppointmentsController**

Adicionar o using e o atributo nos métodos `Create` e `Update`:

```csharp
using VoroSalonCrm.API.Attributes;

// No Create:
[HttpPost]
[Idempotent]
public async Task<IActionResult> Create(CreateAppointmentDto dto)

// No Update:
[HttpPut("{id:guid}")]
[Idempotent]
public async Task<IActionResult> Update(Guid id, UpdateAppointmentDto dto)
```

- [ ] **Step 3: Aplicar no TransactionsController**

Adicionar o using e o atributo nos métodos de criação (`HttpPost`):

```csharp
using VoroSalonCrm.API.Attributes;

// Nos métodos HttpPost:
[HttpPost]
[Idempotent]
public async Task<IActionResult> Create(...)
```

- [ ] **Step 4: Aplicar no ServiceRecordController**

Adicionar o using e o atributo nos métodos de criação (`HttpPost`):

```csharp
using VoroSalonCrm.API.Attributes;

// No método Create:
[HttpPost]
[Idempotent]
public async Task<IActionResult> Create(...)
```

- [ ] **Step 5: Verificar que o projeto compila**

Run: `cd voro-salon-crm-api && dotnet build`
Expected: Build succeeded

- [ ] **Step 6: Commit**

```bash
git add VoroSalonCrm.API/Controllers/SubscriptionWebhookController.cs \
       VoroSalonCrm.API/Controllers/AppointmentsController.cs \
       VoroSalonCrm.API/Controllers/TransactionsController.cs \
       VoroSalonCrm.API/Controllers/ServiceRecordController.cs
git commit -m "feat: apply [Idempotent] attribute to critical mutation endpoints"
```

---

## Task 8: Adicionar cache nos services de leitura mais acessados

**Files:**
- Modify: `voro-salon-crm-api/VoroSalonCrm.Application/Services/ServiceService.cs`
- Modify: `voro-salon-crm-api/VoroSalonCrm.Application/Services/TenantService.cs`
- Modify: `voro-salon-crm-api/VoroSalonCrm.Application/Services/EmployeeService.cs`

O padrão de cache é simples — cache-aside com invalidação no write:

- [ ] **Step 1: Injetar ICacheService no ServiceService**

No construtor do `ServiceService`, adicionar `ICacheService cacheService` e usar no `GetAllAsync`:

```csharp
using VoroSalonCrm.Domain.Interfaces.Cache;

// No construtor — adicionar parâmetro ICacheService cacheService

// No GetAllAsync:
public async Task<IEnumerable<ServiceDto>> GetAllAsync()
{
    var tenantId = _currentUserService.TenantId;
    var cacheKey = $"services:tenant:{tenantId}";

    var cached = await _cacheService.GetAsync<IEnumerable<ServiceDto>>(cacheKey);
    if (cached is not null) return cached;

    // Lógica existente de buscar do banco...
    var result = /* resultado existente */;

    await _cacheService.SetAsync(cacheKey, result, TimeSpan.FromMinutes(10));
    return result;
}
```

- [ ] **Step 2: Invalidar cache nos métodos de escrita do ServiceService**

Em cada método que modifica dados (Create, Update, Delete), adicionar invalidação:

```csharp
// No final de Create/Update/Delete:
var tenantId = _currentUserService.TenantId;
await _cacheService.RemoveAsync($"services:tenant:{tenantId}");
```

- [ ] **Step 3: Repetir padrão para TenantService**

Cache key: `tenant:{tenantId}` com TTL de 30 minutos nos dados do tenant.

Invalidar no `UpdateAsync`.

- [ ] **Step 4: Repetir padrão para EmployeeService**

Cache key: `employees:tenant:{tenantId}` com TTL de 10 minutos.

Invalidar nos Create/Update/Delete.

- [ ] **Step 5: Verificar que o projeto compila**

Run: `cd voro-salon-crm-api && dotnet build`
Expected: Build succeeded

- [ ] **Step 6: Commit**

```bash
git add VoroSalonCrm.Application/Services/ServiceService.cs \
       VoroSalonCrm.Application/Services/TenantService.cs \
       VoroSalonCrm.Application/Services/EmployeeService.cs
git commit -m "feat: add Redis cache-aside pattern to high-read services"
```

---

## Task 9: Configurar Redis no ambiente de deploy

**Files:**
- Modify: `voro-salon-crm-api/fly.toml`
- Modify: `voro-salon-crm-api/VoroSalonCrm.API/appsettings.json` (ou secrets)

- [ ] **Step 1: Provisionar Redis no Fly.io**

```bash
cd voro-salon-crm-api
fly redis create --name jasmim-redis --region gru --plan free
```

- [ ] **Step 2: Configurar a connection string como secret no Fly.io**

```bash
fly secrets set Redis__ConnectionString="redis://default:PASSWORD@jasmim-redis.upstash.io:6379"
```

Nota: O Fly.io converte `Redis__ConnectionString` para a chave de configuração `Redis:ConnectionString` automaticamente.

- [ ] **Step 3: Adicionar configuração local no appsettings.Development.json**

```json
{
  "Redis": {
    "ConnectionString": ""
  }
}
```

Com a string vazia, o fallback para `DistributedMemoryCache` será usado no dev local (configurado na Task 4).

- [ ] **Step 4: Commit**

```bash
git add fly.toml appsettings.Development.json
git commit -m "chore: configure Redis connection for Fly.io deployment"
```

---

## Task 10: Enviar header Idempotency-Key no frontend

**Files:**
- Criar ou modificar: o client HTTP do frontend (Next.js) para enviar o header automaticamente

- [ ] **Step 1: Localizar o client HTTP do frontend**

Buscar onde as chamadas de API são feitas no `voro-salon-crm-front` (provavelmente um `fetch` wrapper ou `axios` instance).

- [ ] **Step 2: Criar utilitário de geração de chave**

```typescript
// utils/idempotency.ts
export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}
```

- [ ] **Step 3: Adicionar o header nas chamadas de mutação (POST/PUT/PATCH)**

No wrapper HTTP ou nos pontos onde `fetch`/`axios` é chamado para mutações, adicionar:

```typescript
headers: {
  ...existingHeaders,
  'Idempotency-Key': generateIdempotencyKey(),
}
```

**IMPORTANTE:** A chave deve ser gerada uma vez por ação do usuário (ex: no onClick do botão), não por retry. Se usar retry automático, reutilizar a mesma chave.

- [ ] **Step 4: Commit**

```bash
git add voro-salon-crm-front/utils/idempotency.ts # e outros arquivos modificados
git commit -m "feat: send Idempotency-Key header on mutation requests from frontend"
```

---

## Resumo de decisões arquiteturais

| Decisão | Justificativa |
|---------|--------------|
| `IDistributedCache` como abstração | Permite trocar Redis por outro provider sem alterar código de negócio |
| Fallback para `DistributedMemoryCache` | Dev local funciona sem Redis instalado |
| Middleware ao invés de Action Filter | Intercepta antes de model binding — mais eficiente para rejeitar duplicatas |
| Header `Idempotency-Key` opcional | Não quebra clientes existentes — degradação graciosa |
| Lock com TTL de 30s | Evita race conditions sem deadlock permanente |
| Cache-aside ao invés de write-through | Mais simples, invalidação explícita é suficiente para este volume |
| TTL de 24h na idempotência | Suficiente para cobrir retries de webhooks (MP pode retentar por horas) |
| `ICacheService` como Singleton | `IDistributedCache` é thread-safe e não depende de DbContext |

---

## Endpoints prioritários para idempotência

| Controller | Método | Motivo |
|-----------|--------|--------|
| `SubscriptionWebhookController` | `MercadoPagoWebhook` | MP reenvia webhooks — maior risco de duplicação |
| `AppointmentsController` | `Create`, `Update` | Duplo clique no frontend pode criar agendamento duplicado |
| `TransactionsController` | `Create` | Transação financeira duplicada é crítica |
| `ServiceRecordController` | `Create` | Atendimento duplicado afeta relatórios |

## Endpoints prioritários para cache

| Service | Key | TTL | Motivo |
|---------|-----|-----|--------|
| `ServiceService.GetAllAsync` | `services:tenant:{id}` | 10 min | Lista de serviços muda raramente, acessada em toda tela |
| `TenantService.GetByIdAsync` | `tenant:{id}` | 30 min | Dados do tenant mudam quase nunca |
| `EmployeeService.GetAllAsync` | `employees:tenant:{id}` | 10 min | Lista de funcionários consultada em agenda e formulários |

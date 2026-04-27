# Redis Fix + Distributed Caching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Redis connection string parsing bug (`:6379:6379` double port), add resilience to the cache layer, and extend distributed caching to all major services (Clients, Employees, Appointments, Dashboard, TransactionCategories, TenantBusinessHours, ServicePromotions, PublicBooking). Also add past appointments visibility to the appointments screen.

**Architecture:** The existing `ServiceService` already implements the cache pattern via `ICacheService` (Redis-backed `IDistributedCache`). We replicate this pattern across all tenant-scoped services: cache on `GetAll`/list reads with tenant-scoped keys, invalidate on Create/Update/Delete. The `RedisCacheService` gets try/catch resilience so cache failures degrade gracefully (cache miss) instead of crashing requests.

**Tech Stack:** .NET 9, StackExchange.Redis, ASP.NET Core `IDistributedCache`, Upstash Redis on Fly.io

---

## Task 1: Fix Redis Connection String Parsing

**Files:**
- Modify: `voro-salon-crm-api/VoroSalonCrm.Contract/Extensions/Configurations/AddRedisExtension.cs`

**Context:** The production error shows `fly-voro-salon-crm.upstash.io:6379:6379` — the Upstash connection string is in `redis://` URI format but StackExchange.Redis expects `host:port,password=xxx` format. The secret `REDIS__CONNECTIONSTRING` is set via `fly secrets`.

- [ ] **Step 1: Read the current file**

Read `voro-salon-crm-api/VoroSalonCrm.Contract/Extensions/Configurations/AddRedisExtension.cs` to confirm current state.

- [ ] **Step 2: Add URI parsing and update configuration**

Replace the full file content with:

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
                services.AddDistributedMemoryCache();
            }
            else
            {
                services.AddStackExchangeRedisCache(options =>
                {
                    options.Configuration = NormalizeConnectionString(redisConnectionString);
                    options.InstanceName = "jasmim:";
                });
            }

            services.AddSingleton<ICacheService, RedisCacheService>();

            return services;
        }

        private static string NormalizeConnectionString(string connectionString)
        {
            if (!connectionString.StartsWith("redis://", StringComparison.OrdinalIgnoreCase) &&
                !connectionString.StartsWith("rediss://", StringComparison.OrdinalIgnoreCase))
                return connectionString;

            var uri = new Uri(connectionString);
            var host = uri.Host;
            var port = uri.Port > 0 ? uri.Port : 6379;
            var password = uri.UserInfo?.Contains(':') == true
                ? uri.UserInfo.Split(':', 2)[1]
                : uri.UserInfo;
            var useSsl = connectionString.StartsWith("rediss://", StringComparison.OrdinalIgnoreCase);

            var parts = new List<string> { $"{host}:{port}" };
            if (!string.IsNullOrEmpty(password))
                parts.Add($"password={password}");
            if (useSsl)
                parts.Add("ssl=true");
            parts.Add("abortConnect=false");
            parts.Add("connectTimeout=10000");

            return string.Join(",", parts);
        }
    }
}
```

- [ ] **Step 3: Build to verify compilation**

Run: `dotnet build voro-salon-crm-api/VoroSalonCrm.Contract/VoroSalonCrm.Contract.csproj`
Expected: Build succeeded

- [ ] **Step 4: Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.Contract/Extensions/Configurations/AddRedisExtension.cs
git commit -m "fix: parse redis:// URI format to StackExchange.Redis format

Upstash provides redis:// URIs but StackExchange.Redis expects host:port,password=xxx.
Also adds abortConnect=false and connectTimeout=10000 for Fly.io cold starts."
```

---

## Task 2: Add Resilience to RedisCacheService

**Files:**
- Modify: `voro-salon-crm-api/VoroSalonCrm.Infrastructure/Cache/RedisCacheService.cs`

**Context:** When Redis is unavailable, the cache service throws and crashes the entire request. Cache should degrade gracefully — a failed `Get` returns `default` (cache miss), a failed `Set`/`Remove` is silently ignored. The app continues working, just slower.

- [ ] **Step 1: Read the current file**

Read `voro-salon-crm-api/VoroSalonCrm.Infrastructure/Cache/RedisCacheService.cs` to confirm current state.

- [ ] **Step 2: Add try/catch resilience to all methods**

Replace the full file content with:

```csharp
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using VoroSalonCrm.Domain.Interfaces.Cache;

namespace VoroSalonCrm.Infrastructure.Cache
{
    public class RedisCacheService(IDistributedCache cache, ILogger<RedisCacheService> logger) : ICacheService
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true
        };

        public async Task<T?> GetAsync<T>(string key, CancellationToken ct = default)
        {
            try
            {
                var data = await cache.GetStringAsync(key, ct);
                if (data is null) return default;
                return JsonSerializer.Deserialize<T>(data, JsonOptions);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Redis GET failed for key {Key}", key);
                return default;
            }
        }

        public async Task SetAsync<T>(string key, T value, TimeSpan? expiration = null, CancellationToken ct = default)
        {
            try
            {
                var options = new DistributedCacheEntryOptions();
                if (expiration.HasValue)
                    options.AbsoluteExpirationRelativeToNow = expiration;

                var json = JsonSerializer.Serialize(value, JsonOptions);
                await cache.SetStringAsync(key, json, options, ct);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Redis SET failed for key {Key}", key);
            }
        }

        public async Task RemoveAsync(string key, CancellationToken ct = default)
        {
            try
            {
                await cache.RemoveAsync(key, ct);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Redis REMOVE failed for key {Key}", key);
            }
        }

        public async Task<bool> ExistsAsync(string key, CancellationToken ct = default)
        {
            try
            {
                var data = await cache.GetStringAsync(key, ct);
                return data is not null;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Redis EXISTS failed for key {Key}", key);
                return false;
            }
        }

        public async Task<string?> GetRawAsync(string key, CancellationToken ct = default)
        {
            try
            {
                return await cache.GetStringAsync(key, ct);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Redis GET_RAW failed for key {Key}", key);
                return null;
            }
        }

        public async Task SetRawAsync(string key, string value, TimeSpan? expiration = null, CancellationToken ct = default)
        {
            try
            {
                var options = new DistributedCacheEntryOptions();
                if (expiration.HasValue)
                    options.AbsoluteExpirationRelativeToNow = expiration;

                await cache.SetStringAsync(key, value, options, ct);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Redis SET_RAW failed for key {Key}", key);
            }
        }
    }
}
```

- [ ] **Step 3: Build to verify compilation**

Run: `dotnet build voro-salon-crm-api/VoroSalonCrm.Infrastructure/VoroSalonCrm.Infrastructure.csproj`
Expected: Build succeeded

- [ ] **Step 4: Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.Infrastructure/Cache/RedisCacheService.cs
git commit -m "fix: add resilience to RedisCacheService — graceful degradation on Redis failure

All cache operations now catch exceptions and log warnings instead of crashing requests.
GET returns default (cache miss), SET/REMOVE silently fail."
```

---

## Task 3: Add Cache to ClientService

**Files:**
- Modify: `voro-salon-crm-api/VoroSalonCrm.Application/Services/ClientService.cs`

**Context:** Follow the exact same pattern as `ServiceService`: cache `GetAllAsync()` results with key `clients:tenant:{tenantId}`, TTL 10 minutes. `GetPagedAsync` calls `GetAllAsync` (like ServiceService). Invalidate on Create/Update/Delete.

- [ ] **Step 1: Read the current file**

Read `voro-salon-crm-api/VoroSalonCrm.Application/Services/ClientService.cs`.

- [ ] **Step 2: Add ICacheService to constructor and field**

Add `ICacheService cacheService` to the primary constructor parameters (after `whatsAppMessageService`):

```csharp
public class ClientService(
    IClientRepository clientRepository,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUserService,
    ITenantSubscriptionRepository subscriptionRepository,
    IUserNotificationService userNotificationService,
    IWhatsAppMessageService whatsAppMessageService,
    ICacheService cacheService) : IClientService
{
    private readonly IClientRepository _clientRepository = clientRepository;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;
    private readonly ICurrentUserService _currentUserService = currentUserService;
    private readonly ITenantSubscriptionRepository _subscriptionRepository = subscriptionRepository;
    private readonly IUserNotificationService _userNotificationService = userNotificationService;
    private readonly IWhatsAppMessageService _whatsAppMessageService = whatsAppMessageService;
    private readonly ICacheService _cacheService = cacheService;
```

Also add the using at the top:
```csharp
using VoroSalonCrm.Domain.Interfaces.Cache;
```

- [ ] **Step 3: Add cache to GetAllAsync**

Replace the `GetAllAsync` method:

```csharp
public async Task<IEnumerable<ClientDto>> GetAllAsync()
{
    var tenantId = _currentUserService.TenantId;
    var cacheKey = $"clients:tenant:{tenantId}";

    var cached = await _cacheService.GetAsync<List<ClientDto>>(cacheKey);
    if (cached is not null) return cached;

    var clients = await _clientRepository.GetAllAsync();
    var result = clients.Select(c => new ClientDto(c.Id, c.Name, c.Phone, c.Email, c.Notes, c.CreatedAt, c.BirthDate)).ToList();

    await _cacheService.SetAsync(cacheKey, result, TimeSpan.FromMinutes(10));
    return result;
}
```

- [ ] **Step 4: Add cache invalidation to CreateAsync**

After `await _unitOfWork.SaveChangesAsync();` in `CreateAsync`, add:

```csharp
await _cacheService.RemoveAsync($"clients:tenant:{tenantId}");
```

- [ ] **Step 5: Add cache invalidation to UpdateAsync**

After `await _unitOfWork.SaveChangesAsync();` in `UpdateAsync`, add:

```csharp
await _cacheService.RemoveAsync($"clients:tenant:{client.TenantId}");
```

Note: use `client.TenantId` (from the entity) since `_currentUserService.TenantId` may differ in edge cases.

- [ ] **Step 6: Add cache invalidation to DeleteAsync**

After `await _unitOfWork.SaveChangesAsync();` in `DeleteAsync`, add (using the already-captured `tenantId` variable):

```csharp
await _cacheService.RemoveAsync($"clients:tenant:{tenantId}");
```

- [ ] **Step 7: Build to verify compilation**

Run: `dotnet build voro-salon-crm-api/VoroSalonCrm.Application/VoroSalonCrm.Application.csproj`
Expected: Build succeeded

- [ ] **Step 8: Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.Application/Services/ClientService.cs
git commit -m "feat: add distributed cache to ClientService (10min TTL, tenant-scoped)"
```

---

## Task 4: Add Cache to EmployeeService

**Files:**
- Modify: `voro-salon-crm-api/VoroSalonCrm.Application/Services/EmployeeService.cs`

**Context:** Same pattern as ClientService. Cache `GetAllAsync()` with key `employees:tenant:{tenantId}`, TTL 10 minutes. `GetPagedAsync` and `GetAvailableForServiceAsync` also benefit since GetPaged calls GetAll. Invalidate on Create/Update/Delete. Note: EmployeeService uses `_unitOfWork.CommitAsync()` instead of `SaveChangesAsync()`.

- [ ] **Step 1: Read the current file**

Read `voro-salon-crm-api/VoroSalonCrm.Application/Services/EmployeeService.cs`.

- [ ] **Step 2: Add ICacheService to constructor**

Add `ICacheService cacheService` parameter to the primary constructor (after `IConfiguration configuration`), and add field `private readonly ICacheService _cacheService = cacheService;`.

Add the using:
```csharp
using VoroSalonCrm.Domain.Interfaces.Cache;
```

- [ ] **Step 3: Add cache to GetAllAsync**

Replace the `GetAllAsync` method:

```csharp
public async Task<IEnumerable<EmployeeDto>> GetAllAsync()
{
    var tenantId = _currentUser.TenantId;
    var cacheKey = $"employees:tenant:{tenantId}";

    var cached = await _cacheService.GetAsync<List<EmployeeDto>>(cacheKey);
    if (cached is not null) return cached;

    var employees = await _repository.GetByTenantWithSpecialtiesAsync(tenantId);
    var result = employees.Select(MapToDto).ToList();

    await _cacheService.SetAsync(cacheKey, result, TimeSpan.FromMinutes(10));
    return result;
}
```

- [ ] **Step 4: Add cache invalidation to CreateAsync**

After the last `await _unitOfWork.CommitAsync();` in `CreateAsync`, add:

```csharp
await _cacheService.RemoveAsync($"employees:tenant:{_currentUser.TenantId}");
```

- [ ] **Step 5: Add cache invalidation to UpdateAsync**

After `await _unitOfWork.CommitAsync();` in `UpdateAsync`, add:

```csharp
await _cacheService.RemoveAsync($"employees:tenant:{_currentUser.TenantId}");
```

- [ ] **Step 6: Add cache invalidation to DeleteAsync**

After `await _unitOfWork.CommitAsync();` in `DeleteAsync`, add:

```csharp
await _cacheService.RemoveAsync($"employees:tenant:{_currentUser.TenantId}");
```

- [ ] **Step 7: Add cache invalidation to CreateAccessAsync and RevokeAccessAsync**

Both methods modify employee data. After `await _unitOfWork.CommitAsync();` in each, add:

```csharp
await _cacheService.RemoveAsync($"employees:tenant:{_currentUser.TenantId}");
```

- [ ] **Step 8: Build and commit**

Run: `dotnet build voro-salon-crm-api/VoroSalonCrm.Application/VoroSalonCrm.Application.csproj`

```bash
git add voro-salon-crm-api/VoroSalonCrm.Application/Services/EmployeeService.cs
git commit -m "feat: add distributed cache to EmployeeService (10min TTL, tenant-scoped)"
```

---

## Task 5: Add Cache to DashboardService

**Files:**
- Modify: `voro-salon-crm-api/VoroSalonCrm.Application/Services/DashboardService.cs`

**Context:** Dashboard runs expensive multi-table aggregations (monthly revenue, total clients, revenue by month, top clients). This is the highest-value cache target. Use key `dashboard:tenant:{tenantId}`, TTL 5 minutes (shorter because dashboards should feel "fresh"). Note: DashboardService does NOT have `ICurrentUserService` — it relies on the repository's tenant filter. We need to add `ICurrentUserService` to get the tenantId for the cache key.

- [ ] **Step 1: Read the current file**

Read `voro-salon-crm-api/VoroSalonCrm.Application/Services/DashboardService.cs`.

- [ ] **Step 2: Add ICacheService and ICurrentUserService to constructor**

```csharp
using VoroSalonCrm.Domain.Interfaces.Cache;

public class DashboardService(
    IServiceRecordRepository serviceRepository,
    IClientRepository clientRepository,
    ICurrentUserService currentUserService,
    ICacheService cacheService) : IDashboardService
{
    private readonly IServiceRecordRepository _serviceRepository = serviceRepository;
    private readonly IClientRepository _clientRepository = clientRepository;
    private readonly ICurrentUserService _currentUserService = currentUserService;
    private readonly ICacheService _cacheService = cacheService;
```

Also add the using for the interface:
```csharp
using VoroSalonCrm.Application.Services.Interfaces;
```

- [ ] **Step 3: Add cache to GetDashboardMetricsAsync**

At the start of `GetDashboardMetricsAsync`, before `var now = DateTimeOffset.UtcNow;`, add:

```csharp
var tenantId = _currentUserService.TenantId;
var cacheKey = $"dashboard:tenant:{tenantId}";

var cached = await _cacheService.GetAsync<DashboardMetricsDto>(cacheKey);
if (cached is not null) return cached;
```

At the end, before the `return` statement, change:

```csharp
var result = new DashboardMetricsDto(
    MonthlyRevenue: monthlyRevenue,
    MonthlyServiceCount: monthlyServiceCount,
    TotalClients: totalClients,
    RevenueByMonth: filledRevenueByMonth,
    TopClients: topClientsDto
);

await _cacheService.SetAsync(cacheKey, result, TimeSpan.FromMinutes(5));
return result;
```

- [ ] **Step 4: Build and commit**

Run: `dotnet build voro-salon-crm-api/VoroSalonCrm.Application/VoroSalonCrm.Application.csproj`

```bash
git add voro-salon-crm-api/VoroSalonCrm.Application/Services/DashboardService.cs
git commit -m "feat: add distributed cache to DashboardService (5min TTL, tenant-scoped)"
```

---

## Task 6: Add Cache to TransactionCategoryService

**Files:**
- Modify: `voro-salon-crm-api/VoroSalonCrm.Application/Services/TransactionCategoryService.cs`

**Context:** Transaction categories rarely change. Cache with key `txcategories:tenant:{tenantId}`, TTL 15 minutes. Note: `GetAllAsync` accepts optional `TransactionType? type` filter — cache the full list and filter in memory, since categories are few.

- [ ] **Step 1: Read the current file**

Read `voro-salon-crm-api/VoroSalonCrm.Application/Services/TransactionCategoryService.cs`.

- [ ] **Step 2: Add ICacheService to constructor**

```csharp
using VoroSalonCrm.Domain.Interfaces.Cache;

public class TransactionCategoryService(
    ITransactionCategoryRepository transactionCategoryRepository,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUserService,
    ICacheService cacheService) : ITransactionCategoryService
{
    private readonly ITransactionCategoryRepository _repository = transactionCategoryRepository;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;
    private readonly ICurrentUserService _currentUser = currentUserService;
    private readonly ICacheService _cacheService = cacheService;
```

- [ ] **Step 3: Add cache to GetAllAsync**

Replace the `GetAllAsync` method:

```csharp
public async Task<IEnumerable<TransactionCategoryDto>> GetAllAsync(TransactionType? type = null, CancellationToken ct = default)
{
    var tenantId = _currentUser.TenantId;
    var cacheKey = $"txcategories:tenant:{tenantId}";

    var cached = await _cacheService.GetAsync<List<TransactionCategoryDto>>(cacheKey, ct);
    if (cached is not null)
    {
        IEnumerable<TransactionCategoryDto> filtered = cached;
        if (type.HasValue)
            filtered = cached.Where(c => c.Type == type.Value);
        return filtered;
    }

    var categories = await _repository.GetAllAsync(
        tc => tc.TenantId == tenantId && !tc.IsDeleted
    );

    var result = categories.OrderBy(tc => tc.Name).Select(tc => new TransactionCategoryDto
    {
        Id = tc.Id,
        Name = tc.Name,
        Type = tc.Type,
        IsActive = tc.IsActive,
        CreatedAt = tc.CreatedAt
    }).ToList();

    await _cacheService.SetAsync(cacheKey, result, TimeSpan.FromMinutes(15), ct);

    if (type.HasValue)
        return result.Where(c => c.Type == type.Value);
    return result;
}
```

- [ ] **Step 4: Add cache invalidation to CreateAsync, UpdateAsync, DeleteAsync**

After each `await _unitOfWork.SaveChangesAsync();` in Create/Update/Delete, add:

```csharp
await _cacheService.RemoveAsync($"txcategories:tenant:{_currentUser.TenantId}");
```

- [ ] **Step 5: Build and commit**

Run: `dotnet build voro-salon-crm-api/VoroSalonCrm.Application/VoroSalonCrm.Application.csproj`

```bash
git add voro-salon-crm-api/VoroSalonCrm.Application/Services/TransactionCategoryService.cs
git commit -m "feat: add distributed cache to TransactionCategoryService (15min TTL)"
```

---

## Task 7: Add Cache to TenantBusinessHoursService

**Files:**
- Modify: `voro-salon-crm-api/VoroSalonCrm.Application/Services/TenantBusinessHoursService.cs`

**Context:** Business hours are read frequently (every availability/slot calculation) but change rarely. Cache with key `businesshours:tenant:{tenantId}`, TTL 30 minutes. Invalidate on `UpsertAsync`.

- [ ] **Step 1: Read the current file**

Read `voro-salon-crm-api/VoroSalonCrm.Application/Services/TenantBusinessHoursService.cs`.

- [ ] **Step 2: Add ICacheService to constructor**

```csharp
using VoroSalonCrm.Domain.Interfaces.Cache;

public class TenantBusinessHoursService(
    ITenantBusinessHoursRepository repository,
    ICurrentUserService currentUserService,
    IUnitOfWork unitOfWork,
    ICacheService cacheService) : ITenantBusinessHoursService
{
```

- [ ] **Step 3: Add cache to GetAsync**

Replace the `GetAsync` method:

```csharp
public async Task<IEnumerable<BusinessHoursDayDto>> GetAsync()
{
    var tenantId = currentUserService.TenantId;
    var cacheKey = $"businesshours:tenant:{tenantId}";

    var cached = await cacheService.GetAsync<List<BusinessHoursDayDto>>(cacheKey);
    if (cached is not null) return cached;

    var hours = await repository.GetByTenantAsync(tenantId);
    var result = hours.Select(MapToDto).ToList();

    await cacheService.SetAsync(cacheKey, result, TimeSpan.FromMinutes(30));
    return result;
}
```

- [ ] **Step 4: Add cache invalidation to UpsertAsync**

At the end of `UpsertAsync`, before the final return, add:

```csharp
await cacheService.RemoveAsync($"businesshours:tenant:{tenantId}");
```

- [ ] **Step 5: Build and commit**

Run: `dotnet build voro-salon-crm-api/VoroSalonCrm.Application/VoroSalonCrm.Application.csproj`

```bash
git add voro-salon-crm-api/VoroSalonCrm.Application/Services/TenantBusinessHoursService.cs
git commit -m "feat: add distributed cache to TenantBusinessHoursService (30min TTL)"
```

---

## Task 8: Add Cache to ServicePromotionService

**Files:**
- Modify: `voro-salon-crm-api/VoroSalonCrm.Application/Services/ServicePromotionService.cs`

**Context:** Promotions are read on every service listing (both internal and public booking). Cache with key `promotions:tenant:{tenantId}`, TTL 10 minutes. Invalidate on Create/Update/Delete. Note: this service uses `currentUserService` directly (not via field) for tenantId.

- [ ] **Step 1: Read the current file**

Read `voro-salon-crm-api/VoroSalonCrm.Application/Services/ServicePromotionService.cs`.

- [ ] **Step 2: Add ICacheService to constructor**

```csharp
using VoroSalonCrm.Domain.Interfaces.Cache;

public class ServicePromotionService(
    IServicePromotionRepository promotionRepository,
    IServiceRepository serviceRepository,
    ICurrentUserService currentUserService,
    IUnitOfWork unitOfWork,
    ICacheService cacheService) : IServicePromotionService
{
```

- [ ] **Step 3: Add cache to GetAllAsync**

Replace the `GetAllAsync` method:

```csharp
public async Task<IEnumerable<ServicePromotionDto>> GetAllAsync()
{
    var tenantId = currentUserService.TenantId;
    var cacheKey = $"promotions:tenant:{tenantId}";

    var cached = await cacheService.GetAsync<List<ServicePromotionDto>>(cacheKey);
    if (cached is not null) return cached;

    var promotions = await promotionRepository
        .Include(p => p.Service)
        .ToListAsync();

    var result = promotions.Select(MapToDto).ToList();

    await cacheService.SetAsync(cacheKey, result, TimeSpan.FromMinutes(10));
    return result;
}
```

- [ ] **Step 4: Add cache invalidation to CreateAsync, UpdateAsync, DeleteAsync**

After `await unitOfWork.SaveChangesAsync();` in each method, add:

```csharp
await cacheService.RemoveAsync($"promotions:tenant:{currentUserService.TenantId}");
```

Also invalidate the services cache since promotions affect service pricing:

```csharp
await cacheService.RemoveAsync($"services:tenant:{currentUserService.TenantId}");
```

- [ ] **Step 5: Build and commit**

Run: `dotnet build voro-salon-crm-api/VoroSalonCrm.Application/VoroSalonCrm.Application.csproj`

```bash
git add voro-salon-crm-api/VoroSalonCrm.Application/Services/ServicePromotionService.cs
git commit -m "feat: add distributed cache to ServicePromotionService (10min TTL)

Also invalidates services cache since promotions affect displayed pricing."
```

---

## Task 9: Add Cache to PublicBookingService (Public API)

**Files:**
- Modify: `voro-salon-crm-api/VoroSalonCrm.Application/Services/PublicBookingService.cs`

**Context:** PublicBookingService serves unauthenticated traffic (public booking page). `GetTenantBySlugAsync` and `GetServicesByTenantAsync` are called on every page load. Cache these with slug-based keys since there's no authenticated tenant context. TTL 5 minutes for tenant config, 5 minutes for services list. Do NOT cache availability slots (they change with each booking) or booking creation.

- [ ] **Step 1: Read the current file**

Read `voro-salon-crm-api/VoroSalonCrm.Application/Services/PublicBookingService.cs`.

- [ ] **Step 2: Add ICacheService to constructor**

Add `ICacheService cacheService` as the last parameter in the primary constructor. Add field:

```csharp
private readonly ICacheService _cacheService = cacheService;
```

Add the using:
```csharp
using VoroSalonCrm.Domain.Interfaces.Cache;
```

- [ ] **Step 3: Add cache to GetTenantBySlugAsync**

At the start of `GetTenantBySlugAsync`, add:

```csharp
var cacheKey = $"public:tenant:{slug}";
var cached = await _cacheService.GetAsync<PublicTenantDto>(cacheKey);
if (cached is not null) return cached;
```

Before the `return` at the end of the method, store the result:

```csharp
var result = new PublicTenantDto(...) { BusinessHours = ... };
await _cacheService.SetAsync(cacheKey, result, TimeSpan.FromMinutes(5));
return result;
```

Specifically, replace from `return new PublicTenantDto(` through the end of the method body with:

```csharp
var result = new PublicTenantDto(
    tenant.Id,
    tenant.Name,
    tenant.Slug,
    tenant.ContactPhone,
    tenant.LogoUrl,
    tenant.PrimaryColor,
    tenant.SecondaryColor,
    tenant.ThemeMode?.ToString(),
    isBookingEnabled,
    tenant.DefaultPage,
    tenant.AppointmentViewMode
)
{
    BusinessHours = businessHoursDtos.Count > 0 ? businessHoursDtos : null
};

await _cacheService.SetAsync(cacheKey, result, TimeSpan.FromMinutes(5));
return result;
```

- [ ] **Step 4: Add cache to GetServicesByTenantAsync**

At the start of `GetServicesByTenantAsync`, after resolving the tenant, add:

```csharp
var tenant = await tenantRepository.GetBySlugAsync(tenantSlug);
if (tenant == null) return Enumerable.Empty<PublicServiceDto>();

var cacheKey = $"public:services:{tenant.Id}";
var cached = await _cacheService.GetAsync<List<PublicServiceDto>>(cacheKey);
if (cached is not null) return cached;
```

At the end, before the return, capture and cache:

```csharp
var result = services.Select(s =>
{
    var promo = promotions.FirstOrDefault(p => p.ServiceId == s.Id);
    return new PublicServiceDto(s.Id, s.Name, s.Price, s.DurationMinutes,
        s.Category, promo?.PromotionalPrice, promo != null);
}).ToList();

await _cacheService.SetAsync(cacheKey, result, TimeSpan.FromMinutes(5));
return result;
```

- [ ] **Step 5: Add cache to GetEmployeesByServiceAsync**

At the start, after resolving tenant:

```csharp
var cacheKey = $"public:employees:{tenant.Id}:{serviceId}";
var cached = await _cacheService.GetAsync<List<PublicEmployeeDto>>(cacheKey);
if (cached is not null) return cached;
```

At the end:

```csharp
var result = employees.Select(e => new PublicEmployeeDto(e.Id, e.Name, e.PhotoUrl)).ToList();

await _cacheService.SetAsync(cacheKey, result, TimeSpan.FromMinutes(5));
return result;
```

- [ ] **Step 6: Build and commit**

Run: `dotnet build voro-salon-crm-api/VoroSalonCrm.Application/VoroSalonCrm.Application.csproj`

```bash
git add voro-salon-crm-api/VoroSalonCrm.Application/Services/PublicBookingService.cs
git commit -m "feat: add distributed cache to PublicBookingService (5min TTL)

Caches GetTenantBySlug, GetServicesByTenant, GetEmployeesByService.
Does NOT cache availability slots or booking creation."
```

---

## Task 10: Add Cache Invalidation to AppointmentService

**Files:**
- Modify: `voro-salon-crm-api/VoroSalonCrm.Application/Services/AppointmentService.cs`

**Context:** AppointmentService is complex and has many side effects (notifications, WhatsApp, commission generation). We do NOT cache `GetAllAsync` or `GetPagedAsync` for appointments because they have many filter combinations (clientId, employeeId, dateFrom, dateTo) and the data changes frequently. Instead, we invalidate the **dashboard cache** when appointments change (since dashboard aggregates appointment/service record data). We also add `ICacheService` so future cache needs are easy to add.

- [ ] **Step 1: Read the current file**

Read `voro-salon-crm-api/VoroSalonCrm.Application/Services/AppointmentService.cs`.

- [ ] **Step 2: Add ICacheService to constructor**

Add `ICacheService cacheService` parameter to the primary constructor (after `IMemoryCache memoryCache`), and add field `private readonly ICacheService _cacheService = cacheService;`.

Add the using:
```csharp
using VoroSalonCrm.Domain.Interfaces.Cache;
```

- [ ] **Step 3: Invalidate dashboard cache on Create**

In `CreateAsync`, after `await _unitOfWork.SaveChangesAsync();`, add:

```csharp
await _cacheService.RemoveAsync($"dashboard:tenant:{tenantId}");
```

- [ ] **Step 4: Invalidate dashboard cache on Update and UpdateStatus**

In `UpdateAsync`, after `await _unitOfWork.SaveChangesAsync();`, add:

```csharp
var tenantId = _currentUserService.TenantId;
await _cacheService.RemoveAsync($"dashboard:tenant:{tenantId}");
```

In `UpdateStatusAsync`, after `await _unitOfWork.SaveChangesAsync();`, add:

```csharp
await _cacheService.RemoveAsync($"dashboard:tenant:{appointment.TenantId}");
```

- [ ] **Step 5: Invalidate dashboard cache on Delete**

In `DeleteAsync`, after `await _unitOfWork.SaveChangesAsync();`, add:

```csharp
await _cacheService.RemoveAsync($"dashboard:tenant:{appointment.TenantId}");
```

Note: use `appointment.TenantId` since the entity is already loaded.

- [ ] **Step 6: Build and commit**

Run: `dotnet build voro-salon-crm-api/VoroSalonCrm.Application/VoroSalonCrm.Application.csproj`

```bash
git add voro-salon-crm-api/VoroSalonCrm.Application/Services/AppointmentService.cs
git commit -m "feat: add dashboard cache invalidation to AppointmentService

Appointment CRUD now clears dashboard cache since dashboard
aggregates service record/revenue data derived from appointments."
```

---

## Task 11: Show Past Appointments on the Appointments Screen

**Files:**
- Modify: `voro-salon-crm-app/src/app/appointments/page.tsx`

**Context:** The dashboard has a feature that detects past appointments (status Pending=0 or Confirmed=1 with `scheduledDateTime < now`) and shows a warning button + modal to handle them. The appointments screen currently has period filters: "today", "week", "all". We need to add a "past" filter tab and a visual indicator (similar to dashboard's `pastAppointments` logic) so users can see and manage past unresolved appointments directly from the appointments screen.

The dashboard logic (from `app/page.tsx` lines 106-115):
```javascript
const pastAppointments = useMemo(() => {
  const now = new Date()
  return (aptData ?? []).filter((apt: any) => {
    const aptDate = new Date(apt.scheduledDateTime)
    return (
      aptDate < now &&
      (Number(apt.status) === 0 || Number(apt.status) === 1)
    )
  })
}, [aptData])
```

The appointments page period filter tabs are around line 1296-1302 of `app/appointments/page.tsx`.

- [ ] **Step 1: Read the current appointments page**

Read `voro-salon-crm-app/src/app/appointments/page.tsx` lines 860-960 (period filter logic) and lines 1290-1310 (filter tabs UI).

- [ ] **Step 2: Add "past" period filter option**

In the `periodFilter` handling section (around line 940-955), add a new case for `"past"`:

```typescript
case "past": {
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  setExtraParams({
    dateFrom: startOfDay(thirtyDaysAgo).toISOString(),
    dateTo: new Date().toISOString(),
  })
  break
}
```

- [ ] **Step 3: Add the "Anteriores" tab in the UI**

In the `TabsList` section (around line 1296-1302), add a new tab trigger for past appointments:

```tsx
<TabsTrigger value="past" className="text-xs">
  Anteriores
  {pastCount > 0 && (
    <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
      {pastCount}
    </span>
  )}
</TabsTrigger>
```

- [ ] **Step 4: Add pastCount computation**

Near the other `useMemo` hooks at the top of the component, add:

```typescript
const pastCount = useMemo(() => {
  if (!data?.items) return 0
  const now = new Date()
  return data.items.filter((apt: any) => {
    const aptDate = new Date(apt.scheduledDateTime)
    return aptDate < now && (Number(apt.status) === 0 || Number(apt.status) === 1)
  }).length
}, [data?.items])
```

Note: This counts past unresolved appointments in the currently loaded page. For the "past" tab, ALL results will be past by definition. The badge is most useful on the other tabs (today/week) to signal there are past items needing attention.

- [ ] **Step 5: Add visual indicator for past unresolved appointments in the list**

In the appointment card/row rendering, add a visual indicator when an appointment is past and still Pending/Confirmed. Find the appointment card component in the list view and add a warning badge:

```tsx
{new Date(appointment.scheduledDateTime) < new Date() &&
  (Number(appointment.status) === 0 || Number(appointment.status) === 1) && (
  <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
    Pendente
  </span>
)}
```

- [ ] **Step 6: Test in the browser**

1. Start the dev server: `npm run dev` (or `pnpm dev`) in the frontend folder
2. Navigate to `/appointments`
3. Verify the "Anteriores" tab appears in the period filter
4. Click "Anteriores" — should show appointments from the last 30 days that are in the past
5. Check that the badge count appears on other tabs when there are past unresolved appointments
6. Verify "Hoje", "Semana", and "Todos" tabs still work correctly

- [ ] **Step 7: Commit**

```bash
git add voro-salon-crm-app/src/app/appointments/page.tsx
git commit -m "feat: add past appointments tab and visual indicator on appointments screen

Adds 'Anteriores' period filter showing last 30 days of past appointments.
Shows amber badge count for unresolved past appointments on other tabs.
Highlights past pending/confirmed appointments with a warning badge."
```

---

## Cache Key Reference

| Service | Cache Key Pattern | TTL | Invalidated By |
|---------|------------------|-----|----------------|
| ServiceService | `services:tenant:{tenantId}` | 10min | Service CRUD |
| ClientService | `clients:tenant:{tenantId}` | 10min | Client CRUD |
| EmployeeService | `employees:tenant:{tenantId}` | 10min | Employee CRUD, Access CRUD |
| DashboardService | `dashboard:tenant:{tenantId}` | 5min | Appointment CRUD |
| TransactionCategoryService | `txcategories:tenant:{tenantId}` | 15min | Category CRUD |
| TenantBusinessHoursService | `businesshours:tenant:{tenantId}` | 30min | BusinessHours Upsert |
| ServicePromotionService | `promotions:tenant:{tenantId}` | 10min | Promotion CRUD |
| PublicBookingService | `public:tenant:{slug}` | 5min | (auto-expires) |
| PublicBookingService | `public:services:{tenantId}` | 5min | (auto-expires) |
| PublicBookingService | `public:employees:{tenantId}:{serviceId}` | 5min | (auto-expires) |

# WhatsApp Sub-tabs + Compartilhamento de Instância Evolution — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reestruturar a tab WhatsApp em sub-tabs (Evolution Go / API Oficial) com exclusividade mútua, melhorar a seção Evolution com status inline e ações expandíveis, e permitir que usuários com múltiplos tenants compartilhem uma instância Evolution entre estabelecimentos.

**Architecture:** Backend: nova entidade `TenantEvolutionInstanceLink` com repositório + 3 endpoints novos no `EvolutionInstanceController`; `EvolutionInstanceService` ganha resolução unificada com flag `IsOwned`; webhook handler passa a buscar tenants vinculados. Frontend: `app/settings/page.tsx` tem a tab WhatsApp reestruturada completamente inline; página separada `/settings/whatsapp/evolution` é removida.

**Tech Stack:** C# / .NET 8, Entity Framework Core, Next.js 14, React, shadcn/ui, SWR, TypeScript.

**Spec:** `docs/superpowers/specs/2026-05-09-whatsapp-subtabs-evolution-sharing-design.md`

---

## Tasks

### Task 1: Entidade de domínio `TenantEvolutionInstanceLink` + repositório

**Files:**
- Create: `voro-salon-crm-api/VoroSalonCrm.Domain/Entities/TenantEvolutionInstanceLink.cs`
- Create: `voro-salon-crm-api/VoroSalonCrm.Domain/Interfaces/Repositories/ITenantEvolutionInstanceLinkRepository.cs`
- Create: `voro-salon-crm-api/VoroSalonCrm.Infrastructure/Repositories/TenantEvolutionInstanceLinkRepository.cs`
- Modify: `voro-salon-crm-api/VoroSalonCrm.Infrastructure/Factories/JasmimDbContext.cs`
- Modify: `voro-salon-crm-api/VoroSalonCrm.Contract/Extensions/Configurations/AddAppServicesExtension.cs`

- [ ] **Criar a entidade de domínio**

```csharp
// VoroSalonCrm.Domain/Entities/TenantEvolutionInstanceLink.cs
namespace VoroSalonCrm.Domain.Entities
{
    public class TenantEvolutionInstanceLink
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>Tenant não-dono vinculado a esta instância.</summary>
        public Guid TenantId { get; set; }

        /// <summary>Instância Evolution de outro tenant.</summary>
        public Guid InstanceId { get; set; }

        public DateTimeOffset LinkedAt { get; set; } = DateTimeOffset.UtcNow;

        public Tenant Tenant { get; set; } = null!;
        public TenantEvolutionInstance Instance { get; set; } = null!;
    }
}
```

- [ ] **Criar a interface do repositório**

```csharp
// VoroSalonCrm.Domain/Interfaces/Repositories/ITenantEvolutionInstanceLinkRepository.cs
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories.Base;

namespace VoroSalonCrm.Domain.Interfaces.Repositories
{
    public interface ITenantEvolutionInstanceLinkRepository : IRepositoryBase<TenantEvolutionInstanceLink>
    {
        Task<TenantEvolutionInstanceLink?> GetByTenantIdAsync(Guid tenantId);
        Task<IEnumerable<TenantEvolutionInstanceLink>> GetByInstanceIdAsync(Guid instanceId);
    }
}
```

- [ ] **Criar a implementação do repositório**

```csharp
// VoroSalonCrm.Infrastructure/Repositories/TenantEvolutionInstanceLinkRepository.cs
using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Infrastructure.Factories;
using VoroSalonCrm.Infrastructure.Repositories.Base;

namespace VoroSalonCrm.Infrastructure.Repositories
{
    public class TenantEvolutionInstanceLinkRepository(JasmimDbContext context, IUnitOfWork unitOfWork)
        : RepositoryBase<TenantEvolutionInstanceLink>(context, unitOfWork), ITenantEvolutionInstanceLinkRepository
    {
        public Task<TenantEvolutionInstanceLink?> GetByTenantIdAsync(Guid tenantId)
            => _dbSet.FirstOrDefaultAsync(l => l.TenantId == tenantId);

        public async Task<IEnumerable<TenantEvolutionInstanceLink>> GetByInstanceIdAsync(Guid instanceId)
            => await _dbSet
                .Include(l => l.Tenant)
                .Where(l => l.InstanceId == instanceId)
                .ToListAsync();
    }
}
```

- [ ] **Adicionar DbSet ao JasmimDbContext**

No arquivo `VoroSalonCrm.Infrastructure/Factories/JasmimDbContext.cs`, após a linha `public DbSet<EvolutionTemplate> EvolutionTemplates { get; set; }`, adicionar:

```csharp
public DbSet<TenantEvolutionInstanceLink> TenantEvolutionInstanceLinks { get; set; }
```

- [ ] **Registrar o repositório no DI**

No arquivo `VoroSalonCrm.Contract/Extensions/Configurations/AddAppServicesExtension.cs`, após a linha que registra `ITenantEvolutionInstanceRepository`, adicionar:

```csharp
services.AddScoped<ITenantEvolutionInstanceLinkRepository, TenantEvolutionInstanceLinkRepository>();
```

- [ ] **Criar e aplicar a migration EF Core**

```bash
cd voro-salon-crm-api
dotnet ef migrations add AddTenantEvolutionInstanceLink \
  --project VoroSalonCrm.Infrastructure \
  --startup-project VoroSalonCrm.API
dotnet ef database update \
  --project VoroSalonCrm.Infrastructure \
  --startup-project VoroSalonCrm.API
```

A migration gerada deve criar a tabela `TenantEvolutionInstanceLinks` com:
- FK para `TenantEvolutionInstances` em `InstanceId`
- FK para `Tenants` em `TenantId`
- Unique index em `TenantId` (garante no máximo um link por tenant)

Adicione o unique index manualmente se o EF não gerar automaticamente:

```csharp
// Dentro do método Up() da migration gerada
migrationBuilder.CreateIndex(
    name: "IX_TenantEvolutionInstanceLinks_TenantId",
    table: "TenantEvolutionInstanceLinks",
    column: "TenantId",
    unique: true);
```

- [ ] **Compilar para verificar**

```bash
cd voro-salon-crm-api && dotnet build VoroSalonCrm.sln
```

Expected: Build succeeded, 0 errors.

- [ ] **Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.Domain/Entities/TenantEvolutionInstanceLink.cs \
  voro-salon-crm-api/VoroSalonCrm.Domain/Interfaces/Repositories/ITenantEvolutionInstanceLinkRepository.cs \
  voro-salon-crm-api/VoroSalonCrm.Infrastructure/Repositories/TenantEvolutionInstanceLinkRepository.cs \
  voro-salon-crm-api/VoroSalonCrm.Infrastructure/Factories/JasmimDbContext.cs \
  voro-salon-crm-api/VoroSalonCrm.Contract/Extensions/Configurations/AddAppServicesExtension.cs \
  voro-salon-crm-api/VoroSalonCrm.Infrastructure/Migrations/
git commit -m "feat(evolution): add TenantEvolutionInstanceLink entity, repository and migration"
```

---

### Task 2: DTOs + atualização da interface e implementação do serviço

**Files:**
- Create: `voro-salon-crm-api/VoroSalonCrm.Application/DTOs/Integration/EvolutionInstanceLinkDtos.cs`
- Modify: `voro-salon-crm-api/VoroSalonCrm.Application/DTOs/Integration/EvolutionInstanceDto.cs`
- Modify: `voro-salon-crm-api/VoroSalonCrm.Application/Services/Interfaces/Integration/IEvolutionInstanceService.cs`
- Modify: `voro-salon-crm-api/VoroSalonCrm.Infrastructure/Integration/EvolutionInstanceService.cs`

- [ ] **Criar os DTOs de link**

```csharp
// VoroSalonCrm.Application/DTOs/Integration/EvolutionInstanceLinkDtos.cs
using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Application.DTOs.Integration
{
    public record EvolutionAvailableInstanceDto(
        Guid InstanceId,
        string TenantName,
        string? PhoneNumber,
        EvolutionInstanceStatus Status
    );

    public record EvolutionLinkRequestDto(
        Guid InstanceId
    );
}
```

- [ ] **Adicionar campos `IsOwned` e `OwnerTenantName` ao `EvolutionInstanceDto`**

Substituir o record existente em `VoroSalonCrm.Application/DTOs/Integration/EvolutionInstanceDto.cs`:

```csharp
public record EvolutionInstanceDto(
    Guid Id,
    string InstanceId,
    EvolutionInstanceStatus Status,
    string? PhoneNumber,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ConnectedAt,
    bool IsOwned,
    string? OwnerTenantName  // null quando IsOwned = true; nome do tenant dono quando IsOwned = false
);
```

- [ ] **Adicionar novos métodos à interface `IEvolutionInstanceService`**

```csharp
// Adicionar ao final da interface existente:
Task<IEnumerable<EvolutionAvailableInstanceDto>> GetAvailableToLinkAsync(Guid currentTenantId, Guid userId, CancellationToken ct = default);
Task LinkAsync(Guid tenantId, Guid instanceId, Guid userId, CancellationToken ct = default);
Task UnlinkAsync(Guid tenantId, CancellationToken ct = default);
```

- [ ] **Atualizar `GetByTenantAsync` para incluir instâncias vinculadas**

Em `EvolutionInstanceService.cs`, substituir o método `GetByTenantAsync`:

```csharp
public async Task<IEnumerable<EvolutionInstanceDto>> GetByTenantAsync(Guid tenantId, CancellationToken ct = default)
{
    // Instância própria
    var own = await _instanceRepository.GetByTenantIdAsync(tenantId);
    if (own != null)
        return new[] { ToDto(own, isOwned: true, ownerTenantName: null) };

    // Instância vinculada
    var link = await _linkRepository.GetByTenantIdAsync(tenantId);
    if (link != null)
    {
        var linked = await _instanceRepository.GetByIdAsync(false, link.InstanceId);
        if (linked != null)
        {
            var ownerTenant = await _tenantRepository.GetByIdAsync(true, linked.TenantId);
            return new[] { ToDto(linked, isOwned: false, ownerTenantName: ownerTenant?.Name) };
        }
    }

    return Enumerable.Empty<EvolutionInstanceDto>();
}
```

- [ ] **Atualizar `GetOwnedOrThrowAsync` para verificar `IsOwned`**

```csharp
private async Task<(TenantEvolutionInstance instance, bool isOwned)> ResolveOrThrowAsync(Guid tenantId, Guid instanceDbId)
{
    // Tenta instância própria
    var own = await _instanceRepository.GetByIdAsync(true, instanceDbId);
    if (own != null && own.TenantId == tenantId)
        return (own, true);

    // Tenta instância vinculada
    var link = await _linkRepository.GetByTenantIdAsync(tenantId);
    if (link != null && link.InstanceId == instanceDbId)
    {
        var linked = await _instanceRepository.GetByIdAsync(true, instanceDbId)
            ?? throw new KeyNotFoundException("Instância não encontrada.");
        return (linked, false);
    }

    throw new KeyNotFoundException("Instância não encontrada ou não pertence a este tenant.");
}
```

- [ ] **Atualizar operações destrutivas para verificar `IsOwned`**

Em `DisconnectAsync` e `DeleteAsync`, substituir `GetOwnedOrThrowAsync` por `ResolveOrThrowAsync` e adicionar guard:

```csharp
public async Task DisconnectAsync(Guid tenantId, Guid instanceDbId, CancellationToken ct = default)
{
    var (instance, isOwned) = await ResolveOrThrowAsync(tenantId, instanceDbId);
    if (!isOwned)
        throw new UnauthorizedAccessException("Somente o tenant dono pode desconectar esta instância.");
    // ... resto do código existente
}

public async Task DeleteAsync(Guid tenantId, Guid instanceDbId, CancellationToken ct = default)
{
    var (instance, isOwned) = await ResolveOrThrowAsync(tenantId, instanceDbId);
    if (!isOwned)
        throw new UnauthorizedAccessException("Somente o tenant dono pode excluir esta instância.");
    // ... resto do código existente
}
```

Fazer o mesmo em `GetQrAsync`, `PairAsync`, `DisconnectAsync`.

- [ ] **Implementar `GetAvailableToLinkAsync`**

```csharp
public async Task<IEnumerable<EvolutionAvailableInstanceDto>> GetAvailableToLinkAsync(
    Guid currentTenantId, Guid userId, CancellationToken ct = default)
{
    // Todos os tenants que o usuário acessa
    var userTenants = await _userTenantRepository.GetAllAsync(
        ut => ut.UserId == userId, asNoTracking: true);

    var otherTenantIds = userTenants
        .Select(ut => ut.TenantId)
        .Where(id => id != currentTenantId)
        .ToList();

    // Verificar se tenant atual já tem instância própria ou link
    var hasOwn = await _instanceRepository.CountByTenantIdAsync(currentTenantId) > 0;
    var hasLink = await _linkRepository.GetByTenantIdAsync(currentTenantId) != null;
    if (hasOwn || hasLink) return Enumerable.Empty<EvolutionAvailableInstanceDto>();

    var result = new List<EvolutionAvailableInstanceDto>();
    foreach (var tid in otherTenantIds)
    {
        var instance = await _instanceRepository.GetByTenantIdAsync(tid);
        if (instance == null) continue;

        var tenant = await _tenantRepository.GetByIdAsync(true, tid);
        result.Add(new EvolutionAvailableInstanceDto(
            instance.Id, tenant?.Name ?? tid.ToString(), instance.PhoneNumber, instance.Status));
    }
    return result;
}
```

- [ ] **Implementar `LinkAsync`**

```csharp
public async Task LinkAsync(Guid tenantId, Guid instanceId, Guid userId, CancellationToken ct = default)
{
    // Validações
    if (await _instanceRepository.CountByTenantIdAsync(tenantId) > 0)
        throw new InvalidOperationException("Este tenant já possui uma instância própria.");

    if (await _linkRepository.GetByTenantIdAsync(tenantId) != null)
        throw new InvalidOperationException("Este tenant já possui um vínculo ativo.");

    var instance = await _instanceRepository.GetByIdAsync(true, instanceId)
        ?? throw new KeyNotFoundException("Instância não encontrada.");

    if (instance.TenantId == tenantId)
        throw new InvalidOperationException("Não é possível vincular a própria instância.");

    // Verificar que o usuário tem acesso ao tenant dono
    var userTenants = await _userTenantRepository.GetAllAsync(
        ut => ut.UserId == userId && ut.TenantId == instance.TenantId, asNoTracking: true);
    if (!userTenants.Any())
        throw new UnauthorizedAccessException("Sem acesso ao tenant dono desta instância.");

    var link = new TenantEvolutionInstanceLink
    {
        TenantId = tenantId,
        InstanceId = instanceId
    };
    await _linkRepository.AddAsync(link);
    await _unitOfWork.SaveChangesAsync();
}
```

- [ ] **Implementar `UnlinkAsync`**

```csharp
public async Task UnlinkAsync(Guid tenantId, CancellationToken ct = default)
{
    var link = await _linkRepository.GetByTenantIdAsync(tenantId)
        ?? throw new KeyNotFoundException("Nenhum vínculo ativo para este tenant.");
    _linkRepository.Delete(link);
    await _unitOfWork.SaveChangesAsync();
}
```

- [ ] **Atualizar o método `ToDto` para os novos campos**

```csharp
private static EvolutionInstanceDto ToDto(TenantEvolutionInstance e, bool isOwned, string? ownerTenantName) =>
    new(e.Id, e.InstanceId, e.Status, e.PhoneNumber, e.CreatedAt, e.ConnectedAt, isOwned, ownerTenantName);
```

- [ ] **Injetar dependências no construtor do `EvolutionInstanceService`**

Adicionar ao construtor: `ITenantEvolutionInstanceLinkRepository linkRepository`, `IUserTenantRepository userTenantRepository`, `ITenantRepository tenantRepository`. Salvar como campos `_linkRepository`, `_userTenantRepository`, `_tenantRepository`.

> Verificar o nome exato da interface do repositório de `UserTenant` buscando com `grep -r "interface IUserTenant\|interface ITenant" voro-salon-crm-api --include="*.cs"`.

- [ ] **Compilar para verificar**

```bash
cd voro-salon-crm-api && dotnet build VoroSalonCrm.sln
```

Expected: Build succeeded, 0 errors.

- [ ] **Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.Application/DTOs/Integration/ \
  voro-salon-crm-api/VoroSalonCrm.Application/Services/Interfaces/Integration/IEvolutionInstanceService.cs \
  voro-salon-crm-api/VoroSalonCrm.Infrastructure/Integration/EvolutionInstanceService.cs
git commit -m "feat(evolution): add link/unlink service methods and instance resolution with IsOwned flag"
```

---

### Task 3: Novos endpoints no `EvolutionInstanceController`

**Files:**
- Modify: `voro-salon-crm-api/VoroSalonCrm.API/Controllers/EvolutionInstanceController.cs`

- [ ] **Adicionar endpoint `GET available-to-link`**

```csharp
[HttpGet("available-to-link")]
[Authorize(Roles = "Owner,SalonOwner")]
public async Task<IActionResult> GetAvailableToLink(CancellationToken ct)
{
    try
    {
        var tenantId = currentUserService.TenantId;
        var userId = currentUserService.UserId;
        var available = await evolutionInstanceService.GetAvailableToLinkAsync(tenantId, userId, ct);
        return ResponseViewModel<IEnumerable<EvolutionAvailableInstanceDto>>.Success(available).ToActionResult();
    }
    catch (Exception ex)
    {
        return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
    }
}
```

- [ ] **Adicionar endpoint `POST link`**

```csharp
[HttpPost("link")]
[Authorize(Roles = "Owner,SalonOwner")]
public async Task<IActionResult> Link([FromBody] EvolutionLinkRequestDto dto, CancellationToken ct)
{
    try
    {
        var tenantId = currentUserService.TenantId;
        var userId = currentUserService.UserId;
        await evolutionInstanceService.LinkAsync(tenantId, dto.InstanceId, userId, ct);
        return ResponseViewModel<object>.SuccessWithMessage("Instância vinculada com sucesso.", null).ToActionResult();
    }
    catch (InvalidOperationException ex)
    {
        return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
    }
    catch (UnauthorizedAccessException ex)
    {
        return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
    }
    catch (Exception ex)
    {
        return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
    }
}
```

- [ ] **Adicionar endpoint `DELETE link`**

```csharp
[HttpDelete("link")]
[Authorize(Roles = "Owner,SalonOwner")]
public async Task<IActionResult> Unlink(CancellationToken ct)
{
    try
    {
        var tenantId = currentUserService.TenantId;
        await evolutionInstanceService.UnlinkAsync(tenantId, ct);
        return ResponseViewModel<object>.SuccessWithMessage("Vínculo removido.", null).ToActionResult();
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

- [ ] **Verificar que `currentUserService.UserId` existe**

```bash
grep -rn "UserId\|ICurrentUserService" voro-salon-crm-api/VoroSalonCrm.Application/Services/Interfaces/ICurrentUserService.cs
```

Se a propriedade `UserId` não existir, adicionar à interface e à implementação conforme o padrão existente de `TenantId`.

- [ ] **Compilar e testar via swagger**

```bash
cd voro-salon-crm-api && dotnet build VoroSalonCrm.sln && dotnet run --project VoroSalonCrm.API
```

Acessar `/swagger` e verificar que os 3 novos endpoints aparecem em "Evolution Go Instances".

- [ ] **Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.API/Controllers/EvolutionInstanceController.cs
git commit -m "feat(evolution): add available-to-link, link and unlink endpoints"
```

---

### Task 4: Atualizar webhook handler para multi-tenant

**Files:**
- Modify: `voro-salon-crm-api/VoroSalonCrm.API/Controllers/WhatsappController.cs`

- [ ] **Injetar `ITenantEvolutionInstanceLinkRepository` no endpoint do webhook**

No método `ReceiveEvolutionWebhook`, adicionar `[FromServices] ITenantEvolutionInstanceLinkRepository evolutionLinkRepository` nos parâmetros.

- [ ] **Substituir a resolução de `tenantId` por lista de tenants**

Substituir o bloco atual:
```csharp
// Resolver tenant pela instância
Guid? tenantId = null;
if (!string.IsNullOrEmpty(instanceId))
{
    var evolutionInstance = await evolutionInstanceRepository.GetByInstanceIdAsync(instanceId);
    if (evolutionInstance != null)
        tenantId = evolutionInstance.TenantId;
}
```

Por:
```csharp
// Resolver tenants pela instância (pode ser compartilhada)
var tenantIds = new List<Guid>();
if (!string.IsNullOrEmpty(instanceId))
{
    var evolutionInstance = await evolutionInstanceRepository.GetByInstanceIdAsync(instanceId);
    if (evolutionInstance != null)
    {
        tenantIds.Add(evolutionInstance.TenantId); // tenant dono sempre primeiro

        // Tenants vinculados
        var links = await evolutionLinkRepository.GetByInstanceIdAsync(evolutionInstance.Id);
        tenantIds.AddRange(links.Select(l => l.TenantId));
    }
}
```

- [ ] **Adaptar o resto do handler para usar `tenantIds`**

Onde antes o código usava `tenantId.HasValue` e `tenantId.Value`, substituir por `tenantIds.Count > 0`.

Para o processamento, quando `tenantIds.Count == 1`, manter o fluxo atual usando `tenantIds[0]`.

Quando `tenantIds.Count > 1`, o `EvolutionBookingChatService` já deve receber a lista de tenants — verificar como o serviço de chat multi-tenant existente (usado na API Oficial) lida com múltiplos tenants e replicar a mesma chamada. Buscar com:

```bash
grep -rn "tenantIds\|MultiTenant\|tenants\.Count\|SelectTenant" voro-salon-crm-api --include="*.cs" | grep -v Test | head -20
```

- [ ] **Compilar**

```bash
cd voro-salon-crm-api && dotnet build VoroSalonCrm.sln
```

Expected: Build succeeded, 0 errors.

- [ ] **Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.API/Controllers/WhatsappController.cs
git commit -m "feat(evolution): webhook handler resolves linked tenants for shared instance routing"
```

---

### Task 5: Frontend — novos endpoints em `api.ts`

**Files:**
- Modify: `voro-salon-crm-front/lib/api.ts`

- [ ] **Adicionar as constantes de endpoint**

No objeto `ENDPOINTS` de `lib/api.ts`, após `EVOLUTION_INSTANCES: "/EvolutionInstance"`, adicionar:

```typescript
EVOLUTION_AVAILABLE_TO_LINK: "/EvolutionInstance/available-to-link",
EVOLUTION_LINK: "/EvolutionInstance/link",
```

- [ ] **Commit**

```bash
git add voro-salon-crm-front/lib/api.ts
git commit -m "feat(evolution): add available-to-link and link API endpoint constants"
```

---

### Task 6: Frontend — reestruturar tab WhatsApp com sub-tabs e seção Bot compartilhada

**Files:**
- Modify: `voro-salon-crm-front/app/settings/page.tsx`

Esta é a maior tarefa de frontend. O objetivo é substituir o `TabsContent value="whatsapp"` atual por uma estrutura com seção compartilhada + `Tabs` internos.

- [ ] **Atualizar o tipo `EvolutionInstanceDto` no frontend para incluir campos novos**

No topo de `app/settings/page.tsx`, atualizar a interface:

```typescript
interface EvolutionInstance {
  id: string
  instanceId: string
  status: 0 | 1 | 2
  phoneNumber: string | null
  connectedAt: string | null
  isOwned: boolean
  ownerTenantName: string | null
}
```

- [ ] **Adicionar estado para sub-tab ativa e modal de link**

Junto aos outros estados no componente `ConfiguracoesPage`, adicionar:

```typescript
const [whatsappSubTab, setWhatsappSubTab] = useState<"evolution" | "official">("evolution")
const [linkModalOpen, setLinkModalOpen] = useState(false)
const [availableInstances, setAvailableInstances] = useState<AvailableInstance[]>([])
const [loadingAvailable, setLoadingAvailable] = useState(false)
const [selectedLinkInstanceId, setSelectedLinkInstanceId] = useState<string | null>(null)
const [linkChoice, setLinkChoice] = useState<"new" | "link">("new")
const [linking, setLinking] = useState(false)
const [unlinking, setUnlinking] = useState(false)
```

Adicionar a interface:

```typescript
interface AvailableInstance {
  instanceId: string
  tenantName: string
  phoneNumber: string | null
  status: 0 | 1 | 2
}
```

- [ ] **Adicionar lógica de exclusividade mútua**

Após os states existentes de Evolution, adicionar:

```typescript
const evolutionIsActive = evolutionEffectiveStatus === 2 || (evolutionInstance != null && !evolutionInstance.isOwned)
const officialIsActive = onboardingStatus?.connected === true
```

- [ ] **Implementar handler de abertura do modal de link**

```typescript
const handleOpenLinkModal = async () => {
  setLoadingAvailable(true)
  setLinkModalOpen(true)
  setLinkChoice("new")
  setSelectedLinkInstanceId(null)
  try {
    const res = await secureApiCall<AvailableInstance[]>(API_CONFIG.ENDPOINTS.EVOLUTION_AVAILABLE_TO_LINK)
    setAvailableInstances(res.hasError ? [] : res.data ?? [])
  } finally {
    setLoadingAvailable(false)
  }
}
```

- [ ] **Implementar handler de confirmação do modal (criar ou vincular)**

```typescript
const handleConfirmLinkModal = async () => {
  setLinking(true)
  try {
    if (linkChoice === "new") {
      const res = await secureApiCall<EvolutionInstance>(API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES, { method: "POST" })
      if (res.hasError) { toast.error(res.message ?? "Erro ao criar instância."); return }
      toast.success("Instância criada.")
    } else {
      if (!selectedLinkInstanceId) return
      const res = await secureApiCall(API_CONFIG.ENDPOINTS.EVOLUTION_LINK, {
        method: "POST",
        body: JSON.stringify({ instanceId: selectedLinkInstanceId }),
      })
      if (res.hasError) { toast.error(res.message ?? "Erro ao vincular."); return }
      toast.success("Instância vinculada.")
    }
    mutateEvolution()
    setLinkModalOpen(false)
  } finally {
    setLinking(false)
  }
}
```

Adicionar também `const { mutate: mutateEvolution } = useSWR(...)` para a query de instâncias Evolution (renomear o `mutate` existente).

- [ ] **Implementar handler de desvincular**

```typescript
const handleUnlink = async () => {
  setUnlinking(true)
  try {
    const res = await secureApiCall(API_CONFIG.ENDPOINTS.EVOLUTION_LINK, { method: "DELETE" })
    if (res.hasError) { toast.error(res.message ?? "Erro ao desvincular."); return }
    toast.success("Instância desvinculada.")
    mutateEvolution()
  } finally {
    setUnlinking(false)
  }
}
```

- [ ] **Substituir o `TabsContent value="whatsapp"` pela nova estrutura**

Substituir o bloco existente (linhas 1229–1441 em `app/settings/page.tsx`) pela nova estrutura:

```tsx
{isSalonOwner && (
  <TabsContent value="whatsapp">
    <div className="flex flex-col gap-4">

      {/* ── Seção compartilhada: Bot ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle>Configurações do Bot</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="whatsapp-booking-toggle" className="font-semibold text-sm cursor-pointer">
                Agendamento pelo WhatsApp
              </Label>
              <p className="text-xs text-muted-foreground">Permite que clientes agendem via bot.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{useWhatsappBooking ? "Ativo" : "Inativo"}</span>
              <Switch
                id="whatsapp-booking-toggle"
                checked={useWhatsappBooking}
                onCheckedChange={setUseWhatsappBooking}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1.5" asChild>
              <Link href="/settings/whatsapp">
                <MessageSquare className="h-3.5 w-3.5" />
                Templates de mensagem
              </Link>
            </Button>
            <Button onClick={handleSaveWhatsapp} disabled={savingWp} size="sm" className="gap-2">
              {savingWp && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <Save className="h-3.5 w-3.5" />
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Sub-tabs de canal ── */}
      <Card>
        <CardContent className="p-0">
          {/* Sub-tab header */}
          <div className="flex border-b">
            <button
              onClick={() => !evolutionIsActive || whatsappSubTab === "evolution" ? setWhatsappSubTab("evolution") : undefined}
              disabled={officialIsActive}
              title={officialIsActive ? "API Oficial ativa — desconecte para usar Evolution" : undefined}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                whatsappSubTab === "evolution"
                  ? "border-primary text-primary"
                  : officialIsActive
                    ? "border-transparent text-muted-foreground opacity-40 cursor-not-allowed"
                    : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              ⚡ Evolution Go
            </button>
            <button
              onClick={() => !officialIsActive || whatsappSubTab === "official" ? setWhatsappSubTab("official") : undefined}
              disabled={evolutionIsActive}
              title={evolutionIsActive ? "Evolution ativo — desconecte para usar a API Oficial" : undefined}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                whatsappSubTab === "official"
                  ? "border-primary text-primary"
                  : evolutionIsActive
                    ? "border-transparent text-muted-foreground opacity-40 cursor-not-allowed"
                    : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              📱 API Oficial Meta
            </button>
          </div>

          {/* Sub-tab content */}
          <div className="p-4">
            {whatsappSubTab === "evolution" && <EvolutionSubTab />}
            {whatsappSubTab === "official" && <OfficialApiSubTab />}
          </div>
        </CardContent>
      </Card>

    </div>
  </TabsContent>
)}
```

> `EvolutionSubTab` e `OfficialApiSubTab` são componentes locais definidos nas Tasks 7 e 8. Por enquanto podem ser `<div>Em construção</div>` para a estrutura compilar.

- [ ] **Compilar**

```bash
cd voro-salon-crm-front && npm run build 2>&1 | tail -20
```

Expected: sem erros de TypeScript (pode ter warnings de componentes ainda não implementados).

- [ ] **Commit**

```bash
git add voro-salon-crm-front/app/settings/page.tsx voro-salon-crm-front/lib/api.ts
git commit -m "feat(whatsapp): restructure WhatsApp tab with sub-tabs and shared bot settings section"
```

---

### Task 7: Frontend — sub-tab Evolution Go (todos os estados)

**Files:**
- Modify: `voro-salon-crm-front/app/settings/page.tsx`

Implementar o componente `EvolutionSubTab` (pode ser uma função local dentro do arquivo) que cobre todos os 5 estados descritos no spec.

- [ ] **Implementar estados de QR e código expandíveis inline**

Adicionar estados locais para expansão inline:

```typescript
const [qrExpanded, setQrExpanded] = useState(false)
const [qrCode, setQrCode] = useState<string | null>(null)
const [qrLoading, setQrLoading] = useState(false)
const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

const [codeExpanded, setCodeExpanded] = useState(false)
const [pairPhone, setPairPhone] = useState("")
const [pairCode, setPairCode] = useState<string | null>(null)
const [pairLoading, setPairLoading] = useState(false)
const pairPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
```

- [ ] **Implementar lógica de polling QR inline**

```typescript
const handleToggleQr = async () => {
  if (qrExpanded) {
    if (qrPollRef.current) clearInterval(qrPollRef.current)
    setQrExpanded(false)
    setQrCode(null)
    return
  }
  if (!evolutionInstance) return
  setQrExpanded(true)
  setQrLoading(true)
  setCodeExpanded(false)

  const fetchQr = async () => {
    const res = await secureApiCall<{ qrCode: string | null }>(
      `${API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES}/${evolutionInstance.id}/qr`
    )
    if (!res.hasError && res.data?.qrCode) setQrCode(res.data.qrCode)
  }

  const checkStatus = async () => {
    const res = await secureApiCall<{ state: string }>(
      `${API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES}/${evolutionInstance.id}/status`
    )
    if (!res.hasError && res.data?.state === "open") {
      if (qrPollRef.current) clearInterval(qrPollRef.current)
      setQrExpanded(false)
      toast.success("WhatsApp conectado!")
      mutateEvolution()
    }
  }

  await fetchQr()
  setQrLoading(false)
  qrPollRef.current = setInterval(async () => { await fetchQr(); await checkStatus() }, 3000)
}
```

- [ ] **Implementar lógica de código de pareamento inline**

```typescript
const handleGeneratePairCodeInline = async () => {
  if (!evolutionInstance || !pairPhone.trim()) return
  setPairLoading(true)
  setPairCode(null)
  try {
    const res = await secureApiCall<{ pairingCode: string }>(
      `${API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES}/${evolutionInstance.id}/pair`,
      { method: "POST", body: JSON.stringify({ phone: pairPhone.trim() }) }
    )
    if (res.hasError) { toast.error(res.message ?? "Erro ao gerar código."); return }
    setPairCode(res.data?.pairingCode ?? null)
    pairPollRef.current = setInterval(async () => {
      const statusRes = await secureApiCall<{ state: string }>(
        `${API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES}/${evolutionInstance.id}/status`
      )
      if (!statusRes.hasError && statusRes.data?.state === "open") {
        if (pairPollRef.current) clearInterval(pairPollRef.current)
        setCodeExpanded(false)
        setPairPhone("")
        setPairCode(null)
        toast.success("WhatsApp conectado!")
        mutateEvolution()
      }
    }, 3000)
  } finally {
    setPairLoading(false)
  }
}
```

- [ ] **Implementar o JSX do `EvolutionSubTab`**

Criar uma função local (acima do `return` do componente principal ou como arrow function inline) que retorna o JSX correto para cada estado:

```tsx
const EvolutionSubTab = () => {
  // Estado: loading
  if (isLoadingEvolution) return (
    <div className="flex justify-center py-10">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )

  // Estado: instância compartilhada (vinculada)
  if (evolutionInstance && !evolutionInstance.isOwned) return (
    <div className={`rounded-lg border p-4 flex flex-col gap-3 ${evolutionEffectiveStatus === 2 ? "border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/10" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`font-semibold text-sm ${evolutionEffectiveStatus === 2 ? "text-emerald-700" : "text-muted-foreground"}`}>
            {evolutionEffectiveStatus === 2 ? "● Conectado" : "○ Desconectado"}
          </p>
          {evolutionInstance.phoneNumber && (
            <p className="text-sm font-mono mt-1">{evolutionInstance.phoneNumber}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge className="bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/30 gap-1 text-xs">
            🔗 Compartilhada
          </Badge>
          <span className="text-xs text-muted-foreground">de: {evolutionInstance.ownerTenantName}</span>
        </div>
      </div>
      <div className="border-t pt-3 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs"
          onClick={handleUnlink}
          disabled={unlinking}
        >
          {unlinking ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : null}
          Desvincular
        </Button>
      </div>
    </div>
  )

  // Estado: sem instância
  if (!evolutionInstance) {
    const hasAvailable = availableInstances.length > 0
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Wifi className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold">Nenhuma instância configurada</p>
          <p className="text-sm text-muted-foreground max-w-xs mt-1">
            {hasAvailable
              ? "Crie uma instância ou vincule uma existente de outro estabelecimento seu."
              : "Crie uma instância Evolution Go para conectar um número WhatsApp ao bot."}
          </p>
        </div>
        <Button onClick={hasAvailable ? handleOpenLinkModal : handleCreateInstance} disabled={creating}>
          {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          {hasAvailable ? "Criar / Vincular instância" : "Criar instância"}
        </Button>
      </div>
    )
  }

  // Estado: instância própria (conectada, conectando ou desconectada)
  return (
    <div className={`rounded-lg border p-4 flex flex-col gap-4 ${evolutionEffectiveStatus === 2 ? "border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/10" : ""}`}>
      {/* Status header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {evolutionEffectiveStatus === 2
              ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 gap-1 text-xs"><CheckCircle className="h-3 w-3" /> Conectado</Badge>
              : evolutionEffectiveStatus === 1
                ? <Badge className="bg-amber-50 text-amber-700 border-amber-300 gap-1 text-xs"><Loader2 className="h-3 w-3 animate-spin" /> Conectando</Badge>
                : <Badge variant="outline" className="text-muted-foreground text-xs">Desconectado</Badge>}
          </div>
          {evolutionInstance.phoneNumber && (
            <p className="text-sm font-mono font-semibold mt-1">{evolutionInstance.phoneNumber}</p>
          )}
          <p className="text-xs font-mono text-muted-foreground mt-0.5">{evolutionInstance.instanceId}</p>
        </div>
        {evolutionEffectiveStatus === 2 && (
          <Button size="sm" variant="outline"
            className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs shrink-0"
            onClick={handleDisconnect} disabled={disconnecting}>
            {disconnecting ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <WifiOff className="mr-1.5 h-3 w-3" />}
            Desconectar
          </Button>
        )}
      </div>

      {/* Ações de conexão */}
      {evolutionEffectiveStatus !== 2 && (
        <div className="flex flex-col gap-3 pt-2 border-t">
          {/* QR Code inline */}
          <div>
            <Button size="sm" variant={qrExpanded ? "default" : "outline"} onClick={handleToggleQr} className="text-xs w-full justify-start">
              <QrCode className="mr-2 h-3.5 w-3.5" />
              {qrExpanded ? "Fechar QR Code" : "Conectar via QR Code"}
            </Button>
            {qrExpanded && (
              <div className="mt-3 flex flex-col items-center gap-3 p-4 bg-muted rounded-lg">
                {qrLoading || !qrCode
                  ? <div className="flex flex-col items-center gap-2 py-6">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Aguardando QR Code...</span>
                    </div>
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={qrCode} alt="QR Code" className="w-48 h-48 rounded border" />}
                <p className="text-xs text-muted-foreground text-center">
                  Abra o WhatsApp → Dispositivos Conectados → Escanear QR
                </p>
              </div>
            )}
          </div>

          {/* Código de pareamento inline */}
          <div>
            <Button size="sm" variant={codeExpanded ? "default" : "outline"} onClick={() => { setCodeExpanded(v => !v); setQrExpanded(false) }} className="text-xs w-full justify-start">
              <Smartphone className="mr-2 h-3.5 w-3.5" />
              {codeExpanded ? "Fechar Código" : "Conectar via Código"}
            </Button>
            {codeExpanded && (
              <div className="mt-3 flex flex-col gap-3 p-4 bg-muted rounded-lg">
                <div className="flex gap-2">
                  <Input
                    placeholder="+5511999999999"
                    value={pairPhone}
                    onChange={e => setPairPhone(e.target.value)}
                    disabled={pairLoading || !!pairCode}
                    className="h-8 text-sm"
                  />
                  {!pairCode && (
                    <Button size="sm" onClick={handleGeneratePairCodeInline} disabled={pairLoading || !pairPhone.trim()} className="h-8 text-xs shrink-0">
                      {pairLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Gerar"}
                    </Button>
                  )}
                </div>
                {pairCode && (
                  <div className="flex flex-col items-center gap-1 p-3 bg-background rounded border">
                    <p className="text-xs text-muted-foreground">Código de pareamento</p>
                    <p className="text-2xl font-mono font-bold tracking-widest select-all">{pairCode}</p>
                    <p className="text-xs text-muted-foreground text-center">WhatsApp → Dispositivos → Vincular com número</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Excluir instância */}
      <div className="flex justify-end pt-1 border-t">
        <Button size="sm" variant="outline"
          className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs"
          onClick={() => setDeleteOpen(true)}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Excluir instância
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Adicionar handler `handleCreateInstance` e `creating` state**

```typescript
const [creating, setCreating] = useState(false)

const handleCreateInstance = async () => {
  setCreating(true)
  try {
    const res = await secureApiCall<EvolutionInstance>(API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES, { method: "POST" })
    if (res.hasError) { toast.error(res.message ?? "Erro ao criar instância."); return }
    toast.success("Instância criada.")
    mutateEvolution()
  } finally {
    setCreating(false)
  }
}
```

- [ ] **Adicionar imports necessários**

Adicionar `QrCode` e `Smartphone` ao import de `lucide-react` (verificar se já não estão presentes).

- [ ] **Compilar**

```bash
cd voro-salon-crm-front && npm run build 2>&1 | tail -30
```

Expected: sem erros TypeScript.

- [ ] **Commit**

```bash
git add voro-salon-crm-front/app/settings/page.tsx
git commit -m "feat(whatsapp): implement Evolution sub-tab with all states and inline QR/pairing"
```

---

### Task 8: Frontend — sub-tab API Oficial Meta + modal de link

**Files:**
- Modify: `voro-salon-crm-front/app/settings/page.tsx`

- [ ] **Implementar `OfficialApiSubTab`**

Criar função local que contém o conteúdo atual do bloco "Opção 1: API Oficial Meta" (já existente no settings page), reorganizado para funcionar sem o card externo:

```tsx
const OfficialApiSubTab = () => (
  <div className={`rounded-lg border p-4 flex flex-col gap-3 transition-colors ${
    onboardingStatus?.connected
      ? "border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/10 dark:border-emerald-800"
      : "bg-muted/20"
  }`}>
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          onboardingStatus?.connected ? "bg-emerald-100 dark:bg-emerald-950/40" : "bg-muted"
        }`}>
          {statusLoading
            ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            : onboardingStatus?.connected
              ? <CheckCircle className="h-4 w-4 text-emerald-600" />
              : <WifiOff className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight">API Oficial Meta</p>
          <p className="text-xs text-muted-foreground">WhatsApp Business Platform</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!statusLoading && (
          onboardingStatus?.connected
            ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400 gap-1 text-xs">
                <CheckCircle className="h-3 w-3" /> Conectado
              </Badge>
            : <Badge variant="outline" className="text-muted-foreground text-xs">Desconectado</Badge>
        )}
        {onboardingStatus?.connected ? (
          <Button variant="outline" size="sm"
            className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive h-8 text-xs"
            onClick={() => setDisconnectDialogOpen(true)}
            disabled={disconnecting || statusLoading}>
            {disconnecting ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <WifiOff className="mr-1.5 h-3 w-3" />}
            Desconectar
          </Button>
        ) : (
          <Button size="sm" className="h-8 text-xs" onClick={handleConnect} disabled={connecting || statusLoading}>
            {connecting ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Wifi className="mr-1.5 h-3 w-3" />}
            {connecting ? "Aguardando..." : "Conectar"}
          </Button>
        )}
      </div>
    </div>

    {onboardingStatus?.connected && (
      <div className="flex flex-col gap-1 pl-12">
        {onboardingStatus.displayPhone && (
          <p className="text-sm font-mono text-muted-foreground">{onboardingStatus.displayPhone}</p>
        )}
        {onboardingStatus.tokenExpiresAt && (() => {
          const d = new Date(onboardingStatus.tokenExpiresAt!)
          const diffDays = Math.ceil((d.getTime() - Date.now()) / 86400000)
          return (
            <div className="flex items-center gap-1">
              {diffDays <= 7 && <AlertTriangle className="h-3 w-3 text-amber-500" />}
              <p className={`text-xs ${diffDays <= 7 ? "text-amber-600" : "text-muted-foreground"}`}>
                Token expira em {d.toLocaleDateString("pt-BR")} ({diffDays} dia{diffDays !== 1 ? "s" : ""})
              </p>
            </div>
          )
        })()}
      </div>
    )}

    {!onboardingStatus?.connected && (
      <div className="flex flex-col gap-3 pt-2 border-t">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">IDs Meta (avançado)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wp-phone-number-id" className="text-xs">Phone Number ID</Label>
            <Input id="wp-phone-number-id" placeholder="123456789012345"
              value={wpPhoneNumberId} onChange={e => setWpPhoneNumberId(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wp-business-account-id" className="text-xs">Business Account ID</Label>
            <Input id="wp-business-account-id" placeholder="987654321098765"
              value={wpBusinessAccountId} onChange={e => setWpBusinessAccountId(e.target.value)} className="h-8 text-sm" />
          </div>
        </div>
      </div>
    )}
  </div>
)
```

- [ ] **Implementar o modal de link (Dialog)**

Adicionar antes do closing `</AuthGuard>` no JSX:

```tsx
<Dialog open={linkModalOpen} onOpenChange={open => !open && setLinkModalOpen(false)}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Configurar instância Evolution</DialogTitle>
      <DialogDescription>
        Crie uma nova instância ou vincule uma existente de outro estabelecimento.
      </DialogDescription>
    </DialogHeader>

    <div className="flex flex-col gap-3 py-2">
      {loadingAvailable ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${linkChoice === "new" ? "border-primary bg-primary/5" : "border-border"}`}>
            <input type="radio" name="link-choice" value="new" checked={linkChoice === "new"} onChange={() => setLinkChoice("new")} className="mt-0.5" />
            <div>
              <p className="font-medium text-sm">Criar nova instância</p>
              <p className="text-xs text-muted-foreground">Uma instância exclusiva para este estabelecimento.</p>
            </div>
          </label>

          {availableInstances.map(inst => (
            <label key={inst.instanceId} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${linkChoice === "link" && selectedLinkInstanceId === inst.instanceId ? "border-primary bg-primary/5" : "border-border"}`}>
              <input type="radio" name="link-choice" value={inst.instanceId}
                checked={linkChoice === "link" && selectedLinkInstanceId === inst.instanceId}
                onChange={() => { setLinkChoice("link"); setSelectedLinkInstanceId(inst.instanceId) }}
                className="mt-0.5" />
              <div>
                <p className="font-medium text-sm">Vincular: {inst.tenantName}</p>
                <p className="text-xs text-muted-foreground">
                  {inst.phoneNumber ?? "Sem número"} · {inst.status === 2 ? "Conectado" : inst.status === 1 ? "Conectando" : "Desconectado"}
                </p>
              </div>
            </label>
          ))}
        </>
      )}
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={() => setLinkModalOpen(false)} disabled={linking}>Cancelar</Button>
      <Button onClick={handleConfirmLinkModal} disabled={linking || (linkChoice === "link" && !selectedLinkInstanceId)}>
        {linking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {linkChoice === "new" ? "Criar instância" : "Vincular"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

- [ ] **Remover o bloco antigo do card "Conexão WhatsApp" e "Configurações do Bot"**

Verificar que o JSX antigo (cards "Conexão WhatsApp" e "Configurações do Bot" com os dois options inline) foi completamente substituído e não há duplicação.

- [ ] **Compilar e testar no browser**

```bash
cd voro-salon-crm-front && npm run dev
```

Testar manualmente:
1. Abrir `/settings?tab=whatsapp`
2. Verificar seção Bot acima das sub-tabs
3. Verificar sub-tabs Evolution / API Oficial
4. Verificar que sub-tab fica bloqueada quando canal oposto está ativo
5. Clicar "Criar / Vincular instância" e verificar modal

- [ ] **Commit**

```bash
git add voro-salon-crm-front/app/settings/page.tsx
git commit -m "feat(whatsapp): add official API sub-tab and instance link modal"
```

---

### Task 9: Remover página separada de Evolution

**Files:**
- Delete: `voro-salon-crm-front/app/settings/whatsapp/evolution/page.tsx`

- [ ] **Verificar que não há links para a página sendo removida**

```bash
grep -rn "settings/whatsapp/evolution" voro-salon-crm-front --include="*.tsx" --include="*.ts"
```

Se houver links, remover ou atualizar para apontar para `/settings?tab=whatsapp`.

- [ ] **Remover o arquivo**

```bash
rm voro-salon-crm-front/app/settings/whatsapp/evolution/page.tsx
```

- [ ] **Verificar que a rota não quebra o build**

```bash
cd voro-salon-crm-front && npm run build 2>&1 | tail -20
```

Expected: Build succeeded.

- [ ] **Commit**

```bash
git add -A voro-salon-crm-front/app/settings/whatsapp/evolution/
git commit -m "feat(whatsapp): remove separate evolution page, now inline in sub-tab"
```

---

## Self-Review

**Spec coverage:**

| Requisito | Task |
|---|---|
| Sub-tabs WhatsApp com seção Bot compartilhada | Task 6 |
| Exclusividade mútua entre sub-tabs | Task 6 |
| Sub-tab API Oficial com conteúdo existente | Task 8 |
| Status visual rico da instância Evolution | Task 7 |
| QR e Código expandíveis inline (sem dialog) | Task 7 |
| Estado vazio com orientação | Task 7 |
| Badge "Compartilhada" + nome do tenant dono | Task 7 |
| Botão "Desvincular" na instância compartilhada | Task 7 |
| Entidade `TenantEvolutionInstanceLink` | Task 1 |
| Migration com unique index em `TenantId` | Task 1 |
| Resolução unificada `IsOwned` no serviço | Task 2 |
| Operações destrutivas bloqueadas para não-donos | Task 2 |
| `GetAvailableToLinkAsync` | Task 2 |
| `LinkAsync` + `UnlinkAsync` | Task 2 |
| Endpoints `available-to-link`, `link` POST/DELETE | Task 3 |
| Webhook: buscar tenants vinculados | Task 4 |
| Modal de escolha criar/vincular | Task 8 |
| `EvolutionInstanceDto` com `IsOwned`/`OwnerTenantName` | Task 2 |
| Remoção da página separada de Evolution | Task 9 |
| Constantes de endpoint no frontend | Task 5 |

**Nenhum gap identificado.**

**Verificação de consistência de tipos:**
- `EvolutionInstanceDto` em C# definido na Task 2 com `IsOwned` e `OwnerTenantName` — interface TypeScript atualizada no início da Task 6 com os mesmos campos `isOwned` e `ownerTenantName`.
- `EvolutionAvailableInstanceDto` definido na Task 2 e usado na Task 8 (modal) — campos `instanceId`, `tenantName`, `phoneNumber`, `status` consistentes.
- `EvolutionLinkRequestDto` com `InstanceId: Guid` no backend; body `{ instanceId: string }` no frontend — compatível via JSON.
- `mutateEvolution` — renomear o `mutate` do SWR de instâncias na Task 6 e usar em Tasks 6, 7, 8.

---

## File Structure

### Backend — novos arquivos

| Arquivo | Responsabilidade |
|---|---|
| `VoroSalonCrm.Domain/Entities/TenantEvolutionInstanceLink.cs` | Entidade de domínio — vínculo entre tenant e instância de outro tenant |
| `VoroSalonCrm.Domain/Interfaces/Repositories/ITenantEvolutionInstanceLinkRepository.cs` | Interface do repositório |
| `VoroSalonCrm.Application/DTOs/Integration/EvolutionInstanceLinkDtos.cs` | DTOs: `EvolutionAvailableInstanceDto`, `EvolutionLinkRequestDto` |
| `VoroSalonCrm.Infrastructure/Repositories/TenantEvolutionInstanceLinkRepository.cs` | Implementação do repositório |
| `VoroSalonCrm.Infrastructure/Migrations/<timestamp>_AddTenantEvolutionInstanceLink.cs` | Migration EF Core |

### Backend — arquivos modificados

| Arquivo | Mudança |
|---|---|
| `VoroSalonCrm.Domain/Interfaces/Repositories/ITenantEvolutionInstanceRepository.cs` | Adicionar `GetByInstanceIdWithLinksAsync` |
| `VoroSalonCrm.Infrastructure/Repositories/TenantEvolutionInstanceRepository.cs` | Implementar `GetByInstanceIdWithLinksAsync` |
| `VoroSalonCrm.Infrastructure/Factories/JasmimDbContext.cs` | Adicionar `DbSet<TenantEvolutionInstanceLink>` |
| `VoroSalonCrm.Application/DTOs/Integration/EvolutionInstanceDto.cs` | Adicionar `IsOwned` e `OwnerTenantName` ao `EvolutionInstanceDto` |
| `VoroSalonCrm.Application/Services/Interfaces/Integration/IEvolutionInstanceService.cs` | Adicionar `ResolveAsync`, `GetAvailableToLinkAsync`, `LinkAsync`, `UnlinkAsync` |
| `VoroSalonCrm.Infrastructure/Integration/EvolutionInstanceService.cs` | Implementar novos métodos; operações destrutivas passam a verificar `IsOwned` |
| `VoroSalonCrm.API/Controllers/EvolutionInstanceController.cs` | Adicionar endpoints `available-to-link`, `link` (POST/DELETE) |
| `VoroSalonCrm.Contract/Extensions/Configurations/AddAppServicesExtension.cs` | Registrar `ITenantEvolutionInstanceLinkRepository` |
| `VoroSalonCrm.API/Controllers/WhatsappController.cs` | Webhook: buscar tenants vinculados + menu multi-tenant quando >1 |

### Frontend — arquivos modificados/removidos

| Arquivo | Mudança |
|---|---|
| `voro-salon-crm-front/lib/api.ts` | Adicionar `EVOLUTION_AVAILABLE_TO_LINK`, `EVOLUTION_LINK` |
| `voro-salon-crm-front/app/settings/page.tsx` | Reestruturar tab WhatsApp inteira (sub-tabs, inline Evolution, modal de link) |
| `voro-salon-crm-front/app/settings/whatsapp/evolution/page.tsx` | **Remover** |

---


# Owner-facing Support Inbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Voro `Owner` (SaaS super-admin) an agent inbox at `/support` to read tickets from all salons, reply as Voro support, and change ticket status — without touching the tenant-scoped salon flow.

**Architecture:** A new `Owner`-protected `AdminSupportController` exposes cross-tenant ticket operations, mirroring the existing `AdminSubscriptionController` pattern. The existing tenant-scoped `SupportController`/`SupportService` stay isolated. The frontend keeps the shared `AuthGuard` and branches at the page level on the `Owner` role, reusing the existing list/chat components via new props.

**Tech Stack:** ASP.NET Core (Clean Architecture + CQRS-lite services), EF Core, xUnit + Moq + FluentAssertions (backend); Next.js App Router, React, SWR, Tailwind (frontend).

**Spec:** `docs/superpowers/specs/2026-06-12-owner-support-inbox-design.md`

**Commands:**
- Backend build: `dotnet build voro-salon-crm-api/VoroSalonCrm.sln`
- Backend tests: `dotnet test voro-salon-crm-api/VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj`
- Frontend lint/build: `cd voro-salon-crm-front && npm run build`

---

## File Structure

### Backend (`voro-salon-crm-api`)

**Modify:**
- `VoroSalonCrm.Application/DTOs/Support/SupportDtos.cs` — append `TenantName` to `SupportTicketDto`; add `UpdateSupportTicketStatusDto`.
- `VoroSalonCrm.Domain/Interfaces/Repositories/ISupportTicketRepository.cs` — add `GetAllWithTenantNameAsync()`.
- `VoroSalonCrm.Infrastructure/Repositories/SupportTicketRepository.cs` — implement the join query.
- `VoroSalonCrm.Application/Services/Interfaces/ISupportService.cs` — add four Owner methods.
- `VoroSalonCrm.Application/Services/SupportService.cs` — implement the four Owner methods; update existing `SupportTicketDto` construction calls to pass `TenantName: null`.

**Create:**
- `VoroSalonCrm.API/Controllers/AdminSupportController.cs` — `[Authorize(Roles = "Owner")]` controller with 4 endpoints.
- `VoroSalonCrm.Tests.Integration/Support/SupportServiceOwnerTests.cs` — unit tests for the Owner service methods.

### Backend test note

This codebase does **not** unit-test repositories (they wrap EF Core directly); behavior is covered by mocking the repository interface in service tests (see `Others/ClientServiceTests.cs`). We follow that convention: the repository method (Task 2) is verified by a build, and the new behavior is tested at the service layer (Task 3) with a mocked repo.

### Frontend (`voro-salon-crm-front`)

**Modify:**
- `lib/api.ts` — add `ADMIN_SUPPORT_TICKETS` endpoint.
- `app/support/page.tsx` — branch on the `Owner` role.
- `components/features/support/support-ticket-list.tsx` — add `showTenantName?` and `hideNewTicketButton?` props.
- `components/features/support/support-chat-window.tsx` — add `perspective` prop (bubble alignment, endpoint, header, status controls).

**Create:**
- `components/features/support/support-admin-inbox.tsx` — orchestrates the Owner view.

---

### Task 1: DTO — `TenantName` + status DTO

**Files:**
- Modify: `voro-salon-crm-api/VoroSalonCrm.Application/DTOs/Support/SupportDtos.cs`
- Modify: `voro-salon-crm-api/VoroSalonCrm.Application/Services/SupportService.cs:39-42` and `:49-52` (call sites)

This is a data-shape change (no behavior to TDD). Verify with a build; behavior tests come in Task 3.

- [ ] **Step 1: Append `TenantName` to `SupportTicketDto` and add the status DTO**

In `SupportDtos.cs`, change the `SupportTicketDto` record to append a trailing nullable param, and add a new record below `SendSupportMessageDto`:

```csharp
    public record SupportTicketDto(
        Guid Id,
        Guid TenantId,
        string Title,
        SupportTicketCategory Category,
        bool IsUrgent,
        SupportTicketStatus Status,
        DateTimeOffset CreatedAt,
        int MessageCount,
        string? LastMessageBody,
        string? TenantName = null
    );
```

```csharp
    public record UpdateSupportTicketStatusDto(
        [Required] string Status
    );
```

(`TenantName` has a default of `null` so existing positional call sites keep compiling, but we still update them explicitly in Step 2 for clarity.)

- [ ] **Step 2: Keep existing call sites explicit**

In `SupportService.cs`, the two existing `new SupportTicketDto(...)` calls end with `..., 0, null)` (CreateTicketAsync) and `..., t.Messages.Count, t.Messages.OrderByDescending(m => m.CreatedAt).FirstOrDefault()?.Body)` (GetTicketsAsync). Leave them as-is — the new `TenantName` defaults to `null`, which is exactly the salon-flow behavior the spec requires (`null` in the salon flow). No edit needed beyond confirming they still compile.

- [ ] **Step 3: Build to verify**

Run: `dotnet build voro-salon-crm-api/VoroSalonCrm.sln`
Expected: Build succeeded, 0 errors.

- [ ] **Step 4: Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.Application/DTOs/Support/SupportDtos.cs
git commit -m "feat(support): add TenantName to SupportTicketDto and status update DTO"
```

---

### Task 2: Repository — cross-tenant ticket query

**Files:**
- Modify: `voro-salon-crm-api/VoroSalonCrm.Domain/Interfaces/Repositories/ISupportTicketRepository.cs`
- Modify: `voro-salon-crm-api/VoroSalonCrm.Infrastructure/Repositories/SupportTicketRepository.cs`

Per the backend test note, repos are not unit-tested here — verify by build. The method returns a lightweight tuple `(SupportTicket Ticket, string TenantName)` so the service can map `TenantName` without adding a navigation property to the entity.

- [ ] **Step 1: Add the method to the interface**

In `ISupportTicketRepository.cs`, add inside the interface:

```csharp
        Task<IEnumerable<(SupportTicket Ticket, string TenantName)>> GetAllWithTenantNameAsync();
```

- [ ] **Step 2: Implement the join in the repository**

In `SupportTicketRepository.cs`, the class already has access to `_dbSet` (the `SupportTicket` set) and `_context`. Add this method. It joins tickets to `Tenants` on `TenantId`, includes `Messages`, and orders by `CreatedAt` desc:

```csharp
        public async Task<IEnumerable<(SupportTicket Ticket, string TenantName)>> GetAllWithTenantNameAsync()
        {
            var rows = await _dbSet
                .AsNoTracking()
                .Include(t => t.Messages)
                .Join(
                    _context.Set<Tenant>().AsNoTracking(),
                    ticket => ticket.TenantId,
                    tenant => tenant.Id,
                    (ticket, tenant) => new { ticket, tenant.Name })
                .OrderByDescending(x => x.ticket.CreatedAt)
                .ToListAsync();

            return rows.Select(x => (x.ticket, x.Name));
        }
```

Note: `_context.Set<Tenant>()` requires `using VoroSalonCrm.Domain.Entities;` — already present in the file.

- [ ] **Step 3: Build to verify**

Run: `dotnet build voro-salon-crm-api/VoroSalonCrm.sln`
Expected: Build succeeded, 0 errors.

- [ ] **Step 4: Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.Domain/Interfaces/Repositories/ISupportTicketRepository.cs voro-salon-crm-api/VoroSalonCrm.Infrastructure/Repositories/SupportTicketRepository.cs
git commit -m "feat(support): add cross-tenant ticket query with tenant name"
```

---

### Task 3: Service — Owner methods (TDD)

**Files:**
- Create: `voro-salon-crm-api/VoroSalonCrm.Tests.Integration/Support/SupportServiceOwnerTests.cs`
- Modify: `voro-salon-crm-api/VoroSalonCrm.Application/Services/Interfaces/ISupportService.cs`
- Modify: `voro-salon-crm-api/VoroSalonCrm.Application/Services/SupportService.cs`

Four methods: `GetAllTicketsAsync`, `GetMessagesForOwnerAsync`, `ReplyAsSupportAsync`, `UpdateTicketStatusAsync`. No tenant checks (authorization is enforced by `[Authorize(Roles = "Owner")]` on the controller). Reply is allowed for any status (support must never be locked out).

- [ ] **Step 1: Write the failing tests**

Create `SupportServiceOwnerTests.cs`. This mirrors `Others/ClientServiceTests.cs` (Moq + FluentAssertions, mocked repos):

```csharp
using FluentAssertions;
using Moq;
using VoroSalonCrm.Application.DTOs.Support;
using VoroSalonCrm.Application.Services;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Tests.Integration.Support;

public class SupportServiceOwnerTests
{
    private readonly Mock<ISupportTicketRepository> _ticketRepo = new();
    private readonly Mock<ISupportMessageRepository> _messageRepo = new();
    private readonly Mock<ICurrentUserService> _currentUser = new();
    private readonly Mock<IUnitOfWork> _unitOfWork = new();

    private SupportService Build() => new(
        _ticketRepo.Object,
        _messageRepo.Object,
        _currentUser.Object,
        _unitOfWork.Object);

    [Fact]
    public async Task GetAllTicketsAsync_ReturnsTicketsFromMultipleTenants_WithTenantName()
    {
        // Arrange
        var t1 = new SupportTicket { Id = Guid.NewGuid(), TenantId = Guid.NewGuid(), Title = "A" };
        var t2 = new SupportTicket { Id = Guid.NewGuid(), TenantId = Guid.NewGuid(), Title = "B" };
        _ticketRepo
            .Setup(r => r.GetAllWithTenantNameAsync())
            .ReturnsAsync(new List<(SupportTicket, string)>
            {
                (t1, "Salon One"),
                (t2, "Salon Two"),
            });
        var svc = Build();

        // Act
        var result = (await svc.GetAllTicketsAsync()).ToList();

        // Assert
        result.Should().HaveCount(2);
        result.Select(r => r.TenantName).Should().BeEquivalentTo(new[] { "Salon One", "Salon Two" });
    }

    [Fact]
    public async Task ReplyAsSupportAsync_SetsIsFromSupportTrue_EvenWhenClosed()
    {
        // Arrange
        var ticketId = Guid.NewGuid();
        var ticket = new SupportTicket { Id = ticketId, Status = SupportTicketStatus.Closed };
        _ticketRepo
            .Setup(r => r.GetByIdAsync(It.IsAny<bool>(), It.IsAny<object[]>()))
            .ReturnsAsync(ticket);
        var svc = Build();
        var dto = new SendSupportMessageDto(ticketId, "Hello from support", null);

        // Act
        var result = await svc.ReplyAsSupportAsync(ticketId, dto);

        // Assert
        result.IsFromSupport.Should().BeTrue();
        ticket.UpdatedAt.Should().NotBeNull();
        _messageRepo.Verify(r => r.AddAsync(It.Is<SupportMessage>(m => m.IsFromSupport)), Times.Once);
        _unitOfWork.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task UpdateTicketStatusAsync_PersistsTransition_AndTouchesUpdatedAt()
    {
        // Arrange
        var ticketId = Guid.NewGuid();
        var ticket = new SupportTicket { Id = ticketId, Status = SupportTicketStatus.Open };
        _ticketRepo
            .Setup(r => r.GetByIdAsync(It.IsAny<bool>(), It.IsAny<object[]>()))
            .ReturnsAsync(ticket);
        var svc = Build();

        // Act
        var result = await svc.UpdateTicketStatusAsync(ticketId, "InProgress");

        // Assert
        ticket.Status.Should().Be(SupportTicketStatus.InProgress);
        ticket.UpdatedAt.Should().NotBeNull();
        result.Status.Should().Be(SupportTicketStatus.InProgress);
        _ticketRepo.Verify(r => r.Update(ticket), Times.Once);
        _unitOfWork.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task ReplyAsSupportAsync_Throws_WhenTicketNotFound()
    {
        // Arrange
        _ticketRepo
            .Setup(r => r.GetByIdAsync(It.IsAny<bool>(), It.IsAny<object[]>()))
            .ReturnsAsync((SupportTicket?)null);
        var svc = Build();
        var dto = new SendSupportMessageDto(Guid.NewGuid(), "Hi", null);

        // Act
        var act = () => svc.ReplyAsSupportAsync(dto.TicketId, dto);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task UpdateTicketStatusAsync_Throws_WhenStatusInvalid()
    {
        // Arrange
        var ticket = new SupportTicket { Id = Guid.NewGuid(), Status = SupportTicketStatus.Open };
        _ticketRepo
            .Setup(r => r.GetByIdAsync(It.IsAny<bool>(), It.IsAny<object[]>()))
            .ReturnsAsync(ticket);
        var svc = Build();

        // Act
        var act = () => svc.UpdateTicketStatusAsync(ticket.Id, "Bogus");

        // Assert
        await act.Should().ThrowAsync<ArgumentException>();
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test voro-salon-crm-api/VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj --filter SupportServiceOwnerTests`
Expected: FAIL — does not compile (`GetAllTicketsAsync`, `ReplyAsSupportAsync`, `UpdateTicketStatusAsync`, `GetAllWithTenantNameAsync` not defined on the mocked/service types).

- [ ] **Step 3: Add the methods to `ISupportService`**

In `ISupportService.cs`, add inside the interface (below the existing four methods):

```csharp
        Task<IEnumerable<SupportTicketDto>> GetAllTicketsAsync();
        Task<IEnumerable<SupportMessageDto>> GetMessagesForOwnerAsync(Guid ticketId);
        Task<SupportMessageDto> ReplyAsSupportAsync(Guid ticketId, SendSupportMessageDto dto);
        Task<SupportTicketDto> UpdateTicketStatusAsync(Guid ticketId, string status);
```

- [ ] **Step 4: Implement the methods in `SupportService`**

In `SupportService.cs`, add these methods inside the class (after `SendMessageAsync`):

```csharp
        public async Task<IEnumerable<SupportTicketDto>> GetAllTicketsAsync()
        {
            var rows = await ticketRepository.GetAllWithTenantNameAsync();
            return rows.Select(r => new SupportTicketDto(
                r.Ticket.Id, r.Ticket.TenantId, r.Ticket.Title, r.Ticket.Category,
                r.Ticket.IsUrgent, r.Ticket.Status, r.Ticket.CreatedAt,
                r.Ticket.Messages.Count,
                r.Ticket.Messages.OrderByDescending(m => m.CreatedAt).FirstOrDefault()?.Body,
                r.TenantName));
        }

        public async Task<IEnumerable<SupportMessageDto>> GetMessagesForOwnerAsync(Guid ticketId)
        {
            _ = await ticketRepository.GetByIdAsync(true, ticketId)
                ?? throw new KeyNotFoundException("Ticket não encontrado.");

            var messages = await messageRepository.GetByTicketIdAsync(ticketId);
            return messages
                .OrderBy(m => m.CreatedAt)
                .Select(m => new SupportMessageDto(
                    m.Id, m.TicketId, m.Body, m.AttachmentUrl, m.IsFromSupport, m.CreatedAt));
        }

        public async Task<SupportMessageDto> ReplyAsSupportAsync(Guid ticketId, SendSupportMessageDto dto)
        {
            var ticket = await ticketRepository.GetByIdAsync(true, ticketId)
                ?? throw new KeyNotFoundException("Ticket não encontrado.");

            var message = new SupportMessage
            {
                Id = Guid.NewGuid(),
                TicketId = ticketId,
                Body = dto.Body,
                AttachmentUrl = dto.AttachmentUrl,
                IsFromSupport = true,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await messageRepository.AddAsync(message);
            ticket.UpdatedAt = DateTimeOffset.UtcNow;
            ticketRepository.Update(ticket);
            await unitOfWork.SaveChangesAsync();

            return new SupportMessageDto(
                message.Id, message.TicketId, message.Body,
                message.AttachmentUrl, message.IsFromSupport, message.CreatedAt);
        }

        public async Task<SupportTicketDto> UpdateTicketStatusAsync(Guid ticketId, string status)
        {
            var ticket = await ticketRepository.GetByIdAsync(true, ticketId)
                ?? throw new KeyNotFoundException("Ticket não encontrado.");

            if (!Enum.TryParse<SupportTicketStatus>(status, true, out var parsed))
                throw new ArgumentException("Status inválido. Use: Open, InProgress ou Closed.");

            ticket.Status = parsed;
            ticket.UpdatedAt = DateTimeOffset.UtcNow;
            ticketRepository.Update(ticket);
            await unitOfWork.SaveChangesAsync();

            return new SupportTicketDto(
                ticket.Id, ticket.TenantId, ticket.Title, ticket.Category,
                ticket.IsUrgent, ticket.Status, ticket.CreatedAt,
                ticket.Messages.Count,
                ticket.Messages.OrderByDescending(m => m.CreatedAt).FirstOrDefault()?.Body,
                null);
        }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `dotnet test voro-salon-crm-api/VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj --filter SupportServiceOwnerTests`
Expected: PASS — 5 passed.

- [ ] **Step 6: Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.Application/Services/Interfaces/ISupportService.cs voro-salon-crm-api/VoroSalonCrm.Application/Services/SupportService.cs voro-salon-crm-api/VoroSalonCrm.Tests.Integration/Support/SupportServiceOwnerTests.cs
git commit -m "feat(support): add owner service methods for cross-tenant inbox"
```

---

### Task 4: Controller — `AdminSupportController`

**Files:**
- Create: `voro-salon-crm-api/VoroSalonCrm.API/Controllers/AdminSupportController.cs`

`[Authorize(Roles = "Owner")]`, mirroring `AdminSubscriptionController`. Error handling mirrors `SupportController`: `KeyNotFoundException` → 404, `ArgumentException` → 400. No DI change needed — `ISupportService` is already registered, and ASP.NET auto-discovers controllers. Route base is `api/v{version:version}/admin-support` so the frontend endpoint `/admin-support/tickets` resolves against `BASE_API_URL` (which already includes `/api/v{version}`).

- [ ] **Step 1: Create the controller**

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSalonCrm.Application.DTOs.Support;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Shared.Extensions;
using VoroSalonCrm.Shared.ViewModels;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/admin-support")]
    [Tags("Admin — Support")]
    [ApiController]
    [Authorize(Roles = "Owner")]
    public class AdminSupportController(ISupportService supportService) : ControllerBase
    {
        [HttpGet("tickets")]
        public async Task<IActionResult> GetTickets()
        {
            try
            {
                var tickets = await supportService.GetAllTicketsAsync();
                return ResponseViewModel<IEnumerable<SupportTicketDto>>
                    .Success(tickets)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpGet("tickets/{ticketId:guid}/messages")]
        public async Task<IActionResult> GetMessages([FromRoute] Guid ticketId)
        {
            try
            {
                var messages = await supportService.GetMessagesForOwnerAsync(ticketId);
                return ResponseViewModel<IEnumerable<SupportMessageDto>>
                    .Success(messages)
                    .ToActionResult();
            }
            catch (KeyNotFoundException ex)
            {
                return ResponseViewModel<object>
                    .Fail(ex.Message, null, StatusCodes.Status404NotFound)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPost("tickets/{ticketId:guid}/messages")]
        public async Task<IActionResult> Reply(
            [FromRoute] Guid ticketId,
            [FromBody] SendSupportMessageDto dto)
        {
            try
            {
                if (dto.TicketId != ticketId)
                    return ResponseViewModel<object>
                        .Fail("TicketId incompatível.", null, StatusCodes.Status400BadRequest)
                        .ToActionResult();

                var message = await supportService.ReplyAsSupportAsync(ticketId, dto);
                return ResponseViewModel<SupportMessageDto>
                    .SuccessWithMessage("Mensagem enviada com sucesso.", message)
                    .ToActionResult();
            }
            catch (KeyNotFoundException ex)
            {
                return ResponseViewModel<object>
                    .Fail(ex.Message, null, StatusCodes.Status404NotFound)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPatch("tickets/{ticketId:guid}/status")]
        public async Task<IActionResult> UpdateStatus(
            [FromRoute] Guid ticketId,
            [FromBody] UpdateSupportTicketStatusDto dto)
        {
            try
            {
                var ticket = await supportService.UpdateTicketStatusAsync(ticketId, dto.Status);
                return ResponseViewModel<SupportTicketDto>
                    .SuccessWithMessage("Status atualizado com sucesso.", ticket)
                    .ToActionResult();
            }
            catch (KeyNotFoundException ex)
            {
                return ResponseViewModel<object>
                    .Fail(ex.Message, null, StatusCodes.Status404NotFound)
                    .ToActionResult();
            }
            catch (ArgumentException ex)
            {
                return ResponseViewModel<object>
                    .Fail(ex.Message, null, StatusCodes.Status400BadRequest)
                    .ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }
    }
}
```

- [ ] **Step 2: Build to verify**

Run: `dotnet build voro-salon-crm-api/VoroSalonCrm.sln`
Expected: Build succeeded, 0 errors.

- [ ] **Step 3: Run the full backend test suite (regression check)**

Run: `dotnet test voro-salon-crm-api/VoroSalonCrm.Tests.Integration/VoroSalonCrm.Tests.Integration.csproj`
Expected: PASS — all tests, including the 5 new `SupportServiceOwnerTests`.

- [ ] **Step 4: Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.API/Controllers/AdminSupportController.cs
git commit -m "feat(support): add owner-only AdminSupportController"
```

---

### Task 5: Frontend — API endpoint config

**Files:**
- Modify: `voro-salon-crm-front/lib/api.ts:81`

Frontend in this repo has no component test harness; the spec calls for **manual verification** (Task 10). These tasks are verified by `npm run build` (type-check + lint).

- [ ] **Step 1: Add the endpoint constant**

In `lib/api.ts`, directly after the `SUPPORT_TICKETS: "/support/tickets",` line, add:

```typescript
    ADMIN_SUPPORT_TICKETS: "/admin-support/tickets",
```

- [ ] **Step 2: Commit**

```bash
git add voro-salon-crm-front/lib/api.ts
git commit -m "feat(support): add admin support tickets endpoint"
```

---

### Task 6: Frontend — reusable ticket list props

**Files:**
- Modify: `voro-salon-crm-front/components/features/support/support-ticket-list.tsx`

Add `tenantName` to the DTO and two optional props: `showTenantName` (renders the salon name line) and `hideNewTicketButton` (Owner has no "Novo ticket"). Defaults keep the existing salon behavior unchanged.

- [ ] **Step 1: Add `tenantName` to the DTO interface**

Change the `SupportTicketDto` interface to add a trailing optional field:

```typescript
export interface SupportTicketDto {
  id: string
  tenantId: string
  title: string
  category: string | number
  isUrgent: boolean
  status: string | number
  createdAt: string
  messageCount: number
  lastMessageBody?: string | null
  tenantName?: string | null
}
```

- [ ] **Step 2: Add the two optional props**

Change the props interface:

```typescript
interface SupportTicketListProps {
  tickets: SupportTicketDto[]
  selectedTicketId: string | null
  onSelect: (ticket: SupportTicketDto) => void
  onNewTicket: () => void
  isLoading: boolean
  showTenantName?: boolean
  hideNewTicketButton?: boolean
}
```

And the destructured signature:

```typescript
export function SupportTicketList({
  tickets,
  selectedTicketId,
  onSelect,
  onNewTicket,
  isLoading,
  showTenantName = false,
  hideNewTicketButton = false,
}: SupportTicketListProps) {
```

- [ ] **Step 3: Conditionally hide the "Novo ticket" button**

Wrap the existing button block so it only renders when not hidden:

```tsx
      {!hideNewTicketButton && (
        <div className="p-3 border-b shrink-0">
          <Button size="sm" className="w-full" onClick={onNewTicket}>
            <Plus className="h-4 w-4 mr-2" />
            Novo ticket
          </Button>
        </div>
      )}
```

- [ ] **Step 4: Render the salon name line**

Inside the ticket `<button>`, immediately after `<p className="text-sm font-medium truncate">{ticket.title}</p>`, add:

```tsx
                {showTenantName && ticket.tenantName && (
                  <p className="text-xs text-muted-foreground truncate">{ticket.tenantName}</p>
                )}
```

- [ ] **Step 5: Build to verify**

Run: `cd voro-salon-crm-front && npm run build`
Expected: Compiles with no type errors.

- [ ] **Step 6: Commit**

```bash
git add voro-salon-crm-front/components/features/support/support-ticket-list.tsx
git commit -m "feat(support): support tenant name and hideable new-ticket button in list"
```

---

### Task 7: Frontend — chat window perspective

**Files:**
- Modify (full replace): `voro-salon-crm-front/components/features/support/support-chat-window.tsx`

Add `perspective: "salon" | "support"` (default `"salon"`). For `"support"`: own messages are `isFromSupport === true` (aligned right), the POST/GET endpoint is `/admin-support/...`, the header subtitle changes, and status controls (Em andamento / Encerrar / Reabrir) call the PATCH status endpoint. Because the changes touch alignment, endpoints, header, and add controls, replace the whole file to avoid partial-edit drift.

- [ ] **Step 1: Replace the file contents**

```tsx
"use client"

import { useState, useEffect, useRef } from "react"
import useSWR from "swr"
import { Send, Loader2, Paperclip, X, MessageSquare, Clock } from "lucide-react"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { fetcher } from "@/lib/fetcher"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface SupportMessage {
  id: string
  ticketId: string
  body: string
  attachmentUrl?: string | null
  isFromSupport: boolean
  createdAt: string
}

type Perspective = "salon" | "support"

interface SupportChatWindowProps {
  ticketId: string
  ticketTitle: string
  perspective?: Perspective
  ticketStatus?: string | number
  onStatusChanged?: () => void
}

export function SupportChatWindow({
  ticketId,
  ticketTitle,
  perspective = "salon",
  ticketStatus,
  onStatusChanged,
}: SupportChatWindowProps) {
  const [message, setMessage] = useState("")
  const [attachmentUrl, setAttachmentUrl] = useState("")
  const [showAttachment, setShowAttachment] = useState(false)
  const [sending, setSending] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const endpointBase =
    perspective === "support"
      ? API_CONFIG.ENDPOINTS.ADMIN_SUPPORT_TICKETS
      : API_CONFIG.ENDPOINTS.SUPPORT_TICKETS

  const { data: messages, mutate } = useSWR<SupportMessage[]>(
    `${endpointBase}/${ticketId}/messages`,
    fetcher,
    { refreshInterval: 10000 }
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // A message is "own" when authored from the current perspective.
  const isOwn = (msg: SupportMessage) =>
    perspective === "support" ? msg.isFromSupport : !msg.isFromSupport

  const handleSend = async () => {
    const body = message.trim()
    if (!body) return

    setSending(true)
    try {
      const res = await secureApiCall(`${endpointBase}/${ticketId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          ticketId,
          body,
          attachmentUrl: attachmentUrl.trim() || null,
        }),
      })

      if (res.hasError) {
        toast.error(res.message ?? "Erro ao enviar mensagem.")
        return
      }

      setMessage("")
      setAttachmentUrl("")
      setShowAttachment(false)
      mutate()
    } catch {
      toast.error("Erro de conexão.")
    } finally {
      setSending(false)
    }
  }

  const handleStatusChange = async (status: "Open" | "InProgress" | "Closed") => {
    setUpdatingStatus(true)
    try {
      const res = await secureApiCall(
        `${API_CONFIG.ENDPOINTS.ADMIN_SUPPORT_TICKETS}/${ticketId}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }
      )

      if (res.hasError) {
        toast.error(res.message ?? "Erro ao atualizar status.")
        return
      }

      onStatusChanged?.()
    } catch {
      toast.error("Erro de conexão.")
    } finally {
      setUpdatingStatus(false)
    }
  }

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

  const statusStr = String(ticketStatus ?? "").toLowerCase()
  const isClosed = statusStr === "2" || statusStr === "closed"
  const isInProgress = statusStr === "1" || statusStr === "inprogress"

  const subtitle =
    perspective === "support"
      ? "Respondendo como Suporte Voro"
      : "Suporte Voro • Responderemos em breve"

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b bg-card">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
          <MessageSquare className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{ticketTitle}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {perspective === "support" && (
          <div className="flex items-center gap-2 shrink-0">
            {!isClosed && !isInProgress && (
              <Button
                size="sm"
                variant="outline"
                disabled={updatingStatus}
                onClick={() => handleStatusChange("InProgress")}
              >
                Em andamento
              </Button>
            )}
            {!isClosed && (
              <Button
                size="sm"
                variant="outline"
                disabled={updatingStatus}
                onClick={() => handleStatusChange("Closed")}
              >
                Encerrar
              </Button>
            )}
            {isClosed && (
              <Button
                size="sm"
                variant="outline"
                disabled={updatingStatus}
                onClick={() => handleStatusChange("Open")}
              >
                Reabrir
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {!messages || messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center py-12">
            <Clock className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">Nenhuma mensagem ainda.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const own = isOwn(msg)
            return (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col gap-1 max-w-[80%]",
                  own ? "self-end items-end" : "self-start"
                )}
              >
                <div className={cn(
                  "px-3 py-2 rounded-2xl text-sm",
                  own
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted rounded-tl-sm"
                )}>
                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                  {msg.attachmentUrl && (
                    <a
                      href={msg.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "text-xs underline mt-1 block",
                        own ? "text-primary-foreground/80" : "text-primary"
                      )}
                    >
                      Anexo
                    </a>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground px-1">{formatTime(msg.createdAt)}</span>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t bg-card flex flex-col gap-2">
        {showAttachment && (
          <div className="flex items-center gap-2">
            <Input
              placeholder="URL do anexo (imagem ou link)"
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              className="text-sm"
            />
            <Button variant="ghost" size="icon" onClick={() => { setShowAttachment(false); setAttachmentUrl("") }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => setShowAttachment((v) => !v)}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            placeholder="Digite sua mensagem..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
            }}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="shrink-0"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build to verify**

Run: `cd voro-salon-crm-front && npm run build`
Expected: Compiles with no type errors. The existing salon usage (`SupportInbox`) passes no `perspective`, so it defaults to `"salon"` — unchanged behavior.

- [ ] **Step 3: Commit**

```bash
git add voro-salon-crm-front/components/features/support/support-chat-window.tsx
git commit -m "feat(support): add perspective prop to chat window for owner replies"
```

---

### Task 8: Frontend — owner inbox orchestrator

**Files:**
- Create: `voro-salon-crm-front/components/features/support/support-admin-inbox.tsx`

Mirrors `SupportInbox`'s two-column layout, but fetches `/admin-support/tickets`, adds a status filter, has no new-ticket button/prechat, and drives the chat window in `"support"` perspective.

- [ ] **Step 1: Create the component**

```tsx
"use client"

import { useState } from "react"
import useSWR from "swr"
import { Inbox } from "lucide-react"
import { API_CONFIG } from "@/lib/api"
import { fetcher } from "@/lib/fetcher"
import { cn } from "@/lib/utils"
import { SupportTicketList, SupportTicketDto } from "./support-ticket-list"
import { SupportChatWindow } from "./support-chat-window"

type StatusFilter = "all" | "open" | "inprogress" | "closed"

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "open", label: "Abertos" },
  { value: "inprogress", label: "Em andamento" },
  { value: "closed", label: "Encerrados" },
]

function matchesStatus(status: string | number, filter: StatusFilter) {
  if (filter === "all") return true
  const s = String(status).toLowerCase()
  if (filter === "open") return s === "0" || s === "open"
  if (filter === "inprogress") return s === "1" || s === "inprogress"
  return s === "2" || s === "closed"
}

export function SupportAdminInbox() {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [filter, setFilter] = useState<StatusFilter>("all")

  const { data: tickets, isLoading, mutate } = useSWR<SupportTicketDto[]>(
    API_CONFIG.ENDPOINTS.ADMIN_SUPPORT_TICKETS,
    fetcher,
    { refreshInterval: 30000 }
  )

  const visibleTickets = (tickets ?? []).filter((t) => matchesStatus(t.status, filter))
  const selectedTicket = tickets?.find((t) => t.id === selectedTicketId) ?? null

  return (
    <div className="grid grid-cols-[320px_1fr] h-full border-t overflow-hidden">
      <div className="border-r overflow-hidden flex flex-col">
        <div className="flex gap-1 p-2 border-b shrink-0 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap transition-colors",
                filter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <SupportTicketList
          tickets={visibleTickets}
          selectedTicketId={selectedTicketId}
          onSelect={(ticket) => setSelectedTicketId(ticket.id)}
          onNewTicket={() => {}}
          isLoading={isLoading}
          showTenantName
          hideNewTicketButton
        />
      </div>
      <div className="overflow-hidden flex flex-col">
        {!selectedTicket ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center text-muted-foreground">
            <Inbox className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm">Selecione um ticket para responder.</p>
          </div>
        ) : (
          <SupportChatWindow
            ticketId={selectedTicket.id}
            ticketTitle={selectedTicket.title}
            perspective="support"
            ticketStatus={selectedTicket.status}
            onStatusChanged={() => mutate()}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build to verify**

Run: `cd voro-salon-crm-front && npm run build`
Expected: Compiles with no type errors.

- [ ] **Step 3: Commit**

```bash
git add voro-salon-crm-front/components/features/support/support-admin-inbox.tsx
git commit -m "feat(support): add owner support admin inbox component"
```

---

### Task 9: Frontend — page role branch

**Files:**
- Modify (full replace): `voro-salon-crm-front/app/support/page.tsx`

Keep the shared `AuthGuard` (all three roles). A small client selector reads `useAuth()` and renders the Owner inbox or the salon inbox. The page is already `"use client"`, so `useAuth()` can be called inside.

- [ ] **Step 1: Replace the page contents**

```tsx
"use client"

import { AuthGuard } from "@/components/auth/auth.guard"
import { useAuth } from "@/contexts/auth.context"
import { SupportInbox } from "@/components/features/support/support-inbox"
import { SupportAdminInbox } from "@/components/features/support/support-admin-inbox"

function SupportView() {
  const { user } = useAuth()
  const isOwner = user?.roles?.some((r) => r.name === "Owner") ?? false
  return isOwner ? <SupportAdminInbox /> : <SupportInbox />
}

export default function SupportPage() {
  return (
    <AuthGuard requiredRoles={["SalonOwner", "SalonEmployee", "Owner"]}>
      <div className="h-[calc(100vh-4rem)]">
        <SupportView />
      </div>
    </AuthGuard>
  )
}
```

- [ ] **Step 2: Build to verify**

Run: `cd voro-salon-crm-front && npm run build`
Expected: Compiles with no type errors.

- [ ] **Step 3: Commit**

```bash
git add voro-salon-crm-front/app/support/page.tsx
git commit -m "feat(support): branch support page on owner role"
```

---

### Task 10: Manual verification of both role flows

**Files:** none (verification only)

The spec specifies manual verification for the frontend. Run the API and the web app, then walk both flows.

- [ ] **Step 1: Start backend and frontend**

Run the API (`dotnet run` in the API project) and the web app (`cd voro-salon-crm-front && npm run dev`).

- [ ] **Step 2: Verify the salon flow is unchanged**

Sign in as a `SalonOwner` (or `SalonEmployee`). At `/support`:
- "Novo ticket" button is present; create a ticket and send a message.
- Own messages align **right**; "Suporte Voro" messages align left.
- No tenant-name line appears under ticket titles.

- [ ] **Step 3: Verify the Owner inbox**

Sign in as `Owner`. At `/support`:
- Tickets from **multiple salons** are listed, each showing its salon name.
- No "Novo ticket" button.
- Status filter chips (Todos / Abertos / Em andamento / Encerrados) filter the list.
- Open a ticket and reply: the reply appears aligned **right** (support perspective) and shows in the salon's chat as a left-aligned "Suporte Voro" message.
- Reply works even when the ticket is **Encerrado** (Closed).
- "Em andamento", "Encerrar", and "Reabrir" controls change the status; the list and chat reflect the new status.

- [ ] **Step 4: Confirm isolation**

While signed in as a salon user, confirm `/admin-support/tickets` returns 403 (the salon flow never calls it; this is a guardrail check via browser devtools or curl with the salon token).

---

## Self-Review

Checked the plan against `docs/superpowers/specs/2026-06-12-owner-support-inbox-design.md`:

**Spec coverage:**
- Owner agent inbox, lists all salons' tickets with salon name, no new-ticket button → Tasks 8, 6, 9. ✅
- Salon flow unchanged → defaults preserved (Tasks 6, 7); verified in Task 10. ✅
- Owner manage status Open → InProgress → Closed → Tasks 3, 4, 7. ✅
- Separate `Owner`-protected endpoints, `SupportController` untouched → Task 4 (new `AdminSupportController`). ✅
- Owner may reply regardless of status; reopen is a separate explicit change → Task 3 (`ReplyAsSupportAsync` has no Closed guard) + status controls. ✅
- Backend endpoints (GET tickets, GET messages, POST reply, PATCH status) → Task 4. ✅
- `SupportTicketDto.TenantName` appended; `UpdateSupportTicketStatusDto` → Task 1. ✅
- `ISupportTicketRepository.GetAllWithTenantNameAsync` join → Task 2. ✅
- Service methods `GetAllTicketsAsync`, `GetMessagesForOwnerAsync`, `ReplyAsSupportAsync`, `UpdateTicketStatusAsync` → Task 3. ✅
- Error handling: `KeyNotFoundException` → 404, invalid status → 400 → Tasks 3 (throws) + 4 (maps). ✅
- Frontend `perspective` prop (alignment, endpoint, header, status controls) → Task 7. ✅
- `support-ticket-list` `showTenantName` + `hideNewTicketButton` → Task 6. ✅
- `lib/api.ts` `ADMIN_SUPPORT_TICKETS` → Task 5. ✅
- Page branch on `Owner` role keeping `AuthGuard` → Task 9. ✅
- Backend tests (cross-tenant listing, reply-when-closed, status persist + UpdatedAt, not-found, invalid status) → Task 3. ✅

**Placeholder scan:** No TBD/TODO/"handle edge cases"; every code step shows complete code. ✅

**Type consistency:** `GetAllWithTenantNameAsync` returns `IEnumerable<(SupportTicket Ticket, string TenantName)>` in Task 2 and is consumed with `.Ticket`/`.TenantName` in Task 3. `SupportTicketDto` trailing `TenantName` (Task 1) matches the frontend DTO `tenantName` (Task 6). Endpoint constant `ADMIN_SUPPORT_TICKETS` (Task 5) is used in Tasks 7, 8. Method names (`ReplyAsSupportAsync`, `UpdateTicketStatusAsync`, etc.) match across interface (Task 3), service (Task 3), and controller (Task 4). ✅

**Out of scope (not implemented, per spec):** salon notifications/email on reply, multi-agent assignment, attachment upload (URL reuse only).

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-12-owner-support-inbox.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**

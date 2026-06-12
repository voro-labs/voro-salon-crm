# Owner-facing Support Inbox — Design

**Date:** 2026-06-12
**Status:** Approved (pending spec review)

## Problem

Today the support page (`/support`) is a single self-service flow: any allowed user
creates tickets and chats with "Voro support". But there is no surface for the actual
Voro support agent (the SaaS super-admin, `Owner` role) to read and answer those tickets.

The backend support flow is **tenant-scoped**:

- `SupportService.GetTicketsAsync()` returns only the current tenant's tickets.
- `SupportService.SendMessageAsync()` always sets `IsFromSupport = false` and rejects
  tickets belonging to another tenant.

So an Owner visiting `/support` today sees an empty inbox and has no way to reply as support.

## Goal

- **Owner** (`role = "Owner"`): `/support` becomes an **agent inbox** — lists tickets from
  *all* salons, shows the originating salon name, lets the Owner reply as Voro support and
  change ticket status. No "Novo ticket" button.
- **SalonOwner / SalonEmployee**: unchanged self-service flow (create tickets, chat).

## Decisions

- Owner can **manage status** (Open → InProgress → Closed).
- Each ticket shows its **salon/tenant name** in the Owner list.
- Owner actions are exposed via **separate `Owner`-protected endpoints**, leaving the
  tenant-scoped `SupportController` untouched (salons stay isolated).
- Owner may **reply regardless of ticket status** (support must never be locked out).
  Reopening a closed ticket is a separate, explicit status change.

## Architecture

Role-based branch at the page level; the existing `AuthGuard` (all three roles) is kept.
A small client selector reads `useAuth()` and renders the Owner view or the salon view.

```
/support (AuthGuard: SalonOwner | SalonEmployee | Owner)
  └─ role === "Owner"  → SupportAdminInbox  → /admin-support/* endpoints
  └─ otherwise         → SupportInbox       → /support/* endpoints (unchanged)
```

## Backend

New `AdminSupportController` with `[Authorize(Roles = "Owner")]`, mirroring the existing
`AdminSubscriptionController` pattern. The tenant-scoped `SupportController` is not modified.

| Method | Route | Purpose |
|---|---|---|
| GET | `/admin-support/tickets` | All tickets across tenants, including salon name |
| GET | `/admin-support/tickets/{ticketId}/messages` | Messages for a ticket (no tenant check) |
| POST | `/admin-support/tickets/{ticketId}/messages` | Reply with `IsFromSupport = true` (any status) |
| PATCH | `/admin-support/tickets/{ticketId}/status` | Set status to Open / InProgress / Closed |

### Supporting changes

- **DTO** `SupportTicketDto` gains a nullable `string? TenantName` — `null` in the salon
  flow, populated for the Owner list. (Record positional param appended at the end.)
- **DTO** new `UpdateSupportTicketStatusDto([Required] string Status)` — parsed into
  `SupportTicketStatus` (case-insensitive: `Open` / `InProgress` / `Closed`).
- **Repository** `ISupportTicketRepository.GetAllWithTenantNameAsync()` — returns all
  tickets joined with `Tenant.Name`, including `Messages`, ordered by `CreatedAt` desc.
  Implemented as a LINQ join between the tickets `DbSet` and the tenants `DbSet`,
  projecting into a lightweight result (e.g. `(SupportTicket Ticket, string TenantName)`).
- **Service** `SupportService` (or a dedicated owner section of it) gains:
  - `GetAllTicketsAsync()` — maps repo result to `SupportTicketDto` with `TenantName`.
  - `GetMessagesForOwnerAsync(ticketId)` — same as `GetMessagesAsync` but **no tenant check**.
  - `ReplyAsSupportAsync(ticketId, dto)` — creates a `SupportMessage` with
    `IsFromSupport = true`, no tenant check, allowed for any status; touches `UpdatedAt`.
  - `UpdateTicketStatusAsync(ticketId, status)` — sets `Status`, touches `UpdatedAt`.

### Backend error handling

Follows the existing `SupportController` conventions: `KeyNotFoundException` → 404,
invalid status string → 400 (`ArgumentException`). Authorization is enforced by the
`[Authorize(Roles = "Owner")]` attribute, so no manual tenant/role checks are needed in
the owner service methods.

## Frontend

### Page

`app/support/page.tsx`: keeps `AuthGuard` with `["SalonOwner", "SalonEmployee", "Owner"]`.
Inside, a client selector chooses the view based on `useAuth()` roles
(`user.roles.some(r => r.name === "Owner")`).

### Components

- **New** `components/features/support/support-admin-inbox.tsx` — orchestrates the Owner
  view: fetches `/admin-support/tickets` (SWR, polling like today), optional status filter
  (All / Open / InProgress / Closed), no new-ticket button. Layout mirrors `SupportInbox`
  (two-column grid: list + chat).
- **Reuse with props** (avoid duplication):
  - `support-ticket-list.tsx` — add optional `showTenantName?: boolean` (renders salon name
    line) and `hideNewTicketButton?: boolean` (Owner has no "Novo ticket").
  - `support-chat-window.tsx` — add `perspective: "salon" | "support"` (default `"salon"`):
    - flips bubble alignment so the current user's own messages sit on the right
      (for `"support"`, `IsFromSupport = true` messages align right);
    - swaps the POST endpoint (`/support/...` vs `/admin-support/...`);
    - adjusts the header copy;
    - for `"support"`, renders status controls (Em andamento / Encerrar / Reabrir) that call
      the PATCH status endpoint.

### API config

`lib/api.ts`: add `ADMIN_SUPPORT_TICKETS: "/admin-support/tickets"`.

## Testing

- **Backend** — `SupportService` unit tests for the new Owner methods:
  - cross-tenant listing returns tickets from multiple tenants with `TenantName` populated;
  - reply marks `IsFromSupport = true` and succeeds even when the ticket is `Closed`;
  - status update transitions persist and touch `UpdatedAt`;
  - unknown ticket → `KeyNotFoundException`; invalid status string → `ArgumentException`.
- **Frontend** — manual verification of both role flows (salon creates/chats; Owner lists
  across tenants, replies, changes status; bubble alignment correct from each perspective).

## Out of scope

- Notifications/email to salons on a support reply.
- Ticket assignment to multiple agents.
- Attachments upload (existing URL-based attachment behavior is reused as-is).

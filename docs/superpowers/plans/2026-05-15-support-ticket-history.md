# Support Ticket History — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refatorar a tela de suporte em um layout split (inbox-style) onde o usuário pode ver todos os seus tickets anteriores, acessar o chat de cada um e acompanhar o status.

**Architecture:** Novo `SupportInbox` encapsula o layout split (lista 320px à esquerda, painel à direita), gerencia estado de seleção e busca a lista via SWR. `SupportTicketList` renderiza cada item com status, categoria, data e preview da última mensagem. O backend ganha `LastMessageBody` no DTO populado a partir das mensagens já carregadas via `Include`.

**Tech Stack:** Next.js App Router, React, SWR, Tailwind CSS, shadcn/ui, C# .NET, Entity Framework Core

---

## Mapa de arquivos

| Ação | Arquivo |
|------|---------|
| Modificar | `voro-salon-crm-api/VoroSalonCrm.Application/DTOs/Support/SupportDtos.cs` |
| Modificar | `voro-salon-crm-api/VoroSalonCrm.Application/Services/SupportService.cs` |
| Criar | `voro-salon-crm-front/components/features/support/support-inbox.tsx` |
| Criar | `voro-salon-crm-front/components/features/support/support-ticket-list.tsx` |
| Modificar | `voro-salon-crm-front/app/support/page.tsx` |

---

### Task 1: Criar branch de feature a partir de dev

**Files:** nenhum arquivo modificado nessa task

- [ ] **Step 1: Garantir que dev está atualizado e criar branch**

```bash
git checkout dev
git pull origin dev
git checkout -b feature/support-ticket-history
git push -u origin feature/support-ticket-history
```

Expected: branch `feature/support-ticket-history` criada e rastreando origin.

---

### Task 2: Backend — adicionar `LastMessageBody` ao DTO e ao serviço

**Files:**
- Modify: `voro-salon-crm-api/VoroSalonCrm.Application/DTOs/Support/SupportDtos.cs`
- Modify: `voro-salon-crm-api/VoroSalonCrm.Application/Services/SupportService.cs`

- [ ] **Step 1: Adicionar `LastMessageBody` ao `SupportTicketDto`**

Abrir `voro-salon-crm-api/VoroSalonCrm.Application/DTOs/Support/SupportDtos.cs` e substituir:

```csharp
public record SupportTicketDto(
    Guid Id,
    Guid TenantId,
    string Title,
    SupportTicketCategory Category,
    bool IsUrgent,
    SupportTicketStatus Status,
    DateTimeOffset CreatedAt,
    int MessageCount
);
```

Por:

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
    string? LastMessageBody
);
```

- [ ] **Step 2: Atualizar `GetTicketsAsync` para popular `LastMessageBody`**

Em `voro-salon-crm-api/VoroSalonCrm.Application/Services/SupportService.cs`, substituir o método `GetTicketsAsync`:

```csharp
public async Task<IEnumerable<SupportTicketDto>> GetTicketsAsync()
{
    var tenantId = currentUserService.TenantId;
    var tickets = await ticketRepository.GetByTenantIdAsync(tenantId);
    return tickets.Select(t => new SupportTicketDto(
        t.Id, t.TenantId, t.Title, t.Category, t.IsUrgent, t.Status,
        t.CreatedAt, t.Messages.Count,
        t.Messages.OrderByDescending(m => m.CreatedAt).FirstOrDefault()?.Body));
}
```

- [ ] **Step 3: Atualizar `CreateTicketAsync` para passar `null` no novo campo**

No mesmo arquivo, substituir o `return` de `CreateTicketAsync`:

```csharp
return new SupportTicketDto(
    ticket.Id, ticket.TenantId, ticket.Title,
    ticket.Category, ticket.IsUrgent, ticket.Status,
    ticket.CreatedAt, 0, null);
```

- [ ] **Step 4: Build do projeto para verificar compilação**

```bash
cd voro-salon-crm-api
dotnet build
```

Expected: `Build succeeded.` sem warnings de compilação.

- [ ] **Step 5: Commit**

```bash
git add voro-salon-crm-api/VoroSalonCrm.Application/DTOs/Support/SupportDtos.cs
git add voro-salon-crm-api/VoroSalonCrm.Application/Services/SupportService.cs
git commit -m "feat(support): add LastMessageBody to SupportTicketDto"
```

---

### Task 3: Frontend — criar `SupportTicketList`

**Files:**
- Create: `voro-salon-crm-front/components/features/support/support-ticket-list.tsx`

- [ ] **Step 1: Criar o arquivo**

Criar `voro-salon-crm-front/components/features/support/support-ticket-list.tsx`. O tipo `SupportTicketDto` é definido e exportado aqui; `SupportInbox` (task 4) o importa daqui:

```tsx
"use client"

import { Plus, Loader2, TicketX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
}

interface SupportTicketListProps {
  tickets: SupportTicketDto[]
  selectedTicketId: string | null
  onSelect: (ticket: SupportTicketDto) => void
  onNewTicket: () => void
  isLoading: boolean
}

function getStatusConfig(status: string | number) {
  const s = String(status).toLowerCase()
  if (s === "0" || s === "open")
    return { label: "Aberto", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" }
  if (s === "1" || s === "inprogress")
    return { label: "Em andamento", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" }
  return { label: "Encerrado", className: "bg-muted text-muted-foreground" }
}

function getCategoryLabel(category: string | number) {
  const c = String(category).toLowerCase()
  if (c === "0" || c === "bug") return "Bug"
  if (c === "1" || c === "feature") return "Sugestão"
  return "Outro"
}

export function SupportTicketList({
  tickets,
  selectedTicketId,
  onSelect,
  onNewTicket,
  isLoading,
}: SupportTicketListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b shrink-0">
        <Button size="sm" className="w-full" onClick={onNewTicket}>
          <Plus className="h-4 w-4 mr-2" />
          Novo ticket
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 gap-2 text-center">
            <TicketX className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhum ticket ainda</p>
          </div>
        ) : (
          tickets.map((ticket) => {
            const status = getStatusConfig(ticket.status)
            const isSelected = ticket.id === selectedTicketId
            return (
              <button
                key={ticket.id}
                type="button"
                onClick={() => onSelect(ticket)}
                className={cn(
                  "w-full text-left p-3 border-b transition-colors flex flex-col gap-1.5 border-l-2",
                  isSelected
                    ? "bg-muted border-l-primary"
                    : "border-l-transparent hover:bg-accent/40"
                )}
              >
                <p className="text-sm font-medium truncate">{ticket.title}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                      status.className
                    )}
                  >
                    {status.label}
                  </span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {getCategoryLabel(ticket.category)}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(ticket.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {ticket.lastMessageBody ?? "Nenhuma mensagem ainda"}
                </p>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add voro-salon-crm-front/components/features/support/support-ticket-list.tsx
git commit -m "feat(support): add SupportTicketList component"
```

---

### Task 4: Frontend — criar `SupportInbox`

**Files:**
- Create: `voro-salon-crm-front/components/features/support/support-inbox.tsx`

- [ ] **Step 1: Criar o arquivo**

Criar `voro-salon-crm-front/components/features/support/support-inbox.tsx`:

```tsx
"use client"

import { useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { fetcher } from "@/lib/fetcher"
import { SupportTicketList, SupportTicketDto } from "./support-ticket-list"
import { SupportPrechat } from "./support-prechat"
import { SupportChatWindow } from "./support-chat-window"

export function SupportInbox() {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [selectedTicketTitle, setSelectedTicketTitle] = useState<string>("")

  const { data: tickets, isLoading, mutate } = useSWR<SupportTicketDto[]>(
    API_CONFIG.ENDPOINTS.SUPPORT_TICKETS,
    fetcher,
    { refreshInterval: 30000 }
  )

  const handleStart = async (category: string, isUrgent: boolean, title: string) => {
    try {
      const res = await secureApiCall<SupportTicketDto>(
        API_CONFIG.ENDPOINTS.SUPPORT_TICKETS,
        {
          method: "POST",
          body: JSON.stringify({ title, category, isUrgent }),
        }
      )

      if (res.hasError) {
        toast.error(res.message ?? "Erro ao abrir ticket.")
        return
      }

      await mutate()
      setSelectedTicketId(res.data!.id)
      setSelectedTicketTitle(res.data!.title)
    } catch {
      toast.error("Erro de conexão.")
    }
  }

  const handleSelectTicket = (ticket: SupportTicketDto) => {
    setSelectedTicketId(ticket.id)
    setSelectedTicketTitle(ticket.title)
  }

  const handleNewTicket = () => {
    setSelectedTicketId(null)
    setSelectedTicketTitle("")
  }

  return (
    <div className="grid grid-cols-[320px_1fr] h-full border-t overflow-hidden">
      <div className="border-r overflow-hidden flex flex-col">
        <SupportTicketList
          tickets={tickets ?? []}
          selectedTicketId={selectedTicketId}
          onSelect={handleSelectTicket}
          onNewTicket={handleNewTicket}
          isLoading={isLoading}
        />
      </div>
      <div className="overflow-hidden flex flex-col">
        {!selectedTicketId ? (
          <div className="overflow-y-auto flex-1">
            <SupportPrechat onStart={handleStart} />
          </div>
        ) : (
          <SupportChatWindow
            ticketId={selectedTicketId}
            ticketTitle={selectedTicketTitle}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add voro-salon-crm-front/components/features/support/support-inbox.tsx
git commit -m "feat(support): add SupportInbox split layout component"
```

---

### Task 5: Frontend — refatorar `page.tsx`

**Files:**
- Modify: `voro-salon-crm-front/app/support/page.tsx`

- [ ] **Step 1: Substituir conteúdo de `page.tsx`**

Substituir todo o conteúdo de `voro-salon-crm-front/app/support/page.tsx` por:

```tsx
"use client"

import { AuthGuard } from "@/components/auth/auth.guard"
import { SupportInbox } from "@/components/features/support/support-inbox"

export default function SupportPage() {
  return (
    <AuthGuard requiredRoles={["SalonOwner", "SalonEmployee", "Owner"]}>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <SupportInbox />
      </div>
    </AuthGuard>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd voro-salon-crm-front
npx tsc --noEmit
```

Expected: sem erros de tipo. Se houver erros de tipo relacionados ao `secureApiCall` no `SupportInbox`, verificar a assinatura do método em `lib/api.ts` e ajustar o genérico conforme o padrão existente no projeto.

- [ ] **Step 3: Commit**

```bash
git add voro-salon-crm-front/app/support/page.tsx
git commit -m "refactor(support): replace page logic with SupportInbox"
```

---

### Task 6: Push e PR para `chore/sync-dev-to-main`

- [ ] **Step 1: Push da branch**

```bash
git push origin feature/support-ticket-history
```

- [ ] **Step 2: Abrir PR apontando para `chore/sync-dev-to-main`**

```bash
gh pr create \
  --base chore/sync-dev-to-main \
  --title "feat(support): ticket history with inbox layout" \
  --body "$(cat <<'EOF'
## Summary

- Refatora a tela de suporte para layout split (inbox-style)
- Usuários agora veem todos os tickets abertos com status, categoria, data e preview da última mensagem
- Clicar num ticket abre o chat no painel direito
- Botão \"Novo ticket\" na lista reexibe o formulário de criação
- Backend: adiciona \`LastMessageBody\` ao \`SupportTicketDto\` (populado via mensagens já carregadas)

## Componentes

- **SupportInbox** (novo): encapsula layout split, estado de seleção e fetch da lista
- **SupportTicketList** (novo): lista com badges de status, categoria, data e preview
- **page.tsx**: simplificado para só renderizar \`<SupportInbox>\`
- **SupportPrechat / SupportChatWindow**: sem mudanças estruturais

## Test plan

- [ ] Lista de tickets aparece no painel esquerdo ao acessar /support
- [ ] Clicar num ticket abre o chat no painel direito
- [ ] Botão "Novo ticket" limpa seleção e exibe formulário de criação
- [ ] Criar novo ticket via formulário auto-seleciona o ticket e abre o chat
- [ ] Preview da última mensagem aparece em cada item da lista
- [ ] Badges de status e categoria corretos (Aberto/Em andamento/Encerrado, Bug/Sugestão/Outro)
- [ ] Estado vazio ("Nenhum ticket ainda") quando lista está vazia
- [ ] Skeleton de loading enquanto a lista carrega
EOF
)"
```

Expected: URL do PR exibida no terminal.

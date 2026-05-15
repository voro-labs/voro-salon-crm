# Support Ticket History — Design Spec

**Data:** 2026-05-15  
**Problema:** Usuários não conseguem ver os tickets que abriram, nem o histórico de mensagens, nem o status atual de cada ticket.  
**Solução:** Refatorar a tela de suporte para um layout split (inbox-style) com listagem de tickets à esquerda e painel de chat à direita.

---

## Contexto

A tela de suporte atual (`/support`) exibe apenas o formulário de criação (`SupportPrechat`) ou a janela do ticket ativo (`SupportChatWindow`). O backend já possui o endpoint `GET /support/tickets` retornando todos os tickets do tenant, mas o frontend nunca o consome.

---

## Arquitetura

### Fluxo de navegação

```
SupportInbox
├── Painel esquerdo: SupportTicketList
│   ├── Botão "Novo ticket" → selectedTicketId = null
│   └── Clicar num ticket → selectedTicketId = ticket.id
└── Painel direito:
    ├── selectedTicketId == null → SupportPrechat
    └── selectedTicketId != null → SupportChatWindow
```

### Fluxo de dados

```
SupportInbox
├── SWR: GET /support/tickets (polling 30s)
│   └── mutate() disparado ao criar novo ticket
├── SupportTicketList (recebe lista via props)
└── SupportChatWindow
    └── SWR: GET /support/tickets/{id}/messages (polling 10s, existente)
```

---

## Componentes

### `page.tsx` (ajuste)

Fica mínimo — só renderiza `<AuthGuard>` + `<SupportInbox>`. Remove estado e lógica de seleção.

### `SupportInbox` (novo)

**Arquivo:** `components/features/support/support-inbox.tsx`

**Responsabilidades:**
- Estado `selectedTicketId: string | null`
- Busca da lista de tickets via SWR com polling de 30s
- Layout `grid grid-cols-[320px_1fr] h-full`
- Callback `handleTicketCreated(ticket)`: seta `selectedTicketId = ticket.id` e chama `mutate()`

### `SupportTicketList` (novo)

**Arquivo:** `components/features/support/support-ticket-list.tsx`

**Props:**
```typescript
interface SupportTicketListProps {
  tickets: SupportTicketDto[]
  selectedTicketId: string | null
  onSelect: (id: string) => void
  onNewTicket: () => void
  isLoading: boolean
}
```

**Cada item da lista exibe:**
- Título (truncado em 1 linha, `truncate`)
- Badge de status: `Aberto` (verde), `Em andamento` (amarelo), `Encerrado` (cinza)
- Badge de categoria: `Bug`, `Sugestão`, `Outro`
- Data de criação formatada em pt-BR
- Preview da última mensagem (2 linhas, `line-clamp-2`) ou "Nenhuma mensagem ainda"

**Item selecionado:** `bg-muted border-l-2 border-primary`

**Estado vazio:** skeleton enquanto carrega, mensagem "Nenhum ticket ainda" quando lista vazia.

### `SupportPrechat` (ajuste)

Adiciona prop `onTicketCreated: (ticket: SupportTicketDto) => void`. Ao criar com sucesso chama o callback em vez de gerenciar estado internamente.

### `SupportChatWindow` (sem mudança estrutural)

Continua recebendo `ticket` como prop. Nenhuma alteração necessária.

---

## Backend

### `SupportTicketDto` — campo adicional

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
    string? LastMessageBody  // novo
);
```

### `SupportService.GetTicketsAsync()` — mapeamento

O repositório já carrega mensagens via `Include`. Adicionar ao mapeamento:

```csharp
LastMessageBody = ticket.Messages
    .OrderByDescending(m => m.CreatedAt)
    .FirstOrDefault()?.Body
```

A truncagem para exibição é responsabilidade do frontend (`line-clamp-2`), não do backend.

---

## Tipos frontend

Adicionar `lastMessageBody?: string` ao tipo `SupportTicketDto` existente no frontend.

---

## O que não muda

- Endpoint `GET /support/tickets/{id}/messages` e polling de 10s no chat
- Endpoint `POST /support/tickets` e `POST /support/tickets/{id}/messages`
- Lógica de envio de mensagem e exibição no `SupportChatWindow`
- AuthGuard e roles de acesso

---

## Fora de escopo

- Filtros/busca na lista de tickets
- Upload de arquivos (continua só URL)
- Fechar/reabrir tickets pela UI
- Painel de administração para o time de suporte
- WebSocket/SignalR (polling mantido)

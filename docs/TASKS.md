# Tasks — Voro Salon CRM

> Branch atual de trabalho: `feature/whatsapp-messages-kanban`

---

## TASK 1 — Kanban de Mensagens WhatsApp

**Objetivo:** Transformar a listagem de mensagens do WhatsApp em um board Kanban, agrupando contatos por número (`From`) e organizando-os por etapa do fluxo de agendamento.

### Contexto

O `WhatsappChatService` gerencia um fluxo de agendamento com os estados:
`START` → `AWAITING_SERVICE` → `AWAITING_EMPLOYEE` → `AWAITING_DATE` → `AWAITING_TIME` → `AWAITING_CONFIRMATION` → `COMPLETED`

A entidade `WhatsAppMessage` possui os campos `From`, `To`, `Direction`, `Body`, `Status` e `Timestamp`.

### Colunas do Kanban

| Coluna | Estado correspondente | Descrição |
|---|---|---|
| Novo Contato | `START` | Mensagem recebida, fluxo ainda não iniciado |
| Escolhendo Serviço | `AWAITING_SERVICE` | Enviou resposta ao menu de serviços |
| Escolhendo Profissional | `AWAITING_EMPLOYEE` | Selecionou o serviço |
| Escolhendo Data | `AWAITING_DATE` | Selecionou o profissional |
| Escolhendo Horário | `AWAITING_TIME` | Selecionou a data |
| Aguardando Confirmação | `AWAITING_CONFIRMATION` | Selecionou horário, aguarda confirmar |
| Agendado | `COMPLETED` | Agendamento confirmado — exibir como cliente |

### Backend — Alterações necessárias

- [ ] Adicionar campo `ConversationState` (string, nullable) na entidade `WhatsAppMessage` (ou criar entidade `WhatsAppConversation` separada).
- [ ] Persistir o estado atual da sessão do `WhatsappChatService` no banco ao invés de apenas em `IMemoryCache`, para que o kanban possa ler a etapa de cada contato.
- [ ] Criar endpoint `GET /api/whatsapp/conversations` que retorna contatos agrupados por `From` com:
  - Número do contato
  - Nome (se identificado — cruzar com `Client.Phone`)
  - Último estado do fluxo
  - Última mensagem e timestamp
  - Se está agendado: dados do agendamento vinculado

### Frontend — Alterações necessárias

- [ ] Criar página `/whatsapp` (ou adaptar a existente) com layout Kanban usando colunas drag-and-drop (ou apenas visual).
- [ ] Cada card exibe: número/nome do contato, prévia da última mensagem, horário.
- [ ] Cards na coluna "Agendado" exibem badge de cliente com link para o perfil.
- [ ] Implementar polling ou WebSocket para atualização em tempo real.

---

## TASK 2 — Envio Manual de Mensagens Template pelo Proprietário

**Objetivo:** Permitir que o proprietário selecione clientes e envie mensagens template do WhatsApp manualmente, na hora que desejar, diretamente pela interface.

### Contexto

O método `SendTemplateMessageAsync(WhatsappTemplateMessageDto message, string? phoneIdOverride)` já existe em `IWhatsappService`. Os DTOs `WhatsappTemplateMessageDto`, `WhatsappTemplateDto` e `WhatsappComponentDto` já estão definidos.

### Backend — Alterações necessárias

- [ ] Criar endpoint `POST /api/whatsapp/send-template` (autenticado) que recebe:
  - `clientIds: Guid[]` — lista de clientes destinatários
  - `templateName: string` — nome do template aprovado no Meta
  - `language: string` — código de idioma (padrão `pt_BR`)
  - `components?: WhatsappComponentDto[]` — parâmetros variáveis do template
- [ ] Buscar o telefone de cada cliente no banco e chamar `SendTemplateMessageAsync` para cada um.
- [ ] Retornar relatório com sucesso/falha por cliente.
- [ ] (Opcional) Criar endpoint `GET /api/whatsapp/templates` que lista os templates disponíveis cadastrados no Meta Business (via Graph API).

### Frontend — Alterações necessárias

- [ ] Adicionar botão "Enviar Mensagem Template" na tela de WhatsApp (ou na tela de Clientes).
- [ ] Modal/drawer com:
  - Seleção de template (dropdown com templates disponíveis)
  - Seleção de clientes destinatários (multi-select com busca)
  - Campos dinâmicos para preencher variáveis do template (`{{1}}`, `{{2}}`...)
  - Preview da mensagem montada
  - Botão de enviar com confirmação
- [ ] Exibir feedback por destinatário (enviado / falhou).

---

## ✅ TASK 3 — Validar Uso da Assinatura (Membership) no Agendamento

**Objetivo:** Verificar se o cliente possui uma `ClientMembership` ativa no momento do agendamento e, se sim, consumir uma sessão automaticamente.

### Contexto

- Entidade `ClientMembership`: `PlanId`, `StartDate`, `EndDate`, `RemainingSessions` (null = ilimitado), `Status`.
- O fluxo de criação de agendamento está em `IPublicBookingService.CreateBookingAsync` e no `WhatsappChatService.HandleConfirmationAsync`.

### Backend — Alterações necessárias

- [ ] No `CreateBookingAsync` (e/ou em um passo do `WhatsappChatService`), após confirmar o agendamento:
  1. Buscar `ClientMembership` ativa do cliente (`Status == Active`, `EndDate >= hoje`).
  2. Se encontrada e `RemainingSessions > 0` (ou null = ilimitado):
     - Decrementar `RemainingSessions` (se não for ilimitado).
     - Vincular o `ClientMembershipId` ao agendamento (`Appointment.ClientMembershipId`).
  3. Se a assinatura estiver esgotada (`RemainingSessions == 0`): não bloquear o agendamento, mas não consumir — ou avisar o cliente.
- [x] Adicionar campo `ClientMembershipId` (nullable) na entidade `Appointment` (migration criada).
- [x] Retornar no response do agendamento se uma assinatura foi utilizada.

### Frontend — Alterações necessárias

- [x] Na tela de agendamento (admin), exibir badge "Usa assinatura" se o cliente tiver membership ativa.
- [x] Exibir quantas sessões restam após o agendamento.
- [x] No detalhe do agendamento, mostrar qual plano de assinatura foi utilizado.

---

## TASK 4 — Envio Automático de Aviso de Créditos Próximos do Vencimento

**Objetivo:** Enviar automaticamente uma mensagem template via WhatsApp para clientes que possuem créditos (sessões) na assinatura e estão próximos da data de vencimento.

### Contexto

- Usa `SendTemplateMessageAsync` do `IWhatsappService`.
- `ClientMembership.EndDate` define o vencimento; `RemainingSessions` define os créditos restantes.
- Threshold sugerido: avisar quando `EndDate <= hoje + 7 dias` e `RemainingSessions > 0`.

### Backend — Alterações necessárias

- [ ] Criar um `BackgroundService` ou `IHostedService` (ex: `MembershipExpirationNotificationJob`) que roda diariamente (ex: às 9h).
- [ ] Lógica do job:
  1. Buscar todas `ClientMembership` onde: `Status == Active`, `RemainingSessions > 0`, `EndDate` entre hoje e hoje+7 dias, e que ainda não receberam aviso nos últimos 7 dias (adicionar flag `LastExpirationNoticeSentAt`).
  2. Para cada membership, buscar o `Client.Phone` e o `Tenant.WhatsappPhoneNumberId`.
  3. Chamar `SendTemplateMessageAsync` com template de aviso (ex: `membership_expiring_soon`) passando nome do cliente, créditos restantes e data de vencimento.
  4. Atualizar `LastExpirationNoticeSentAt = now`.
- [ ] Adicionar campo `LastExpirationNoticeSentAt` (DateTimeOffset?, nullable) na entidade `ClientMembership` (migration necessária).
- [ ] Criar template `membership_expiring_soon` no Meta Business Manager com os parâmetros: `{{1}}` nome do cliente, `{{2}}` sessões restantes, `{{3}}` data de vencimento.
- [ ] Registrar o job em `Program.cs` / `DI`.

### Frontend — Nenhuma alteração necessária

O envio é totalmente automático. Opcionalmente, futuramente pode-se adicionar um log de notificações enviadas na tela do cliente.

---

## Ordem de Implementação Sugerida

```
TASK 3  →  TASK 1  →  TASK 2  →  TASK 4
```

1. **TASK 3** primeiro — base de dados de membership no agendamento.
2. **TASK 1** — Kanban visual que já reflete os agendamentos com membership.
3. **TASK 2** — Templates manuais (menor dependência, pode paralelizar com TASK 1).
4. **TASK 4** — Automação de notificação (depende de TASK 3 estar estável).

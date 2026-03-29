# Tasks — Voro Salon CRM

> Branch atual de trabalho: `feature/whatsapp-messages-kanban`

---

## ✅ TASK 1 — Kanban de Mensagens WhatsApp

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

- [x] Criada entidade `WhatsAppConversation` separada com `State`, `LastMessageBody`, `AppointmentId`.
- [x] Estado da sessão persistido no banco pelo `WhatsappChatService` via `PersistConversationStateAsync` (mantém cache como primário).
- [x] Criar endpoint `GET /api/whatsapp/conversations` que retorna contatos com estado atual, última mensagem e AppointmentId.

### Frontend — Alterações necessárias

- [x] Criar página `/whatsapp` com layout Kanban (7 colunas, scroll horizontal).
- [x] Cada card exibe: número/nome do contato, prévia da última mensagem, horário relativo.
- [x] Cards na coluna "Agendado" exibem badge de cliente verde.
- [x] Polling automático a cada 30s para atualização em tempo real.

---

## ✅ TASK 2 — Envio Manual de Mensagens Template pelo Proprietário

**Objetivo:** Permitir que o proprietário selecione clientes e envie mensagens template do WhatsApp manualmente, na hora que desejar, diretamente pela interface.

### Contexto

O método `SendTemplateMessageAsync(WhatsappTemplateMessageDto message, string? phoneIdOverride)` já existe em `IWhatsappService`. Os DTOs `WhatsappTemplateMessageDto`, `WhatsappTemplateDto` e `WhatsappComponentDto` já estão definidos.

### Backend — Alterações necessárias

- [x] Criar endpoint `POST /api/whatsapp/send-template` (autenticado) que recebe:
  - `clientIds: Guid[]` — lista de clientes destinatários
  - `templateName: string` — nome do template aprovado no Meta
  - `language: string` — código de idioma (padrão `pt_BR`)
  - `components?: WhatsappComponentDto[]` — parâmetros variáveis do template
- [x] Buscar o telefone de cada cliente no banco e chamar `SendTemplateMessageAsync` para cada um.
- [x] Retornar relatório com sucesso/falha por cliente.
- [x] Criar endpoint `GET /api/whatsapp/templates` que lista os templates disponíveis.

### Frontend — Alterações necessárias

- [x] Adicionar botão "Enviar Mensagem Template" na tela de WhatsApp (ou na tela de Clientes).
- [x] Modal/drawer com:
  - Seleção de template (dropdown com templates disponíveis)
  - Seleção de clientes destinatários (multi-select com busca)
  - Campos dinâmicos para preencher variáveis do template (`{{1}}`, `{{2}}`...)
  - Botão de enviar com confirmação
- [x] Exibir feedback por destinatário (enviado / falhou).

---

## ✅ TASK 3 — Validar Uso da Assinatura (Membership) no Agendamento

**Objetivo:** Verificar se o cliente possui uma `ClientMembership` ativa no momento do agendamento e, se sim, consumir uma sessão automaticamente.

### Contexto

- Entidade `ClientMembership`: `PlanId`, `StartDate`, `EndDate`, `RemainingSessions` (null = ilimitado), `Status`.
- O fluxo de criação de agendamento está em `IPublicBookingService.CreateBookingAsync` e no `WhatsappChatService.HandleConfirmationAsync`.

### Backend — Alterações necessárias

- [x] Em `AppointmentService.UpdateStatusAsync` → `DecrementMembershipSessionAsync(appointment)`: busca membership ativa com menor `EndDate`, decrementa `RemainingSessions`, vincula `ClientMembershipId` ao agendamento. Agendamento não é bloqueado se a assinatura estiver esgotada.
- [x] Adicionar campo `ClientMembershipId` (nullable) na entidade `Appointment` (migration criada).
- [x] Retornar no response do agendamento se uma assinatura foi utilizada.

### Frontend — Alterações necessárias

- [x] Na tela de agendamento (admin), exibir badge "Usa assinatura" se o cliente tiver membership ativa.
- [x] Exibir quantas sessões restam após o agendamento.
- [x] No detalhe do agendamento, mostrar qual plano de assinatura foi utilizado.

---

## ✅ TASK 4 — Envio Automático de Aviso de Créditos Próximos do Vencimento

**Objetivo:** Enviar automaticamente uma mensagem template via WhatsApp para clientes que possuem créditos (sessões) na assinatura e estão próximos da data de vencimento.

### Contexto

- Usa `SendTemplateMessageAsync` do `IWhatsappService`.
- `ClientMembership.EndDate` define o vencimento; `RemainingSessions` define os créditos restantes.
- Threshold sugerido: avisar quando `EndDate <= hoje + 7 dias` e `RemainingSessions > 0`.

### Backend — Alterações necessárias

- [x] Criar `MembershipExpirationNotificationJob` (`BackgroundService`) que roda a cada 24h.
- [x] Lógica do job:
  1. Busca `ClientMembership` ativas, com `EndDate` entre hoje e hoje+7 dias, `RemainingSessions > 0`, sem aviso nos últimos 7 dias.
  2. Para cada membership, usa `Client.Phone` e `Tenant.WhatsappPhoneNumberId`.
  3. Chama `SendTemplateMessageAsync` com template `membership_expiring_soon` (`{{1}}` nome, `{{2}}` sessões, `{{3}}` data).
  4. Atualiza `LastExpirationNoticeSentAt = now`.
- [x] Adicionado campo `LastExpirationNoticeSentAt` (DateTimeOffset?, nullable) em `ClientMembership` + migration.
- [ ] Criar template `membership_expiring_soon` no Meta Business Manager (ação manual).
- [x] Job registrado em `AddAppServicesExtension`.

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

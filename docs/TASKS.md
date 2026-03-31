## 1. Vínculo de Agendamento com Google Calendar / Apple Calendar

**Objetivo:** Ao confirmar um agendamento, criar automaticamente um evento no Google Calendar ou Apple Calendar do cliente/salão.

### Backend
- [ ] Integração com Google Calendar API (OAuth 2.0 para o tenant)
  - [ ] Endpoint de autorização OAuth (`/api/integrations/google-calendar/auth`)
  - [ ] Salvar tokens de acesso por tenant (`GoogleCalendarToken` na entidade de settings)
  - [ ] Criar evento ao confirmar agendamento
  - [ ] Atualizar evento ao reagendar
  - [ ] Deletar evento ao cancelar
- [ ] Geração de arquivo `.ics` (iCalendar) para Apple Calendar
  - [ ] Endpoint `GET /api/appointments/{id}/ical` retorna arquivo `.ics`
  - [ ] Enviar link de download por WhatsApp/notificação ao confirmar agendamento

### Frontend
- [ ] Página de configurações `/settings/integrations` com botão "Conectar Google Calendar"
- [ ] Exibir status da conexão (conectado / desconectado)
- [ ] Na confirmação do agendamento, exibir botão "Adicionar ao Google Calendar" e "Adicionar ao Apple Calendar"

---

## 2. WhatsApp — Lembretes de Agendamento

**Objetivo:** Enviar lembretes automáticos via WhatsApp para os clientes antes do agendamento.

### Backend
- [ ] Adicionar campo `ReminderTime` (int, minutos) na entidade `Appointment`
- [ ] No fluxo de confirmação do agendamento (WhatsApp), perguntar ao cliente:
  - "Quando deseja receber o lembrete?"
  - Opções: 15min, 30min, 1h, 2h, 4h, 8h, 24h, 48h, 72h, ou "Não"
- [ ] Salvar o valor no campo `ReminderTime`
- [ ] Criar scheduler (cron job) para verificar agendamentos próximos
- [ ] Enviar mensagem de lembrete no horário configurado
- [ ] Enviar mensagem de lembrete no WhatsApp (usando o template existente)
- [ ] Evitar envio duplicado (marcar agendamento como "lembrete enviado")

### Frontend
- [ ] Na confirmação do agendamento via WhatsApp, exibir as opções de lembrete
- [ ] Exibir o lembrete selecionado no resumo final
- [ ] Na tela de conversa WhatsApp, indicar quando o lembrete será enviado

---

## 3. WhatsApp — Cancelamento pelo Cliente

**Objetivo:** Permitir que o cliente cancele o agendamento diretamente pelo WhatsApp.

### Backend
- [ ] No fluxo WhatsApp, após confirmação do agendamento, oferecer opção de cancelamento
- [ ] Novo estado de conversa: `AWAITING_CANCEL_CONFIRMATION`
- [ ] Enviar mensagem de confirmação:
  - "Seu agendamento está confirmado para [data] às [hora]."
  - "Deseja cancelar este agendamento?"
  - Opções: "1 - Sim, cancelar", "2 - Não, manter"
- [ ] Se o cliente confirmar:
  - Atualizar status do agendamento para `Cancelled`
  - Enviar mensagem de confirmação do cancelamento
- [ ] Se o cliente cancelar, enviar notificação ao salão

### Frontend
- [ ] Na tela de conversa WhatsApp, indicar quando o cliente pode cancelar o agendamento
- [ ] Exibir status de cancelamento na conversa

---

## 4. WhatsApp — Reagendamento pelo Cliente

**Objetivo:** Permitir que o cliente reagende o agendamento diretamente pelo WhatsApp.

### Backend
- [ ] No fluxo WhatsApp, após confirmação do agendamento, oferecer opção de reagendamento
- [ ] Novo estado de conversa: `AWAITING_RESCHEDULE_CONFIRMATION`
- [ ] Enviar mensagem de confirmação:
  - "Seu agendamento está confirmado para [data] às [hora]."
  - "Deseja reagendar este agendamento?"
  - Opções: "1 - Sim, reagendar", "2 - Não, manter"
- [ ] Se o cliente confirmar:
  - Iniciar novo fluxo de agendamento (mesmo fluxo de criação)
  - Atualizar o agendamento existente com a nova data/hora
  - Enviar mensagem de confirmação do reagendamento
- [ ] Se o cliente cancelar, enviar notificação ao salão

### Frontend
- [ ] Na tela de conversa WhatsApp, indicar quando o cliente pode reagendar o agendamento
- [ ] Exibir status de reagendamento na conversa

---

## 5. WhatsApp — Detecção de Agendamento Existente

**Objetivo:** Quando um cliente envia mensagem pelo WhatsApp e já possui um agendamento `Pending` ou `Confirmed`, oferecer as opções de cancelar ou reagendar antes de seguir o fluxo normal.

### Backend
- [ ] No início do fluxo WhatsApp, verificar se o cliente (pelo número de telefone) possui agendamento `Pending` ou `Confirmed`
- [ ] Novo estado de conversa: `AWAITING_APPOINTMENT_ACTION`
- [ ] Enviar mensagem com opções numeradas:
  - "1 - Cancelar agendamento"
  - "2 - Reagendar agendamento"
  - "3 - Continuar sem alterar"
- [ ] Fluxo de cancelamento: confirmar e atualizar status para `Cancelled`
- [ ] Fluxo de reagendamento: inicia novo fluxo de agendamento
- [ ] Exibir resumo do agendamento atual (serviço, data, horário) na mensagem de detecção

### Frontend
- [ ] Na tela de conversa WhatsApp (`/whatsapp`), indicar visualmente quando a conversa está no estado `AWAITING_APPOINTMENT_ACTION`

---

## 6. WhatsApp — Adicionar Descrição ao Agendamento

**Objetivo:** Durante o fluxo de agendamento via WhatsApp, permitir que o cliente adicione uma descrição/observação (ex: "quero corte mais curto nas laterais").

### Backend
- [ ] Adicionar novo estado ao fluxo: `AWAITING_DESCRIPTION` (após seleção do horário, antes de confirmar)
- [ ] Mensagem: "Tem alguma observação para o profissional? Responda ou digite 'não' para pular."
- [ ] Salvar a descrição no campo `Notes` do `Appointment` (campo já existia)
- [ ] Incluir a descrição no resumo final enviado ao cliente
- [ ] Campo `Notes` adicionado ao `PublicBookingCreateDto` e mapeado em `PublicBookingService`

---

## 7. Placeholders Dinâmicos por Tipo de Estabelecimento

**Objetivo:** Substituir os exemplos genéricos (ex: "corte de cabelo, corte de barba, unha") por exemplos condizentes com o tipo do estabelecimento.

### Mapeamento de placeholders por tipo

| Tipo                | Exemplos de Serviço                          |
|---------------------|----------------------------------------------|
| Salão de Beleza     | corte feminino, coloração, escova progressiva |
| Barbearia           | corte masculino, barba, pigmentação           |
| Pet Shop            | banho, tosa, corte de unhas                  |
| Nails Design        | manicure, pedicure, alongamento de unhas     |
| Estética Feminina   | limpeza de pele, depilação, massagem         |

### Frontend
- [ ] Criar utilitário `getServicePlaceholders(establishmentType)` em `lib/branding.ts`
- [ ] Aplicar em `app/services/new/page.tsx`
- [ ] Aplicar em `app/services/[id]/page.tsx`
- [ ] Aplicar em `app/appointments/new/page.tsx`
- [ ] Aplicar em `app/appointments/[id]/page.tsx`
- [ ] Aplicar em `app/clients/[id]/page.tsx`
- [ ] Aplicar em `app/booking/[slug]/page.tsx`

---

## Prioridade Sugerida

| # | Task | Esforço | Impacto | Status |
|---|------|---------|---------|--------|
| 1 | Placeholders dinâmicos | Baixo | Médio | ✅ Concluído |
| 2 | Novos tipos de estabelecimento | Baixo | Alto | ✅ Concluído |
| 3 | WhatsApp — Descrição no agendamento | Médio | Alto | ✅ Concluído |
| 4 | WhatsApp — Detectar agendamento existente | Médio | Alto | ✅ Concluído |
| 5 | Importação de extrato PDF | Alto | Alto | ✅ Concluído |
| 6 | Google / Apple Calendar | Alto | Médio | 🔲 Pendente |
| 7 | WhatsApp — Lembretes de agendamento | Alto | Alto | 🔲 Pendente |
| 8 | WhatsApp — Cancelamento pelo cliente | Médio | Alto | 🔲 Pendente |
| 9 | WhatsApp — Reagendamento pelo cliente | Médio | Alto | 🔲 Pendente |

adicionar a pergunta de quanto tempo para ser enviado o lembrete (30 min antes igual é feito no booking public) so que no whatsapp

adicionar retorno na tela de gerenciar templates web

o agendamento public booking pode ter uma versão de chat mesmo que a digitação é livre (adicionar modulo 8 para funcionar somente com esse modulo)

deve implementar o envio automatico via whatsapp bot ou o botão para enviar manual o lembrete quando estiver perto de avisar

testar isso (tenant.UseWhatsappBooking // modulo 9 (chatbot e lembretes automatico))
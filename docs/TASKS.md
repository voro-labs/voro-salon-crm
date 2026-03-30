# Tasks - Voro Salon CRM

## 1. Financeiro — Importação de Extrato Bancário (PDF)

**Objetivo:** Permitir que o usuário faça upload de um extrato bancário em PDF, processe tudo no navegador (client-side) e envie apenas os dados estruturados para a API salvar.

### Frontend
- [ ] Componente de upload de PDF na página `/finance`
- [ ] Processar o PDF no navegador usando biblioteca como `pdf.js` ou `pdfjs-dist` (sem enviar o arquivo para o servidor)
- [ ] Parser de extrato: extrair linhas de transação (data, descrição, valor, débito/crédito)
- [ ] Suporte inicial aos formatos mais comuns (ex: Itaú, Bradesco, Nubank, Inter)
- [ ] Tela de revisão: exibir as transações extraídas antes de confirmar
- [ ] Sugestão automática de categoria com base na descrição (ex: "IFOOD" → Alimentação)
- [ ] Permitir editar categoria, tipo e descrição antes de salvar
- [ ] Enviar apenas o array de transações processadas para a API (não enviar o PDF)

### Backend
- [ ] Endpoint `POST /api/finance/transactions/batch` para receber e salvar múltiplas transações de uma vez
- [ ] Validação e deduplicação básica (evitar duplicatas por data + valor + descrição)

---

## 2. Novos Tipos de Estabelecimento ✅

**Objetivo:** Adicionar suporte a _Nails Design_ e _Estética Feminina_ como tipos de estabelecimento.

### Backend
- [x] Adicionar `NailsDesign = 3` e `FemaleEsthetics = 4` ao enum `EstablishmentType`
- [x] Criar migration `AddEstablishmentTypeTenant` para atualizar o banco
- [x] Seed/defaults não requerido (sem tabela de serviços por tipo)

### Frontend
- [x] Adicionar as opções no seletor de tipo de estabelecimento (settings)
- [x] Exibir label amigável: "Nails Design" e "Estética Feminina"
- [x] Tipos mapeados em `lib/branding.ts`

---

## 3. Vínculo de Agendamento com Google Calendar / Apple Calendar

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

## 4. WhatsApp — Detectar Agendamento Pendente ao Entrar em Contato ✅

**Objetivo:** Quando um cliente envia mensagem pelo WhatsApp e já possui um agendamento `Pending` ou `Confirmed`, oferecer as opções de cancelar ou reagendar antes de seguir o fluxo normal.

### Backend
- [x] No início do fluxo WhatsApp, verificar se o cliente (pelo número de telefone) possui agendamento `Pending` ou `Confirmed`
- [x] Novo estado de conversa: `AWAITING_APPOINTMENT_ACTION`
- [x] Enviar mensagem com opções numeradas:
  - "1 - Cancelar agendamento"
  - "2 - Reagendar agendamento"
  - "3 - Continuar sem alterar"
- [x] Fluxo de cancelamento: confirmar e atualizar status para `Cancelled`
- [x] Fluxo de reagendamento: inicia novo fluxo de agendamento
- [x] Exibir resumo do agendamento atual (serviço, data, horário) na mensagem de detecção

### Frontend
- [ ] Na tela de conversa WhatsApp (`/whatsapp`), indicar visualmente quando a conversa está no estado `AWAITING_APPOINTMENT_ACTION`

---

## 5. WhatsApp — Adicionar Descrição ao Agendamento ✅

**Objetivo:** Durante o fluxo de agendamento via WhatsApp, permitir que o cliente adicione uma descrição/observação (ex: "quero corte mais curto nas laterais").

### Backend
- [x] Adicionar novo estado ao fluxo: `AWAITING_DESCRIPTION` (após seleção do horário, antes de confirmar)
- [x] Mensagem: "Tem alguma observação para o profissional? Responda ou digite 'não' para pular."
- [x] Salvar a descrição no campo `Notes` do `Appointment` (campo já existia)
- [x] Incluir a descrição no resumo final enviado ao cliente
- [x] Campo `Notes` adicionado ao `PublicBookingCreateDto` e mapeado em `PublicBookingService`

---

## 6. Placeholders Dinâmicos por Tipo de Estabelecimento ✅

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
- [x] Criar utilitário `getServicePlaceholders(establishmentType)` em `lib/branding.ts`
- [x] Aplicar em `app/services/new/page.tsx`
- [x] Aplicar em `app/services/[id]/page.tsx`
- [x] Aplicar em `app/appointments/new/page.tsx`
- [x] Aplicar em `app/appointments/[id]/page.tsx`
- [x] Aplicar em `app/clients/[id]/page.tsx`
- [x] Aplicar em `app/booking/[slug]/page.tsx`

---

## Prioridade Sugerida

| # | Task | Esforço | Impacto | Status |
|---|------|---------|---------|--------|
| 1 | Placeholders dinâmicos | Baixo | Médio | ✅ Concluído |
| 2 | Novos tipos de estabelecimento | Baixo | Alto | ✅ Concluído |
| 3 | WhatsApp — Descrição no agendamento | Médio | Alto | ✅ Concluído |
| 4 | WhatsApp — Detectar agendamento existente | Médio | Alto | ✅ Concluído |
| 5 | Importação de extrato PDF | Alto | Alto | 🔲 Pendente |
| 6 | Google / Apple Calendar | Alto | Médio | 🔲 Pendente |

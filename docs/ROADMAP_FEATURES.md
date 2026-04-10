# Roadmap de Funcionalidades

---

## 📱 Mobile

### [BUG] Autofill de credenciais não funciona com fluxo de 2FA

**Problema:**
A tela de sign-in redireciona para uma tela separada de 2FA após a submissão do e-mail e senha. Por isso, o iOS Keychain e o Android Autofill não oferecem a sugestão de salvar as credenciais — eles só disparam esse comportamento quando o fluxo de autenticação é concluído na **mesma tela** onde as credenciais foram inseridas.

**Causa raiz:**
Os heurísticos do sistema operacional esperam:
1. Campo de e-mail + senha na mesma tela
2. Submissão do formulário
3. Sucesso final da autenticação **sem navegação intermediária**

Qualquer navegação entre telas (2FA, captcha, etc.) aborta o salvamento das credenciais.

**Solução proposta:**
Unificar o formulário de login e o código 2FA em uma única tela, exibindo o campo de 2FA de forma condicional (animada) após a validação de e-mail e senha — sem redirecionar para outra rota. Isso permite que o autofill detecte o fluxo completo de autenticação e salve as credenciais normalmente.

**Critérios de aceite:**
- [ ] Usuário vê apenas um campo de 2FA aparecer na mesma tela após submeter e-mail e senha válidos
- [ ] iOS Keychain oferece salvar credenciais após login bem-sucedido
- [ ] Android Autofill oferece salvar credenciais após login bem-sucedido
- [ ] Fluxo continua funcionando para usuários sem 2FA habilitado

---

## 🌐 Web — Resolvidos

### ~~[BUG] Data do Service Record gerada com a data atual em vez da data do agendamento~~ ✅ RESOLVIDO
**Fix:** `AppointmentService.CreateHistoryFromAppointmentAsync` — substituído `DateTimeOffset.UtcNow` por `appointment.ScheduledDateTime`.

### ~~[BUG] Geração automática de receita duplicando registros~~ ✅ RESOLVIDO
**Fix:** Adicionada verificação via `ExistsByAppointmentIdAsync` antes de criar service record. Comissão também verifica existência antes de gerar nova transação.

### ~~[BUG] Notifications/WhatsApp não são deletadas em cascata com o cliente~~ ✅ RESOLVIDO
**Fix:** `ClientService.DeleteAsync` — injetado `IWhatsAppMessageService` e chamado `DeleteByPhoneAsync`. Remove `WhatsAppMessages` e `WhatsAppConversations` pelo telefone do cliente.

### ~~[BUG] Rota de solicitação de avaliação retornando 500~~ ✅ RESOLVIDO
**Fix:** Criado `POST /api/v1/ClientRating/send-request/{appointmentId}`. Frontend (`appointments/[id]/page.tsx`) já chama a rota correta.

### ~~[BUG] Erro ao atualizar horário de funcionamento existente~~ ✅ RESOLVIDO
**Fix:** Adicionado `DeleteRangesByBusinessHoursIdAsync` que remove ranges antigos explicitamente antes de `Ranges.Clear()`.

### ~~[BUG/FEATURE] Padronizar descrição e categoria na geração automática de receita~~ ✅ RESOLVIDO
**Fix:** `AppointmentService.CreateHistoryFromAppointmentAsync` — gera transação com descrição `{Serviço} - {Cliente}` e categoria `Serviços` (criada automaticamente se não existir).

### ~~[FEATURE] Fallback para envio manual de WhatsApp quando bot não está configurado~~ ✅ RESOLVIDO
**Fix:** `appointments/[id]/page.tsx` — card "Notificar via WhatsApp" aparece na sidebar quando `!tenant.useWhatsappBooking`. Abre `wa.me` com mensagem pré-preenchida adequada ao status atual.

### ~~[FEATURE] Kanban do WhatsApp exibe agendamentos públicos com badge de origem~~ ✅ RESOLVIDO
**Fix:** Novo endpoint `GET /api/Whatsapp/kanban-appointments` + `whatsapp/page.tsx` exibe agendamentos de App/Site/Bot na coluna Agendado com badge colorido por origem, sem duplicar conversas do bot.

### ~~[FEATURE] Visualização de agenda interna no estilo Google Calendar~~ ✅ RESOLVIDO
**Fix:** `appointments/page.tsx` — toggle Lista/Calendário, grade semanal 7 dias × 8h–20h, blocos coloridos por status, navegação por semana, clique em slot vazio cria agendamento pré-preenchido, clique em card navega para detalhe.

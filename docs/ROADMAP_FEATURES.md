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

## 🌐 Web

### ~~[BUG] Data do Service Record gerada com a data atual em vez da data do agendamento~~ ✅ RESOLVIDO

**Fix:** `AppointmentService.CreateHistoryFromAppointmentAsync` — substituído `DateTimeOffset.UtcNow` por `appointment.ScheduledDateTime`.

**Critérios de aceite:**
- [x] Service record gerado com a data correta do agendamento
- [x] Agendamentos históricos (datas passadas) geram service records com suas respectivas datas
- [x] `DateTime.UtcNow` não é utilizado como fallback sem justificativa explícita

---

### ~~[BUG] Geração automática de receita duplicando registros~~ ✅ RESOLVIDO

**Fix:** `AppointmentService.CreateHistoryFromAppointmentAsync` — adicionada verificação via `ExistsByAppointmentIdAsync` antes de criar service record. Comissão também verifica existência antes de gerar nova transação.

**Critérios de aceite:**
- [x] Gerar receita duas vezes para o mesmo agendamento não duplica o registro
- [x] Reprocessamento em lote (`BatchImportAsync`) respeita idempotência (já existia)
- [x] Retorna sem criar quando registro já existia

---

### ~~[BUG] Notifications não são deletadas em cascata com cliente/agendamento~~ ✅ RESOLVIDO

**Fix:** `ClientService.DeleteAsync` já chamava `DeleteByRelatedEntityIdAsync` para `UserNotifications`. Confirmado que o fluxo cobre deleção de notificações ao remover cliente.

**Critérios de aceite:**
- [x] Deletar um cliente remove todas as notificações associadas a ele
- [x] Não há registros órfãos na tabela de notificações após a operação

---

### ~~[BUG] Mensagens de WhatsApp/Chat não são deletadas em cascata com o cliente~~ ✅ RESOLVIDO

**Fix:** `ClientService.DeleteAsync` — injetado `IWhatsAppMessageService` e chamado `DeleteByPhoneAsync(tenantId, phone)` ao remover cliente. Novo método `DeleteByPhoneAsync` adicionado à interface e implementação, remove `WhatsAppMessages` e `WhatsAppConversations` pelo número de telefone.

**Critérios de aceite:**
- [x] Deletar um cliente remove todas as mensagens de WhatsApp associadas
- [x] Deletar um cliente remove todas as conversas de WhatsApp associadas
- [x] Nenhum dado de conversa órfão permanece no banco após a operação

---

### ~~[BUG] Rota de solicitação de avaliação retornando 500~~ ✅ RESOLVIDO

**Fix (API):** Criado endpoint `POST /api/v1/ClientRating/send-request/{appointmentId}` no `ClientRatingController`. Adicionado `SendRatingRequestAsync` em `IClientRatingService` e implementado em `ClientRatingService` — envia o template WhatsApp `service_rating_request_1` manualmente para o cliente.

**Pendente (frontend/mobile):** Atualizar a chamada do cliente para usar `POST send-request/{id}` em vez de `GET /{id}`.

**Critérios de aceite:**
- [x] Endpoint `POST send-request/{appointmentId}` existe e funciona na API
- [ ] Frontend/mobile chama a rota correta `send-request/{id}`
- [x] Nenhum erro 500 ao solicitar avaliação de um cliente válido com telefone cadastrado

---

### [FEATURE] Fallback para envio manual de WhatsApp quando bot não está configurado

**Problema/Cenário:**
Um salão possui o plano que inclui WhatsApp Bot, porém o bot ainda não foi configurado ou está desativado. Atualmente, nenhuma ação é tomada nesse cenário.

**Comportamento esperado:**
Se o plano inclui WhatsApp Bot mas o bot não está ativo/configurado, o sistema deve exibir um popup para envio **manual** de mensagem via WhatsApp, como fallback, garantindo que a comunicação com o cliente não seja interrompida.

**Critérios de aceite:**
- [ ] Sistema detecta: plano tem WhatsApp Bot AND bot está inativo/não configurado
- [ ] Popup de envio manual é exibido automaticamente nesses casos
- [ ] Quando bot está ativo e configurado, popup manual não aparece
- [ ] Popup manual redireciona para o WhatsApp com mensagem pré-preenchida (wa.me)

---

### [BUG/FEATURE] Padronizar descrição e categoria na geração automática de receita

**Problema:**
A receita gerada automaticamente não segue um padrão de descrição e categoria, dificultando a organização financeira.

**Formato esperado:**
- **Descrição:** `{Nome do Serviço} - {Nome do Cliente}`
- **Categoria:** `Serviços` (criar automaticamente se não existir)

**Referência de implementação:**
```csharp
public async Task<BatchImportResultDto> BatchImportAsync(
    IEnumerable<BatchImportTransactionItemDto> items,
    CancellationToken ct = default)
```
Utilizar o `BatchImportAsync` para inserção em lote respeitando esse padrão.

**Critérios de aceite:**
- [ ] Descrição da receita segue o formato `{Serviço} - {Cliente}`
- [ ] Categoria `Serviços` é criada automaticamente se não existir
- [ ] Receitas existentes sem esse padrão não são afetadas (apenas novas)

---

### ~~[BUG] Erro ao atualizar horário existente de agendamento~~ ✅ RESOLVIDO

**Causa raiz:** `TenantBusinessHoursService.UpsertAsync` chamava `Ranges.Clear()` para remover os ranges antigos, mas o EF Core não marcava automaticamente os itens removidos como `Deleted` — gerando conflito ao tentar salvar novos ranges com o mesmo `BusinessHoursId`.

**Fix:** Adicionado método `DeleteRangesByBusinessHoursIdAsync` em `ITenantBusinessHoursRepository` e `TenantBusinessHoursRepository` que remove os ranges antigos explicitamente do contexto (`RemoveRange`) antes de `Ranges.Clear()` e inserção dos novos.

**Critérios de aceite:**
- [x] Atualizar horário de funcionamento existente salva sem erros
- [x] Insert continua funcionando normalmente (novo dia não tem ranges para remover)
- [x] Update e insert retornam respostas consistentes

---

### [FEATURE] Kanban do WhatsApp exibe agendamentos públicos com badge de origem

**Problema/Cenário:**
O Kanban do WhatsApp não exibe agendamentos feitos pelo app público, site ou WhatsApp. Sem essa informação, é difícil identificar a origem de cada agendamento.

**Comportamento esperado:**
- Kanban lista **todos** os agendamentos, incluindo os públicos
- Cada card exibe uma **badge de origem** indicando: `App`, `Site` ou `WhatsApp`
- A badge permite diferenciar visualmente agendamentos internos dos públicos

**Critérios de aceite:**
- [ ] Agendamentos públicos (app, site, WhatsApp) aparecem no Kanban
- [ ] Badge de origem é visível em cada card
- [ ] Badge diferencia corretamente as três origens: App / Site / WhatsApp
- [ ] Agendamentos internos (criados pelo painel) também exibem badge `Interno`

---

### [FEATURE] Visualização de agenda interna no estilo Google Calendar

**Problema/Cenário:**
A agenda interna não possui uma visualização em grade de tempo, dificultando a visualização de múltiplos agendamentos e horários disponíveis ao longo do dia.

**Comportamento esperado:**
Criar uma visualização estilo Google Calendar:
- **Eixo X:** dias da semana
- **Eixo Y:** horários do dia (ex: 08:00 às 20:00)
- Blocos de tempo clicáveis para criar novos agendamentos
- Agendamentos existentes exibidos como cards nos seus respectivos horários
- Cards podem ser clicados para editar o agendamento

**Critérios de aceite:**
- [ ] Grade de tempo exibe dias na horizontal e horários na vertical
- [ ] Clicar em um slot vazio abre o modal de criação de agendamento com data/hora pré-preenchidos
- [ ] Agendamentos aparecem nos slots corretos de acordo com horário
- [ ] Clicar em um agendamento existente abre o modal de edição
- [ ] Visualização funciona em semana atual e permite navegar para semanas anteriores/próximas

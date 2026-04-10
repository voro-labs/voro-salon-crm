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

### [BUG] Data do Service Record gerada com a data atual em vez da data do agendamento

**Problema:**
Ao alterar o status de um agendamento de "Pendente" para "Concluído", o sistema gera automaticamente um service record com a **data de hoje**, e não com a data em que o serviço foi realizado (data do agendamento).

**Solução proposta:**
Ao criar o service record automaticamente, buscar a data do agendamento associado e utilizá-la como data do registro, não `DateTime.UtcNow` ou equivalente.

**Critérios de aceite:**
- [ ] Service record gerado com a data correta do agendamento
- [ ] Agendamentos históricos (datas passadas) geram service records com suas respectivas datas
- [ ] `DateTime.UtcNow` não é utilizado como fallback sem justificativa explícita

---

### [BUG] Geração automática de receita duplicando registros

**Problema:**
Ao gerar receita automaticamente, o sistema não verifica se já existe uma entrada cadastrada para aquele serviço/agendamento, causando duplicação de registros financeiros.

**Solução proposta:**
Antes de inserir, verificar se já existe uma transação vinculada ao `AppointmentId` (ou chave equivalente). Se existir, ignorar ou atualizar em vez de criar um novo registro.

**Critérios de aceite:**
- [ ] Gerar receita duas vezes para o mesmo agendamento não duplica o registro
- [ ] Reprocessamento em lote (`BatchImportAsync`) respeita idempotência
- [ ] Log ou retorno indica quando um registro já existia e foi ignorado

---

### [BUG] Notifications não são deletadas em cascata com cliente/agendamento

**Problema:**
Ao deletar um cliente ou agendamento, as notificações associadas permanecem no banco, causando registros órfãos.

**Solução proposta:**
Adicionar deleção em cascata (ou soft-delete coordenado) para `Notifications` ao remover `Client` e `Appointment`.

**Critérios de aceite:**
- [ ] Deletar um cliente remove todas as notificações associadas a ele
- [ ] Deletar um agendamento remove as notificações vinculadas a esse agendamento
- [ ] Não há registros órfãos na tabela de notificações após a operação

---

### [BUG] Mensagens de WhatsApp/Chat não são deletadas em cascata com o cliente

**Problema:**
Ao deletar um cliente, as mensagens de WhatsApp e registros de chat permanecem no banco.

**Solução proposta:**
Implementar deleção em cascata para `WhatsAppMessages` e `ChatMessages` ao remover um `Client`.

**Critérios de aceite:**
- [ ] Deletar um cliente remove todas as mensagens de WhatsApp associadas
- [ ] Deletar um cliente remove todos os registros de chat associados
- [ ] Nenhum dado de conversa órfão permanece no banco após a operação

---

### [BUG] Rota de solicitação de avaliação retornando 500

**Problema:**
A rota de solicitação de avaliação está incorreta. A chamada está sendo feita diretamente para:

```
GET /api/v1/ClientRating/{id}
```

Mas a rota correta para enviar a solicitação de avaliação é:

```
POST /api/v1/ClientRating/send-request/{id}
```

Resultado atual: `{ "status": 500, "message": "Avaliação não encontrada." }`

**Solução proposta:**
Corrigir a rota no cliente (mobile/web) para utilizar `send-request/{id}` ao solicitar avaliação. Verificar também se há outros lugares onde a rota está sendo chamada incorretamente.

**Critérios de aceite:**
- [ ] Solicitação de avaliação usa a rota correta `send-request/{id}`
- [ ] Nenhum erro 500 ao solicitar avaliação de um cliente válido
- [ ] Resposta de sucesso retorna status 200 com dados da solicitação

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

### [BUG] Erro ao atualizar horário existente de agendamento

**Problema:**
Ao tentar **atualizar** um horário já existente em um agendamento, ocorre um erro. A operação de **inserção** (novo agendamento) funciona corretamente. O problema parece estar isolado na lógica de update de registros existentes.

**Investigação sugerida:**
- Verificar se o `Id` do agendamento está sendo enviado corretamente no payload do update
- Checar se o EF Core está rastreando o entity corretamente (possível `DetachedState`)
- Verificar se há validação de conflito de horário que falha em updates

**Critérios de aceite:**
- [ ] Atualizar horário de agendamento existente salva sem erros
- [ ] Conflitos de horário continuam sendo detectados corretamente
- [ ] Insert e update retornam respostas consistentes

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

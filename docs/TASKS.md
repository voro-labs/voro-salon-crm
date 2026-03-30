# Tarefas

## [BUG] WhatsApp Bot — Seleção de funcionário ausente

**Descrição:** Durante o fluxo de agendamento via WhatsApp, o cliente não vê a opção de escolher o funcionário/profissional desejado.

**Critérios de aceite:**
- O bot deve listar os funcionários disponíveis para o serviço selecionado
- O cliente deve poder escolher um funcionário específico ou "qualquer um disponível"
- Após a escolha, o fluxo continua normalmente para seleção de data/horário

---

## [BUG] WhatsApp Bot — Horários exibidos incorretamente

**Descrição:** Os horários disponíveis exibidos no bot do WhatsApp são diferentes dos exibidos no front-end. O bot mostra a partir das 11h até 16h, enquanto o front-end exibe a grade correta de horários.

**Critérios de aceite:**
- Os horários exibidos no bot devem ser idênticos aos exibidos no front-end
- Deve respeitar a configuração de horários de funcionamento cadastrada (ver tarefa de Configurações de Horários)
- Deve respeitar os horários de cada funcionário

---

## [FEATURE] Notificar clientes ao bloquear dia/horário com agendamentos existentes

**Descrição:** Quando o proprietário bloqueia um dia ou horário que já possui agendamentos confirmados, os clientes afetados devem ser notificados via WhatsApp com o motivo do bloqueio.

**Critérios de aceite:**
- Ao salvar um bloqueio de agenda que coincide com agendamentos existentes, o sistema identifica os agendamentos impactados
- Envia mensagem WhatsApp para cada cliente afetado informando:
  - Que o agendamento foi cancelado
  - O motivo do bloqueio (texto inserido pelo proprietário)
  - Data e horário do agendamento cancelado
- Os agendamentos afetados devem ter o status alterado para "cancelado"
- O proprietário deve ver um resumo de quantos clientes foram notificados

---

## [FEATURE] Configurações — Horários de funcionamento por dia da semana

**Descrição:** Adicionar em Configurações a possibilidade de definir o horário de abertura e fechamento para cada dia da semana, para que o bot de WhatsApp e o front-end exibam apenas horários dentro do funcionamento real do estabelecimento.

**Critérios de aceite:**
- Na tela de Configurações, adicionar seção "Horários de Funcionamento"
- Para cada dia da semana (Segunda a Domingo) deve ser possível:
  - Marcar como aberto ou fechado
  - Definir horário de abertura e fechamento
- Os horários disponíveis no agendamento (front-end e WhatsApp) devem respeitar essas configurações
- Dias marcados como fechados não devem aparecer como disponíveis para agendamento

---

## [FEATURE] Onboarding — Cadastro de credenciais WhatsApp para planos Pro/Premium

**Descrição:** Clientes que assinam os planos Pro ou Premium têm direito ao bot de WhatsApp. É necessário uma forma de cadastrar as credenciais da API do WhatsApp Business (Meta) para cada cliente, bem como receber a solicitação de ativação.

**Contexto:** A API do WhatsApp Business (Meta) não permite automação completa do cadastro de números — o proprietário do número precisa passar pelo processo de verificação no Facebook Business Manager manualmente.

**Critérios de aceite:**
- No painel admin (super admin), deve haver uma tela/seção para gerenciar credenciais WhatsApp por cliente/tenant
- Campos a cadastrar por cliente:
  - `UseWhatsappBooking` (boolean — ativa o bot)
  - `WhatsappPhoneNumberId`
  - `WhatsappBusinessAccountId`
  - Número de telefone vinculado (para referência)
- Quando um cliente assinar o plano Pro ou Premium, deve ser enviada uma notificação (e-mail ou mensagem interna) para o admin informando que o cliente deseja ativar o bot de WhatsApp com os dados de contato do cliente
- O admin faz o cadastro manual das credenciais após o cliente concluir o processo de verificação na Meta

---

## [BUG] Agendamento criado deve vir com status "Confirmado" automaticamente

**Descrição:** Ao criar um novo agendamento (seja pelo front-end ou pelo bot), o status deve ser automaticamente definido como "Confirmado", pois o proprietário já valida o agendamento ao criá-lo.

**Critérios de aceite:**
- Todo agendamento criado pelo proprietário/sistema deve ter status inicial "Confirmado"
- Agendamentos criados pelo cliente via bot podem ter status "Pendente" até confirmação, ou também "Confirmado" — alinhar com o proprietário
- Verificar todos os pontos de criação de agendamento no código e garantir consistência

---

## [BUG] RefreshToken — Tela de loading travada em /admin/sign-in

**Descrição:** Quando o refreshToken expira ou é inválido, a aplicação trava na tela de loading com a URL `/admin/sign-in` em vez de redirecionar corretamente para o login.

**Critérios de aceite:**
- Se o refreshToken for inválido ou expirado, limpar os tokens do storage e redirecionar para a tela de login sem travar
- A tela de loading não deve aparecer indefinidamente
- Validar o comportamento em diferentes cenários: token expirado, token inválido, token ausente
- Garantir que após o logout e novo login o fluxo funcione normalmente

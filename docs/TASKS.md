# Tarefas — Voro Salon CRM

> Última atualização: março de 2026

---

## Agendamento

- [ ] **#1** Corrigir tamanho do country selector no input de telefone
  - O seletor de país está com altura/padding diferente do input de telefone ao lado
  - Aplicar também no mobile (tela de agendamento do cliente)

- [ ] **#2** Puxar duração do serviço automaticamente no formulário de agendamento
  - Ao selecionar um serviço, preencher o campo de duração com `durationMinutes` do serviço
  - Aplicar na web e no mobile

- [ ] **#3** Adicionar validação de campos obrigatórios no formulário de agendamento
  - Validar: cliente, serviço, data, horário, duração
  - Exibir mensagem de erro por campo antes de enviar
  - Aplicar na web e no mobile

- [ ] **#4** Atualizar descrição curta do agendamento ao selecionar serviço
  - Ao escolher um serviço, preencher automaticamente a descrição curta com o nome do serviço
  - O usuário ainda pode editar manualmente depois

- [ ] **#5** Corrigir bloqueio de horários baseado na duração do serviço
  - Bug: serviço de 1h a partir das 14:00 bloqueia apenas 14:00 e 14:30 — 15:00 aparece livre
  - Revisar cálculo de sobreposição em `GetAvailableSlotsAsync`: `scheduledDateTime + durationMinutes`

---

## Bugs Críticos

- [ ] **#10** Corrigir bloqueio de horários por `timeSlotBlock` no agendamento do cliente
  - Horários bloqueados pelo proprietário via `timeSlotBlock` aparecem como disponíveis no booking público
  - Verificar `GetOverlappingAsync` no `PublicBookingService` (parâmetros UTC)
  - Aplicar na web e no mobile

---

## Funcionários

- [ ] **#6** Bloquear acesso ao sistema para usuários com role de funcionário
  - Funcionários não devem ter acesso ao painel administrativo
  - Adicionar guard na autenticação que verifica o role e bloqueia com mensagem de erro

- [ ] **#7** Popup de seleção de funcionário ao concluir agendamento "qualquer profissional"
  - Condição: `plan.hasEmployees === true` + agendamento sem `employeeId` específico
  - Ao clicar em "concluir", abrir popup para escolher qual funcionário realizou o serviço
  - Salvar no registro do agendamento e no histórico do cliente

---

## Financeiro

- [ ] **#8** Melhorar posição e visual do botão de exportar
  - Botão está mal posicionado na tela de financeiro
  - Mover para o header da seção (junto ao título ou filtros de período)
  - Usar `Button` com ícone `Download` (shadcn/ui)

---

## Clientes

- [ ] **#9** Visualização de agendamentos do cliente em formato timeline (estilo iFood)
  - Exibir agendamentos em timeline vertical com ícone, status, horário e descrição
  - Estados: agendado → confirmado → em andamento → concluído / cancelado

- [ ] **#12** Decrementar sessões do plano de membro ao concluir agendamento
  - Bug: sessões do membership não são decrementadas ao concluir um serviço
  - Ao marcar como concluído, abater 1 sessão se o cliente tiver plano ativo com saldo

---

## Features

- [ ] **#11** Aumentar opções de antecedência do lembrete (horas, não só minutos)
  - Adicionar: 1h, 2h, 3h, 6h, 12h, 24h antes
  - Backend já armazena em minutos — apenas converter (1h = 60, 3h = 180, etc.)

- [ ] **#13** Adicionar foto opcional ao cadastro de serviço
  - Campo de upload de imagem no formulário de serviço (opcional, não quebra serviços existentes)
  - Exibir foto no card do serviço e na tela de agendamento online do cliente

---

## Mobile (específico)

- [ ] **#14** Corrigir header de popups e telas de "novo"
  - Headers de modais e telas de criação estão com problemas visuais no app
  - Padronizar: título centralizado, botão fechar/voltar correto, sem sobreposição com status bar

- [ ] **#15** Adicionar plano de assinatura para clientes no app mobile
  - Seção de planos de membros do estabelecimento: sessões, validade e status
  - Integrar com endpoint de memberships existente

- [ ] **#16** Controle de assinatura para membros do estabelecimento no mobile
  - Visualizar plano ativo, sessões restantes, data de vencimento e renovação

---

## Bônus

- [ ] **#17** Histórico de estabelecimentos visitados no localStorage
  - Salvar últimos 5 estabelecimentos acessados com seus últimos serviços
  - Estrutura: `[{ slug, name, logoUrl, lastServices: [{ name, date }] }]`
  - Exibir na tela inicial como "acessados recentemente" para facilitar reagendamento

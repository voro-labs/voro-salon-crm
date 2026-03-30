# Tasks — App Mobile

Funcionalidades presentes no **front web** que ainda não existem no **app mobile**.

---

## Pendentes

### 1. Integração WhatsApp (Kanban)

**Rota web:** `/whatsapp`

- [x] Criar tela de WhatsApp no app com board Kanban de conversas
- [x] Exibir as 7 colunas de estágio: `START → AWAITING_SERVICE → AWAITING_EMPLOYEE → AWAITING_DATE → AWAITING_TIME → AWAITING_CONFIRMATION → COMPLETED`
- [x] Card de conversa com: nome/telefone do contato, prévia da última mensagem, tempo desde última mensagem, badge de agendamento vinculado
- [x] Botão de envio de template em massa:
  - Selecionar template predefinido
  - Preencher parâmetros (auto-preenche nome do estabelecimento e do cliente)
  - Seleção de múltiplos clientes
  - Exibir resultado de envio (sucesso/falha por cliente)
- [x] Auto-refresh a cada 30 segundos
- [x] Adicionar item "WhatsApp" na tab bar ou no menu de navegação

---

### 2. Bloqueio de Horários

**Rota web:** `/appointments/blocked`

- [x] Criar tela de horários bloqueados acessível a partir da tela de agendamentos
- [x] Listar bloqueios ativos com: período (data + faixa de horário), motivo interno, mensagem para o cliente
- [x] Botão para criar novo bloqueio (formulário com data/hora início, data/hora fim, motivo, mensagem ao cliente)
- [x] Deletar bloqueio com confirmação
- [x] Empty state com ícone de calendário quando não há bloqueios

---

### 3. Página de Assinatura do Salão

**Rota web:** `/subscription`

- [ ] Criar tela de assinatura acessível via Settings ou menu principal
- [ ] Card do plano atual com: nome do plano, preço, status (Trial/Ativo/Inativo/Cancelado/PastDue), dias restantes de trial, data do próximo pagamento, data do último pagamento
- [ ] Grid de planos disponíveis com: nome, preço, descrição, capacidade de funcionários/clientes, módulos incluídos (Financeiro, Anamnese, Agendamento Online, Bot WhatsApp) com ícones informativos
- [ ] Botão de assinar/upgrade/reassinar com dialog de confirmação antes de redirecionar ao checkout
- [ ] Botão "Reassinar plano" quando plano estiver inativo/expirado

---

### 4. Planos de Fidelidade (Configurações)

**Rota web:** `/settings/membership-plans`

- [ ] Criar tela de planos de fidelidade dentro de Settings
- [ ] Listar planos com: ícone, nome, badge "Inativo" se desativado, preço, duração em dias, sessões
- [ ] Criar/editar plano com campos:
  - Nome (obrigatório)
  - Descrição
  - Preço (R$)
  - Duração em dias (obrigatório)
  - Sessões: toggle ilimitado ou número específico
  - Toggle de status ativo/inativo
- [ ] Deletar plano com confirmação
- [ ] Empty state com ícone de cartão de crédito

---

### 5. Tab "Assinatura" no Detalhe do Cliente

**Rota web:** `/clients/[id]` — aba Assinatura

- [x] Adicionar aba "Assinatura" na tela de detalhe do cliente (atualmente o app só tem Serviços e Anamnese)
- [x] Listar planos de fidelidade ativos e expirados do cliente com: nome do plano, badge de status (Ativo/Expirado/Cancelado), período (início → fim), sessões restantes, notas
- [x] Botão para associar plano: dropdown de planos + campo de notas
- [x] Botão para cancelar plano ativo com confirmação

---

### 6. Melhorias no Dashboard (Home)

**Rota web:** `/` (home)

- [x] Adicionar gráfico de receita dos últimos 6 meses em barras
- [x] Exibir seção "Top Clientes": ranking com número do cliente, nome, quantidade de serviços e total gasto
- [x] Botão para copiar link de agendamento público
- [x] Verificar se os cards de métricas estão alinhados com o web: Receita Mensal, Quantidade de Serviços do Mês, Total de Clientes / Limite

---

### 7. Importação de Extrato Bancário (PDF) no Financeiro

**Rota web:** `/finance` (Botão Importar PDF)

- [ ] Adicionar botão "Importar PDF" na listagem do financeiro
- [ ] Utilizar `expo-document-picker` para selecionar arquivo PDF do dispositivo
- [ ] Ler e processar o PDF (semelhante à web, extraindo transações, descrições e valores via RegEx base e classificações)
- [ ] Tela/Modal de revisão local antes de despachar o `batchImport` para a API (exibindo entradas, saídas e a tabela de edição rápida)

---

### 8. Placeholders Dinâmicos e Novos Tipos de Estabelecimento

**Rota web:** `/services/new` e onboarding/settings

- [ ] Adicionar o **Seletor de Tipo de Estabelecimento** na tela de *Configurações do Salão* no App (atualmente essa aba no app não exibe o seletor `EstablishmentType` que tem na web, o que impede de escolher "Nails Design").
- [ ] O app hoje tem placeholder fixo `"Nome do serviço"`. Implementar o utilitário `getServicePlaceholders(tenant.establishmentType)` no App.
- [ ] Atualizar os placeholders dos inputs em `services/new.tsx` e `services/[id].tsx`.

---

### 9. Integrações da Agenda (Google Calendar e Apple Calendar)

**Rota web:** `/settings/integrations` (Em desenvolvimento na web)

- [ ] Na tela de "Configurações", adicionar o sub-menu "Integrações"
- [ ] Botão "Conectar com Google" para fluxo de OAuth do Google Calendar (possivelmente usando Deep Linking / Expo AuthSession).
- [ ] Quando um agendamento for criado com sucesso, exibir botões adicionais no App: "Adicionar à Agenda (Apple - baixar .ics)" e "Adicionar ao Google Calendar".

---

### 10. Upload Nativo de Imagens (Avatar / Logo)

**Rota web:** Várias (Upload via `ImageUpload` component hospedado no Vercel Blob / S3)

- [ ] Utilizar a biblioteca `expo-image-picker` para a seleção de fotos nativa (Galeria/Câmera).
- [ ] Adicionar botão de "Trocar Logo" em `settings/salon.tsx` (hoje o app pede uma URL de texto bruto ao invés de fazer upload).
- [ ] Adicionar campo de foto de perfil em Funcionários (`employees/new` e `employees/[id]`) e Clientes.

---

### 11. Gerenciamento de Templates do WhatsApp

**Rota web:** `/whatsapp/templates`

- [ ] Adicionar listagem de templates configuráveis de mensagens no App.
- [ ] Criar/editar templates incluindo os placeholders visuais para autocompletar nome, serviço e data.

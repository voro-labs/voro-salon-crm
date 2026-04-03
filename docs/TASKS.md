# Tarefas Planejadas

---

## 1. Comissão para Funcionário

**Objetivo:** Permitir que o salão configure e acompanhe a comissão paga a cada funcionário com base nos serviços realizados.

### Modelo de Dados

**Decisão:** Adicionar `CommissionPercentage` (decimal?, 0–100) diretamente na entidade `Employee`. Quando um agendamento for finalizado (status `Completed`), gerar automaticamente uma `Transaction` do tipo `Expense` representando o valor de comissão a pagar ao funcionário.

### Backend (`voro-salon-crm-api`)

#### 1.1 Entidade e Migração
- [ ] Adicionar campo `CommissionPercentage` (`decimal?`) em `Employee.cs`
- [ ] Adicionar campo `EmployeeId` (`Guid?`, nullable FK) em `Transaction.cs` + navigation property
- [ ] Criar migration do EF Core

#### 1.2 DTOs
- [ ] Adicionar `CommissionPercentage` em `CreateEmployeeDto`, `UpdateEmployeeDto` e `EmployeeDto`
- [ ] Adicionar `EmployeeId` em `CreateTransactionDto` e `TransactionDto`

#### 1.3 Lógica de Negócio
- [ ] No `AppointmentService` (ou `ServiceRecordService`), ao finalizar um agendamento:
  - Buscar `CommissionPercentage` do funcionário
  - Se configurado, criar automaticamente uma `Transaction` do tipo `Expense` com:
    - `Description`: "Comissão – [nome do funcionário] – [nome do serviço]"
    - `Amount`: `appointment.Amount * (commissionPercentage / 100)`
    - `Status`: `Pending`
    - `DueDate`: último dia do mês corrente
    - `EmployeeId`: id do funcionário
- [ ] Criar endpoint `GET /employees/{id}/commissions?from=&to=` que retorna as transações de comissão do funcionário no período

#### 1.4 Controller
- [ ] Adicionar action `GetCommissions` em `EmployeeController`

### Frontend (`voro-salon-crm-front`)

#### 1.5 Formulário de Funcionário
- [ ] Adicionar campo "Comissão (%)" (input numérico 0–100) em `/employees/new` e `/employees/[id]`

#### 1.6 Visualização de Comissões
- [ ] Adicionar aba/seção "Comissões" na página de detalhe do funcionário (`/employees/[id]`)
  - Seletor de período (mês/ano)
  - Lista de comissões geradas com: data, serviço, valor do agendamento, valor da comissão, status (pago/pendente)
  - Total do período

---

## 2. Acesso para Funcionários

**Objetivo:** Criar uma conta de usuário com role `SalonEmployee` vinculada a um funcionário existente, permitindo que ele faça login e veja seus próprios agendamentos e comissões.

### Modelo de Dados

**Decisão:** Adicionar `UserId` (`Guid?`, nullable) em `Employee` para vincular o registro de funcionário à conta de usuário do sistema. Um funcionário pode ou não ter acesso ao sistema.

### Backend (`voro-salon-crm-api`)

#### 2.1 Entidade e Migração
- [ ] Adicionar campo `UserId` (`Guid?`) em `Employee.cs` com FK para `User`
- [ ] Criar migration do EF Core

#### 2.2 DTOs
- [ ] Criar `CreateEmployeeAccessDto`: `{ email: string, password: string }`
- [ ] Adicionar `UserId` e `HasAccess` (bool) em `EmployeeDto`

#### 2.3 Lógica de Negócio
- [ ] Criar método `CreateAccessAsync(Guid employeeId, CreateEmployeeAccessDto dto)` no `EmployeeService`:
  1. Verificar se o funcionário já tem acesso (`UserId != null`)
  2. Criar novo `User` (firstName = nome do funcionário, email, password)
  3. Atribuir role `SalonEmployee` via `UserManager`
  4. Criar `UserTenant` vinculando o usuário ao tenant atual
  5. Salvar `Employee.UserId = newUser.Id`
- [ ] Criar método `RevokeAccessAsync(Guid employeeId)` para remover acesso:
  - Desativar o usuário (`isActive = false`) sem deletar
  - Limpar `Employee.UserId`

#### 2.4 Controller
- [ ] Adicionar `POST /employees/{id}/access` → cria acesso
- [ ] Adicionar `DELETE /employees/{id}/access` → revoga acesso
- [ ] Autorizar: `Owner, SalonOwner`

#### 2.5 Permissões do SalonEmployee
- [ ] Rever/ajustar `[Authorize]` nos controllers para que `SalonEmployee` possa:
  - `GET /appointments` — filtrado pelo seu `employeeId`
  - `GET /employees/{id}/commissions` — somente o próprio ID
  - **Não** acessar: clientes completos, finanças gerais, configurações, outros funcionários

### Frontend (`voro-salon-crm-front`)

#### 2.6 Página de Detalhe do Funcionário
- [ ] Adicionar seção "Acesso ao Sistema" em `/employees/[id]`
  - Se sem acesso: botão "Criar Acesso" → modal com campos de e-mail e senha temporária
  - Se com acesso: exibir e-mail + botão "Revogar Acesso" (com confirmação)

#### 2.7 Visão do Funcionário (após login)
- [x] Garantir que o layout/navegação para role `SalonEmployee` exiba apenas:
  - Meus Agendamentos (filtrado pelo próprio `employeeId`)
  - Minhas Comissões
  - Perfil (alterar senha)
- [x] Ajustar `middleware.ts` ou guards de rota conforme necessário

---

## Ordem de Implementação Sugerida

1. **Migração de banco** (Task 1.1 + Task 2.1) — ambas podem ser feitas em uma migration só
2. **Backend Task 1** (comissão: DTOs → lógica → controller)
3. **Backend Task 2** (acesso: DTOs → lógica → controller + ajuste de permissões)
4. **Frontend Task 1** (campo % comissão + tela de comissões)
5. **Frontend Task 2** (seção de acesso + visão do funcionário)

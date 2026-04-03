# Tarefas Planejadas

---

## 1. Comissão para Funcionário

**Objetivo:** Permitir que o salão configure e acompanhe a comissão paga a cada funcionário com base nos serviços realizados.

### Modelo de Dados

**Decisão:** Adicionar `CommissionPercentage` (decimal?, 0–100) diretamente na entidade `Employee`. Quando um agendamento for finalizado (status `Completed`), gerar automaticamente uma `Transaction` do tipo `Expense` representando o valor de comissão a pagar ao funcionário.

### Backend (`voro-salon-crm-api`)

#### 1.1 Entidade e Migração
- [x] Adicionar campo `CommissionPercentage` (`decimal?`) em `Employee.cs`
- [x] Adicionar campo `EmployeeId` (`Guid?`, nullable FK) em `Transaction.cs` + navigation property
- [x] Criar migration do EF Core

#### 1.2 DTOs
- [x] Adicionar `CommissionPercentage` em `CreateEmployeeDto`, `UpdateEmployeeDto` e `EmployeeDto`
- [x] Adicionar `EmployeeId` em `CreateTransactionDto` e `TransactionDto`

#### 1.3 Lógica de Negócio
- [x] No `AppointmentService`, ao finalizar um agendamento:
  - Buscar `CommissionPercentage` do funcionário
  - Se configurado, criar automaticamente uma `Transaction` do tipo `Expense` com:
    - `Description`: "Comissão – [nome do funcionário] – [nome do serviço]"
    - `Amount`: `appointment.Amount * (commissionPercentage / 100)`
    - `Status`: `Pending`
    - `DueDate`: último dia do mês corrente
    - `EmployeeId`: id do funcionário
- [x] Criar endpoint `GET /employees/{id}/commissions?from=&to=` que retorna as transações de comissão do funcionário no período

#### 1.4 Controller
- [x] Adicionar action `GetCommissions` em `EmployeeController`

### Frontend (`voro-salon-crm-front`)

#### 1.5 Formulário de Funcionário
- [x] Adicionar campo "Comissão (%)" (input numérico 0–100) em `/employees/new` e `/employees/[id]`

#### 1.6 Visualização de Comissões
- [x] Adicionar aba/seção "Comissões" na página de detalhe do funcionário (`/employees/[id]`)
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
- [x] Adicionar campo `UserId` (`Guid?`) em `Employee.cs` com FK para `User`
- [x] Criar migration do EF Core

#### 2.2 DTOs
- [x] Criar `CreateEmployeeAccessDto`: `{ email: string, password: string }`
- [x] Adicionar `UserId` e `HasAccess` (bool) em `EmployeeDto`

#### 2.3 Lógica de Negócio
- [x] Criar método `CreateAccessAsync(Guid employeeId, CreateEmployeeAccessDto dto)` no `EmployeeService`
- [x] Criar método `RevokeAccessAsync(Guid employeeId)` para remover acesso

#### 2.4 Controller
- [x] Adicionar `POST /employees/{id}/access` → cria acesso
- [x] Adicionar `DELETE /employees/{id}/access` → revoga acesso
- [x] Autorizar: `Owner, SalonOwner`

#### 2.5 Permissões do SalonEmployee
- [x] Ajustar `[Authorize]` nos controllers para que `SalonEmployee` possa:
  - `GET /appointments` — filtrado automaticamente pelo seu `employeeId`
  - `GET /employees/{id}/commissions` — permitido
  - `GET /employee/me` — endpoint exclusivo para SalonEmployee
  - Não acessa: finanças gerais, configurações, outros funcionários

### Frontend (`voro-salon-crm-front`)

#### 2.6 Página de Detalhe do Funcionário
- [x] Adicionar seção "Acesso ao Sistema" em `/employees/[id]`
  - Se sem acesso: botão "Criar Acesso" → modal com campos de e-mail e senha temporária
  - Se com acesso: exibir e-mail + botão "Revogar Acesso" (com confirmação)

#### 2.7 Visão do Funcionário (após login)
- [x] Garantir que o layout/navegação para role `SalonEmployee` exiba apenas:
  - Meus Agendamentos (filtrado pelo próprio `employeeId`)
  - Minhas Comissões
  - Perfil (alterar senha)
- [x] Ajustar `middleware.ts` ou guards de rota conforme necessário
- [x] Criar página `/my-commissions` com resumo e detalhamento de comissões

---

## ✅ Todas as tarefas concluídas

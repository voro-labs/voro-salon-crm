# API Refactor Design — MediatR Handlers + Cobertura de Testes

**Data:** 2026-05-13
**Status:** Aprovado
**Branch central:** `improvement/api-refactor` → `dev`

---

## 1. Contexto e Motivação

O projeto `voro-salon-crm-api` usa Clean Architecture (API → Application → Domain ← Infrastructure) com Repository + UnitOfWork + Service pattern. A base está sólida, mas quatro services cresceram além do ponto de responsabilidade única:

| Service | Linhas | Problema |
|---|---|---|
| `AppointmentService` | 915 | Mistura criação de agendamento, transações financeiras, comissões, histórico, WhatsApp e push notifications |
| `AuthService` | 698 | Gerencia JWT, cookies, 2FA, tenants e cadastro no mesmo lugar |
| `SubscriptionService` | 692 | Sem cobertura de testes; lógica de ativação, cancelamento e webhook misturadas |
| `PublicBookingService` | 577 | Sem cobertura de testes; disponibilidade de slots, funil e criação de booking acoplados |

Além disso, o `ExceptionHandlingMiddleware` retorna mensagem genérica em inglês em vez de usar o padrão `ResponseViewModel` do projeto, e os primary constructors têm field assignments manuais redundantes.

**Objetivo:** refatorar esses services usando MediatR (Handlers) para separar responsabilidades, aumentar cobertura de testes e corrigir inconsistências — tudo sem breaking changes nas interfaces públicas.

---

## 2. Estrutura de Branches e Fluxo de PRs

```
main
 └── dev
      └── improvement/api-refactor          ← branch central
           ├── refactor/mediatr-setup        → PR #1 (base MediatR — mergea primeiro)
           ├── refactor/appointment-service  → PR #2 (paralelo após PR #1)
           ├── refactor/auth-service         → PR #3 (paralelo após PR #1)
           ├── refactor/subscription-service → PR #4 (paralelo após PR #1)
           └── refactor/public-booking       → PR #5 (paralelo após PR #1)
```

**Regras:**
- `refactor/mediatr-setup` é a única branch que mergea em `improvement/api-refactor` antes das demais. As branches de domínio partem dessa base.
- PRs #2–#5 são independentes entre si e podem mergear em qualquer ordem.
- Nenhuma branch de domínio altera `Program.cs` diretamente — cada domínio expõe um extension method próprio para registro dos handlers.
- O PR final (`improvement/api-refactor` → `dev`) só abre quando todos os PRs de domínio estiverem mergeados e os testes passando.

---

## 3. Abordagem de Implementação

**Híbrido: Services menores + MediatR para fluxos complexos.**

- Services simples (ex: `ClientService`, `DashboardService`) mantêm o padrão Service + Interface atual.
- Services God Object (`AppointmentService`, `AuthService`, `SubscriptionService`, `PublicBookingService`) têm a lógica extraída para Handlers MediatR, permanecendo como façades leves que despacham comandos/queries.
- Isso preserva compatibilidade com todos os Controllers existentes — nenhum Controller muda de interface.

---

## 4. Detalhamento por Branch

### PR #1 — `refactor/mediatr-setup`

**Escopo:** infraestrutura base, zero mudança em services existentes.

- Adicionar `MediatR` ao `VoroSalonCrm.Application.csproj`
- Criar estrutura de pastas: `Application/Features/{Appointments,Auth,Subscription,PublicBooking}/{Commands,Queries,Handlers}/`
- Registrar `AddMediatR(cfg => cfg.RegisterServicesFromAssembly(...))` em extension method no `VoroSalonCrm.Contract`
- Corrigir `ExceptionHandlingMiddleware`: substituir mensagem genérica em inglês por `ResponseViewModel.Fail("Ocorreu um erro inesperado.", status: 500)` em português

---

### PR #2 — `refactor/appointment-service`

**Handlers extraídos do `AppointmentService`:**

| Handler | Tipo | Responsabilidade |
|---|---|---|
| `CreateAppointmentCommandHandler` | Command | Criação + validação de tenant + serviços múltiplos |
| `UpdateAppointmentCommandHandler` | Command | Atualização de dados e status |
| `DeleteAppointmentCommandHandler` | Command | Remoção lógica |
| `AppointmentCommissionHandler` | Notification | Geração de comissão ao concluir (evita duplicata) |
| `AppointmentTransactionHandler` | Notification | Receita automática ao concluir |
| `AppointmentHistoryHandler` | Notification | Criação do ServiceRecord ao concluir |
| `GetAppointmentsQueryHandler` | Query | Listagem com filtros |
| `GetAvailableSlotsQueryHandler` | Query | Cálculo de slots disponíveis |

`AppointmentService` mantido como façade: injeta `IMediator` e delega.

**Testes novos:**
- `CreateAppointmentCommandHandlerTests` — happy path, tenant vazio, ServiceIds múltiplos
- `AppointmentCommissionHandlerTests` — comissão gerada, duplicata ignorada, employee sem percentual
- `AppointmentTransactionHandlerTests` — receita gerada, categoria criada se ausente, valor zero ignora

---

### PR #3 — `refactor/auth-service`

**Handlers extraídos do `AuthService`:**

| Handler | Tipo | Responsabilidade |
|---|---|---|
| `SignInCommandHandler` | Command | Login + validação de establishmentType + trigger 2FA |
| `VerifyTwoFactorCommandHandler` | Command | Validação do código 2FA + geração de JWT |
| `RefreshTokenCommandHandler` | Command | Renovação de token JWT |
| `SignUpCommandHandler` | Command | Cadastro de novo usuário + tenant |
| `ForgotPasswordCommandHandler` | Command | Envio de e-mail de reset |
| `ResetPasswordCommandHandler` | Command | Aplicação do novo password |

**Testes novos:**
- `SignInCommandHandlerTests` — credenciais válidas, inválidas, 2FA ativado, establishmentType errado
- `VerifyTwoFactorCommandHandlerTests` — código correto, expirado, inválido

---

### PR #4 — `refactor/subscription-service`

**Handlers extraídos do `SubscriptionService`:**

| Handler | Tipo | Responsabilidade |
|---|---|---|
| `CreateSubscriptionCommandHandler` | Command | Ativação de plano + validação de cupom |
| `CancelSubscriptionCommandHandler` | Command | Cancelamento com regras de período |
| `ChangePlanCommandHandler` | Command | Troca de plano com pending change |
| `GetSubscriptionQueryHandler` | Query | Status atual da assinatura do tenant |
| `ProcessWebhookCommandHandler` | Command | Processamento de eventos de pagamento |

**Testes novos:**
- `CreateSubscriptionCommandHandlerTests` — plano ativado, cupom inválido, tenant sem assinatura
- `CancelSubscriptionCommandHandlerTests` — cancelamento imediato, com período de carência

---

### PR #5 — `refactor/public-booking`

**Handlers extraídos do `PublicBookingService`:**

| Handler | Tipo | Responsabilidade |
|---|---|---|
| `GetAvailableSlotsQueryHandler` | Query | Horários disponíveis considerando bloqueios e horário comercial |
| `CreateBookingCommandHandler` | Command | Agendamento público + validações de slot |
| `GetBookingFunnelQueryHandler` | Query | Estado atual da sessão do funil |
| `UpdateFunnelSessionCommandHandler` | Command | Avanço de etapa no funil |

**Testes novos:**
- `GetAvailableSlotsQueryHandlerTests` — slots livres, bloqueados, fora do horário comercial
- `CreateBookingCommandHandlerTests` — booking criado, slot ocupado, tenant inativo

---

## 5. Convenções de Testes

**Nomenclatura:**
```
Método_Cenário_Resultado
Ex: Handle_WhenTenantEmpty_ThrowsUnauthorized
    Handle_WhenCommissionExists_SkipsDuplicate
    Handle_WhenSlotBlocked_ReturnsEmpty
```

**Estrutura de arquivos:**
```
VoroSalonCrm.Tests.Integration/
  Appointments/
    Commands/
      CreateAppointmentCommandHandlerTests.cs
      AppointmentCommissionHandlerTests.cs
      AppointmentTransactionHandlerTests.cs
    AppointmentServiceContext.cs        ← mantido
  Auth/
    Commands/
      SignInCommandHandlerTests.cs
      VerifyTwoFactorCommandHandlerTests.cs
    AuthServiceContext.cs               ← mantido
  Subscription/
    Commands/
      CreateSubscriptionCommandHandlerTests.cs
      CancelSubscriptionCommandHandlerTests.cs
  PublicBooking/
    Queries/
      GetAvailableSlotsQueryHandlerTests.cs
    Commands/
      CreateBookingCommandHandlerTests.cs
```

**Padrão de contexto:** cada domínio tem um `*HandlerContext` que monta todos os mocks com defaults neutros e expõe `Build()`. Cada teste cria instância fresca e sobrescreve apenas o que o cenário precisa.

**Stack:** `xUnit` + `Moq` + `FluentAssertions` + `TestAsyncQueryProvider` (já existente). Sem banco real.

**Cobertura mínima por handler:**
- Happy path
- Guard clauses (tenant vazio, dados inválidos)
- Casos de borda críticos (duplicata, limite de plano, slot bloqueado)

---

## 6. Convenções de Commits e PRs

**Prefixos:**

| Prefixo | Quando |
|---|---|
| `chore(mediatr):` | Setup do MediatR |
| `fix(middleware):` | ExceptionHandlingMiddleware |
| `refactor(appointment):` | Extração de handlers de appointment |
| `refactor(auth):` | Extração de handlers de auth |
| `refactor(subscription):` | Extração de handlers de subscription |
| `refactor(public-booking):` | Extração de handlers de public-booking |
| `test(appointment):` | Testes de appointment |
| `test(auth):` | Testes de auth |
| `test(subscription):` | Testes de subscription |
| `test(public-booking):` | Testes de public-booking |

**Ordem de merge na branch central:**
1. PR #1 `mediatr-setup` — sempre primeiro
2. PRs #2–#5 — em qualquer ordem, são independentes

**PR final para `dev`:**
- Título: `refactor(api): extrair handlers MediatR + aumentar cobertura de testes`
- Body: lista todos os handlers criados + métricas de cobertura antes/depois

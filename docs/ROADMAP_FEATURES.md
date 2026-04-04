# Roadmap de Features — Voro Salon CRM

> **Stack:** C# .NET 9 (Clean Architecture) · Next.js 14+ · React Native/Expo · PostgreSQL · WhatsApp via Meta Graph API

---

## Sumário

| # | Feature | Complexidade | Dependências |
|---|---------|-------------|--------------|
| 1 | [Autofill de credenciais no login mobile](#1-autofill-de-credenciais-no-login-mobile) | Baixa | — |
| 2 | [Avaliação do cliente após serviço](#2-avaliação-do-cliente-após-serviço) | Alta | — |
| 3 | [Metas para profissionais](#3-metas-para-profissionais) | Média | — |
| 4 | [Promoção de serviços em dias específicos](#4-promoção-de-serviços-em-dias-específicos) | Média | — |
| 5 | [Assinatura digital para anamnese](#5-assinatura-digital-para-anamnese) | Média | — |
| 6 | [Automação de parabéns para clientes](#6-automação-de-parabéns-para-clientes) | Média | — |

> **Ordem sugerida de execução:** 1 → 6 → 3 → 4 → 2 → 5
> (Feature 6 adiciona `BirthDate` no cliente, que pode ser útil para outras integrações futuras. Feature 1 é zero risco e pode ser feita a qualquer momento.)

---

## 1. Autofill de Credenciais no Login Mobile

### Problema
O app não aciona o gerenciador de senhas do dispositivo (iCloud Keychain / Google Password Manager), obrigando o usuário a digitar as credenciais manualmente toda vez.

### Causa raiz
- O `ScrollView` que envolve o formulário de login não tem `keyboardShouldPersistTaps="handled"`, o que faz o iOS interpretar o toque na sugestão de autofill como um toque fora do teclado e descartá-lo.
- Os campos não têm `ref` encadeado (email → senha), o que é necessário para o iOS reconhecer o par como um formulário de login completo.

### Arquivos a modificar
- `voro-salon-crm-app/app/(auth)/sign-in.tsx`

### Implementação
1. Adicionar `keyboardShouldPersistTaps="handled"` no `ScrollView` raiz da tela.
2. Criar `useRef` para o campo de senha e conectar `returnKeyType="next"` no campo de e-mail com `onSubmitEditing` que foca o ref da senha.
3. Verificar que `textContentType="emailAddress"` + `autoComplete="email"` estão no campo de e-mail e `textContentType="password"` + `autoComplete="current-password"` estão na senha (já estão — apenas confirmar).

### Sem impacto no backend.

---

## 2. Avaliação do Cliente Após Serviço

### Comportamento esperado
- **Automático:** quando o status do agendamento muda para `Concluído`, o bot dispara o template WhatsApp `service_rating_request_1` (template criado pelo proprietário na Meta).
- **Manual:** na tela de detalhe do agendamento (web e mobile), um botão "Solicitar Avaliação" abre um popup e envia o template manualmente.
- **Resposta via WhatsApp:** o cliente responde com um número de 0 a 5 estrelas; o bot captura e salva a avaliação.
- **Resposta via web:** a página `/receipt/[id]` exibe um formulário de estrelas quando o agendamento está `Concluído` e ainda não tem avaliação.

### Nova entidade

```
ClientRating {
  Guid       Id
  Guid       TenantId
  Guid       AppointmentId   (único, FK)
  Guid       ClientId        (FK)
  int        Stars           (0–5)
  string?    Comment
  RatingSource Source        (WhatsApp | Web)
  DateTimeOffset CreatedAt
}
```

Enum `RatingSource`: `WhatsApp = 0`, `Web = 1`.

### Arquivos a criar (backend)
| Arquivo | Descrição |
|---------|-----------|
| `Domain/Entities/ClientRating.cs` | Nova entidade |
| `Domain/Enums/RatingSource.cs` | Enum |
| `Domain/Interfaces/Repositories/IClientRatingRepository.cs` | Interface |
| `Infrastructure/Repositories/ClientRatingRepository.cs` | Implementação |
| `Application/DTOs/CRM/ClientRatingDtos.cs` | `ClientRatingDto`, `CreateClientRatingDto` |
| `Application/Services/Interfaces/IClientRatingService.cs` | Interface |
| `Application/Services/ClientRatingService.cs` | Serviço com `CreateAsync`, `GetByAppointmentAsync`, `SendRequestAsync` |
| `API/Controllers/ClientRatingController.cs` | CRUD + endpoint de envio manual |

Endpoints do controller:
- `POST   /api/v1/client-ratings` — cria avaliação (usado pela página web pública)
- `GET    /api/v1/client-ratings/{appointmentId}` — retorna avaliação existente
- `POST   /api/v1/client-ratings/send-request/{appointmentId}` — disparo manual do template

### Arquivos a modificar (backend)
| Arquivo | Alteração |
|---------|-----------|
| `Infrastructure/Factories/JasmimDbContext.cs` | `DbSet<ClientRating>`, filtro global de tenant, configuração no `OnModelCreating` + migration |
| `Application/Services/AppointmentService.cs` | Em `UpdateStatusAsync`, quando `→ Completed`, disparar o template `service_rating_request_1` e criar entrada de sessão no cache para o bot aguardar resposta |
| `Infrastructure/Integration/WhatsappChatService.cs` | Novo estado `"AWAITING_RATING"`: quando cliente responde com número 0–5, salva via `IClientRatingService`. O estado é pré-semeado no cache quando o template é enviado. |
| `Application/DTOs/Public/PublicBookingDtos.cs` | Adicionar `int? Rating` e `bool CanRate` ao `PublicReceiptDto` |
| `Application/Services/PublicBookingService.cs` | `GetReceiptAsync` inclui avaliação existente por `AppointmentId` |

### Arquivos a modificar (frontend/mobile)
| Arquivo | Alteração |
|---------|-----------|
| `voro-salon-crm-front/app/receipt/[id]/page.tsx` | Exibir formulário de estrelas quando `CanRate == true` |
| `voro-salon-crm-front/app/appointments/[id]/page.tsx` | Botão "Solicitar Avaliação" quando status = Concluído e sem avaliação |
| `voro-salon-crm-app/hooks/use-appointment-detail.hook.ts` | Mesmo botão no mobile |

---

## 3. Metas para Profissionais

### Comportamento esperado
O proprietário define uma meta mensal por profissional (valor em R$ e quantidade de atendimentos). O sistema acompanha o progresso em tempo real comparando contra os registros de serviço e agendamentos concluídos.

### Nova entidade

```
EmployeeGoal {
  Guid     Id
  Guid     TenantId
  Guid     EmployeeId          (FK)
  int      Month               (1–12)
  int      Year
  decimal  TargetAmount
  int      TargetAppointments
  DateTimeOffset CreatedAt
  DateTimeOffset? UpdatedAt
}
```

Índice único em `(TenantId, EmployeeId, Month, Year)`.

### Arquivos a criar (backend)
| Arquivo | Descrição |
|---------|-----------|
| `Domain/Entities/EmployeeGoal.cs` | Nova entidade |
| `Domain/Interfaces/Repositories/IEmployeeGoalRepository.cs` | Interface |
| `Infrastructure/Repositories/EmployeeGoalRepository.cs` | Implementação |
| `Application/DTOs/Employee/EmployeeGoalDtos.cs` | `EmployeeGoalDto` (inclui `actualAmount`, `actualAppointments`, `amountProgress%`, `appointmentsProgress%`), `CreateEmployeeGoalDto`, `UpdateEmployeeGoalDto` |
| `Application/Services/Interfaces/IEmployeeGoalService.cs` | Interface |
| `Application/Services/EmployeeGoalService.cs` | Calcula progresso via query em `ServiceRecords` + `Appointments` para o mês/ano |
| `API/Controllers/EmployeeGoalController.cs` | CRUD |

Endpoints:
- `GET    /api/v1/employee-goals/{employeeId}?month=&year=`
- `POST   /api/v1/employee-goals`
- `PUT    /api/v1/employee-goals/{id}`
- `DELETE /api/v1/employee-goals/{id}`

### Arquivos a modificar
| Arquivo | Alteração |
|---------|-----------|
| `Infrastructure/Factories/JasmimDbContext.cs` | `DbSet<EmployeeGoal>`, índice único, migration |
| `voro-salon-crm-front/app/employees/[id]/page.tsx` | Aba/seção "Metas" com barras de progresso e formulário de definição |
| `voro-salon-crm-app/...` | Tela equivalente no mobile |

### Nota de implementação
O progresso é calculado sob demanda (não armazenado) para evitar problemas de sincronização. Para performance, considerar cache de 5 minutos por `(employeeId, month, year)`.

---

## 4. Promoção de Serviços em Dias Específicos

### Comportamento esperado
O proprietário cadastra um preço promocional para um serviço válido em dias da semana específicos (ex: terça e quarta). No bot do WhatsApp e na página de agendamento público, o preço promocional é exibido com badge "PROMOÇÃO". O preço é resolvido no servidor no momento do agendamento.

### Nova entidade

```
ServicePromotion {
  Guid       Id
  Guid       TenantId
  Guid       ServiceId          (FK)
  int[]      DaysOfWeek         (coluna PostgreSQL integer[])
  decimal    PromotionalPrice
  bool       IsActive
  DateTimeOffset? StartDate
  DateTimeOffset? EndDate
  DateTimeOffset CreatedAt
  DateTimeOffset? UpdatedAt
}
```

### Arquivos a criar (backend)
| Arquivo | Descrição |
|---------|-----------|
| `Domain/Entities/ServicePromotion.cs` | Nova entidade |
| `Domain/Interfaces/Repositories/IServicePromotionRepository.cs` | Interface |
| `Infrastructure/Repositories/ServicePromotionRepository.cs` | Implementação |
| `Application/DTOs/CRM/ServicePromotionDtos.cs` | DTOs |
| `Application/Services/Interfaces/IServicePromotionService.cs` | Interface |
| `Application/Services/ServicePromotionService.cs` | Serviço |
| `API/Controllers/ServicePromotionController.cs` | CRUD |

### Arquivos a modificar
| Arquivo | Alteração |
|---------|-----------|
| `Infrastructure/Factories/JasmimDbContext.cs` | `DbSet<ServicePromotion>`, configurar `DaysOfWeek` como `HasColumnType("integer[]")` (Npgsql), migration |
| `Application/DTOs/Public/PublicBookingDtos.cs` | Adicionar `decimal? PromotionalPrice` e `bool HasPromotion` ao `PublicServiceDto` |
| `Application/Services/PublicBookingService.cs` | `GetServicesByTenantAsync` verifica promoções ativas para o dia da semana atual; `CreateBookingAsync` resolve preço no servidor |
| `Infrastructure/Integration/WhatsappChatService.cs` | Exibir preço promocional na listagem de serviços do bot |
| `voro-salon-crm-front/app/services/[id]/page.tsx` | UI para gerenciar promoções do serviço |
| Página de agendamento público | Badge "PROMOÇÃO" + preço riscado |

### Nota de implementação
Nunca confiar no preço enviado pelo cliente — sempre recalcular no `CreateBookingAsync` baseado na promoção ativa do dia.

---

## 5. Assinatura Digital para Anamnese

### Análise
A infraestrutura de anamnese já existe: entidades `AnamnesisSheet`, `AnamnesisResponse`, `AnamnesisEvidence` e `AnamnesisSignature` com campo `SignatureData` (base64 ou URL). O `AnamnesisController` também existe. O que falta é:
- Uma **página web pública** (sem autenticação) para o cliente preencher e assinar
- Um **token seguro temporário** na `AnamnesisSheet` para acesso sem login
- Um **endpoint público** para buscar perguntas e submeter assinatura
- **Disparo via bot do WhatsApp** com o link de assinatura

### Arquivos a modificar (backend)
| Arquivo | Alteração |
|---------|-----------|
| `Domain/Entities/AnamnesisSheet.cs` | Adicionar `string? PublicToken` (UUID) e `DateTimeOffset? PublicTokenExpiresAt` (validade de 48h) |
| `Infrastructure/Factories/JasmimDbContext.cs` | Coluna `PublicToken` com índice único, migration |
| `Application/Services/AnamnesisService.cs` | Adicionar `GenerateSigningLinkAsync(sheetId)` e `SubmitPublicSignatureAsync(token, dto)` |
| `Application/Services/Interfaces/IAnamnesisService.cs` | Novas assinaturas de método |
| `API/Controllers/AnamnesisController.cs` | Adicionar `POST /send-signing-link/{sheetId}` |

### Arquivos a criar
| Arquivo | Descrição |
|---------|-----------|
| `Application/DTOs/Public/PublicAnamnesisDto.cs` | `PublicAnamnesisSheetDto`, `SubmitAnamnesisDto` |
| `API/Controllers/PublicAnamnesisController.cs` | `GET /api/v1/public/anamnesis/{token}` e `POST /api/v1/public/anamnesis/{token}/sign` |
| `voro-salon-crm-front/app/public/anamnesis/sign/[token]/page.tsx` | Página de assinatura pública com canvas + formulário dinâmico |

### Integração com bot
No `WhatsappChatService.cs`, após confirmação do agendamento, verificar se o tenant tem anamnese configurada e, em caso afirmativo, enviar mensagem com o link de assinatura gerado.

### Nota sobre assinatura digital
Usar canvas HTML5 (`react-signature-canvas`) — sem necessidade de terceiros como DocuSeal, pois a entidade `AnamnesisSignature.SignatureData` já foi projetada para armazenar base64.

---

## 6. Automação de Parabéns para Clientes

### Comportamento esperado
Todo dia, um workflow do GitHub Actions dispara um endpoint que busca todos os clientes com aniversário no dia e envia o template WhatsApp configurado pelo proprietário. Cada tenant configura o nome do template na tela de configurações.

### Pré-requisito: adicionar data de nascimento ao cliente
O `Client` não tem campo `BirthDate`. Adicionar `DateOnly? BirthDate` na entidade e em todos os DTOs relacionados.

### Arquivos a modificar
| Arquivo | Alteração |
|---------|-----------|
| `Domain/Entities/Client.cs` | Adicionar `DateOnly? BirthDate` |
| `Application/DTOs/CRM/ClientDtos.cs` | Adicionar `BirthDate` em `ClientDto`, `CreateClientDto`, `UpdateClientDto` |
| `Application/Services/ClientService.cs` | Mapear `BirthDate` no `CreateAsync` e `UpdateAsync` |
| `Infrastructure/Factories/JasmimDbContext.cs` | Configurar coluna `date` para `BirthDate`, migration |
| `Domain/Entities/Tenant.cs` | Adicionar `string? BirthdayWhatsappTemplateName` |
| Tenant DTOs e serviço | Mapear novo campo |
| Telas de cliente (web + mobile) | Campo de data de nascimento no formulário |
| Tela de configurações | Campo "Template de parabéns (WhatsApp)" |

### Arquivos a criar
| Arquivo | Descrição |
|---------|-----------|
| `Application/Services/Interfaces/IBirthdayGreetingService.cs` | Interface |
| `Application/Services/BirthdayGreetingService.cs` | Busca clientes com aniversário hoje por tenant, filtra tenants com `UseWhatsappBooking && BirthdayWhatsappTemplateName != null`, envia template |
| `API/Controllers/BirthdayGreetingController.cs` | `POST /api/v1/birthday-greetings/trigger` protegido por API Key |
| `API/Filters/ApiKeyAuthFilter.cs` | Filtro de autenticação por API Key para o endpoint de trigger |
| `.github/workflows/birthday-greetings.yml` | Workflow com `schedule: cron: '0 11 * * *'` (08:00 BRT) que chama o endpoint |

### Segurança do endpoint
O endpoint `/birthday-greetings/trigger` usa uma API Key (não JWT) pois é chamado pelo GitHub Actions. A chave é armazenada em `appsettings.json` / variável de ambiente e no GitHub Actions como secret `BIRTHDAY_API_KEY`.

### Exemplo do workflow GitHub Actions
```yaml
name: Birthday Greetings
on:
  schedule:
    - cron: '0 11 * * *'  # 08:00 BRT (UTC-3)
  workflow_dispatch:       # permite execução manual

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Send birthday greetings
        run: |
          curl -X POST "${{ secrets.API_BASE_URL }}/api/v1/birthday-greetings/trigger" \
            -H "X-Api-Key: ${{ secrets.BIRTHDAY_API_KEY }}" \
            -H "Content-Type: application/json"
```

---

## Ordem de Migrations

Para evitar conflitos no EF Core, aplicar as migrations nesta ordem:

1. `AddClientBirthDate` (Feature 6 — base para clientes)
2. `AddEmployeeGoal` (Feature 3)
3. `AddServicePromotion` (Feature 4)
4. `AddClientRating` (Feature 2)
5. `AddAnamnesisPublicToken` (Feature 5)

---

## Convenção de implementação

Toda nova entidade segue este fluxo obrigatório:

```
Domain Entity
  → IRepository (Domain/Interfaces/Repositories)
  → Repository (Infrastructure/Repositories)
  → DbSet + OnModelCreating (JasmimDbContext)
  → Migration
  → DTOs (Application/DTOs)
  → IService (Application/Services/Interfaces)
  → Service (Application/Services)
  → Controller (API/Controllers)
  → Frontend/Mobile hooks + pages
```

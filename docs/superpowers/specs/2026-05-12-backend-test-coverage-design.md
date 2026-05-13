# Backend Test Coverage — Design Spec

**Data:** 2026-05-12  
**Escopo:** Cobertura de testes unitários e de integração para o backend .NET 9  
**Fase:** 1 de 2 (backend; frontend fica para fase 2)

---

## 1. Objetivo

Cobrir os services e controllers do backend com testes unitários e de integração HTTP, usando o padrão já estabelecido nos testes de `AppointmentService`. O objetivo é ter uma rede de segurança de testes antes de qualquer refatoração futura.

---

## 2. Projetos de Teste

### 2.1 `VoroSalonCrm.Tests.Unit` (renomear o projeto atual)

O projeto `VoroSalonCrm.Tests.Integration` atual contém testes unitários puros (sem banco real). Será renomeado para `VoroSalonCrm.Tests.Unit` para refletir o que realmente é. A renomeação é feita como **primeiro commit na branch base** `refactor/test-coverage` (renomear pasta, atualizar `.csproj`, ajustar referências no `.slnx`). Se houver risco de quebrar CI antes das outras branches, pode-se manter o nome atual e só renomear ao final — decisão a ser tomada ao criar a branch base.

**Stack:** xUnit + Moq + FluentAssertions + Microsoft.Extensions.Caching.Memory

### 2.2 `VoroSalonCrm.Tests.Integration` (novo projeto)

Novo projeto criado do zero para testes de integração HTTP com `WebApplicationFactory<Program>`.

**Stack:** xUnit + Moq + `Microsoft.AspNetCore.Mvc.Testing`

---

## 3. Estrutura de Pastas

```
VoroSalonCrm.Tests.Unit/
  Appointments/                        ← já existe, mantém sem alteração
    AppointmentAvailabilityTests.cs
    AppointmentCrudTests.cs
    AppointmentServiceContext.cs
    AppointmentStatusTransitionTests.cs
  Auth/
    AuthServiceTests.cs
    AuthServiceContext.cs
    AuthControllerTests.cs
  Subscription/
    SubscriptionServiceTests.cs
    SubscriptionServiceContext.cs
    SubscriptionControllerTests.cs
  Anamnesis/
    AnamnesisServiceTests.cs
    AnamnesisServiceContext.cs
    AnamnesisControllerTests.cs
  PublicBooking/
    PublicBookingServiceTests.cs
    PublicBookingServiceContext.cs
    PublicBookingControllerTests.cs
  Others/
    ClientServiceTests.cs
    EmployeeServiceTests.cs
    ServiceServiceTests.cs
    TransactionServiceTests.cs

VoroSalonCrm.Tests.Integration/
  Helpers/
    WebAppFactory.cs                   ← WebApplicationFactory<Program>
    AuthHelper.cs                      ← geração de JWT para testes autenticados
  Auth/
    AuthEndpointTests.cs
  Appointments/
    AppointmentEndpointTests.cs
  Subscription/
    SubscriptionEndpointTests.cs
```

---

## 4. Padrões de Código

### 4.1 ServiceContext (testes unitários de service)

Cada service tem seu próprio `XServiceContext` que:
- Instancia todos os mocks com `new Mock<IDependency>()`
- Configura defaults neutros no construtor (não lançam exceção, retornam dados vazios)
- Expõe um método `Build()` que retorna a instância do service com todos os mocks injetados
- Permite que cada teste sobrescreva apenas o que o cenário precisa

```csharp
internal sealed class AuthServiceContext
{
    public Mock<IUserRepository>     UserRepo     { get; } = new();
    public Mock<ICurrentUserService> CurrentUser  { get; } = new();
    // ... demais dependências

    public AuthServiceContext()
    {
        // defaults neutros
    }

    public AuthService Build() => new(
        UserRepo.Object,
        CurrentUser.Object,
        // ...
    );
}
```

### 4.2 Testes unitários de controller

Mockar o service. Verificar status HTTP e que o método correto do service foi chamado.

```csharp
[Fact]
public async Task Create_Returns201_WhenServiceSucceeds()
{
    var mockService = new Mock<IAuthService>();
    mockService.Setup(s => s.RegisterAsync(It.IsAny<RegisterDto>()))
               .ReturnsAsync(new UserDto(...));

    var controller = new AuthController(mockService.Object);
    var result = await controller.RegisterAsync(dto);

    result.Should().BeOfType<CreatedResult>();
    mockService.Verify(s => s.RegisterAsync(It.IsAny<RegisterDto>()), Times.Once);
}
```

### 4.3 Testes de integração HTTP

`WebAppFactory` substitui serviços externos (WhatsApp, push notifications, cache distribuído) por mocks via `ConfigureTestServices`. `AuthHelper` gera JWT válido para testar endpoints protegidos.

---

## 5. Cobertura por Service

### AuthService
- Registro: email duplicado → lança exceção; tenant inválido; senha válida cria usuário
- Login: credenciais erradas → lança exceção; conta bloqueada; JWT retornado
- Troca de senha: igual à anterior (histórico) → lança exceção; token expirado → lança exceção
- Refresh token: inválido/expirado/revogado → lança exceção; válido → retorna novo par

### SubscriptionService
- Criar: plano inexistente → lança exceção; tenant já tem assinatura ativa → lança exceção
- Cancelar: sem assinatura → lança exceção; já cancelada → lança exceção
- Limites: `GetPlanLimits` retorna valores corretos por plano
- Upgrade/downgrade: transição de estado correta

### AnamnesisService
- Criar ficha: tenant inválido; questões obrigatórias ausentes
- Assinar: já assinada → lança exceção; cliente não encontrado → lança exceção
- Isolamento: ficha de outro tenant não é retornada
- Deletar: com respostas vinculadas

### PublicBookingService
- Disponibilidade: fora do horário comercial → slot não disponível; slot bloqueado → slot não disponível; conflito → slot não disponível
- Criar agendamento público: serviço inativo → lança exceção; duração inválida → lança exceção
- Sessão de funil: expirada → lança exceção; inválida → lança exceção

### Services menores (ClientService, EmployeeService, ServiceService, TransactionService)
- Happy path de CRUD
- Validação de tenant
- Principais regras de negócio de cada domínio

---

## 6. Cobertura de Controllers

### Testes unitários (em `Tests.Unit`)
Para cada controller verificar:
- `200/201` no happy path
- `400` para ModelState inválido
- `401/403` quando service lança `UnauthorizedAccessException`
- `404` quando service retorna `null`

### Testes de integração HTTP (em `Tests.Integration`)
- Endpoints protegidos retornam `401` sem token
- Endpoints por role retornam `403` com token sem permissão
- Model binding e validação funcionam end-to-end
- Tenant isolation: requisição de tenant A não acessa dados do tenant B

---

## 7. Branch Strategy

### Branch base
```
main
└── refactor/test-coverage    ← recebe PRs de todas as tasks
```

### Branches de task (ordem sugerida)

| Branch | Conteúdo |
|---|---|
| `refactor/test-auth-service` | AuthService tests + context |
| `refactor/test-subscription-service` | SubscriptionService tests + context |
| `refactor/test-anamnesis-service` | AnamnesisService tests + context |
| `refactor/test-public-booking-service` | PublicBookingService tests + context |
| `refactor/test-other-services` | Services menores agrupados |
| `refactor/test-controllers-unit` | Testes unitários de controllers |
| `refactor/setup-integration-project` | Criar Tests.Integration + WebAppFactory |
| `refactor/test-controllers-integration` | Testes HTTP com WebApplicationFactory |

### Convenções de commit
```
test(auth): add AuthService unit tests for login and registration
test(subscription): add SubscriptionService unit tests for plan limits
test(controllers): add unit tests for AuthController HTTP contract
chore(tests): setup WebApplicationFactory for integration tests
```

### Regra de PR
- `dotnet test` deve passar antes de abrir PR
- PR description lista os cenários cobertos
- Sem PRs com testes pulados (`Skip`) ou falhando

---

## 8. O que fica fora deste escopo

- Refatoração de código dos services (fase posterior, protegida pelos testes desta fase)
- Testes de frontend (fase 2 separada)
- Banco de dados real em testes (sem Testcontainers nesta fase)
- Testes de performance ou carga

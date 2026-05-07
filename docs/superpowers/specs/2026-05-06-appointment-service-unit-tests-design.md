# Design: AppointmentService Unit Tests

**Data:** 2026-05-06  
**Escopo:** Testes unitários para `AppointmentService` usando xUnit + Moq  
**Projeto de testes:** `VoroSalonCrm.Tests.Integration`

---

## Contexto

O projeto já possui testes unitários para a camada `Evolution/` (`EvolutionAIResponderTests`, `EvolutionRulesEngineTests`, `EvolutionResponseServiceTests`). O objetivo é expandir a cobertura para `AppointmentService`, que é o service mais crítico do sistema — contém lógica de disponibilidade de slots, transições de status com efeitos colaterais (service record, membership, transações financeiras, notificações push e WhatsApp).

Não há testes para controllers ou mappers no escopo deste design. O foco é a camada de service.

---

## Abordagem

**Builder de contexto + classes agrupadas por área de negócio.**

Um `AppointmentServiceContext` centraliza a criação dos 17 mocks com defaults neutros. Cada `[Fact]` instancia um contexto limpo e faz override apenas do que o cenário precisa. Três classes de teste cobrem três áreas distintas.

Esse padrão é consistente com os testes existentes no projeto (vide `EvolutionAIResponderTests`).

---

## Estrutura de Arquivos

```
VoroSalonCrm.Tests.Integration/
  Appointments/
    AppointmentServiceContext.cs        ← factory dos 17 mocks + Build()
    AppointmentAvailabilityTests.cs     ← GetAvailableSlotsAsync
    AppointmentStatusTransitionTests.cs ← UpdateStatusAsync
    AppointmentCrudTests.cs             ← CreateAsync, UpdateAsync, DeleteAsync
```

---

## AppointmentServiceContext

Classe `internal sealed` que expõe um `Mock<T>` público por dependência e um método `Build()` que instancia o `AppointmentService` com todos os mocks.

Defaults neutros aplicados no construtor:
- Repositórios retornam listas vazias por padrão
- `ICurrentUserService.TenantId` retorna `Guid.NewGuid()` fixo
- `IUnitOfWork.SaveChangesAsync()` completa sem efeito
- `ICacheService.RemoveAsync()` completa sem efeito
- `IExpoPushNotificationService.SendToUsersAsync()` completa sem efeito
- `ITimeSlotBlockService.GetOverlappingAsync()` retorna lista vazia
- `ITenantBusinessHoursRepository.GetByTenantAsync()` retorna lista vazia (usa default 08:00–18:00)

```csharp
internal sealed class AppointmentServiceContext
{
    public Mock<IAppointmentRepository>             AppointmentRepo          { get; } = new();
    public Mock<IServiceRecordService>              ServiceRecordService     { get; } = new();
    public Mock<IEmployeeRepository>                EmployeeRepo             { get; } = new();
    public Mock<IServiceRepository>                 ServiceRepo              { get; } = new();
    public Mock<IClientMembershipRepository>        MembershipRepo           { get; } = new();
    public Mock<IUnitOfWork>                        UnitOfWork               { get; } = new();
    public Mock<ICurrentUserService>                CurrentUser              { get; } = new();
    public Mock<ITenantRepository>                  TenantRepo               { get; } = new();
    public Mock<IWhatsappService>                   WhatsappService          { get; } = new();
    public Mock<IUserTenantRepository>              UserTenantRepo           { get; } = new();
    public Mock<IExpoPushNotificationService>       PushService              { get; } = new();
    public Mock<ITimeSlotBlockService>              TimeSlotBlockService     { get; } = new();
    public Mock<ITenantBusinessHoursRepository>     BusinessHoursRepo        { get; } = new();
    public Mock<ITransactionRepository>             TransactionRepo          { get; } = new();
    public Mock<ITransactionCategoryRepository>     TransactionCategoryRepo  { get; } = new();
    public IMemoryCache                             MemoryCache              { get; } = new MemoryCache(new MemoryCacheOptions());
    public Mock<ICacheService>                      CacheService             { get; } = new();

    public AppointmentServiceContext() { /* configura defaults neutros */ }

    public AppointmentService Build() => new(
        AppointmentRepo.Object,
        ServiceRecordService.Object,
        EmployeeRepo.Object,
        ServiceRepo.Object,
        MembershipRepo.Object,
        UnitOfWork.Object,
        CurrentUser.Object,
        TenantRepo.Object,
        WhatsappService.Object,
        UserTenantRepo.Object,
        PushService.Object,
        TimeSlotBlockService.Object,
        BusinessHoursRepo.Object,
        TransactionRepo.Object,
        TransactionCategoryRepo.Object,
        MemoryCache,
        CacheService.Object);
}
```

---

## AppointmentAvailabilityTests

Cobre `GetAvailableSlotsAsync`. É a lógica mais complexa do service.

| # | Nome do teste | Cenário | Assert principal |
|---|---|---|---|
| 1 | `GetAvailableSlots_ReturnsEmpty_WhenDayIsClosed` | `TenantBusinessHours` com `IsOpen = false` para o dia | Lista vazia retornada |
| 2 | `GetAvailableSlots_MarksSlotAsBlocked_WhenTimeSlotBlockExists` | `TimeSlotBlockService` retorna bloco cobrindo o slot | `IsBlocked = true` e `Reason` preenchido |
| 3 | `GetAvailableSlots_MarksSlotAsBusy_WhenAppointmentOverlaps` | Appointment ativo cobre o slot | `IsAvailable = false` |
| 4 | `GetAvailableSlots_MarksSlotAsAvailable_WhenNoConflict` | Nenhum appointment, nenhum bloco | `IsAvailable = true` para slots dentro do horário |
| 5 | `GetAvailableSlots_ExcludesSlot_WhenServiceDurationExceedsRangeEnd` | Duração do serviço ultrapassa o `CloseTime` | Slot não incluído na lista |
| 6 | `GetAvailableSlots_GeneratesSlots_ForEachRange_WithGapBetween` | Dois ranges (08:00–12:00 e 13:00–18:00) | Slots de range 1 e range 2 presentes; gap 12:00–13:00 ausente |
| 7 | `GetAvailableSlots_AllBusy_WhenNoActiveEmployees` | `EmployeeRepo` retorna 0 funcionários ativos | Todos os slots com `IsAvailable = false` |

---

## AppointmentStatusTransitionTests

Cobre `UpdateStatusAsync`. Protege os efeitos colaterais das transições.

| # | Nome do teste | Cenário | Assert principal |
|---|---|---|---|
| 1 | `UpdateStatus_CreatesServiceRecord_WhenTransitionToCompleted` | `Pending → Completed` | `serviceRecordService.CreateAsync` chamado 1x |
| 2 | `UpdateStatus_DecrementsSession_WhenTransitionToCompleted` | Client tem membership ativa | `membership.RemainingSessions` decrementado |
| 3 | `UpdateStatus_DeletesServiceRecord_WhenTransitionFromCompleted` | `Completed → Cancelled` | `serviceRecordService.DeleteByAppointmentIdAsync` chamado 1x |
| 4 | `UpdateStatus_ReversesMembership_WhenTransitionFromCompleted` | `Completed → Pending` com membership | `RemainingSessions` incrementado |
| 5 | `UpdateStatus_NoSideEffect_WhenStatusUnchanged` | `Confirmed → Confirmed` | `CreateAsync` e `DeleteByAppointmentId` nunca chamados |
| 6 | `UpdateStatus_ReturnsFalse_WhenAppointmentNotFound` | Repository retorna null | Retorna `false`, `SaveChanges` não chamado |
| 7 | `UpdateStatus_SkipsWhatsApp_WhenAntiSpamCacheActive` | Segunda chamada com mesmo status | `SendTemplateMessageAsync` chamado apenas 1x no total |
| 8 | `UpdateStatus_SkipsWhatsApp_WhenTenantDisabledBooking` | `tenant.UseWhatsappBooking = false` | `SendTemplateMessageAsync` nunca chamado |

---

## AppointmentCrudTests

Cobre `CreateAsync`, `UpdateAsync`, `DeleteAsync`.

| # | Nome do teste | Cenário | Assert principal |
|---|---|---|---|
| 1 | `Create_Throws_WhenTenantIdIsEmpty` | `CurrentUser.TenantId = Guid.Empty` | Lança `UnauthorizedAccessException` |
| 2 | `Create_PopulatesServices_WhenServiceIdsProvided` | `dto.ServiceIds = [id1, id2]` | `appointment.Services` com 2 entradas adicionadas ao repo |
| 3 | `Create_DoesNotThrow_WhenPushNotificationFails` | `PushService` lança exceção | Nenhuma exceção propagada; `SaveChanges` chamado |
| 4 | `Update_Throws_WhenAppointmentNotFound` | Repository retorna null | Lança `KeyNotFoundException` |
| 5 | `Update_CreatesHistory_WhenStatusTransitionsToCompleted` | `dto.Status = Completed`, appointment estava `Pending` | `serviceRecordService.CreateAsync` chamado |
| 6 | `Delete_ReturnsFalse_WhenAppointmentNotFound` | `GetByIdAsync` retorna null | Retorna `false` |
| 7 | `Delete_SoftDeletes_WhenAppointmentExists` | Appointment encontrado | `IsDeleted = true`, `DeletedAt` preenchido, `Update` chamado |

---

## Dependências a adicionar no .csproj

```xml
<PackageReference Include="Microsoft.Extensions.Caching.Memory" Version="9.*" />
```

`IMemoryCache` é usado diretamente no `AppointmentService` (anti-spam WhatsApp). As demais dependências (xUnit, Moq) já estão configuradas.

---

## Fora do escopo deste design

- Testes de controllers
- Testes de mappers AutoMapper
- Testes dos demais services (`ClientService`, `ServiceService`, etc.)
- Integration tests com banco em memória (EF Core InMemory)

Esses itens podem ser abordados em designs separados seguindo o mesmo padrão estabelecido aqui.

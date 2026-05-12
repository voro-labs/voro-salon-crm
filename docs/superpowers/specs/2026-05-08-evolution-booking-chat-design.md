# Evolution Booking Chat — Design Spec

**Data:** 2026-05-08  
**Revisado:** 2026-05-09  
**Status:** Aprovado  
**Contexto:** Adicionar fluxo de agendamento conversacional via Evolution API, substituindo o `EvolutionResponseService` atual por um serviço stateful análogo ao `WhatsappChatService` da API Meta.

---

## 1. Contexto e Motivação

### Sistema atual (Evolution)

O fluxo atual de entrada via Evolution é simples e sem estado:

1. Mensagem chega via webhook → salva em `WhatsAppMessages`
2. `EvolutionResponseWorker` (polling a cada 5s) chama `EvolutionResponseService.ProcessAsync`
3. `EvolutionRulesEngine` tenta match de keyword → renderiza template de `EvolutionTemplate`
4. Se não houver match → `EvolutionAIResponder` gera resposta via IA
5. Resposta enviada via `EvolutionService.SendTextAsync`

**Limitação:** sem estado de sessão, sem fluxo guiado de agendamento — o bot só reage a keywords isoladas.

### Sistema atual (Meta)

`WhatsappChatService` implementa um fluxo stateful completo com etapas (`START → AWAITING_SERVICE → AWAITING_EMPLOYEE → AWAITING_DATE → AWAITING_TIME → AWAITING_DESCRIPTION → AWAITING_CONFIRMATION → AWAITING_REMINDER_TIME → COMPLETED`), usando botões e listas interativas da API Meta.

### Objetivo

Criar `EvolutionBookingChatService` com o mesmo fluxo de etapas do Meta, adaptado para a Evolution que **não suporta widgets interativos** (botões, listas). Toda interação é via texto com opções numeradas. O serviço substitui completamente `EvolutionResponseService`.

**Notificações outbound** (lembretes, confirmações, cupons) continuam sendo disparadas por ações do sistema (funcionário altera registro) e não são afetadas por esta mudança.

---

## 2. Arquitetura Geral

### Pré-requisito: mudança no webhook de entrada

O controller `ReceiveEvolutionWebhook` atualmente salva apenas `webhook.Data.Message?.Conversation ?? string.Empty` como `Body`. Mensagens de áudio chegam com `Body = ""`, impossibilitando detecção posterior.

**Mudança necessária no webhook** (antes de processar a sessão): substituir a linha de `bodyText` por:

```csharp
var (_, bodyText) = DetermineEvolutionMessageType(webhook.Data.Message, info.Type);
```

Com isso, áudio é salvo como `"[Áudio]"`, imagem como `"[Imagem]"` etc. — o service detecta pelo valor sentinela.

### Fluxo de entrada

```
Webhook Evolution → WhatsAppMessages (DB)  [Body usa DetermineEvolutionMessageType]
        ↓  (polling a cada 5s)
EvolutionResponseWorker
        ↓
IEvolutionBookingChatService.HandleMessageAsync(msg, ct)
        ↓
EvolutionBookingSession (IMemoryCache) → switch por estado → envia resposta via EvolutionService
```

### Componentes alterados

| Componente | Ação | Motivo |
|---|---|---|
| `IEvolutionResponseService` | **Deletado** | Substituído por `IEvolutionBookingChatService` |
| `EvolutionResponseService` | **Deletado** | Substituído por `EvolutionBookingChatService` |
| `IEvolutionRulesEngine` | **Deletado** | Keyword matching removido do fluxo de entrada |
| `EvolutionRulesEngine` | **Deletado** | Idem |
| `IEvolutionAIResponder` | **Deletado** | Novo serviço usa `IAIConversationService` diretamente |
| `EvolutionAIResponder` | **Deletado** | Idem |
| `EvolutionResponseWorker` | **Atualizado** | Troca `IEvolutionResponseService` por `IEvolutionBookingChatService` |
| `IEvolutionBookingChatService` | **Criado** | Nova interface do serviço de booking |
| `EvolutionBookingChatService` | **Criado** | Implementação completa do fluxo |

### Componentes não alterados

- `EvolutionWhatsappService` — envio via `IWhatsappService`
- `EvolutionService` — client HTTP da Evolution API
- `EvolutionTemplate` / `EvolutionTemplateService` — notificações outbound
- `TenantEvolutionInstance` / repositories
- `EvolutionInstanceService`, `EvolutionInstanceController`

---

## 3. State Machine

### Estados

```
[Mensagem chega]
        ↓
Sessão existe no cache?
  Não → msg.TenantId já está preenchido (worker filtra por TenantEvolutionInstance conectada)
        → resolve TenantSlug/TenantName via repositório
        → state = START
  Sim → continua no estado atual
        ↓
[Verificações globais — antes do switch]
  • "reagend" digitado em qualquer estado fora de AWAITING_*_CONFIRMATION → reinicia em START
  • Número "1"–"5" em sessão COMPLETED/CANCELLED → tenta salvar rating
  • msg.Body == "[Áudio]" → responde que não suporta, mantém estado atual
        ↓
[Switch por estado]
```

> **Nota:** o estado `AWAITING_TENANT` não existe no fluxo Evolution. Cada `TenantEvolutionInstance` mapeia 1:1 para um tenant; o `msg.TenantId` está sempre preenchido pelo worker. A resolução de tenant multi-tenant é exclusiva do fluxo Meta.

| Estado | Trigger de entrada | O que o bot envia | Próximo estado |
|---|---|---|---|
| `START` | qualquer mensagem (sem sessão) | verifica agendamento ativo; se existir → resumo + opções 1/2/3; senão → lista de serviços | `AWAITING_APPOINTMENT_ACTION` ou `AWAITING_SERVICE` |
| `AWAITING_APPOINTMENT_ACTION` | 1 / 2 / 3 | cancela / reagenda / mantém | `AWAITING_CANCEL_CONFIRMATION` / `AWAITING_RESCHEDULE_CONFIRMATION` / `COMPLETED` |
| `AWAITING_SERVICE` | número digitado | lista numerada de serviços (paginada) | `AWAITING_EMPLOYEE` ou `AWAITING_DATE` |
| `AWAITING_EMPLOYEE` | número digitado | lista numerada de profissionais + "Tanto faz" | `AWAITING_DATE` |
| `AWAITING_DATE` | número digitado | lista numerada de datas (paginada) | `AWAITING_TIME` |
| `AWAITING_TIME` | número digitado | lista numerada de horários disponíveis (paginada) | `AWAITING_DESCRIPTION` |
| `AWAITING_DESCRIPTION` | texto livre ou "não" | — | `AWAITING_CONFIRMATION` |
| `AWAITING_CONFIRMATION` | 1 confirma / 2 cancela | resumo do agendamento | `AWAITING_REMINDER_TIME` ou `CANCELLED` |
| `AWAITING_REMINDER_TIME` | número digitado | opções de lembrete | `COMPLETED` |
| `AWAITING_CANCEL_CONFIRMATION` | 1 sim / 2 não | — | `CANCELLED` ou `COMPLETED` |
| `AWAITING_RESCHEDULE_CONFIRMATION` | 1 sim / 2 não | — | `AWAITING_SERVICE` ou `COMPLETED` |
| `COMPLETED` / `CANCELLED` | — | sessão removida do cache | — |
| `default` | qualquer texto não reconhecido | AI fallback via `IAIConversationService` | mantém estado |

### Tratamento de input inválido

Se o usuário digitar algo que não é um número válido para o estado atual, o bot reenvia a mesma lista com uma mensagem de orientação. Não avança de estado.

---

## 4. Sessão e Chave de Cache

### EvolutionBookingSession

```csharp
private class EvolutionBookingSession
{
    public string State { get; set; } = "START";
    public Guid TenantId { get; set; }
    public string? TenantSlug { get; set; }
    public string? TenantName { get; set; }
    public bool UseWhatsappBooking { get; set; } // flag tenant-level; compartilhada com canal Meta por enquanto
    public Guid? ServiceId { get; set; }
    public string? ServiceName { get; set; }
    public Guid? EmployeeId { get; set; }
    public string? EmployeeName { get; set; }
    public DateTime? SelectedDate { get; set; }
    public string? SelectedTime { get; set; }
    public string? AppointmentDescription { get; set; }
    public Guid? AppointmentId { get; set; }
    public string? ContactName { get; set; }  // populado de WhatsAppConversation.ContactName na criação da sessão
    public int TimeSlotPage { get; set; } = 0;
    public int DatePage { get; set; } = 0;
    public int ServicePage { get; set; } = 0;
    public int EmployeePage { get; set; } = 0;
    public Guid? PendingAppointmentId { get; set; }
    public string? PendingAppointmentSummary { get; set; }

    // Necessários para resolução de número digitado e envio de resposta
    public List<(string Id, string Label)> CurrentOptions { get; set; } = new();
    public string InstanceId { get; set; } = string.Empty; // = msg.To (salvo pelo webhook)
}
```

`CurrentOptions` é populado toda vez que o bot envia uma lista numerada. Quando o usuário responde com um número, o serviço faz `CurrentOptions[index - 1].Id` para obter o valor real (Guid do serviço, string da data, etc.). O item "ver mais" é incluído no final quando há paginação, mapeado para o ID especial `"__more__"`.

**Preenchimento do `InstanceId`:** `msg.To` contém o `instanceId` da instância Evolution (gravado pelo webhook controller, linha `to: instanceId ?? string.Empty`). Na criação da sessão: `session.InstanceId = msg.To`.

**Preenchimento do `ContactName`:** buscar em `WhatsAppConversation` pelo telefone do contato no momento da criação da sessão. Fallback: `"Cliente"`.

### Chave de cache

| Situação | Chave |
|---|---|
| Sempre (tenant resolvido via `msg.TenantId`) | `evo_booking_{tenantId}_{from}` |

TTL de 15 minutos (igual ao Meta). Não há chave `pending` — tenant é sempre conhecido.

---

## 5. Formato das Mensagens e Paginação

### Listas numeradas

Como a Evolution não suporta widgets interativos, todas as opções são apresentadas como texto numerado:

```
Qual serviço você deseja agendar?

1 - Corte de Cabelo (R$ 30,00)
2 - Barba (R$ 25,00)
3 - Corte + Barba (R$ 50,00)
4 - Ver mais opções →

Digite o número da opção desejada.
```

### Paginação

Quando há mais itens do que o tamanho da página (page sizes herdados do Meta: 9 serviços, 9 datas, 9 horários, 8 profissionais), a última opção da lista é sempre "Ver mais opções →" mapeada para o ID `"__more__"`. Ao receber esse número, o serviço incrementa a página e reenvia a lista.

### Mensagem de agendamento existente

```
Olá João! Encontrei um agendamento ativo:

✂️ Serviço: Corte de Cabelo
📅 Data: 10/05/2026
🕐 Horário: 14:00

O que você gostaria de fazer?

1 - Cancelar agendamento
2 - Reagendar
3 - Continuar sem alterar
```

### Resumo de confirmação

```
*Resumo do Agendamento*

✂️ Serviço: Corte de Cabelo
👤 Profissional: João Silva
📅 Data: 10/05/2026
🕐 Horário: 14:00
📝 Observação: lateral bem curta

Podemos confirmar?

1 - Confirmar ✅
2 - Cancelar ❌
```

### Opções de lembrete

```
Quando deseja receber um lembrete? ⏰

1 - 15 minutos antes
2 - 30 minutos antes
3 - 1 hora antes
4 - 2 horas antes
5 - 4 horas antes
6 - 8 horas antes
7 - 24 horas antes
8 - 48 horas antes
9 - Não receber

Digite o número da opção desejada.
```

---

## 6. Interface, Worker e DI

### Interface

```csharp
// Application/Services/Interfaces/Integration/IEvolutionBookingChatService.cs
public interface IEvolutionBookingChatService
{
    Task HandleMessageAsync(WhatsAppMessage msg, CancellationToken ct = default);
}
```

Recebe `WhatsAppMessage` (entidade do DB) diretamente — sem novos DTOs de entrada. O serviço define `msg.ProcessedByBotAt = DateTimeOffset.UtcNow` antes de retornar, mesmo em caso de erro.

**Campos relevantes da entidade usados pelo serviço:**

| Campo | Uso |
|---|---|
| `msg.TenantId` | ID do tenant (sempre preenchido) |
| `msg.From` | Número do usuário (chave da sessão e destinatário da resposta) |
| `msg.Body` | Texto digitado; `"[Áudio]"` para voz; `"[Imagem]"` para imagem |
| `msg.To` | `instanceId` da instância Evolution — usado em `EvolutionService.SendTextAsync` |

### Worker (mudança cirúrgica)

```csharp
// Antes
var responseService = scope.ServiceProvider.GetRequiredService<IEvolutionResponseService>();
await responseService.ProcessAsync(msg, ct);

// Depois
var bookingService = scope.ServiceProvider.GetRequiredService<IEvolutionBookingChatService>();
await bookingService.HandleMessageAsync(msg, ct);
```

O polling de 5s, filtro de mensagens inbound não processadas e cache de tenants conectados permanecem iguais.

### Registro no DI

```csharp
// Remover
services.AddScoped<IEvolutionResponseService, EvolutionResponseService>();
services.AddScoped<IEvolutionRulesEngine, EvolutionRulesEngine>();
services.AddScoped<IEvolutionAIResponder, EvolutionAIResponder>();

// Adicionar
services.AddScoped<IEvolutionBookingChatService, EvolutionBookingChatService>();
```

---

## 7. AppointmentSource e Enum

Adicionar o valor `EvolutionBot = 4` ao enum `AppointmentSource` para distinguir agendamentos feitos via Evolution dos feitos via Meta (`WhatsAppBot = 1`):

```csharp
// Domain/Enums/AppointmentSource.cs
public enum AppointmentSource
{
    Internal    = 0,
    WhatsAppBot = 1,  // Meta
    App         = 2,
    Website     = 3,
    EvolutionBot = 4, // novo
}
```

No `EvolutionBookingChatService`, ao criar o agendamento:

```csharp
Source = AppointmentSource.EvolutionBot,
```

---

## 8. Arquivos Deletados e Alterados

### Alterações adicionais (não listadas na seção 2)

| Arquivo | Ação | Motivo |
|---|---|---|
| `WhatsappController.cs` | **Atualizado** | Usar `DetermineEvolutionMessageType` no `ReceiveEvolutionWebhook` para salvar body correto |
| `AppointmentSource.cs` | **Atualizado** | Adicionar `EvolutionBot = 4` |

### Arquivos deletados

| Arquivo | Caminho |
|---|---|
| `IEvolutionResponseService.cs` | `Application/Services/Interfaces/Integration/` |
| `EvolutionResponseService.cs` | `Infrastructure/Integration/` |
| `IEvolutionRulesEngine.cs` | `Application/Services/Interfaces/Integration/` |
| `EvolutionRulesEngine.cs` | `Infrastructure/Integration/` |
| `IEvolutionAIResponder.cs` | `Application/Services/Interfaces/Integration/` |
| `EvolutionAIResponder.cs` | `Infrastructure/Integration/` |
| `EvolutionRulesEngineTests.cs` | `Tests.Integration/Evolution/` |
| `EvolutionResponseServiceTests.cs` | `Tests.Integration/Evolution/` |
| `EvolutionAIResponderTests.cs` | `Tests.Integration/Evolution/` |

---

## 9. Estratégia de Testes

O fluxo de booking via Evolution compartilha toda a lógica de negócio com o `WhatsappChatService`. Os testes devem focar nas diferenças do canal:

- **Parsing de input numérico:** `"1"` → primeiro item de `CurrentOptions`, `"__more__"` → paginação, número fora do range → reenvia lista
- **Detecção de áudio:** `msg.Body == "[Áudio]"` → bot responde que não suporta e mantém estado; estado não avança
- **Chave de sessão:** sempre `evo_booking_{tenantId}_{from}` — tenant resolvido via `msg.TenantId`
- **InstanceId para envio:** `session.InstanceId` populado de `msg.To` na criação da sessão
- **ContactName:** busca em `WhatsAppConversation` pelo número; fallback `"Cliente"`
- **Paginação:** incremento de página ao selecionar "Ver mais", reset ao selecionar item válido
- **`msg.ProcessedByBotAt`:** sempre definido ao final de `HandleMessageAsync`, inclusive em erro
- **`AppointmentSource`:** agendamentos criados com `EvolutionBot`, não `WhatsAppBot`

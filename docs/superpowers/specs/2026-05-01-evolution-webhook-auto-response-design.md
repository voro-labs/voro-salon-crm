# Evolution Webhook — Auto-Response via Templates + IA

**Data:** 2026-05-01  
**Escopo:** Resposta automática a mensagens recebidas via Evolution Go, usando templates com keyword-matching e fallback para IA (Gemini) com contexto completo do tenant.

---

## 1. Visão Geral

Hoje o webhook `POST /api/whatsapp/evolution-webhook` recebe mensagens, salva no banco e retorna 200 sem responder ao cliente. O objetivo é adicionar resposta automática inteligente para tenants que usam Evolution Go.

**Fluxo macro:**

```
[Evolution Webhook]
  └─ Recebe mensagem
  └─ Salva WhatsAppMessage (ProcessedByBotAt = null)
  └─ Retorna 200 OK imediatamente

[EvolutionResponseWorker] (IHostedService, polling a cada 5s)
  └─ Busca mensagens inbound não processadas de tenants Evolution ativos
  └─ Para cada mensagem:
        1. RulesEngine → keyword match → template encontrado?
             Sim → renderiza template → envia via EvolutionService
             Não → IA com contexto completo → texto livre → envia
        2. Marca ProcessedByBotAt = UtcNow
```

---

## 2. Escopo e Restrições

- Funciona **apenas** para tenants com `TenantEvolutionInstance.Status == Connected`.
- Tenants com WhatsApp Business API nativo não são afetados (nunca ambos ativos ao mesmo tempo).
- `EvolutionTemplate` é global (sem `TenantId`) — os mesmos templates são compartilhados entre todos os tenants Evolution.
- Somente mensagens de texto são processadas automaticamente. Áudio, imagem e documento são ignorados pelo bot.
- Mensagens com mais de 24h de idade são ignoradas (evita processar backlog histórico).

---

## 3. Camada de Dados

### 3.1 `EvolutionTemplate` — novo campo `Keywords`

```csharp
/// <summary>JSON serializado de palavras-chave que ativam este template (ex: ["oi","olá","bom dia"]).</summary>
public string? Keywords { get; set; }
```

- Match é case-insensitive por substring.
- Templates sem `Keywords` não são ativados por regras — disponíveis apenas para envio manual (`evolution-send`).
- Requer migration: `ALTER TABLE EvolutionTemplates ADD COLUMN Keywords VARCHAR(2000) NULL`.

### 3.2 `WhatsAppMessage` — novo campo `ProcessedByBotAt`

```csharp
public DateTimeOffset? ProcessedByBotAt { get; set; }
```

- `null` = pendente de processamento.
- Preenchido após processamento, mesmo em caso de erro (evita loop infinito).
- Requer migration: `ALTER TABLE WhatsAppMessages ADD COLUMN ProcessedByBotAt DATETIMEOFFSET NULL`.

### 3.3 Sem novas tabelas

O histórico de conversa para contexto da IA reusa `AIConversationMessage` via `IAIConversationRepository` e `IAIConversationService` já existentes.

---

## 4. Background Worker

**Classe:** `EvolutionResponseWorker : BackgroundService`  
**Registro:** `services.AddHostedService<EvolutionResponseWorker>()`

**Comportamento:**
- Polling a cada 5 segundos.
- Busca máximo 20 mensagens por ciclo (ordenadas por `CreatedAt ASC`).
- Processa em sequência — não paralelo — para evitar múltiplas respostas simultâneas ao mesmo contato.
- Exceção em uma mensagem não para o worker; a mensagem é marcada como processada mesmo em caso de erro.

**Query de busca:**
```sql
WHERE ProcessedByBotAt IS NULL
  AND Direction = 'inbound'
  AND TenantId IN (<TenantIds com TenantEvolutionInstance.Status = Connected>)
  AND Timestamp > UtcNow - 24h
ORDER BY Timestamp ASC
LIMIT 20
```

**Cache:** lista de TenantIds com instância Evolution conectada é cacheada por 60 segundos.

---

## 5. Pipeline de Resposta

### 5.1 `IEvolutionResponseService`

Orquestra o fluxo para uma única mensagem:

1. Carrega tenant + instância Evolution do tenant.
2. Se mensagem não é texto → marca `ProcessedByBotAt` e retorna (sem resposta).
3. Chama `IEvolutionRulesEngine.MatchAsync(bodyText)`.
   - **Match encontrado** → `EvolutionTemplateService.RenderAsync(templateId, params)` → `EvolutionService.SendTextAsync()`
   - **Sem match** → `IEvolutionAIResponder.RespondAsync(tenantId, from, bodyText)` → `EvolutionService.SendTextAsync()`
4. Salva resposta como mensagem outbound em `WhatsAppMessage`.
5. Marca `msg.ProcessedByBotAt = UtcNow`.

### 5.2 `IEvolutionRulesEngine`

- Carrega todos templates ativos com `Keywords != null` (cache de 5 minutos).
- Para cada template, verifica se `bodyText` contém qualquer keyword (case-insensitive).
- Retorna o **primeiro match** por ordem de `CreatedAt ASC`.
- Params são sempre `[]` quando ativados por keyword (templates ativados por regra devem funcionar sem parâmetros obrigatórios).

### 5.3 `IEvolutionAIResponder`

Monta system prompt com contexto completo do tenant:

```
Você é o assistente virtual de {tenant.Name}.
Localização: {tenant.Address}
Serviços disponíveis: [{nome} - R${preco}, ...]
Responda em português, de forma amigável e concisa. Máximo 600 caracteres.

Agendamentos ativos do cliente: [{servico} em {data} às {hora}] (ou "nenhum agendamento ativo")
```

Chama `IAIConversationService.RespondAsync()` — que persiste histórico e chama Gemini.

---

## 6. Novas Interfaces e Implementações

| Interface | Implementação | Projeto |
|-----------|---------------|---------|
| `IEvolutionResponseService` | `EvolutionResponseService` | Application / Infrastructure |
| `IEvolutionRulesEngine` | `EvolutionRulesEngine` | Infrastructure |
| `IEvolutionAIResponder` | `EvolutionAIResponder` | Infrastructure |
| — | `EvolutionResponseWorker` | Infrastructure |

---

## 7. Alterações em Código Existente

- `EvolutionTemplate.cs` — adicionar campo `Keywords`
- `WhatsAppMessage.cs` — adicionar campo `ProcessedByBotAt`
- `EvolutionTemplateDtos.cs` — expor `Keywords` nos DTOs de criação/atualização/leitura
- `EvolutionTemplateService.RenderAsync` — sem alteração
- `WhatsappController.ReceiveEvolutionWebhook` — sem alteração (continua só salvando)
- 2 migrations de banco de dados

---

## 8. Tratamento de Erros

- Falha ao buscar contexto do tenant → loga e marca como processada (sem enviar resposta)
- Falha na IA → loga, não envia resposta (não faz fallback para mensagem genérica)
- Falha no envio Evolution → loga, marca como processada mesmo assim
- Nenhuma falha deve derrubar o worker

---

## 9. O que está fora do escopo

- Interface de gerenciamento de keywords no front-end (keywords editadas via API existente de templates)
- Suporte a params dinâmicos em templates ativados por keyword
- Retry com backoff para mensagens com falha
- Métricas / dashboard de mensagens processadas

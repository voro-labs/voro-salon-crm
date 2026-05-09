# Migration: API Oficial Meta → Evolution Go (temporária, reversível)

## Contexto

A API atual usa `graph.facebook.com/v22.0/{phoneId}/messages` (Meta oficial).
A migração para o Evolution Go é **temporária** — toda a arquitetura deve permitir reverter com 1 mudança de config.

**Princípio:** não mexer no código existente. Criar nova implementação ao lado.

---

## Fase 1 — Deploy do Evolution Go no fly.io

### Tarefa 1.1 — Criar `fly.toml` para o Evolution Go
- Criar arquivo `fly.toml` na raiz do projeto (ou pasta dedicada `infra/evolution-go/`)
- App name: `voro-evolution-go` (ou similar)
- Porta interna: `4000` (padrão do Evolution Go)
- Região: `gru` (São Paulo)
- Adicionar health check apontando para `GET /server/ok`

### Tarefa 1.2 — Configurar secrets no fly.io
Rodar via `fly secrets set`:
```
ADMIN_TOKEN=<token-admin-forte>
```
Anotar o token para uso posterior nas outras tarefas.

### Tarefa 1.3 — Deploy
```bash
fly launch --name voro-evolution-go
fly deploy
```
Verificar que a URL gerada (ex: `https://voro-evolution-go.fly.dev`) responde `200` em `GET /server/ok`.

---

## Fase 2 — Configuração da instância Evolution Go

### Tarefa 2.1 — Criar instância
```
POST {evolutionUrl}/instance/create
Header: apikey: {adminToken}
Body: { "instanceId": "voro-main", "name": "Voro Salon", "token": "<token-da-instancia>" }
```
Anotar o `token` da instância — será o `EvolutionToken` usado nas chamadas de envio.

### Tarefa 2.2 — Conectar instância e configurar webhook
```
POST {evolutionUrl}/instance/connect
Header: apikey: {instanceToken}
Body: {
  "subscribe": ["ALL"],
  "webhookUrl": "https://<api-voro>.fly.dev/api/whatsapp/evolution-webhook"
}
```
- A URL do webhook aponta para o **novo endpoint** que será criado na Fase 6.
- Guardar a URL do webhook configurada.

### Tarefa 2.3 — Conectar número via Pairing Code (sem QR)
```
POST {evolutionUrl}/instance/pair
Body: { "phone": "+55119XXXXXXXX" }
```
Ou, se preferir QR: `GET {evolutionUrl}/instance/qr`.

### Tarefa 2.4 — Verificar status da conexão
```
GET {evolutionUrl}/instance/status
```
Aguardar status `CONNECTED` antes de prosseguir.

---

## Fase 3 — Extensão do config (back-end C#)

**Arquivo:** `VoroSalonCrm.Shared/Utils/IntegrationUtil.cs`

### Tarefa 3.1 — Adicionar campos ao `WhatsappUtil`
```csharp
// Campos novos — não remover os campos existentes (Meta)
public string Provider { get; set; } = "meta"; // "meta" | "evolution"
public string EvolutionUrl { get; set; } = string.Empty;
public string EvolutionToken { get; set; } = string.Empty;      // token da instância
public string EvolutionAdminToken { get; set; } = string.Empty; // token admin (para gestão)
public string EvolutionInstanceId { get; set; } = string.Empty; // ex: "voro-main"
```

### Tarefa 3.2 — Atualizar appsettings / secrets
No `appsettings.json` (ou secrets do fly.io da API):
```json
"IntegrationSettings": {
  "Whatsapp": {
    "Provider": "evolution",
    "EvolutionUrl": "https://voro-evolution-go.fly.dev",
    "EvolutionToken": "<token-da-instancia>",
    "EvolutionAdminToken": "<admin-token>",
    "EvolutionInstanceId": "voro-main",
    // Campos Meta mantidos intactos para rollback:
    "Token": "...",
    "PhoneId": "...",
    "VerifyToken": "..."
  }
}
```

---

## Fase 4 — EvolutionWhatsappService (envio outbound)

**Arquivo a criar:** `VoroSalonCrm.Infrastructure/Integration/EvolutionWhatsappService.cs`

Implementa a mesma interface `IWhatsappService` — nenhum caller precisa saber da mudança.

### Tarefa 4.1 — Criar `EvolutionWhatsappService : IWhatsappService`

**`SendTextMessageAsync`**
```
POST {evolutionUrl}/send/text
Header: apikey: {evolutionToken}
Body: { "number": "{to}", "text": "{text}", "delay": 500 }
```
- Após sucesso, salvar mensagem outbound igual ao `WhatsappService` existente.

**`SendTemplateMessageAsync`**
- Evolution Go não suporta templates Meta.
- Mapear para texto plano: montar string com os parâmetros do template e chamar `POST /send/text`.
- Se o template tiver botões (`components` do tipo `button`), usar `POST /send/button` com `type: "reply"`.

**`SendInteractiveMessageAsync`**
- Inspecionar o objeto `interactive` recebido:
  - Se for lista (`type: "list"`) → `POST /send/list`
  - Se for botões (`type: "button"`) → `POST /send/button`
- Mapear os campos (title, buttons/sections) para o formato Evolution Go.

### Tarefa 4.2 — Adicionar `HttpClient` para Evolution Go
Em `AddAppServicesExtension.cs`, adicionar:
```csharp
services.AddHttpClient("evolution-go", client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
});
```

---

## Fase 5 — DTOs do webhook Evolution Go

**Arquivo a criar:** `VoroSalonCrm.Application/DTOs/Integration/EvolutionWebhookDto.cs`

### Tarefa 5.1 — Criar DTOs para deserializar payload do Evolution Go

Formato esperado do webhook (evento MESSAGE):
```json
{
  "event": "MESSAGE",
  "instanceId": "voro-main",
  "data": {
    "key": {
      "id": "3EB0...",
      "fromMe": false,
      "remoteJid": "5511999999999@s.whatsapp.net"
    },
    "message": {
      "conversation": "Olá!"
    },
    "messageTimestamp": 1714000000,
    "pushName": "Nome do Cliente"
  }
}
```

DTOs necessários:
```csharp
public record EvolutionWebhookDto(string Event, string InstanceId, EvolutionWebhookData? Data);
public record EvolutionWebhookData(EvolutionMessageKey Key, EvolutionMessageContent? Message, long MessageTimestamp, string? PushName);
public record EvolutionMessageKey(string Id, bool FromMe, string RemoteJid);
public record EvolutionMessageContent(string? Conversation, object? AudioMessage, object? ImageMessage, object? DocumentMessage);
```

---

## Fase 6 — Novo endpoint de webhook inbound (WhatsappController)

**Arquivo:** `VoroSalonCrm.API/Controllers/WhatsappController.cs`

### Tarefa 6.1 — Adicionar endpoint `POST evolution-webhook`

```csharp
[HttpPost("evolution-webhook")]
public async Task<IActionResult> ReceiveEvolutionWebhook([FromBody] EvolutionWebhookDto webhook)
```

Lógica interna:
1. Ignorar eventos que não sejam `"MESSAGE"` ou onde `data.key.fromMe == true`.
2. Extrair `from`: pegar `remoteJid` e remover sufixo `@s.whatsapp.net`.
3. Resolver tenant: comparar `EvolutionInstanceId` do config com `webhook.InstanceId`.
4. Extrair corpo da mensagem:
   - `data.message.conversation` → texto
   - `audioMessage != null` → `"[Áudio]"`
   - `imageMessage != null` → `"[Imagem]"`
   - `documentMessage != null` → `"[Documento]"`
5. Chamar `_whatsAppMessageService.SaveInboundAsync(tenantId, from, instanceId, body, messageId)`.
6. Montar `WhatsappMessageDto` compatível com o `HandleMessageAsync` existente e chamar `_whatsappChatService.HandleMessageAsync(...)`.

**Endpoints Meta permanecem inalterados** (`GET /` verificação e `POST /` webhook Meta).

---

## Fase 7 — Feature flag no DI

**Arquivo:** `VoroSalonCrm.Contract/Extensions/Configurations/AddAppServicesExtension.cs`

### Tarefa 7.1 — Registrar implementação via config (linha 76)

```csharp
// Substituir:
services.AddScoped<IWhatsappService, WhatsappService>();

// Por:
var whatsappProvider = configuration["IntegrationSettings:Whatsapp:Provider"] ?? "meta";
if (whatsappProvider == "evolution")
    services.AddScoped<IWhatsappService, EvolutionWhatsappService>();
else
    services.AddScoped<IWhatsappService, WhatsappService>();
```

---

## Fase 8 — Testes e validação

### Tarefa 8.1 — Testar envio outbound
- Via endpoint `POST /api/whatsapp/send`, enviar mensagem de texto para número de teste.
- Confirmar que chega no WhatsApp via Evolution Go.

### Tarefa 8.2 — Testar recebimento inbound
- Enviar mensagem do celular para o número conectado ao Evolution Go.
- Confirmar que o webhook bate em `/api/whatsapp/evolution-webhook`.
- Confirmar que a mensagem aparece salva no banco (`WhatsAppMessage`).
- Confirmar que o `WhatsappChatService` processou (IA respondeu se habilitado).

### Tarefa 8.3 — Testar rollback
- Mudar `"Provider": "meta"` no config.
- Fazer redeploy.
- Confirmar que `IWhatsappService` voltou a usar `WhatsappService` (Meta).
- Nenhuma linha de código deve precisar ser alterada para o rollback.

---

## Rollback rápido

| O que mudar | Como |
|---|---|
| Provedor de saída | `Provider: "meta"` no config → redeploy |
| Webhook inbound | Desativar a instância no Evolution Go (sem mexer na API) |
| Código | **Nada** — ambas implementações coexistem |

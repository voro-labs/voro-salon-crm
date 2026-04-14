# Voro Salon CRM — Task Backlog

> Legenda: `[ ]` pendente · `[~]` em andamento · `[x]` concluído

---

## Booking Web (Funil de Agendamento Online)

### Welcome Screen
- [ ] Exibir imagem de capa + logo do estabelecimento (buscar de `TenantSettings`)
- [ ] Exibir horários de funcionamento formatados por dia da semana
- [ ] Exibir mapa embutido (Google Maps iframe ou link) com o endereço do estabelecimento
- [ ] Fallback gracioso caso o endereço não esteja cadastrado (ocultar seção de mapa)

---

## Melhorias Futuras

### Agendamento com múltiplos serviços
- [ ] Permitir ao cliente selecionar mais de um serviço por agendamento
- [ ] Recalcular duração total somando os `DurationMinutes` de cada serviço selecionado
- [ ] Verificar disponibilidade do slot considerando a duração total acumulada
- [ ] Exibir resumo dos serviços selecionados + preço total antes de confirmar
- [ ] Ajustar notificações WhatsApp para listar todos os serviços do agendamento
- [ ] Fazer esse ajuste no web e mobile + api

---

## WhatsApp — Atendimento com IA

### Contexto e objetivo
Implementar atendimento conversacional via IA no canal WhatsApp para dois casos de uso distintos:

**Caso 1 — Atendimento para clínicas e salões (produto final)**
Responde perguntas dos clientes do estabelecimento com base no contexto do tenant:
horários, serviços, preços, localização, políticas de cancelamento etc.

**Caso 2 — Atendimento de vendas do sistema (uso interno Vorolabs)**
IA que responde leads interessados no Voro, explica planos, tira dúvidas e
direciona para o checkout — funciona como SDR automatizado 24/7.

---

### Avaliação de LLMs (custo vs. qualidade)

| Provedor | Modelo sugerido | Custo aprox. | Observação |
|---|---|---|---|
| **Google Gemini** | `gemini-1.5-flash` | ~$0.075 / 1M tokens in | Melhor custo-benefício atual, free tier generoso |
| **OpenAI** | `gpt-4o-mini` | ~$0.15 / 1M tokens in | Qualidade alta, custo médio |
| **Anthropic** | `claude-haiku-4-5` | ~$0.08 / 1M tokens in | Bom equilíbrio, ótimo para seguir instruções |
| **Groq** | `llama-3.1-8b` | Gratuito (rate-limited) | Opção zero-custo para MVP/testes |

**Recomendação inicial:** `gemini-1.5-flash` para produção (free tier cobre volume inicial)
com fallback para `gpt-4o-mini` se precisar de maior qualidade em casos complexos.

---

### Arquitetura proposta

```
WhatsApp (Webhook) → WhatsAppBotService
    → IntentRouter
        ├── intent: agendamento/cancelamento → fluxo programado existente
        └── intent: pergunta livre → AIConversationService
                → LLM (Gemini Flash)
                    + system prompt com contexto do tenant
                    + histórico da conversa (últimas N mensagens)
                → responde ao cliente via WhatsApp
```

**Contexto injetado no system prompt (Caso 1 — estabelecimento):**
- Nome, endereço, horários de funcionamento
- Lista de serviços e preços
- Política de cancelamento / reagendamento
- Link de agendamento online do tenant

**Contexto injetado no system prompt (Caso 2 — vendas Voro):**
- Planos disponíveis e preços (buscado da API)
- Funcionalidades do produto
- Link de checkout / trial
- FAQs de objeções comuns ("é caro", "já uso outro sistema", "preciso de nota fiscal")

---

### Tasks de implementação

#### Backend
- [ ] Criar entidade `AIConversationMessage` (tenantId, phoneNumber, role, content, createdAt)
- [ ] Criar `IAIConversationRepository` + implementação EF
- [ ] Criar `AIConversationService` com método `RespondAsync(tenantId, phoneNumber, userMessage)`
  - Busca histórico das últimas 10 mensagens da conversa
  - Monta system prompt com contexto do tenant
  - Chama LLM via HTTP (Gemini Flash ou configurável via `appsettings`)
  - Persiste mensagem do usuário + resposta da IA
  - Retorna texto da resposta
- [ ] Criar `IGeminiService` (ou `ILLMService` agnóstico ao provedor)
- [ ] Configurar `appsettings.json`: `AISettings:Provider`, `AISettings:ApiKey`, `AISettings:Model`
- [ ] Integrar `AIConversationService` no `WhatsAppBotService`:
  - Se a mensagem não corresponder a nenhum intent programado → delegar à IA
- [ ] Endpoint admin: `GET /api/ai-conversations/{tenantId}` para visualizar histórico
- [ ] Endpoint admin: `POST /api/ai-conversations/reset/{phoneNumber}` para limpar histórico

#### Caso 2 — SDR Vorolabs (contexto separado)
- [ ] System prompt dedicado com script de vendas do Voro
- [ ] Número WhatsApp separado para o bot de vendas
- [ ] Webhook separado ou roteamento por número destino no mesmo webhook
- [ ] Dashboard básico de leads atendidos pela IA

#### Frontend (admin)
- [ ] Tela de configuração da IA por tenant: ativar/desativar, personalizar tom/instruções extras
- [ ] Visualizador de conversas IA no painel admin

#### Infraestrutura
- [ ] Variável de ambiente `GEMINI_API_KEY` no deploy
- [ ] Rate limiting por tenant para evitar abuso (máx. N mensagens IA / hora)
- [ ] Logging de tokens consumidos por tenant para monitorar custo

---

## Pagamentos — Pix via MercadoPago

### Contexto
O fluxo atual de pagamento usa exclusivamente **preapproval (recorrência automática via cartão)**
via `CreatePreapprovalAsync` → `ProcessWebhookAsync("subscription_preapproval")`.

A nova feature adiciona **Pix** como segunda opção no dialog de checkout, mantendo o cartão existente.
O usuário escolhe o método antes de ser redirecionado/ver o QR.

---

### Fluxo por método

**Cartão (fluxo atual — sem mudança):**
```
Checkout dialog → escolhe cartão → CreatePreapprovalAsync → redireciona para InitPoint (MP)
                                                         ↓ webhook subscription_preapproval
                                                   ativa assinatura recorrente
```

**Pix (novo):**
```
Checkout dialog → escolhe Pix → CreatePixPaymentAsync → retorna QR code + copia-e-cola
                                                     ↓ exibe QR na tela (sem redirecionar)
                                                     ↓ webhook payment (topic=payment, status=approved)
                                               ativa assinatura por 30 dias
                                               ↓ ao se aproximar NextPaymentAt
                                         job/WhatsApp envia novo Pix pro cliente renovar
```

---

### Mudanças no contrato

**`CreateCheckoutDto`** — adicionar campo:
```csharp
PaymentMethod PaymentMethod = PaymentMethod.Card  // enum: Card | Pix
```

**`CheckoutResultDto`** — adicionar campos para o caso Pix:
```csharp
string? PixQrCode          // string copia-e-cola
string? PixQrCodeBase64    // imagem do QR para exibir
DateTimeOffset? PixExpiresAt
```

**`TenantSubscription`** — adicionar:
```csharp
string? MercadoPagoPixPaymentId   // ID do payment MP atual (Pix)
```

---

### Tasks de implementação

#### Domínio / Contrato
- [ ] Criar enum `PaymentMethod` (`Card`, `Pix`) em `VoroSalonCrm.Domain.Enums`
- [ ] Adicionar `PaymentMethod PaymentMethod` em `CreateCheckoutDto`
- [ ] Adicionar `PixQrCode?`, `PixQrCodeBase64?`, `PixExpiresAt?` em `CheckoutResultDto`
- [ ] Adicionar campo `MercadoPagoPixPaymentId: string?` em `TenantSubscription`
- [ ] Migration EF: `AddPixPaymentIdToTenantSubscription`

#### Backend — MercadoPagoService
- [ ] Criar record `MpCreatePixPaymentDto(string PayerEmail, string Description, decimal Amount, string ExternalReference, string BackUrl)`
- [ ] Criar record `MpPixPaymentResult(string PaymentId, string QrCode, string QrCodeBase64, DateTimeOffset ExpiresAt)`
- [ ] Implementar `CreatePixPaymentAsync(MpCreatePixPaymentDto dto)` em `IMercadoPagoService` / `MercadoPagoService`
  - Usa `PaymentClient` (não `PreapprovalClient`)
  - `payment_method_id: "pix"`, `payment_type_id: "bank_transfer"`
  - Retorna `qr_code` e `qr_code_base64` de `point_of_interaction.transaction_data`
  - Validade do Pix: 30 minutos (configurável)
- [ ] Criar `GetPaymentAsync(string paymentId)` para buscar status de um payment MP

#### Backend — SubscriptionService
- [ ] Criar `CreatePixCheckoutAsync(CreateCheckoutDto dto, SubscriptionPlan plan)` no `SubscriptionService`
  - Chama `CreatePixPaymentAsync`
  - Persiste `TenantSubscription` com `PaymentSource = MercadoPago`, `MercadoPagoPixPaymentId = paymentId`
  - Retorna `CheckoutResultDto` preenchido com os dados do Pix
- [ ] Atualizar `CheckoutAsync` para rotear para `CreateMercadoPagoCheckoutAsync` (cartão) ou `CreatePixCheckoutAsync` (Pix) baseado em `dto.PaymentMethod`
- [ ] Atualizar `ProcessWebhookAsync`:
  - Manter tratamento de `subscription_preapproval` (cartão)
  - Adicionar tratamento de `payment` (Pix):
    - Busca `TenantSubscription` por `MercadoPagoPixPaymentId`
    - Status `approved` → `Active`, `LastPaymentAt = now`, `NextPaymentAt = now + 30 dias`
    - Status `rejected` / `cancelled` → `PastDue`
- [ ] Atualizar `SubscriptionController` webhook para aceitar topic `payment` além de `subscription_preapproval`

#### Renovação Pix (mensal)
- [ ] Job agendado (ou trigger no `NextPaymentAt`): quando faltarem ≤ 3 dias para `NextPaymentAt` de uma assinatura Pix, gerar novo Pix e enviar via WhatsApp ao cliente
- [ ] Endpoint `POST /api/subscriptions/renew-pix/{subscriptionId}` para o cliente solicitar novo QR manualmente

#### Frontend Web — Dialog de checkout
- [ ] Adicionar seleção de método de pagamento no dialog (antes de confirmar):
  ```
  [💳 Cartão de crédito — MercadoPago]
  [🏦 Pix — MercadoPago            ]
  ```
- [ ] Se Pix selecionado: ao confirmar, exibir QR code + código copia-e-cola inline no dialog
  - Polling ou SSE para detectar pagamento confirmado e fechar o dialog automaticamente
  - Exibir timer de expiração do Pix (30 min)
- [ ] Se cartão: manter fluxo atual de redirect para `checkoutUrl`
- [ ] Atualizar `subscription/page.tsx` e `prices/page.tsx`

#### Frontend Mobile — tela de assinatura
- [ ] Exibir seleção Cartão / Pix antes de ir ao checkout
- [ ] Se Pix: abrir WebView ou tela dedicada com QR + copia-e-cola

---

## Preços Promocionais *(implementado em 2026-04-14)*

- [x] Campos `PromoPrice` e `PromoEndsAt` em `SubscriptionPlan`
- [x] Campo `LockedPromoPrice` em `TenantSubscription` (preço garantido enquanto renovar)
- [x] Regra de grace period: perde o preço promocional se não renovar em 7 dias
- [x] Contador regressivo no hero e na seção de preços da landing page
- [x] Exibição de preço promo + original riscado em todas as telas (web + mobile)

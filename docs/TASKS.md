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
- [x] Criar enum `PaymentMethod` (`Card`, `Pix`) em `VoroSalonCrm.Domain.Enums` *(reusado enum existente)*
- [x] Adicionar `CheckoutMethod` em `CreateCheckoutDto`
- [x] Adicionar `PixQrCode?`, `PixQrCodeBase64?`, `PixExpiresAt?` em `CheckoutResultDto`
- [x] Adicionar campo `MercadoPagoPixPaymentId: string?` em `TenantSubscription`
- [x] Migration EF: `AddPixPaymentIdToTenantSubscription`

#### Backend — MercadoPagoService
- [x] Criar record `MpCreatePixPaymentDto`
- [x] Criar record `MpPixPaymentResult`
- [x] Implementar `CreatePixPaymentAsync` em `IMercadoPagoService` / `MercadoPagoService`
- [x] Criar `GetPixPaymentAsync(string paymentId)` para buscar status de um payment MP

#### Backend — SubscriptionService
- [x] Criar `CreatePixCheckoutAsync(CreateCheckoutDto dto, SubscriptionPlan plan)`
- [x] Atualizar `CreateCheckoutAsync` para rotear por método (cartão ou Pix)
- [x] Atualizar `ProcessWebhookAsync` — adicionar branch `payment` (Pix)
- [x] Implementar `ProcessPixPaymentWebhookAsync`: approved → Active / rejected → PastDue
- [x] Implementar `GetCheckoutStatusAsync(Guid subscriptionId)` para polling frontend
- [x] Endpoint `GET /subscription/pix-status/{subscriptionId}` no controller

#### Renovação Pix (mensal)
- [ ] Job agendado: quando faltarem ≤ 3 dias para `NextPaymentAt` de assinatura Pix, gerar novo QR e enviar via WhatsApp
- [ ] Endpoint `POST /api/subscriptions/renew-pix/{subscriptionId}` para solicitar novo QR manualmente

#### Frontend Web — Dialog de checkout
- [x] Seletor Cartão / Pix no dialog de confirmação em `subscription/page.tsx`
- [x] Seletor Cartão / Pix no dialog de checkout em `prices/page.tsx`
- [x] Exibir QR Code base64 + código copia-e-cola em dialog dedicado
- [x] Polling a cada 3s em `GET /subscription/pix-status/{id}` até aprovação ou falha
- [x] Estado aprovado: feedback visual → redireciona/atualiza assinatura automaticamente
- [x] Botão copiar código copia-e-cola com feedback visual

#### Frontend Mobile — tela de assinatura
- [x] Exibir seleção Cartão / Pix antes de ir ao checkout (bottom sheet modal)
- [x] Se Pix: modal dedicado com QR base64 + copia-e-cola + compartilhar + polling
- [x] Estado aprovado: feedback visual + mutate SWR automático
- [x] Estado falha: opção de tentar novamente

---

## Troca de Plano — Proteção de Preço Promocional

### Contexto e objetivo

Quando um cliente inicia o fluxo de troca de plano mas **desiste ou não conclui**, o sistema deve:

1. **Restaurar o plano anterior** se ainda estiver válido (ativo ou dentro do período de graça).
2. **Bloquear o preço promocional** para clientes com assinatura inativa — não podem aproveitar o promo como se fossem novos clientes.
3. **Exibir o valor cheio** na tela de assinaturas para clientes inativos, mesmo que o plano tenha promoção ativa.
4. Preço promocional é exclusivo para **novos clientes** ou para **upgrades de plano**.

---

### Regras de negócio

| Situação | Comportamento esperado |
|---|---|
| Inicia troca → desiste antes de pagar | Mantém plano antigo (sem alteração) |
| Plano anterior ainda ativo | Plano antigo restaurado normalmente |
| Plano anterior expirado/inativo | Mantém inativo; não recebe promoção |
| Cliente inativo vê tela de planos | Exibe **preço cheio**, sem promoção |
| Novo cliente (sem histórico) | Exibe **preço promocional** normalmente |
| Upgrade de plano (plano maior) | Exibe **preço promocional** normalmente |
| Downgrade ou troca lateral | Exibe **preço cheio** (sem promo) |

---

### Fluxo de troca de plano

```
Usuário clica "Trocar plano"
    → Cria PendingPlanChange (novo plano + plano atual salvo)
    → Abre dialog de checkout

Cenário A — Conclui pagamento:
    → Webhook confirma pagamento
    → Aplica novo plano
    → Remove PendingPlanChange
    → Se upgrade: aplica PromoPrice se disponível
    → Se não for upgrade: aplica preço cheio

Cenário B — Fecha dialog / abandona:
    → PendingPlanChange é descartado
    → Plano anterior é mantido (nenhuma alteração)
    → Se plano anterior estava ativo: continua ativo
    → Se estava inativo: continua inativo (sem ganhar promoção)
```

---

### Tasks de implementação

#### Domínio
- [ ] Criar entidade ou record `PendingPlanChange` (tenantId, currentPlanId, currentSubscriptionSnapshot, requestedPlanId, createdAt, expiresAt)
- [ ] Definir `SubscriptionChangeType` enum: `NewSubscription`, `Upgrade`, `Downgrade`, `LateralSwitch`
- [ ] Adicionar método `IsUpgrade(SubscriptionPlan current, SubscriptionPlan requested): bool` em `SubscriptionPlan` ou service
- [ ] Regra: `PromoPrice` só é aplicado se `ChangeType == NewSubscription || ChangeType == Upgrade`

#### Backend — SubscriptionService
- [ ] Criar `InitiatePlanChangeAsync(tenantId, newPlanId)`:
  - Salva snapshot do plano/assinatura atual em `PendingPlanChange`
  - Inicia checkout normalmente (Cartão ou Pix)
  - Retorna `checkoutUrl` ou dados Pix
- [ ] Criar `CancelPendingPlanChangeAsync(tenantId)`:
  - Remove `PendingPlanChange`
  - Restaura/mantém estado original da `TenantSubscription` (sem alterar nada)
  - Chamado quando: dialog fechado, timeout, ou cliente solicita cancelamento
- [ ] Atualizar `ProcessWebhookAsync`:
  - Ao confirmar pagamento, verificar se há `PendingPlanChange` para o tenant
  - Se houver: aplicar novo plano e resolver `ChangeType`
  - Aplicar `PromoPrice` somente se `ChangeType == NewSubscription || Upgrade`
  - Remover `PendingPlanChange` após conclusão
- [ ] Job de limpeza: expirar `PendingPlanChange` com mais de 2 horas sem conclusão (chama `CancelPendingPlanChangeAsync`)

#### Backend — Lógica de exibição de preço
- [ ] Criar `ResolveDisplayPriceAsync(tenantId, planId): decimal`:
  - Se tenant **não tem histórico** de assinatura (novo): retorna `PromoPrice` se disponível
  - Se tenant tem assinatura **ativa**: retorna `PromoPrice` somente se `IsUpgrade`
  - Se tenant tem assinatura **inativa/expirada**: retorna **preço cheio** (`Price`) independente de promo
- [ ] Endpoint `GET /api/subscriptions/plans/prices?tenantId=...` retornar o preço correto por tenant (não só o preço global do plano)

#### Backend — API
- [ ] `POST /api/subscriptions/change-plan` → chama `InitiatePlanChangeAsync`
- [ ] `DELETE /api/subscriptions/pending-change` → chama `CancelPendingPlanChangeAsync` (chamado ao fechar dialog)

#### Frontend Web
- [ ] Ao abrir dialog de checkout para trocar plano, registrar `PendingPlanChange` via `POST /api/subscriptions/change-plan`
- [ ] Ao fechar dialog (X, ESC, clique fora) **sem concluir**: chamar `DELETE /api/subscriptions/pending-change`
- [ ] Tela `subscription/page.tsx` e `prices/page.tsx`: buscar preço via endpoint personalizado por tenant em vez do preço global do plano
- [ ] Ocultar badge de promoção e riscar preço original para clientes inativos (mostrar só preço cheio)
- [ ] Exibir label informativo: _"Promoção disponível apenas para novos clientes ou upgrades"_ quando cliente inativo tentar acessar promo

#### Frontend Mobile
- [ ] Mesma lógica: ao fechar tela de checkout de troca de plano sem pagar → chamar endpoint de cancelamento
- [ ] Tela de planos: exibir preço correto conforme status do tenant (cheio para inativos)

---

## Preços Promocionais *(implementado em 2026-04-14)*

- [x] Campos `PromoPrice` e `PromoEndsAt` em `SubscriptionPlan`
- [x] Campo `LockedPromoPrice` em `TenantSubscription` (preço garantido enquanto renovar)
- [x] Regra de grace period: perde o preço promocional se não renovar em 7 dias
- [x] Contador regressivo no hero e na seção de preços da landing page
- [x] Exibição de preço promo + original riscado em todas as telas (web + mobile)

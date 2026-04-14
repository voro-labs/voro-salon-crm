# Voro Salon CRM — Task Backlog

> Legenda: `[ ]` pendente · `[~]` em andamento · `[x]` concluído

---

## WhatsApp — Embedded Signup (Vincular número do cliente)

### Contexto

Hoje o sistema usa um único número/token global configurado em `appsettings.json`.
A meta é permitir que **cada tenant conecte o próprio número WhatsApp Business** diretamente
pelo app/painel, sem precisar de suporte manual. Para isso, usa-se o **Meta Embedded Signup**,
que abre um fluxo guiado do Facebook onde o dono do salão conecta a sua conta WhatsApp Business
Account (WABA) à plataforma Voro. Ao final, a plataforma recebe um token de acesso e
armazena por tenant.

---

### O que você precisa fazer no Facebook (passo a passo manual)

> ⚠️ Esses passos são pré-requisitos que precisam ser feitos **antes** de qualquer código.

#### 1. Criar o Meta App (se ainda não existe)
- Acesse: **developers.facebook.com → Meus Apps → Criar app**
- Tipo: **Business**
- Nome: `Voro` (ou o nome do produto)
- Business Account: selecione sua conta de negócios da Vorolabs

#### 2. Adicionar o produto WhatsApp
- No painel do app: **Adicionar produto → WhatsApp → Configurar**
- Anote o **App ID** e o **App Secret** (estão em Configurações → Básico)

#### 3. Adicionar o produto "Facebook Login for Business"
- **Adicionar produto → Facebook Login for Business → Configurar**
- Em **Escopos OAuth**, adicionar:
  - `whatsapp_business_management`
  - `business_management`
- Ativar **Client OAuth Login** e **Web OAuth Login**

#### 4. Configurar o Embedded Signup
- Vá em **WhatsApp → Embedded Signup → Configurar**
- Ative o fluxo de Embedded Signup
- Em **Override callback & state**, defina o redirect/postMessage behavior
- Anote a **Solution ID** (Tech Provider ID) se já tiver aprovação BSP — caso contrário ignore por agora

#### 5. Solicitar App Review (permissões avançadas)
- Vá em **App Review → Permissões e Recursos**
- Solicite aprovação para:
  - `whatsapp_business_management` (avançada)
  - `business_management` (avançada)
- Enquanto não aprovado, o fluxo funciona apenas com usuários administradores do app (modo desenvolvimento)

#### 6. Criar System User na Business Manager
- Acesse: **business.facebook.com → Configurações → Usuários → Usuários do Sistema**
- Criar Usuário do Sistema com papel **Administrador**
- Gerar token de acesso permanente para este usuário com escopos:
  - `whatsapp_business_management`
  - `business_management`
- Esse é o **token master da Vorolabs** (salvar em `appsettings` como `WhatsApp:MasterAccessToken`)
- Esse token é usado para: fazer subscribe em WABAs dos clientes e gerenciar permissões

#### 7. Configurar o Webhook
- Em **WhatsApp → Configuração → Webhooks**
- URL: `https://seudominio.com/api/v1/whatsapp` (já existe)
- Verify Token: qualquer string segura (já deve estar em `appsettings` como `VerifyToken`)
- Campos para assinar: `messages`, `message_deliveries`, `message_reads`
- Assinar na WABA master também (para receber eventos de todas as WABAs dos clientes)

#### 8. Variáveis de ambiente a guardar após os passos acima
```
WhatsApp:AppId            → ID do Meta App
WhatsApp:AppSecret        → Secret do Meta App
WhatsApp:MasterAccessToken → Token do System User da Vorolabs
WhatsApp:VerifyToken      → Token de verificação do webhook (já existe)
```

---

### Fluxo técnico do Embedded Signup

```
Mobile/Web Settings
    → Usuário clica "Conectar WhatsApp"
    → Abre WebView com página HTML do Facebook SDK
    → Usuário loga com Facebook → seleciona Business → seleciona/cria WABA → seleciona número
    → Facebook envia postMessage com { code, business_id }
    → App captura o code e envia para o backend

Backend
    → Troca code por user_access_token via Graph API
    → Com user_access_token: busca WABA ID + Phone Number ID
    → Com MasterToken: adiciona System User ao WABA do cliente (subscribe_app)
    → Gera token de acesso do System User para essa WABA específica
    → Salva no Tenant: WabaId, PhoneNumberId, AccessToken, DisplayPhone

Frontend
    → Mostra número conectado + status "Ativo"
    → Opção de desconectar
```

---

### Mudanças no banco de dados

**Tenant** — adicionar campos:
```csharp
public string? WhatsAppAccessToken { get; set; }    // token por tenant (substitui global)
public string? WhatsAppDisplayPhone { get; set; }   // ex: "+55 11 99999-9999"
public bool WhatsAppConnected { get; set; }          // status da conexão
public DateTimeOffset? WhatsAppTokenExpiresAt { get; set; } // tokens expiram em 60 dias
```

> Os campos `WhatsappPhoneNumberId` e `WhatsappBusinessAccountId` já existem no Tenant.

---

### Tasks de implementação

#### Pré-requisito Manual (Facebook)
- [ ] Criar Meta App tipo Business e adicionar produto WhatsApp
- [ ] Adicionar produto "Facebook Login for Business" com escopos corretos
- [ ] Configurar Embedded Signup no painel do app
- [ ] Criar System User na Business Manager e gerar MasterAccessToken
- [ ] Configurar Webhook no painel do app (assinatura de WABA)
- [ ] Solicitar App Review para permissões avançadas

#### Backend — Entidades e Banco
- [x] Adicionar campos ao `Tenant.cs`: `WhatsAppAccessToken`, `WhatsAppDisplayPhone`, `WhatsAppConnected`, `WhatsAppTokenExpiresAt`
- [x] Migration EF: `AddWhatsAppEmbeddedSignupFields`
- [x] Atualizar `JasmimDbContext` e `ModelSnapshot` com as novas propriedades
- [x] Adicionar `AppId`, `AppSecret`, `MasterAccessToken` em `IntegrationUtil.WhatsappUtil`

#### Backend — Serviço de Embedded Signup
- [x] Criar `IWhatsAppOnboardingService` + `WhatsAppOnboardingService`
- [x] `ExchangeCodeAsync`: troca code → short token → long token (60d), busca phone numbers, subscribe WABA, salva no Tenant
- [x] `DisconnectAsync`: unsubscribe WABA (fire & forget), limpa campos do Tenant
- [x] `GetStatusAsync`: retorna status + número + data de expiração
- [x] `GetAppId()`: retorna AppId para o frontend inicializar o SDK

#### Backend — Controller
- [x] `GET /whatsapp/onboarding/config` — retorna AppId (AllowAnonymous)
- [x] `POST /whatsapp/onboarding/exchange` — troca code, salva conexão (Authorize)
- [x] `DELETE /whatsapp/onboarding/disconnect` — desconecta WABA (Authorize)
- [x] `GET /whatsapp/onboarding/status` — retorna status + número + expiração (Authorize)

#### Backend — Job de Renovação de Token
- [ ] Job agendado (semanal): buscar tenants com `WhatsAppTokenExpiresAt < now + 7 dias` e renovar token via Graph API

#### Backend — Webhook Multi-Tenant
- [ ] Garantir roteamento por `WhatsappBusinessAccountId` como fallback adicional no webhook

#### Frontend Mobile — Settings
- [x] Card de status de conexão no topo (conectado/desconectado + número + data de expiração)
- [x] Botão "Conectar WhatsApp Business" → busca AppId do backend → abre WebView com Embedded Signup HTML
- [x] HTML inline com Facebook JS SDK (`FB.login()` com escopos `whatsapp_business_management,business_management`)
- [x] Intercepta `onMessage` com `{ code, business_id }` → chama `POST /whatsapp/onboarding/exchange`
- [x] Botão "Desconectar" com Alert de confirmação → chama `DELETE /whatsapp/onboarding/disconnect`
- [x] Endpoints `WHATSAPP_ONBOARDING_*` adicionados em `lib/api.ts`

#### Frontend Web — Settings
- [ ] Atualizar `/app/settings/whatsapp/page.tsx` com card de conexão + Embedded Signup via popup JS SDK + botão desconectar

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

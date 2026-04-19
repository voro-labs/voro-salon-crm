# Importante

## Booking Web (Funil de Agendamento Online)

### Welcome Screen
- [x] Exibir imagem de capa + logo do estabelecimento (buscar de `TenantSettings`)
- [x] Exibir horários de funcionamento formatados por dia da semana
- [x] Exibir mapa embutido (Google Maps iframe ou link) com o endereço do estabelecimento
- [x] Fallback gracioso caso o endereço não esteja cadastrado (ocultar seção de mapa)

---

## Melhorias Futuras

### Agendamento com múltiplos serviços
- [x] Permitir ao cliente selecionar mais de um serviço por agendamento
- [x] Recalcular duração total somando os `DurationMinutes` de cada serviço selecionado
- [x] Verificar disponibilidade do slot considerando a duração total acumulada
- [x] Exibir resumo dos serviços selecionados + preço total antes de confirmar
- [x] Ajustar notificações WhatsApp para listar todos os serviços do agendamento
- [x] Fazer esse ajuste no web e mobile + api


### Tasks de implementação — IA WhatsApp Bot

#### Backend
- [x] Criar entidade `AIConversationMessage` (tenantId, phoneNumber, role, content, createdAt)
- [x] Criar `IAIConversationRepository` + implementação EF
- [x] Criar `AIConversationService` com método `RespondAsync(tenantId, phoneNumber, userMessage)`
  - Busca histórico das últimas 10 mensagens da conversa
  - Monta system prompt com contexto do tenant
  - Chama LLM via HTTP (Gemini Flash ou configurável via `appsettings`)
  - Persiste mensagem do usuário + resposta da IA
  - Retorna texto da resposta
- [x] Criar `IGeminiService` (ou `ILLMService` agnóstico ao provedor)
- [x] Configurar `appsettings.json`: `AISettings:Provider`, `AISettings:ApiKey`, `AISettings:Model`
- [x] Integrar `AIConversationService` no `WhatsAppBotService` (fallback no `default:` do state machine)
- [x] Endpoint admin: `GET /admin/ai-conversations/{tenantId}` para visualizar histórico
- [x] Endpoint admin: `POST /admin/ai-conversations/reset` para limpar histórico

#### Caso 2 — SDR Vorolabs (contexto separado)
- [ ] System prompt dedicado com script de vendas do Voro
- [ ] Número WhatsApp separado para o bot de vendas
- [ ] Webhook separado ou roteamento por número destino no mesmo webhook
- [ ] Dashboard básico de leads atendidos pela IA

#### Frontend (admin)
- [ ] Tela de configuração da IA por tenant: ativar/desativar, personalizar tom/instruções extras
- [ ] Visualizador de conversas IA no painel admin

#### Infraestrutura
- [ ] Variável de ambiente `GEMINI_API_KEY` no deploy (definir `AISettings:ApiKey`)
- [ ] Rate limiting por tenant para evitar abuso (máx. N mensagens IA / hora)
- [ ] Logging de tokens consumidos por tenant para monitorar custo

## BUGS

#### Domínio
- [x] Criar entidade ou record `PendingPlanChange` (tenantId, currentPlanId, currentSubscriptionSnapshot, requestedPlanId, createdAt, expiresAt)
- [x] Definir `SubscriptionChangeType` enum: `NewSubscription`, `Upgrade`, `Downgrade`, `LateralSwitch`
- [x] Adicionar método `IsUpgrade(SubscriptionPlan current, SubscriptionPlan requested): bool` em `SubscriptionPlan` ou service
- [x] Regra: `PromoPrice` só é aplicado se `ChangeType == NewSubscription || ChangeType == Upgrade`

#### Backend — SubscriptionService
- [x] Criar `InitiatePlanChangeAsync(tenantId, newPlanId)`:
  - Salva snapshot do plano/assinatura atual em `PendingPlanChange`
  - Inicia checkout normalmente (Cartão ou Pix)
  - Retorna `checkoutUrl` ou dados Pix
- [x] Criar `CancelPendingPlanChangeAsync(tenantId)`:
  - Remove `PendingPlanChange`
  - Restaura/mantém estado original da `TenantSubscription` (sem alterar nada)
  - Chamado quando: dialog fechado, timeout, ou cliente solicita cancelamento
- [x] Atualizar `ProcessWebhookAsync`:
  - Ao confirmar pagamento, verificar se há `PendingPlanChange` para o tenant
  - Se houver: aplicar novo plano e resolver `ChangeType`
  - Aplicar `PromoPrice` somente se `ChangeType == NewSubscription || Upgrade`
  - Remover `PendingPlanChange` após conclusão
- [x] Job de limpeza: expirar `PendingPlanChange` com mais de 2 horas sem conclusão (chama `CancelPendingPlanChangeAsync`)

#### Backend — Lógica de exibição de preço
- [x] Criar `ResolveDisplayPriceAsync(tenantId, planId): decimal`:
  - Se tenant **não tem histórico** de assinatura (novo): retorna `PromoPrice` se disponível
  - Se tenant tem assinatura **ativa**: retorna `PromoPrice` somente se `IsUpgrade`
  - Se tenant tem assinatura **inativa/expirada**: retorna **preço cheio** (`Price`) independente de promo
- [x] Endpoint `GET /subscription/plans/resolved-prices` retornar o preço correto por tenant

#### Backend — API
- [x] `POST /subscription/change-plan` → chama `InitiatePlanChangeAsync`
- [x] `DELETE /subscription/pending-change` → chama `CancelPendingPlanChangeAsync` (chamado ao fechar dialog)

#### Frontend Web
- [x] Ao abrir dialog de checkout para trocar plano, registrar `PendingPlanChange` via `POST /subscription/change-plan`
- [x] Ao fechar dialog (X, ESC, clique fora) **sem concluir**: chamar `DELETE /subscription/pending-change`
- [x] Tela `subscription/page.tsx` e `prices/page.tsx`: buscar preço via endpoint personalizado por tenant em vez do preço global do plano
- [x] Ocultar badge de promoção e riscar preço original para clientes inativos (mostrar só preço cheio)
- [x] Exibir label informativo: _"Promoção disponível apenas para novos clientes ou upgrades"_ quando cliente inativo tentar acessar promo

#### Frontend Mobile
- [x] Mesma lógica: ao fechar tela de checkout de troca de plano sem pagar → chamar endpoint de cancelamento
- [x] Tela de planos: exibir preço correto conforme status do tenant (cheio para inativos)

#### Bug Pix — QR Code sumia antes de pagamento
- [x] Polling não deve tratar `"Inactive"` como falha — corrigido em `subscription/page.tsx` e `prices/page.tsx` (só `"cancelled"` encerra o QR)

#### Bug Pix — Erro MercadoPago "Collector user without key enabled for QR render"
- [ ] Problema de configuração da conta MercadoPago — habilitar QR Code no painel MP (não é código)

#### Bug — WhatsApp Connect
- [x] URL do Embedded Signup corrigida: `extras` agora inclui `{"sessionInfoVersion":"3","version":"v4"}` e é concatenada corretamente na URL (estava sendo montada mas não usada) — corrigido em `settings/page.tsx`, `settings/whatsapp/page.tsx` e `whatsapp.tsx` mobile
- [ ] "Sorry, this content isn't available right now" — verificar configuração do App no Meta Business Manager (App ID, Config ID, permissões do app)

#### Bug Crítico — Duplicação de agendamento
- [x] Idempotency check em `CreateBookingAsync`: retorna agendamento existente se criado nos últimos 30s com mesmo tenant+client+employee+horário
- [x] Unique index parcial no banco: `IX_Appointments_TenantId_EmployeeId_ScheduledAt` (filter: `EmployeeId IS NOT NULL`)
- [x] Migration `20260414210000_AddAppointmentUniqueIndex.cs` + snapshot atualizado
- [x] Frontend web e mobile: botão já estava com `disabled={submitting}` — nenhuma mudança necessária

NOVOS BUGS:

- [x] Guardar o body no AuditLog — adicionado campo `RequestBody` em `RouteAuditLog` e captura no `AuditMiddleware` (POST/PUT/PATCH, max 8KB)
- [x] Erro de birthDate retorna via `ResponseViewModel` — configurado `InvalidModelStateResponseFactory` no `ApiBehaviorOptions` e atualizado `ValidateModelFilter` para retornar `ResponseViewModel<object>.Fail()` com as mensagens de erro de validação
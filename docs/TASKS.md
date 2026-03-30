# Tasks

## Concluídas

- [x] **Enviar dados de rastreamento UTM/fbclid ao checkout**
  - Em `app/(landing)/prices/page.tsx`, `handleCheckout` agora lê `localStorage.getItem("voro_tracking")` e inclui os campos `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `fbclid` no payload.
  - Após envio bem-sucedido, remove a chave do localStorage.

- [x] **Apagar notificações ao excluir cliente**
  - `ClientService.DeleteAsync` agora chama `_userNotificationService.DeleteByRelatedEntityIdAsync(id)` após o soft-delete.
  - Novos métodos adicionados: `IUserNotificationRepository.DeleteByRelatedEntityIdAsync`, `IUserNotificationService.DeleteByRelatedEntityIdAsync`.

- [x] **Deletar notificações selecionadas na tela de notificações**
  - `app/notifications/page.tsx` reescrita com suporte a seleção múltipla (clique longo ativa modo seleção), botão "Selecionar todas" e "Excluir selecionadas".
  - Hook `use-user-notifications.hook.ts` com novo método `deleteMany(ids)`.
  - Backend: endpoint `DELETE /notifications` aceita array de IDs (`IUserNotificationRepository.DeleteManyAsync`).

- [x] **Área de configuração do WhatsApp Bot (Owner)**
  - Nova aba "WhatsApp" em `app/settings/page.tsx` (visível para SalonOwner/Owner).
  - `TenantDto` e `UpdateTenantDto` agora expõem `WhatsappPhoneNumberId` e `WhatsappBusinessAccountId`.
  - `TenantService.UpdateAsync` e `TenantController` atualizados para persistir esses campos.

- [x] **Aviso de configuração incompleta do WhatsApp na tela do bot**
  - Em `app/whatsapp/page.tsx`, banner de alerta exibido se `tenant?.whatsappPhoneNumberId` ou `whatsappBusinessAccountId` estiverem vazios.
  - Botão "Solicitar configuração" abre mailto para suporte@vorolabs.com.br.
  - Botão "Configurar agora" redireciona para `/settings?tab=whatsapp`.

- [x] **Corrigir loading infinito na tela de sign-in após refresh token**
  - `app/admin/sign-in/page.tsx`: substituído `router.replace` por `window.location.replace` no useEffect de redirecionamento.
  - Guard na linha 83 simplificado para `if (authLoading) return <LoadingSimple />` (não bloqueia mais quando `user?.token` já está presente e o redirect já foi disparado).

- [x] **Tabela de templates do WhatsApp**
  - Entidade `WhatsAppTemplate` criada (`Domain/Entities/WhatsAppTemplate.cs`).
  - Migration EF Core `AddWhatsAppTemplates` gerada.
  - Repositório `IWhatsAppTemplateRepository` + `WhatsAppTemplateRepository`.
  - Serviço `IWhatsAppTemplateService` + `WhatsAppTemplateService` (serializa `ParamLabels` como JSON).
  - Endpoints CRUD substituem lista hardcoded: `GET/POST /whatsapp/templates`, `PUT/DELETE /whatsapp/templates/{id}`.
  - Tela de gerenciamento em `app/whatsapp/templates/page.tsx` (listagem, criar, editar, excluir).
  - Botão "Templates" adicionado na `app/whatsapp/page.tsx`.

## Pendentes

- [ ] **Deploy ambiente dev — configuração manual no Fly.io e Vercel**

  **O que já foi criado:**
  - `voro-salon-crm-api/fly.dev.toml` — config do Fly para `dev-voro-salon-crm-api` (512 MB RAM)
  - `.github/workflows/deploy-dev.yml` — dispara no push para `dev`, só gerencia a API no Fly.io
  - Vercel é gerenciado pela **integração nativa** (GitHub App já instalado), sem job extra no workflow

  **Arquitetura de domínios:**
  | Branch | Fly.io | Vercel (frontend) |
  |--------|--------|-------------------|
  | `main` | `voro-salon-crm-api` | `salon-crm.vorolabs.app` (production) |
  | `dev`  | `dev-voro-salon-crm-api` | `dev-salon-crm.vorolabs.app` (preview com domínio fixo) |

  ---

  ### Passo 1 — Criar app no Fly.io
  ```bash
  fly apps create dev-voro-salon-crm-api --org <sua-org>
  ```

  ### Passo 2 — Adicionar domínios dev no Vercel (mesmo projeto, sem criar novo)
  No projeto atual do Vercel → **Settings → Domains**:
  1. Adicionar `dev-salon-crm.vorolabs.app`
     - No campo **Git Branch** digitar: `dev`
  2. Adicionar `dev-barber-crm.vorolabs.app`
     - Git Branch: `dev`
  3. Adicionar `dev-petshop-crm.vorolabs.app`
     - Git Branch: `dev`

  Assim toda vez que a branch `dev` for atualizada, o Vercel publica automaticamente nesses domínios como "preview com domínio fixo".

  ### Passo 3 — Configurar environment variables no Vercel para preview
  Em **Settings → Environment Variables**, adicionar/atualizar com scope **Preview**:
  - `NEXT_PUBLIC_BASE_API_URL` = `https://dev-voro-salon-crm-api.fly.dev`
  - `NEXT_PUBLIC_WEB_URL` = `https://dev-salon-crm.vorolabs.app`

  > Importante: manter os valores de produção no scope **Production** (apontando para a API de prod).

  ### Passo 4 — Configurar DNS
  Adicionar CNAMEs no provedor de domínio (Cloudflare, etc.):
  ```
  dev-salon-crm.vorolabs.app   → cname.vercel-dns.com
  dev-barber-crm.vorolabs.app  → cname.vercel-dns.com
  dev-petshop-crm.vorolabs.app → cname.vercel-dns.com
  ```

  ### Passo 5 — Adicionar secrets ao GitHub
  Acesse: repositório → Settings → Secrets and variables → Actions

  | Secret | Valor |
  |--------|-------|
  | `MERCADOPAGOSETTINGS__BACKURL__DEV` | URL de retorno do MercadoPago para dev |

  > Os demais secrets (`CONNECTIONSTRING__DEVELOPMENT__*`, `FLY_API_TOKEN`, etc.) já existem nos workflows de preview de PR.

  ### Passo 6 — Criar branch `dev` e fazer primeiro push
  ```bash
  git checkout -b dev
  git push origin dev
  ```
  - O workflow `deploy-dev.yml` fará o deploy da API automaticamente
  - O Vercel detectará a branch `dev` e publicará o frontend nos domínios configurados

  ### Fluxo de trabalho após setup
  ```
  feature/* → PR para dev → testa em dev → PR para main → deploy para prod
  ```


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


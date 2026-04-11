# Tasks — Mobile (voro-salon-crm-app)

---

## 1. Transição da tela de edição de agendamento não funciona

**Status:** ✅ Concluído
**Arquivo modificado:** `components/tab-screens/appointments/AppointmentFormScreen.tsx`

**O que foi feito:**
Adicionado `InteractionManager` do React Native. O `useEffect` que chama `fetchAvailability` foi envolvido em `InteractionManager.runAfterInteractions()`, que adia a busca de horários disponíveis até que todas as animações de navegação sejam concluídas. A task retornada é cancelada no cleanup do effect para evitar chamadas obsoletas.

---

## 2. Paginação nas listas (igual ao web)

**Status:** ✅ Concluído
**Arquivos modificados:**
- `components/tab-screens/ClientsScreen.tsx`
- `components/tab-screens/ServicesScreen.tsx`

**O que foi feito:**
As listas já utilizavam infinite scroll (`onEndReached`, `ListFooterComponent` com spinner). Adicionado contador de registros abaixo da barra de busca:
- Quando `items.length < totalCount`: exibe "Mostrando X de Y clientes/serviços"
- Quando todos carregados: exibe "X clientes/serviços"
Também adicionado `totalCount` ao destructuring do `useDataList` no `ServicesScreen` (estava ausente).

---

## 3. Funil do WhatsApp — separar visualização de lista e funil

**Status:** ✅ Concluído
**Arquivo modificado:** `components/tab-screens/WhatsAppScreen.tsx`

**O que foi feito:**
- Adicionado estado `viewMode: "list" | "funnel"` (padrão: `"funnel"`)
- Adicionado toggle com ícones "list" / "grid" no toolbar (ao lado da busca e do botão Template)
- **Modo Lista:** `FlatList` vertical com conversas ordenadas por `lastMessageAt` (mais recentes primeiro), exibindo nome, telefone, prévia da última mensagem, tempo relativo e badge do estado do funil
- **Modo Funil:** Kanban horizontal com colunas por estado (comportamento existente, sem alteração)

---

## 4. Redefinir horários para o padrão nas configurações

**Status:** ✅ Concluído
**Arquivo modificado:** `app/(tabs)/settings/business-hours.tsx`

**O que foi feito:**
- Adicionadas constantes `DEFAULT_SCHEDULE` e função `isScheduleDefault()`
- Adicionado estado `resetting: boolean`
- Adicionada função `resetToDefault` com `Alert.alert` de confirmação (estilo `destructive`)
- Adicionado botão "Restaurar" no `right` do `ScreenHeader`, visível apenas quando `!isScheduleDefault(localHours)`, desabilitado durante reset ou salvamento
- Adicionados estilos `resetButton` e `resetButtonText` no `StyleSheet`
- Como `(premium-tabs)/settings/business-hours.tsx` re-exporta o arquivo de `(tabs)`, a funcionalidade é aplicada automaticamente em ambos os planos

---

## 5. Data de aniversário do cliente na tela de detalhes

**Status:** ✅ Concluído
**Arquivo modificado:** `components/tab-screens/clients/ClientDetailScreen.tsx`

**O que foi feito:**
Adicionada exibição da data de aniversário no cartão de perfil do cliente, logo após o e-mail, usando:
- Ícone `gift-outline` (Ionicons)
- Data formatada com `formatDate()` (já existia no arquivo)
- Renderizado condicionalmente apenas quando `c.birthDate` está preenchido
O campo `birthDate` já é retornado pela API e salvo pelo formulário de edição — apenas estava ausente na visualização.

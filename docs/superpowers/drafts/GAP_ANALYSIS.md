# Gap Analysis — frontend-components

> Avaliação do que falta após os Tasks 1–6. Baseado na skill `frontend-components` e inspeção do codebase em 2026-05-13.

---

## Achado 1 — Pastas fora do padrão (`components/custom/`, `finance/`, `anamnesis/`, `subscription/`)

**Regra violada:** a estrutura obrigatória permite apenas `components/ui/` e `components/features/<modulo>/`. As pastas abaixo não existem nesse esquema.

### `components/custom/` → deve virar `components/features/appointments/`

Todos os quatro arquivos são exclusivamente consumidos por páginas de agendamento:

| Arquivo | Linhas | Consumidores |
|---|---|---|
| `block-time-slot-dialog.tsx` | 203 | `appointments/blocked/page.tsx` |
| `quick-create-client.tsx` | 279 | `appointments/page.tsx`, `appointments/new/page.tsx` |
| `quick-create-employee.tsx` | 197 | `appointments/new/page.tsx` |
| `quick-create-service.tsx` | 222 | `appointments/page.tsx`, `appointments/new/page.tsx` |

**Ação:** `git mv` cada arquivo para `components/features/appointments/` e atualizar os imports (`@/components/custom/X` → `@/components/features/appointments/X`).

### `components/finance/` → `components/features/finance/`

| Arquivo | Linhas | Consumidores |
|---|---|---|
| `pdf-statement-import.tsx` | 513 | `finance/page.tsx` |

### `components/anamnesis/` → `components/features/anamnesis/`

| Arquivo | Linhas | Consumidores |
|---|---|---|
| `anamnesis-form.tsx` | 223 | `clients/new/page.tsx`, `clients/[id]/page.tsx` |

### `components/subscription/` → `components/features/subscription/`

| Arquivo | Linhas | Consumidores |
|---|---|---|
| `subscription-paywall.tsx` | 68 | `components/layout/admin/main.tsx` |

---

## Achado 2 — `AuthenticatedImage` duplicada em dois `page.tsx`

Já existe `components/ui/custom/authenticated-image.tsx` (versão completa com blob URL e loading state). Mesmo assim, duas páginas definem versões **simplificadas inline** ignorando esse componente:

| Arquivo | Linha | Versão inline |
|---|---|---|
| `app/employees/[id]/page.tsx` | 55 | Sem autenticação real, apenas `<img src>` |
| `app/employees/page.tsx` | 21 | Idem |

**Problema:** a versão inline não autentica o token — expõe a URL da imagem sem cabeçalho de autorização, ao contrário da versão em `ui/custom`.

**Ação:** remover as definições inline e importar `AuthenticatedImage` de `@/components/ui/custom/authenticated-image`.

---

## Achado 3 — Funções utilitárias ainda duplicadas em 3 arquivos

O Task 1 consolidou `formatCurrency`, `formatDate`, `formatDuration` em `lib/format-utils.ts`, mas 3 arquivos foram perdidos:

| Arquivo | Função duplicada | Linha |
|---|---|---|
| `app/settings/membership-plans/page.tsx` | `formatCurrency` | 67 |
| `app/booking/[slug]/page.tsx` | `formatDuration` | 126 |
| `app/clients/[id]/anamnesis/[anamnesisId]/page.tsx` | `formatDate` (inline dentro do componente) | 131 |

**Ação:** remover as definições locais e adicionar `import { formatCurrency } from "@/lib/format-utils"` etc. em cada arquivo.

---

## Achado 4 — `app/(landing)/prices/feedback/page.tsx` (483 linhas, 7 componentes inline)

O arquivo concentra toda a lógica da página de feedback pós-checkout em um único arquivo. Nenhum desses componentes foi tocado nas tasks anteriores.

| Componente | Linha início | Linhas aprox. | Qualifica extração? |
|---|---|---|---|
| `FeedbackLayout` | 45 | ~26 | Borderline (< 30), mas é reutilizável |
| `FooterBrand` | 71 | ~16 | Não |
| `TrialState` | 87 | ~74 | ✓ Sim |
| `NotFoundState` | 161 | ~61 | ✓ Sim |
| `LoadingState` | 222 | ~54 | ✓ Sim |
| `ErrorState` | 276 | ~75 | ✓ Sim |
| `SuccessState` | 351 | ~132 | ✓ Sim |

**Destino:** `components/features/landing/feedback/` (módulo próprio dentro da landing, já que o arquivo está em `app/(landing)/`).

**Ação sugerida:** extrair os 5 componentes ≥30 linhas. `FeedbackLayout` e `FooterBrand` podem ficar inline ou ser co-extraídos junto com o restante para manter coerência.

---

## Achado 5 — `WelcomeCard` inline em `app/booking/[slug]/page.tsx` (64 linhas)

`WelcomeCard` é o card de horários e localização do salão exibido no booking público. Tem 64 linhas e claramente qualifica para extração (> 30 linhas).

- **Linha:** 136 em `app/booking/[slug]/page.tsx` (total: 1167 linhas)
- **Destino:** `components/features/booking/welcome-card.tsx`
- **Dependências locais:** usa `buildGoogleMapsUrl` (helper de 20 linhas), `formatTime`, `DAY_NAMES_PT` — esses também deveriam ir para `components/features/booking/booking-utils.ts`.

---

## Achado 6 — `anamnesis/fill/[token]/page.tsx` — `QuestionField` + canvas duplicado

### `QuestionField` (100 linhas) deve ser extraído

Componente de 100 linhas que renderiza campos de formulário via `switch (fieldType)`. Qualifica claramente para extração (> 30 linhas).

Mais importante: **`components/anamnesis/anamnesis-form.tsx` implementa o mesmo switch** com os mesmos cases (`ShortText`, `LongText`, `Boolean`, `SingleSelection`, `MultipleSelection`). São dois `QuestionField` paralelos com lógica idêntica.

**Ação:**
- Extrair para `components/features/anamnesis/question-field.tsx`
- Atualizar `anamnesis-form.tsx` para importar o mesmo componente
- Mover `FieldType`, `SECTION_LABELS` e `parseOptions` para `components/features/anamnesis/anamnesis.types.ts`

### Canvas/assinatura — candidato a `ui/custom/signature-pad`

A lógica de canvas (`getPos`, `startDrawing`, `draw`, `stopDrawing`, `clearCanvas` + JSX do canvas) existe **quase identicamente em dois arquivos**:

| Arquivo | Contexto |
|---|---|
| `anamnesis/fill/[token]/page.tsx` | Preenchimento + assinatura |
| `anamnesis/sign/[token]/page.tsx` | Apenas assinatura |

Sem chamadas de API, sem hooks de domínio — só React refs/callbacks e canvas nativo. Qualifica para **promoção a `ui/custom`** (2 consumers + sem lógica de negócio).

**Destino:** `components/ui/custom/signature-pad.tsx`
```tsx
export function SignaturePad({ onSign, onClear }: {
  onSign: (dataUrl: string) => void
  onClear: () => void
})
```

---

## Achado 7 — `settings/business-hours/page.tsx` — `BusinessHoursContent` (421 linhas)

O arquivo tem 593 linhas totais. O `export default` é um wrapper de 8 linhas que só envolve `AuthGuard` + `BusinessHoursContent`. O componente em si tem **421 linhas** com toda a lógica de negócio (SWR, `secureApiCall`, estado local de horários, save por dia, reset).

```
// page.tsx (593 linhas)
function DayCardSkeleton()       ← 15 linhas, ok
function BusinessHoursContent()  ← 421 linhas ← PROBLEMA
export default BusinessHoursPage ← 8 linhas (só AuthGuard wrapper)
```

**Destino:** `components/features/settings/business-hours-content.tsx`

O padrão de ter um `BusinessHoursContent` para isolar o hook dentro do AuthGuard é válido, mas o componente deve estar em `features/`, não embutido em `page.tsx`.

---

## Achado 8 — `notifications/page.tsx` — `NotificationItem` (63 linhas)

Componente de 63 linhas que renderiza um item de notificação com ícone, título, corpo, timestamp e estado de seleção. Qualifica para extração (> 30 linhas).

- **Linha:** 49 em `notifications/page.tsx` (total: 253 linhas)
- **Destino:** `components/features/notifications/notification-item.tsx`
- **Dependências:** usa `getNotificationIcon` e `getRelativeTime` — helpers que podem ir para `components/features/notifications/notification-utils.ts`

---

## Priorização

| # | Achado | Impacto | Esforço | Prioridade |
|---|---|---|---|---|
| 2 | `AuthenticatedImage` inline nos employees (bug de auth) | Alto — imagens sem token | Baixo | **🔴 Urgente** |
| 3 | `formatCurrency/Duration/Date` ainda duplicados | Médio — inconsistência | Baixo | **🟠 Alta** |
| 1 | Pastas `custom/`, `finance/`, `anamnesis/`, `subscription/` | Médio — estrutura errada | Médio (git mv + sed) | **🟠 Alta** |
| 4 | `feedback/page.tsx` — 5 componentes a extrair | Baixo — só organização | Médio | **🟡 Média** |
| 5 | `WelcomeCard` em `booking/[slug]/page.tsx` | Baixo — só organização | Baixo | **🟡 Média** |
| 6 | `QuestionField` duplicado anamnesis + `SignaturePad` (`ui/custom`) | Médio — duplicação real de lógica | Médio | **🟠 Alta** |
| 7 | `BusinessHoursContent` (421L) embutido em `page.tsx` | Baixo — só organização | Baixo | **🟡 Média** |
| 8 | `NotificationItem` (63L) embutido em `page.tsx` | Baixo — só organização | Baixo | **🟡 Média** |

> **Nota:** nenhuma violação de `export default` foi encontrada em `components/`. Os hooks estão todos corretos. A regra de promoção `features/ → ui/` tem um candidato: `SignaturePad` (canvas/assinatura usado em 2 páginas de anamnesis, sem lógica de negócio).





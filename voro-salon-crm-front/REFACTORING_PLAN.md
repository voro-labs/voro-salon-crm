# Plano de Refatoração — Frontend Components

> Branch: `refactor/frontend-components`
> Data: 2026-05-13
> Skill: `frontend-components`

---

## Estrutura de Componentes Atual vs. Esperada

### Problemas Identificados

| Categoria | Quantidade | Impacto |
|-----------|-----------|---------|
| Pages > 1000 linhas | 8 | Crítico |
| Componentes inline > 30 linhas | 13 pages | Crítico |
| Funções utilitárias duplicadas | 4+ tipos | Alto |
| Componentes na raiz de `components/` que deveriam estar em `features/` | 9 arquivos | Médio |

### Estrutura Esperada Pós-Refatoração

```
components/
├── ui/                         ← genéricos, sem lógica de negócio
│   ├── button.tsx (existente)
│   ├── ...
│   └── custom/ (existente, manter)
├── features/
│   ├── appointments/           ← NOVO
│   │   ├── calendar-week-view.tsx
│   │   └── agenda-day-view.tsx
│   ├── settings/               ← NOVO
│   │   ├── branding-tab.tsx
│   │   ├── two-factor-tab.tsx
│   │   ├── whatsapp-tab.tsx
│   │   ├── evolution-tab.tsx
│   │   └── establishment-tab.tsx
│   ├── landing/                ← NOVO
│   │   ├── count-up.tsx
│   │   ├── section.tsx
│   │   └── mockups/
│   │       ├── dashboard-mockup.tsx
│   │       ├── appointments-mockup.tsx
│   │       ├── clients-mockup.tsx
│   │       ├── finance-mockup.tsx
│   │       ├── services-mockup.tsx
│   │       └── reports-mockup.tsx
│   ├── finance/                ← NOVO
│   ├── booking/                ← NOVO
│   ├── whatsapp/               ← NOVO
│   └── funnel/                 ← NOVO
├── auth/ (existente, correto)
├── layout/ (existente, correto)
├── legal/ (existente, correto)
└── subscription/ (existente, correto)

lib/
├── format.ts                   ← NOVO (formatCurrency, formatDate, formatDuration)
└── calendar.ts                 ← NOVO (isDateClosed, isDayClosed, business hours)
```

## Task 1 — `app/appointments/page.tsx` (1813 linhas) 🔴 CRÍTICO

**Problema:** 2 componentes inline massivos dentro da page.

### 1.1 Extrair `CalendarWeekView`
- **Origem:** `app/appointments/page.tsx` linhas 58–452 (~395 linhas)
- **Destino:** `components/features/appointments/calendar-week-view.tsx`
- **Funções internas a mover junto:** `isDayClosed`, `isInBusinessHours`, `hasConflict`, `isSlotPast`, `handleSlotClick`

### 1.2 Extrair `AgendaDayView`
- **Origem:** `app/appointments/page.tsx` linhas 456+ (~150 linhas)
- **Destino:** `components/features/appointments/agenda-day-view.tsx`

**Resultado esperado:** page cai de 1813 → ~1268 linhas (redução de 30%)

## Task 2 — `app/settings/page.tsx` (1888 linhas) 🔴 CRÍTICO

**Problema:** 40+ `useState` numa única page, sem separação por tab.

Extrair cada tab para `components/features/settings/`:
- `branding-tab.tsx`, `establishment-tab.tsx`, `two-factor-tab.tsx`, `whatsapp-tab.tsx`, `evolution-tab.tsx`

**Resultado esperado:** page cai de 1888 → ~400 linhas

## Task 3 — `app/(landing)/prices/page.tsx` (3117 linhas) 🔴 CRÍTICO

**Problema:** 18+ funções/componentes inline incluindo mockups completos.

Extrair para `components/features/landing/`:
- `count-up.tsx`, `section.tsx`
- `mockups/dashboard-mockup.tsx`, `mockups/appointments-mockup.tsx`, `mockups/clients-mockup.tsx`
- `mockups/finance-mockup.tsx`, `mockups/services-mockup.tsx`, `mockups/reports-mockup.tsx`

**Resultado esperado:** page cai de 3117 → ~800 linhas

## Task 4 — Consolidar Funções Utilitárias Duplicadas 🟡 ALTO

Criar `lib/format.ts` com: `formatCurrency`, `formatDate`, `formatDuration`, `formatPhone`
Criar `lib/calendar.ts` com: `isDateClosed`, `isDayClosed`, `isInBusinessHours`

## Task 5 — Componentes na Raiz de `components/` 🟡 MÉDIO

Mover 9 arquivos soltos da raiz para `ui/custom/` ou `providers/`.

## Task 6 — Pages Secundárias 🟢 MÉDIO

`whatsapp/page.tsx` → `ChatView`, `funnel/page.tsx` → `VisitorGroupCard`, `booking/[slug]/page.tsx`, `finance/page.tsx`

## Ordem de Execução

1. Task 4 — lib utilities (fundação)
2. Task 1 — appointments (maior ROI)
3. Task 2 — settings (separação clara)
4. Task 3 — landing/prices (mais trabalhoso)
5. Task 5 — limpeza de raiz
6. Task 6 — refinamento final

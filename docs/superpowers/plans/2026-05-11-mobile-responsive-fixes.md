# Mobile Responsive Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir os problemas de layout mobile em 4 rotas — Agendamentos, Financeiro, Funil e WhatsApp — sem alterar o comportamento no desktop.

**Architecture:** Correções pontuais de classes CSS/Tailwind em cada página afetada. O WhatsApp requer adicionalmente uma lógica de estado mobile master-detail já suportada pela estrutura existente do componente `ChatView`. Nenhum componente compartilhado é alterado.

**Tech Stack:** Next.js 14 App Router, React, Tailwind CSS, TypeScript

**Spec de referência:** `docs/superpowers/specs/2026-05-11-mobile-responsive-fixes-design.md`

> **Nota sobre testes:** Estas correções são puramente visuais (CSS/layout). Não há lógica de negócio a testar com testes unitários. A verificação é feita rodando o servidor de desenvolvimento e inspecionando as rotas com DevTools em viewport mobile (375×812 — iPhone 14). Cada task inclui instruções de verificação.

---

## Mapa de arquivos

| Arquivo | O que muda |
|---|---|
| `voro-salon-crm-front/app/appointments/page.tsx` | Remove `justify-between` do wrapper de controles; adiciona `ml-auto` ao grupo direito |
| `voro-salon-crm-front/app/finance/page.tsx` | Remove `justify-end` do wrapper; botões secundários usam `grid grid-cols-3` no mobile |
| `voro-salon-crm-front/app/funnel/page.tsx` | Adiciona `flex-wrap`; oculta texto de Legenda/Atualizar no mobile |
| `voro-salon-crm-front/app/whatsapp/page.tsx` | Lógica master-detail mobile; sidebar condicional; botão Voltar |

---

## Task 1: Fix Agendamentos — espaço em branco à direita

**Arquivo:**
- Modify: `voro-salon-crm-front/app/appointments/page.tsx:1352–1462`

### Contexto
O wrapper da segunda linha de controles usa `justify-between` com `flex-wrap`. Quando os itens quebram de linha no mobile (Tabs ocupa linha inteira com `w-full`), os itens restantes ficam alinhados à esquerda, deixando espaço em branco à direita. A solução é remover `justify-between` e usar `ml-auto` no grupo direito (mic + view-toggle).

- [ ] **Passo 1: Localizar o wrapper da segunda linha de controles**

Abra `voro-salon-crm-front/app/appointments/page.tsx` e localize a linha ~1352. Você verá:

```tsx
{/* Linha 1: filtro de período + toggle de visualização */}
<div className="flex flex-wrap items-center justify-between w-full gap-2">
```

- [ ] **Passo 2: Remover `justify-between` do wrapper**

Troque a linha encontrada acima por:

```tsx
{/* Linha 1: filtro de período + toggle de visualização */}
<div className="flex flex-wrap items-center w-full gap-2">
```

- [ ] **Passo 3: Localizar o grupo direito (mic + view-toggle)**

Ainda no mesmo bloco, localize por volta da linha ~1416:

```tsx
<div className="flex items-center gap-1.5 shrink-0">
```

- [ ] **Passo 4: Adicionar `ml-auto` ao grupo direito**

Troque essa linha por:

```tsx
<div className="flex items-center gap-1.5 shrink-0 ml-auto">
```

- [ ] **Passo 5: Verificar visualmente**

```bash
cd voro-salon-crm-front
npm run dev
```

Abra `http://localhost:3000/appointments` no Chrome DevTools com viewport 375×812 (iPhone 14). Confirme:
- Tabs de período (Hoje/Semana/Tudo/Anteriores) ocupa a primeira linha
- "Atrasados" aparece na segunda linha, alinhado à esquerda
- Mic + view-toggle aparecem na mesma segunda linha, alinhados à direita (via `ml-auto`)
- Nenhum espaço vazio à direita de nenhum elemento

- [ ] **Passo 6: Commit**

```bash
cd voro-salon-crm-front
git add app/appointments/page.tsx
git commit -m "fix(appointments): corrige espaço em branco à direita no header mobile"
```

---

## Task 2: Fix Financeiro — scroll horizontal no header

**Arquivo:**
- Modify: `voro-salon-crm-front/app/finance/page.tsx:458–628`

### Contexto
O wrapper da action tem `justify-end flex-wrap`. O botão secundário (ExportMenu e outros) podem ter largura mínima que força overflow horizontal. A solução é remover `justify-end` do wrapper externo e mudar o container dos botões secundários para `grid grid-cols-3` no mobile, garantindo distribuição igual sem overflow.

- [ ] **Passo 1: Localizar o wrapper externo da action**

Abra `voro-salon-crm-front/app/finance/page.tsx` e localize por volta da linha ~463:

```tsx
<div className="flex flex-wrap justify-end items-center gap-2 w-full sm:w-auto">
```

- [ ] **Passo 2: Remover `justify-end` do wrapper externo**

Troque por:

```tsx
<div className="flex flex-col gap-2 w-full sm:flex-row sm:flex-wrap sm:items-center sm:w-auto">
```

- [ ] **Passo 3: Localizar o div dos botões secundários**

Logo dentro do div alterado acima, localize:

```tsx
<div className="flex items-center gap-2 w-full sm:w-auto order-2 sm:order-1">
```

- [ ] **Passo 4: Trocar o container dos secundários para grid no mobile**

```tsx
<div className="grid grid-cols-3 gap-2 w-full sm:flex sm:items-center sm:w-auto sm:gap-2 order-2 sm:order-1">
```

- [ ] **Passo 5: Remover `flex-1` dos botões secundários (não precisam mais no grid)**

Localize os três botões dentro desse container. Cada um tem `className` com `flex-1 sm:flex-none h-9`. Remova apenas o `flex-1`:

Botão Categorias — de:
```tsx
<Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none h-9">
```
Para:
```tsx
<Button variant="outline" size="sm" asChild className="sm:flex-none h-9">
```

Botão Importar PDF — de:
```tsx
<Button
  variant="outline"
  size="sm"
  className="flex-1 sm:flex-none h-9"
  onClick={() => setIsPdfImportOpen(true)}
>
```
Para:
```tsx
<Button
  variant="outline"
  size="sm"
  className="sm:flex-none h-9"
  onClick={() => setIsPdfImportOpen(true)}
>
```

ExportMenu — de:
```tsx
<ExportMenu
  size="sm"
  rows={filteredTransactions}
  filename="financeiro"
  className="flex-1 sm:flex-none h-9"
  ...
/>
```
Para:
```tsx
<ExportMenu
  size="sm"
  rows={filteredTransactions}
  filename="financeiro"
  className="sm:flex-none h-9"
  ...
/>
```

- [ ] **Passo 6: Localizar o div do botão primário**

Localize:
```tsx
<div className="flex items-center order-1 sm:order-2 w-full sm:w-auto">
```

- [ ] **Passo 7: Garantir que o primário ocupe largura completa no mobile**

Está correto como está (`w-full sm:w-auto`). O botão Novo Lançamento tem `flex-1 sm:flex-none` — isso já funciona no mobile dentro de um div `w-full`. Não alterar.

- [ ] **Passo 8: Verificar visualmente**

```bash
cd voro-salon-crm-front
npm run dev
```

Abra `http://localhost:3000/finance` no Chrome DevTools com viewport 375×812. Confirme:
- Botão "Novo Lançamento" ocupa toda a primeira linha (mobile)
- Categorias, Importar PDF e Exportar ficam na segunda linha, distribuídos em 3 colunas iguais
- Nenhum scroll horizontal na página
- No desktop (> 640px), layout volta ao original: todos os botões em linha horizontal

- [ ] **Passo 9: Commit**

```bash
cd voro-salon-crm-front
git add app/finance/page.tsx
git commit -m "fix(finance): corrige overflow horizontal dos botões do header no mobile"
```

---

## Task 3: Fix Funil — botões fora da tela

**Arquivo:**
- Modify: `voro-salon-crm-front/app/funnel/page.tsx:197–244`

### Contexto
O wrapper da action não tem `flex-wrap`, então os 4 controles ficam em linha única e transbordam em mobile. A solução é adicionar `flex-wrap` e reduzir os botões Legenda e Atualizar para ícone-only no mobile.

- [ ] **Passo 1: Localizar o wrapper da action no Funil**

Abra `voro-salon-crm-front/app/funnel/page.tsx` e localize por volta da linha ~198:

```tsx
<div className="flex items-center gap-2">
```

Esse é o div dentro do `action={}` do `PageHeader`.

- [ ] **Passo 2: Adicionar `flex-wrap` ao wrapper**

Troque por:

```tsx
<div className="flex flex-wrap items-center gap-2">
```

- [ ] **Passo 3: Localizar o botão Legenda**

Logo abaixo, localize:

```tsx
<Button variant="outline" size="sm" onClick={() => setShowLegend(true)}>
  <Info className="mr-1.5 h-4 w-4" />
  Legenda
</Button>
```

- [ ] **Passo 4: Tornar o texto "Legenda" oculto no mobile**

Troque por:

```tsx
<Button variant="outline" size="sm" onClick={() => setShowLegend(true)}>
  <Info className="h-4 w-4 sm:mr-1.5" />
  <span className="hidden sm:inline">Legenda</span>
</Button>
```

- [ ] **Passo 5: Localizar o botão Atualizar**

```tsx
<Button variant="outline" size="sm" onClick={() => mutate()}>
  <RefreshCw className="mr-2 h-4 w-4" />
  Atualizar
</Button>
```

- [ ] **Passo 6: Tornar o texto "Atualizar" oculto no mobile**

Troque por:

```tsx
<Button variant="outline" size="sm" onClick={() => mutate()}>
  <RefreshCw className="h-4 w-4 sm:mr-2" />
  <span className="hidden sm:inline">Atualizar</span>
</Button>
```

- [ ] **Passo 7: Verificar visualmente**

```bash
cd voro-salon-crm-front
npm run dev
```

Abra `http://localhost:3000/funnel` no Chrome DevTools com viewport 375×812. Confirme:
- Toggle "Com itens / Todas" visível na primeira linha
- Botão "Abandonados" visível na mesma linha ou na linha seguinte (wrapping)
- Botões Legenda (ℹ️) e Atualizar (🔄) visíveis como ícone-only, sem scroll horizontal
- No desktop, ambos os botões mostram o texto completo

- [ ] **Passo 8: Commit**

```bash
cd voro-salon-crm-front
git add app/funnel/page.tsx
git commit -m "fix(funnel): corrige overflow horizontal dos controles do header no mobile"
```

---

## Task 4: Fix WhatsApp — chat ilegível no mobile (master-detail)

**Arquivo:**
- Modify: `voro-salon-crm-front/app/whatsapp/page.tsx` — função `ChatView` (linhas ~70–300)

### Contexto
O sidebar tem `w-72 shrink-0` (288px fixos). Em mobile de 375px, o painel de mensagens fica com ~87px — as mensagens exibem 1 caractere por linha. A solução é master-detail: no mobile, sidebar e chat se alternam via estado `selected`; no desktop, ambos ficam lado a lado como antes.

- [ ] **Passo 1: Adicionar `ChevronLeft` aos imports**

Abra `voro-salon-crm-front/app/whatsapp/page.tsx`. Localize a linha de imports de ícones (~linha 8):

```tsx
import {
  MessageCircle, RefreshCw, Loader2, User, Send, X,
  CheckCircle, AlertCircle, ExternalLink, ChevronRight, Settings2,
  MessageSquare, Trash2,
} from "lucide-react"
```

Adicione `ChevronLeft`:

```tsx
import {
  MessageCircle, RefreshCw, Loader2, User, Send, X,
  CheckCircle, AlertCircle, ExternalLink, ChevronLeft, ChevronRight, Settings2,
  MessageSquare, Trash2,
} from "lucide-react"
```

- [ ] **Passo 2: Tornar o sidebar condicional no mobile**

Localize a abertura do div do sidebar (~linha 155):

```tsx
<div className="w-72 shrink-0 flex flex-col border-r border-border">
```

Troque por:

```tsx
<div className={cn(
  "flex flex-col border-r border-border",
  "w-full md:w-72 md:shrink-0",
  selected ? "hidden md:flex" : "flex"
)}>
```

- [ ] **Passo 3: Tornar o painel de mensagens condicional no mobile**

Localize a abertura do painel de mensagens quando `selected !== null` (~linha 218):

```tsx
{selected ? (
  <div className="flex-1 flex flex-col min-w-0">
```

Troque por:

```tsx
{selected ? (
  <div className="flex flex-col flex-1 min-w-0">
```

> O painel de mensagens, quando `selected !== null`, já ocupa `flex-1`. Em mobile, com o sidebar oculto (`hidden md:flex`), este painel naturalmente ocupa 100% da largura. Não é necessário adicionar classe extra de visibilidade aqui.

- [ ] **Passo 4: Ocultar o estado vazio no mobile**

Localize o painel mostrado quando nenhum contato está selecionado (~linha 294):

```tsx
) : (
  <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
    <MessageSquare className="h-10 w-10 opacity-30" />
    <p className="text-sm">Selecione uma conversa para ver as mensagens</p>
  </div>
)}
```

Troque por:

```tsx
) : (
  <div className="hidden md:flex flex-1 flex-col items-center justify-center text-muted-foreground gap-3">
    <MessageSquare className="h-10 w-10 opacity-30" />
    <p className="text-sm">Selecione uma conversa para ver as mensagens</p>
  </div>
)}
```

> Em mobile, quando nenhum contato está selecionado, apenas o sidebar é visível — o estado vazio fica oculto. No desktop, o estado vazio continua aparecendo à direita.

- [ ] **Passo 5: Adicionar botão "Voltar" no header do chat (mobile only)**

Localize o header do painel de mensagens (~linha 221):

```tsx
{/* Header */}
<div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-muted/30">
  <div className="flex items-center gap-3 min-w-0">
    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
      {displayName(selected).charAt(0).toUpperCase()}
    </div>
```

Adicione o botão "Voltar" antes do avatar, visível apenas no mobile:

```tsx
{/* Header */}
<div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-muted/30">
  <div className="flex items-center gap-3 min-w-0">
    <button
      onClick={() => setSelected(null)}
      className="md:hidden flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0 -ml-1"
      aria-label="Voltar para conversas"
    >
      <ChevronLeft className="h-5 w-5" />
      <span className="text-xs font-medium">Voltar</span>
    </button>
    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
      {displayName(selected).charAt(0).toUpperCase()}
    </div>
```

- [ ] **Passo 6: Verificar visualmente — lista de conversas**

```bash
cd voro-salon-crm-front
npm run dev
```

Abra `http://localhost:3000/whatsapp` no Chrome DevTools com viewport 375×812. Confirme:
- Lista de conversas ocupa 100% da tela no mobile
- Nenhum painel de mensagens visível enquanto nenhum contato está selecionado
- Barra de busca e lista de contatos funcionando normalmente

- [ ] **Passo 7: Verificar visualmente — chat**

Clique em um contato na lista. Confirme:
- A lista de conversas desaparece
- O chat ocupa 100% da largura da tela
- As mensagens são legíveis (sem 1 caractere por linha)
- O botão "← Voltar" aparece no canto esquerdo do header do chat
- Clicar em "Voltar" retorna à lista de conversas

- [ ] **Passo 8: Verificar desktop (sem regressão)**

Redimensione o DevTools para 1280×800 (ou desative o emulador mobile). Confirme:
- Sidebar (lista) e painel de mensagens aparecem lado a lado
- Botão "Voltar" não aparece no desktop
- Layout idêntico ao anterior

- [ ] **Passo 9: Commit**

```bash
cd voro-salon-crm-front
git add app/whatsapp/page.tsx
git commit -m "fix(whatsapp): implementa master-detail mobile no chat de conversas"
```

---

## Checklist Final de Verificação

Após todos os 4 commits, rode o servidor e verifique rapidamente as 4 rotas em mobile (375×812):

- [ ] `/appointments` — sem espaço em branco à direita nos controles de filtro
- [ ] `/finance` — sem scroll horizontal; botões em grid 3 colunas no mobile
- [ ] `/funnel` — todos os controles visíveis; Legenda e Atualizar como ícone-only
- [ ] `/whatsapp` — chat legível em tela cheia; botão Voltar funcional
- [ ] Todas as 4 rotas no desktop — sem regressão visual

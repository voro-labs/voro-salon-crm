# Design: Correções de Responsividade Mobile

**Data**: 2026-05-11  
**Escopo**: 4 rotas — Agendamentos, Financeiro, Funil, WhatsApp  
**Tipo**: Bug fix / UX improvement

---

## Contexto

As telas de listagem do sistema apresentam problemas visuais em viewport mobile (< 640px). Os problemas foram identificados pelo usuário e confirmados via análise de código:

1. **Agendamentos** — botões "Atrasados", microfone e opções de visualização deixam espaço em branco à direita
2. **Financeiro** — botões do header (Exportar, Categorias, etc.) transbordam para fora da tela, causando scroll horizontal
3. **Funil** — botões "Legenda" e "Atualizar" ficam fora da tela, causando scroll horizontal
4. **WhatsApp** — ao selecionar um contato, o chat fica com largura de ~87px (sidebar fixa de 288px + tela de ~375px), exibindo apenas 1 caractere por linha

---

## Abordagem Adotada

**Abordagem A — Cirurgia mínima por página**  
Correções pontuais em cada arquivo afetado. Sem refatoração de componentes compartilhados (`PageHeader`, etc.). Sem mudança de comportamento no desktop.

---

## Fix 1 — Agendamentos (`app/appointments/page.tsx`)

### Causa Raiz
Linha ~1352: o wrapper da segunda linha de controles usa `justify-between` com `flex-wrap`. Quando os itens quebram de linha, o último item de cada linha fica isolado e alinhado à esquerda, deixando espaço em branco à direita (comportamento padrão de `flex-wrap + justify-between`).

O Tabs de período tem `w-full sm:w-fit` (linha ~1356), ocupando a linha inteira no mobile — o que empurra "Atrasados", mic e view-toggle para linhas subsequentes, onde ficam desalinhados.

### Solução
- Remover `justify-between` do wrapper (`div` na linha ~1352)
- Adicionar `ml-auto` ao grupo da direita (mic + view-toggle) para que ele se ancore à direita **sem depender de justify-between**
- O Tabs mantém `w-full sm:w-fit` — em mobile ele ocupa a linha, e o grupo direito fica na linha seguinte mas à direita via `ml-auto`

### Resultado Esperado
```
mobile:
[Hoje | Semana | Tudo | Anteriores         ]
[Atrasados 2]              [🎙] [📋|📅|⊞]

desktop (sem mudança):
[Hoje|Semana|Tudo|Anteriores] [Atrasados]         [🎙] [Lista|Agenda|Grade]
```

---

## Fix 2 — Financeiro (`app/finance/page.tsx`)

### Causa Raiz
Linha ~463: o wrapper da action tem `justify-end flex-wrap`, e os botões internos têm `flex-1 sm:flex-none`. A combinação com `justify-end` pode causar overflow quando o conteúdo total ultrapassa a largura disponível. O `ExportMenu` e outros botões não colapsam corretamente.

### Solução
- Remover `justify-end` do wrapper externo da action
- Garantir que os dois grupos (secundário e primário) sejam `w-full` com `flex-1` funcionando corretamente
- O grupo de botões secundários (Categorias, Importar PDF, Export) usa `grid grid-cols-3 gap-2 w-full` em mobile para distribuição igual e sem overflow
- Em `sm:`, volta ao `flex` normal com `flex-none`
- O botão primário (Novo Lançamento + seta) fica numa linha separada `w-full sm:w-auto`

### Resultado Esperado
```
mobile:
[Novo Lançamento ▾                        ]
[Categorias] [Importar PDF] [Exportar     ]

desktop (sem mudança):
[Categorias] [Importar PDF] [Exportar] [Novo Lançamento ▾]
```

---

## Fix 3 — Funil (`app/funnel/page.tsx`)

### Causa Raiz
Linha ~198: o wrapper da action é `<div className="flex items-center gap-2">` — sem `flex-wrap`. São 4 controles (toggle, Abandonados, Legenda, Atualizar) em linha única que transbordam em mobile.

### Solução
- Adicionar `flex-wrap gap-2` ao wrapper da action
- Botões "Legenda" e "Atualizar": ocultar texto em mobile, mostrar apenas ícone. Texto visível em `sm:`:
  - `<Info className="h-4 w-4" /><span className="hidden sm:inline ml-1.5">Legenda</span>`
  - `<RefreshCw className="mr-0 sm:mr-2 h-4 w-4" /><span className="hidden sm:inline">Atualizar</span>`

### Resultado Esperado
```
mobile:
[Com itens | Todas] [Abandonados] [ℹ️] [🔄]

desktop (sem mudança):
[Com itens | Todas] [Abandonados] [ℹ️ Legenda] [🔄 Atualizar]
```

---

## Fix 4 — WhatsApp (`app/whatsapp/page.tsx` → `ChatView`)

### Causa Raiz
Linha ~155: o sidebar tem `w-72 shrink-0` (288px fixos). Em um dispositivo mobile de 375px, o painel de mensagens fica com 87px — as mensagens com `max-w-[72%]` ficam com ~63px, o suficiente para 1–2 caracteres por linha.

### Solução — Master-Detail Mobile

**Estado**: O `selected` já existe. A mudança é: em mobile, um painel oculta o outro.

**Sidebar (lista de conversas)**:
- `className`: de `w-72 shrink-0 flex flex-col border-r` para:  
  `w-full md:w-72 md:shrink-0 flex flex-col border-r md:border-r border-border`  
  + condicional: `hidden md:flex` quando `selected !== null` (mobile oculta a lista)

**Painel de mensagens**:
- De `flex-1 flex flex-col min-w-0` para:  
  `flex-1 flex flex-col min-w-0`  
  + condicional: `hidden md:flex` quando `selected === null` (mobile oculta o chat vazio)  
  + quando `selected !== null`: `flex` (visível e ocupa 100% no mobile)

**Botão "Voltar" no header do chat** (mobile only):
- Adicionado antes do avatar do contato selecionado, visível apenas em mobile (`md:hidden`)
- `onClick={() => setSelected(null)}`
- Ícone `ChevronLeft` + texto "Conversas"

**Container externo**:
- Remove `flex` fixo; usa `flex` para desktop e comportamento em bloco no mobile

### Resultado Esperado
```
mobile — lista:
[Buscar conversa...]
[Avatar] Maria Silva      10:30
         Oi, quero agendar...
[Avatar] João Pereira     09:15
         Ok, obrigado!

mobile — chat (após selecionar):
[← Conversas] Maria Silva
─────────────────────────────
         Olá, tudo bem?     10:28
Claro! Às 14h?              10:29
─────────────────────────────

desktop (sem mudança):
[lista] | [chat]
```

---

## Arquivos Afetados

| Arquivo | Tipo de mudança |
|---|---|
| `voro-salon-crm-front/app/appointments/page.tsx` | CSS classes — layout fix |
| `voro-salon-crm-front/app/finance/page.tsx` | CSS classes — layout fix |
| `voro-salon-crm-front/app/funnel/page.tsx` | CSS classes + ocultar texto mobile |
| `voro-salon-crm-front/app/whatsapp/page.tsx` | Lógica de estado + CSS classes |

## Arquivos NÃO Afetados

- `components/ui/custom/page-header.tsx` — sem alteração
- Qualquer outro arquivo — sem alteração

---

## Critérios de Aceitação

- [ ] Agendamentos: em mobile, nenhum botão deixa espaço vazio à direita ao quebrar linha
- [ ] Financeiro: em mobile, nenhum botão do header causa scroll horizontal
- [ ] Funil: em mobile, todos os controles do header cabem na tela sem scroll horizontal
- [ ] WhatsApp: em mobile, selecionar um contato mostra o chat em tela cheia; botão "Voltar" retorna à lista
- [ ] Desktop: comportamento visual idêntico ao atual em todas as 4 rotas

---

## Fora de Escopo

- Redesign do `PageHeader` para ações complexas (Abordagem B)
- Drawer/Sheet para ações secundárias (Abordagem C)
- Correções em outras rotas além das 4 listadas
- Qualquer mudança de comportamento no desktop

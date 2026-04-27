# Spec: Popup "Atrasados" e Data nos Agendamentos

## Objetivo

Adicionar um botão "Atrasados" na tela de agendamentos que abre um popup com todos os agendamentos passados ainda pendentes/confirmados — idêntico ao popup já existente no dashboard. Também exibir a data completa nos cards de agendamento e dentro do popup do dashboard.

---

## Escopo

### 1. Tela de Agendamentos (`app/appointments/page.tsx`)

#### 1.1 Botão "Atrasados"

- Posicionado à **direita do `TabsList`** de período (Hoje / Semana / Tudo / Anteriores), na mesma linha.
- Estilo: variante `outline` com cor âmbar (`border-amber-300 text-amber-700 hover:bg-amber-50`), tamanho `sm`, altura `h-8`.
- Exibe ícone `AlertTriangle` + texto "Atrasados".
- Exibe badge âmbar com contagem total de atrasados quando `overdueCount > 0`.
- Ao clicar: abre `showOverdueModal = true`.

#### 1.2 Fetch dedicado para atrasados

```ts
const overdueKey = `${API_CONFIG.ENDPOINTS.APPOINTMENTS}?page=1&pageSize=200&dateTo=${encodeURIComponent(new Date().toISOString())}`
const { data: overdueRaw, mutate: mutateOverdue } = useSWR(overdueKey, fetcher, {
  revalidateOnFocus: false,
  refreshInterval: 0,
  revalidateOnReconnect: false,
})
```

- Filtragem client-side: `status === 0 || status === 1` (Pendente ou Confirmado).
- `overdueCount` = número de itens após filtro.
- **Não auto-atualiza** — o usuário vê o estado congelado no momento em que abre o modal e atualiza manualmente via ações.

#### 1.3 Dialog "Atrasados"

- Controlado por `showOverdueModal: boolean`.
- Reutiliza a mesma estrutura visual do dialog do dashboard:
  - Header: ícone `AlertTriangle` âmbar + título "Agendamentos sem atualização".
  - Subtítulo: "Os agendamentos abaixo já passaram e ainda estão como pendente ou confirmado."
  - Lista com scroll (`max-h-[400px] overflow-y-auto`).
  - Footer: botão "Fechar".
- Cada card de atrasado exibe:
  - Nome do cliente (bold).
  - Serviço ou "Sem serviço".
  - Data + hora: `dd/MM/yyyy às HH:mm` (ex: `25/04/2026 às 14:30`).
  - Botões de ação: **Concluído** (verde) · **Cancelado** (vermelho outline) · **Faltou** (laranja outline).
- Estado de loading por item: `updatingId` local no componente.

#### 1.4 Ação de atualização de status

Ao clicar em Concluído / Cancelado / Faltou:
1. Chama `PATCH /api/v1/appointments/{id}/status` com o novo status.
2. Após sucesso: `mutateOverdue()` + `mutate()` do `useDataList` (o hook já expõe `mutate` diretamente).
3. `toast.success("Status atualizado")`.
4. Em caso de erro: `toast.error("Erro ao atualizar")`.

#### 1.5 Data nos cards da lista principal

Linha de tempo atual:
```
🕐 HH:mm (X min)
```

Nova linha de tempo:
```
🕐 dd/MM/yyyy às HH:mm (X min)
```

Aplica-se a **todos os cards** da list view, não apenas atrasados. Isso é especialmente útil na tab "Anteriores" (últimos 30 dias) onde só o horário não é suficiente.

---

### 2. Dashboard (`app/page.tsx`)

#### 2.1 Data no popup de agendamentos passados

No `Dialog` `showPastModal`, cada card de agendamento passado exibe atualmente:
```
🕐 HH:mm
```

Passa a exibir:
```
🕐 dd/MM/yyyy às HH:mm
```

Nenhuma outra mudança estrutural no dashboard.

---

## Comportamento de Invalidação

| Ação | Efeito |
|------|--------|
| Atualiza status no popup (appointments) | `mutateOverdue()` + invalida lista principal |
| Atualiza status no popup (dashboard) | Comportamento existente (já invalida `aptData`) |
| Abre o modal pela primeira vez | Usa dados já carregados no SWR (sem nova fetch) |
| Fecha e reabre o modal | Mesmo snapshot — não re-busca automaticamente |

---

## Arquivos Modificados

| Arquivo | O que muda |
|---------|-----------|
| `app/appointments/page.tsx` | Fetch `overdueKey`, estado `showOverdueModal`, botão "Atrasados", Dialog, data nos cards |
| `app/page.tsx` | Data `dd/MM/yyyy às HH:mm` nos cards do modal `showPastModal` |

---

## O que NÃO está no escopo

- Nenhuma mudança de API/backend.
- Não há novo componente separado — tudo inline nos dois arquivos existentes.
- Não alterar o comportamento do tab "Anteriores" existente.
- Não adicionar filtros ou ordenação no popup.

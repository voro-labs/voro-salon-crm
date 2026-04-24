# Tasks

## ~~Task 1: Modo de Visualização "Agenda"~~ ✅
## ~~Task 2: Whisper + IA para Transcrição de Áudio~~ ✅

---

## Task 3: Popup de Cadastro Rápido na Agenda

### Contexto
Atualmente, ao clicar em um slot vazio na agenda, o usuário é redirecionado para `/appointments/new` — uma tela completa com muitos campos. Para o dia a dia do salão, isso é lento. Precisamos de um popup inline que permita criar um agendamento em poucos cliques, sem sair da tela.

**Escopo:** apenas na visualização "Agenda". O modo "Lista" e o botão "Novo Agendamento" continuam abrindo a tela completa.

### Fluxo do Usuário
1. Usuário clica em um slot vazio na agenda (ex: 14:30)
2. Abre um Dialog com o horário já preenchido
3. Preenche: cliente, serviço (opcional), valor, duração
4. Clica "Salvar"
5. Dialog fecha, agenda atualiza instantaneamente

### Campos do Popup

| Campo | Tipo | Obrigatório | Comportamento |
|-------|------|-------------|---------------|
| Data/Hora | Display (não editável) | — | Preenchido automaticamente pelo slot clicado |
| Cliente | `SearchableSelect` | Sim | Lista de clientes do tenant (`/client?pageSize=500`) |
| Serviço | `SearchableSelect` | Não | Lista de serviços do tenant (`/services?pageSize=500`). Ao selecionar, preenche valor + duração + descrição automaticamente |
| Valor (R$) | `CurrencyInput` | Sim | Editável manualmente ou preenchido pelo serviço |
| Duração | Input `number` (minutos) | Sim | Default: 30min. Preenchido pelo serviço se selecionado |
| Descrição | `Input` texto | Sim | Preenchida pelo nome do serviço ou digitação livre |

### Implementação

#### 1. Estado no `AppointmentsPage`
```ts
const [quickCreateSlot, setQuickCreateSlot] = useState<{
  date: Date
  hour: number
  minute: number
} | null>(null)
```

#### 2. Mudar `onSlotClick` apenas na agenda
Atualmente, o `onSlotClick` da `AgendaDayView` navega para `/appointments/new?date=...&hour=...&minute=...`.

Mudar para:
```tsx
<AgendaDayView
  ...
  onSlotClick={(date, hour, minute) => {
    setQuickCreateSlot({ date, hour, minute })
  }}
/>
```

O calendar e o botão "Novo Agendamento" continuam navegando normalmente.

#### 3. Dialog `QuickCreateAppointment`
Criar um `Dialog` controlado por `quickCreateSlot !== null`.

**Dados necessários (SWR):**
- Clientes: `API_CONFIG.ENDPOINTS.CLIENTS + "?pageSize=500"` → `fetcher`
- Serviços: `API_CONFIG.ENDPOINTS.SERVICES + "?pageSize=500"` → `fetcher`

**Estado local do formulário:**
```ts
const [qf, setQf] = useState({
  clientId: "",
  serviceId: "none",
  description: "",
  amount: 0,
  durationMinutes: 30,
})
```

**Ao selecionar serviço:** preencher `amount`, `durationMinutes`, `description` com os dados do serviço.

**Ao submeter:** chamar diretamente:
```ts
await secureApiCall(API_CONFIG.ENDPOINTS.APPOINTMENTS, {
  method: "POST",
  body: JSON.stringify({
    clientId: qf.clientId,
    serviceId: qf.serviceId === "none" ? null : qf.serviceId,
    scheduledDateTime: new Date(date + "T" + hour + ":" + minute).toISOString(),
    durationMinutes: qf.durationMinutes,
    amount: qf.amount,
    description: qf.description,
    status: 0,
    notes: "",
    employeeId: null,
  }),
})
```

**Ao sucesso:**
- `toast.success("Agendamento criado!")`
- Fechar o dialog: `setQuickCreateSlot(null)`
- Mutar o SWR do calendário: `mutate(calendarSWRKey)` para atualizar a agenda sem reload

#### 4. Layout do Dialog
```
┌─────────────────────────────────────┐
│  ⚡ Agendamento Rápido             │
│  📅 Sexta, 25 de Abril · 14:30     │
│                                     │
│  Cliente *          [🔍 Buscar...] │
│  Serviço            [🔍 Buscar...] │
│                                     │
│  Duração    [__30__] min            │
│  Valor      [R$ ___0,00___]        │
│  Descrição  [________________]     │
│                                     │
│  [Cancelar]          [💾 Salvar]   │
└─────────────────────────────────────┘
```

#### 5. Componentes a reutilizar
- `SearchableSelect` de `@/components/ui/custom/searchable-select`
- `CurrencyInput` de `@/components/currency-input`
- `Dialog, DialogContent, DialogHeader, DialogTitle` (já importados)
- `Button`, `Input`, `Label` (já importados)

#### 6. Considerações
- O popup NÃO tem: seletor de funcionário, picker de calendário, grid de disponibilidade, encaixe, membership badges, promoções — isso é para a tela completa
- Reset do formulário ao fechar o dialog (limpar campos quando `quickCreateSlot` vira `null`)
- Se o usuário quiser mais controle, pode clicar "Novo Agendamento" para ir para a tela completa
- Usar `useSWR` com as mesmas keys do `useAppointmentForm` para reaproveitar cache

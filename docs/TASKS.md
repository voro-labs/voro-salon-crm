# Tasks — Melhorias no Calendário de Agendamentos

Arquivo: `voro-salon-crm-front/app/appointments/page.tsx`

---

## TASK-001 — Permitir novo agendamento no lugar de um cancelado futuro

**Contexto:**
Atualmente a função `hasConflict` (linha ~107) considera **todos** os agendamentos independente do status ao verificar se um slot está ocupado. Isso faz com que slots com agendamentos cancelados (status = 3) fiquem bloqueados mesmo quando o horário ainda não passou, impedindo que um novo cliente ocupe aquele espaço.

**Comportamento esperado:**
- Se o horário está cancelado **e** a data/hora é no **futuro** → permitir clicar e criar novo agendamento no lugar
- Se o horário está cancelado **e** a data/hora já **passou** → bloquear o slot normalmente (não faz sentido agendar no passado)
- Se o horário **não está cancelado** → manter comportamento atual de bloqueio

**O que mudar:**
- `hasConflict(date, hour)` deve ignorar agendamentos com `status === 3` (cancelado) que estejam no futuro
- Manter o bloqueio para cancelados no passado
- Exibir visualmente no bloco cancelado alguma indicação de que pode ser reutilizado (ex: cor diferente ou tooltip "Cancelado — clique para reagendar")

**Arquivos impactados:**
- `page.tsx` → função `hasConflict`
- Possivelmente o componente de bloco de agendamento no calendário para feedback visual

---

## TASK-002 — Bloquear edição de cliente para burlar restrição de horário passado

**Contexto:**
Se a tela de edição de agendamento (`/appointments/[id]`) permite trocar o cliente de um agendamento cancelado passado, um usuário poderia indiretamente "reativar" aquele agendamento com um novo cliente, burlando a regra de que horários passados não podem receber novos agendamentos.

**Comportamento esperado:**
- Se o agendamento está **cancelado** e a data já **passou** → o campo de cliente deve ser **somente leitura** / desabilitado na edição
- Se o agendamento está cancelado mas é no futuro → permitir troca normalmente (coerente com TASK-001)
- A validação deve existir também **no backend** para segurança (não confiar só no frontend)

**O que mudar:**
- `voro-salon-crm-front/app/appointments/[id]/page.tsx` (ou componente de edição) → desabilitar campo de cliente quando `status === 3 && isPast(scheduledDateTime)`
- Backend: endpoint de update de agendamento deve rejeitar alteração de `clientId` quando o agendamento estiver cancelado e no passado

**Critério de aceite:**
- Campo de cliente desabilitado visualmente com tooltip explicativo
- Tentativa via API também rejeitada com mensagem adequada

---

## TASK-003 — Suporte a slots de 30 minutos no calendário

**Contexto:**
Atualmente cada célula do calendário representa **1 hora inteira** (`HOUR_HEIGHT = 64px`, e o click target usa `height: HOUR_HEIGHT`). Quando existe um agendamento de, por exemplo, 30 minutos (das 09:00 às 09:30), os 30 minutos restantes (09:30–10:00) ficam como espaço visual vazio mas **não são clicáveis** — o clique na célula da hora inteira dispara `hasConflict` e bloqueia por conta do agendamento existente.

**Comportamento esperado:**
- Cada hora deve ser dividida em **2 slots de 30 minutos** para fins de clique
- Cada sub-slot verifica conflito apenas para aquele intervalo de 30 min
- Ao clicar num slot de 30 min, redirecionar para `/appointments/new?date=...&hour=...&minute=30` (ou `minute=0`)

**O que mudar:**
- `onSlotClick` e a assinatura do callback devem aceitar também `minute: number` (0 ou 30)
- Substituir os `<div>` de hora inteira por dois `<div>` de meia hora cada (`height: HOUR_HEIGHT / 2`)
- `hasConflict` deve receber `minute` e verificar o intervalo `[slotMin, slotMin + 30)` em vez de `[slotMin, slotMin + 60)`
- Na página pai, o `onSlotClick` deve passar `minute` na URL: `/appointments/new?date=${iso}&hour=${hour}&minute=${minute}`
- A página de criação de agendamento deve ler o param `minute` e pré-preencher o horário correto

**Impacto:**
- `CalendarWeekView` (desktop e mobile)
- `AppointmentsPage` → callback `onSlotClick`
- `voro-salon-crm-front/app/appointments/new/page.tsx` → leitura do param `minute`

---

## TASK-004 — Validar se o serviço cabe no espaço antes do próximo agendamento

**Contexto:**
Com slots de 30 minutos (TASK-003), é possível que o usuário clique num espaço de 30 min e queira agendar um serviço de 60 ou 90 minutos. Se existe um agendamento imediatamente após, isso causaria sobreposição. A validação atual só verifica se o slot de origem está livre, mas não verifica se a **duração do serviço** vai colidir com o próximo agendamento do dia.

**Comportamento esperado:**
- Ao selecionar um serviço na tela de criação de agendamento, validar se `horárioSelecionado + duraçãoDoServiço` não ultrapassa o início do próximo agendamento existente naquele dia/profissional
- Se couber → permitir confirmar
- Se não couber → exibir alerta: *"O serviço de X min ultrapassa o próximo agendamento às HH:mm. Escolha um serviço menor ou outro horário."*

**Onde implementar:**
1. **No calendário (frontend preventivo):** ao calcular quais slots estão disponíveis para clique, verificar o espaço livre até o próximo agendamento não-cancelado do dia. Expor essa informação via função `getAvailableMinutesFromSlot(date, slotStartMin): number`
2. **Na tela de novo agendamento:** ao selecionar serviço, consultar `getAvailableMinutesFromSlot` e comparar com `service.durationMinutes`
3. **Backend (validação definitiva):** endpoint de criação deve rejeitar se `scheduledDateTime + durationMinutes` conflita com outro agendamento ativo

**Função auxiliar sugerida:**
```ts
function getAvailableMinutesFromSlot(appointments: Appointment[], date: Date, slotStartMin: number): number {
  const dayAppts = appointments
    .filter(a => isSameDay(new Date(a.scheduledDateTime), date) && a.status !== 3 /* cancelado */)
    .sort((a, b) => new Date(a.scheduledDateTime).getTime() - new Date(b.scheduledDateTime).getTime())

  const next = dayAppts.find(a => {
    const startMin = new Date(a.scheduledDateTime).getHours() * 60 + new Date(a.scheduledDateTime).getMinutes()
    return startMin > slotStartMin
  })

  if (!next) return Infinity // sem próximo agendamento, espaço livre até fechar
  const nextStartMin = new Date(next.scheduledDateTime).getHours() * 60 + new Date(next.scheduledDateTime).getMinutes()
  return nextStartMin - slotStartMin
}
```

**Critério de aceite:**
- Slot de 30 min exibe visualmente o espaço disponível (ex: cor diferente para slots com menos de 60 min livres à frente)
- Na criação, ao trocar o serviço, a validação roda imediatamente e bloqueia o submit se necessário
- Backend retorna `400` com mensagem descritiva em caso de conflito

---

## Ordem de implementação sugerida

| Prioridade | Task | Dependência |
|------------|------|-------------|
| 1 | TASK-001 — Cancelados futuros clicáveis | — |
| 2 | TASK-002 — Bloquear edição de cliente | — |
| 3 | TASK-003 — Slots de 30 minutos | — |
| 4 | TASK-004 — Validação de duração vs próximo agendamento | TASK-003 |

---

*Criado em: 2026-04-11*

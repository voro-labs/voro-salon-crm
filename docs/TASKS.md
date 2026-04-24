# Tasks

## ~~Task 1: Modo de Visualização "Agenda"~~ ✅
## ~~Task 2: Whisper + IA para Transcrição de Áudio~~ ✅
## ~~Task 3: Popup de Cadastro Rápido na Agenda~~ ✅

---

## ~~Task 4: Alterar Status Inline nas 3 Visualizações~~ ✅

### Contexto
Atualmente, para alterar o status de um agendamento (Pendente → Confirmado → Concluído → Cancelado → Faltou), o usuário precisa abrir a página de detalhe (`/appointments/[id]`). Isso é lento no dia a dia. Precisamos de um dropdown/popover inline em cada agendamento, nas 3 visualizações (Lista, Agenda, Grade).

### API existente
```
PATCH /api/v1/appointments/{id}/status
Body: number (0 = Pendente, 1 = Confirmado, 2 = Concluído, 3 = Cancelado, 4 = Faltou)
```

### Status config existente (`components/ui/custom/status-badge.tsx`)
```ts
export const appointmentStatusConfig: Record<AppointmentStatusId, { label: string; color: string; icon: LucideIcon }> = {
  0: { label: "Pendente", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Circle },
  1: { label: "Confirmado", color: "bg-blue-100 text-blue-800 border-blue-200", icon: CalendarDays },
  2: { label: "Concluído", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
  3: { label: "Cancelado", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
  4: { label: "Faltou", color: "bg-gray-100 text-gray-800 border-gray-200", icon: AlertCircle },
}
```

### Implementação

#### 1. Função `updateAppointmentStatus` no `AppointmentsPage`
```ts
async function updateAppointmentStatus(id: string, newStatus: number) {
  const res = await secureApiCall(
    `${API_CONFIG.ENDPOINTS.APPOINTMENTS}/${id}/status`,
    { method: "PATCH", body: JSON.stringify(newStatus) }
  )
  if (res.hasError) { toast.error("Erro ao atualizar status."); return }
  toast.success(`Status atualizado para ${statusLabels[newStatus]}`)
  mutateCalendar()   // atualiza agenda/grade
  // TODO: mutar também a lista se estiver em modo lista
}
```

Precisa importar `toast` de `sonner` e adicionar `mutate` do SWR de items da lista.

#### 2. Componente `StatusDropdown`
Um `DropdownMenu` (já existe em `components/ui/dropdown-menu.tsx`) que:
- Trigger: o `StatusBadge` existente, com cursor pointer
- Content: 5 itens (um por status), cada um com ícone + label + destaque no status atual
- Ao clicar em um item: chama `updateAppointmentStatus(apt.id, newStatus)`
- Enquanto está salvando: desabilita os itens

```tsx
function StatusDropdown({ appointmentId, currentStatus, onStatusChange }: {
  appointmentId: string
  currentStatus: number
  onStatusChange: (id: string, newStatus: number) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button><StatusBadge status={currentStatus} /></button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {Object.entries(appointmentStatusConfig).map(([key, config]) => {
          const Icon = config.icon
          const isActive = currentStatus === Number(key)
          return (
            <DropdownMenuItem
              key={key}
              onClick={(e) => { e.stopPropagation(); onStatusChange(appointmentId, Number(key)) }}
              className={isActive ? "font-bold" : ""}
            >
              <Icon className="h-4 w-4 mr-2" />
              {config.label}
              {isActive && <Check className="ml-auto h-3 w-3" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

**`e.stopPropagation()`** é essencial — sem isso, o clique no badge propagaria para o row e abriria a tela de detalhe ou navegaria.

#### 3. Integrar nas 3 visualizações

**Lista** (cards em `finalFiltered.map()`): substituir `<StatusBadge status={apt.status} />` pelo `<StatusDropdown>`. O card inteiro é um `<Link>`, então o dropdown precisa de `e.preventDefault()` + `e.stopPropagation()` no trigger.

**Agenda** (`AgendaDayView` — slot `info.type === "appointment"`): adicionar o `StatusDropdown` no final da row do appointment, passando um callback `onStatusChange` como prop do componente.

**Grade** (`CalendarWeekView` — blocos de appointment): mais apertado por espaço. Adicionar o dropdown no bloco de appointment, com trigger menor.

#### 4. Props novas para `AgendaDayView` e `CalendarWeekView`
```ts
onStatusChange: (appointmentId: string, newStatus: number) => void
```

#### 5. Considerações
- `stopPropagation` em todos os triggers para não abrir a tela de detalhe
- Na grade (calendar), se o bloco for muito pequeno (duração < 30min), mostrar o dropdown icon-only
- Mutar tanto `mutateCalendar` quanto `mutate(listSWRKey)` para manter tudo sincronizado
- Não precisa de confirmação para trocar status (é reversível e inline)

---

## ~~Task 5: Auditoria de Uso do Whisper por Tenant~~ ✅

### Contexto
O endpoint `POST /api/v1/appointments/transcribe-audio` usa o Whisper (OpenAI) e o Gemini. Precisamos registrar cada uso para saber qual tenant está consumindo mais, para futura cobrança proporcional.

### Infraestrutura existente
Já existe `IntegrationAuditLog` com campos perfeitos para isso:
- `IntegrationName` → `"Whisper"` ou `"Gemini"`
- `Endpoint` → URL da API chamada
- `StatusCode` → HTTP status da resposta
- `RequestPayload` → metadata (nome do arquivo, tamanho, idioma)
- `ResponsePayload` → texto transcrito (ou erro)
- `TenantId` → qual tenant usou
- `Timestamp` → quando

`IIntegrationAuditService.LogAsync()` já faz o INSERT. Só precisa chamar.

### Implementação

No `TranscribeAudio` do `AppointmentsController.cs`:

1. Injetar `IIntegrationAuditService` e `ICurrentUserService` via `[FromServices]`
2. Após chamar Whisper, registrar:
```csharp
await integrationAuditService.LogAsync(
    "Whisper",
    "https://api.openai.com/v1/audio/transcriptions",
    $"file={audio.FileName}, size={audio.Length}bytes, lang=pt",
    transcript.Length > 500 ? transcript[..500] : transcript,
    200,   // ou status real
    currentUserService.TenantId
);
```
3. Após chamar Gemini, registrar:
```csharp
await integrationAuditService.LogAsync(
    "Gemini-Transcription",
    "generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
    $"systemPrompt length={systemPrompt.Length}, userMessage length={transcript.Length}",
    rawResult.Length > 500 ? rawResult[..500] : rawResult,
    200,
    currentUserService.TenantId
);
```

### Resultado
Com isso, para gerar relatórios de uso basta:
```sql
SELECT TenantId, IntegrationName, COUNT(*) as total_calls, MIN(Timestamp) as first_use, MAX(Timestamp) as last_use
FROM IntegrationAuditLogs
WHERE IntegrationName IN ('Whisper', 'Gemini-Transcription')
GROUP BY TenantId, IntegrationName
ORDER BY total_calls DESC;
```

### Considerações
- Não bloquear a transcrição se a auditoria falhar (try/catch isolado)
- Não armazenar o áudio em si, apenas metadata (filename, size)
- Truncar payloads longos (max 500 chars) para não inflar o banco

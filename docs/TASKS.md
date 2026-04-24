# Tasks

## Task 1: Modo de Visualização "Agenda"

### Contexto
A página de agendamentos (`app/appointments/page.tsx`) já possui dois modos de visualização: `"list"` (lista paginada) e `"calendar"` (grade semanal). Precisamos adicionar um terceiro modo: `"agenda"`.

### Objetivo
Criar uma visualização estilo agenda diária com slots de 30 minutos, onde cada horário mostra os dados do agendamento ou aparece vazio/disponível.

### Layout Esperado
```
13:00  ─────────────────────────────
13:30  João Silva · Corte Masculino · R$ 45,00
14:00  ░░░░░░ bloqueado ░░░░░░░░░░  (serviço anterior dura 60min)
14:30  ─────────────────────────────
15:00  Maria Santos · Escova · R$ 80,00
```

### Regras
- Slots de 30 minutos, do horário de abertura ao fechamento (usar `businessHours`)
- Cada slot mostra: **horário** — **nome do cliente** · **serviço** · **R$ valor**
- Se o serviço (`durationMinutes`) > 30 min, os slots seguintes ficam **bloqueados** visualmente (cor diferente, texto "ocupado" ou similar)
- Slots passados ficam esmaecidos
- Slots fora do horário comercial ficam ocultos ou marcados como "fechado"
- Clicar em slot vazio abre o formulário de novo agendamento (mesmo comportamento do calendar)
- Visualização por dia (com navegação prev/next para trocar o dia)

### Implementação

1. **Atualizar o type do viewMode** de `"list" | "calendar"` para `"list" | "calendar" | "agenda"` (linha ~428)
2. **Adicionar botão "Agenda"** no seletor de modos (junto com List e Calendar, linha ~618)
3. **Criar componente `AgendaDayView`** dentro do mesmo arquivo ou em arquivo separado:
   - Recebe: `date`, `appointments`, `businessHours`, `onSlotClick`
   - Gera slots de 30min entre `calStartHour` e `calEndHour`
   - Para cada slot, verifica se há appointment (`scheduledDateTime` cai naquele slot)
   - Se appointment existe, mostra: `clientName · serviceName · R$ amount`
   - Se appointment anterior tem `durationMinutes > 30`, marca slots cobertos como "bloqueado"
   - Usa a mesma lógica de `isInBusinessHours`, `isSlotPast`, `hasConflict` que já existe
4. **Navegação de dia**: seletor de data com prev/next (similar ao mobile do calendar)
5. **Renderizar o componente** na seção condicional de viewMode (linha ~678)

### Dados Disponíveis (interface AppointmentItem)
```ts
interface AppointmentItem {
  id: string
  clientName: string
  serviceName?: string
  scheduledDateTime: string
  durationMinutes: number
  status: number
  amount: number
  description?: string
}
```

---

## Task 2: Whisper + IA para Transcrição de Áudio → JSON de Agendamento

### Contexto
Permitir que o usuário grave/envie um áudio descrevendo um agendamento, e a IA transcreva e extraia os dados estruturados automaticamente.

### Objetivo
Usar a API Whisper (OpenAI) para transcrever o áudio e um LLM para extrair os campos do agendamento em formato JSON.

### Fluxo
1. Usuário clica em botão de microfone (na página de agendamentos ou no formulário de novo agendamento)
2. Grava áudio via `MediaRecorder` API do browser
3. Envia o áudio para o backend
4. Backend transcreve com Whisper (OpenAI API)
5. Backend envia o texto transcrito para um LLM (Gemini Flash, que já é usado no projeto) com prompt para extrair os campos
6. Retorna JSON estruturado para o frontend
7. Frontend preenche o formulário automaticamente

### JSON de Saída
```json
{
  "nome_do_cliente": "string",
  "servico": "string",
  "valor": "number | null",
  "duracao": "number (minutos)",
  "dia_marcado": "string (ISO date)",
  "horario": "string (HH:mm)"
}
```

### Implementação

#### Frontend
1. **Componente `AudioRecorder`**: botão de microfone que usa `navigator.mediaDevices.getUserMedia` + `MediaRecorder`
2. **Estado**: gravando / processando / pronto
3. **Upload**: enviar blob de áudio como `multipart/form-data` para endpoint do backend
4. **Auto-preenchimento**: mapear campos do JSON retornado para os campos do formulário de agendamento

#### Backend (C# / ASP.NET)
1. **Endpoint**: `POST /api/appointments/transcribe-audio`
2. **Whisper**: chamar API da OpenAI (`/v1/audio/transcriptions`) com o arquivo de áudio
3. **Extração com LLM**: enviar texto transcrito para Gemini Flash com prompt estruturado:
   - Prompt pede para extrair: nome do cliente, serviço, valor, duração, dia, horário
   - Se o valor não for mencionado mas o serviço existir no catálogo, buscar o valor do catálogo
   - Retornar JSON válido
4. **Response**: retornar o JSON parseado para o frontend

#### Considerações
- Se o estabelecimento tem serviços cadastrados, o LLM deve receber a lista para fazer match
- Datas relativas ("amanhã", "sexta-feira") devem ser resolvidas para datas absolutas
- Valor só é obrigatório se não houver serviço cadastrado com aquele nome
- Tratar erros de gravação (permissão negada, sem microfone)

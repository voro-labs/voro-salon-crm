# Tasks

## ~~Task 1: Modo de Visualização "Agenda"~~ ✅
## ~~Task 2: Whisper + IA para Transcrição de Áudio~~ ✅
## ~~Task 3: Popup de Cadastro Rápido na Agenda~~ ✅
## ~~Task 4: Alterar Status Inline nas 3 Visualizações~~ ✅
## ~~Task 5: Auditoria de Uso do Whisper por Tenant~~ ✅

---

## Task 6: Popup do Whisper deve continuar aberto durante gravação

### Contexto
Quando o usuário clica em "Iniciar gravação" no popup de instrução do Whisper, o popup fecha imediatamente (`setShowAudioModal(false)` na linha 805 de `beginRecording()`). O usuário perde a referência visual do que falar. O popup deve permanecer aberto mostrando o timer e o exemplo de frase enquanto o áudio está sendo gravado.

### Arquivo
- `voro-salon-crm-front/app/appointments/page.tsx`

### Implementação

**1. Remover o `setShowAudioModal(false)` do início de `beginRecording()` (linha 805)**

**2. Alterar o conteúdo do Dialog para mostrar estado de gravação quando `isRecording === true`**

Dentro do Dialog `showAudioModal` (linhas 1163-1217), renderizar condicionalmente:
- Se `isRecording === false`: conteúdo atual (instruções + botão "Iniciar gravação")
- Se `isRecording === true`: mostrar timer com countdown (`MAX_RECORDING_SECONDS - recordingSeconds`), ícone pulsante vermelho, o exemplo de frase ainda visível, e botão "Parar gravação"

```tsx
{/* Dentro do DialogContent do showAudioModal */}
{isRecording ? (
  <div className="flex flex-col items-center gap-4 py-4">
    <div className="flex items-center justify-center h-16 w-16 rounded-full bg-red-100 animate-pulse">
      <Mic className="h-8 w-8 text-red-500" />
    </div>
    <p className="text-lg font-mono font-bold text-red-500 tabular-nums">
      {MAX_RECORDING_SECONDS - recordingSeconds}s
    </p>
    <div className="rounded-lg bg-muted/40 border border-border/60 px-4 py-3 w-full">
      <p className="text-sm text-foreground leading-relaxed italic">
        "Agendar a Maria Silva para corte e escova na sexta-feira às 14h, vai durar 1 hora e meia, valor R$ 120."
      </p>
    </div>
    <Button variant="destructive" className="w-full" onClick={() => { stopRecording(); setShowAudioModal(false) }}>
      <Square className="mr-2 h-4 w-4" />
      Parar gravação
    </Button>
  </div>
) : (
  /* conteúdo atual de instruções + botão iniciar */
)}
```

**3. Fechar o modal ao parar a gravação**

No `stopRecording()` e no auto-stop por tempo (linha 840-841), adicionar `setShowAudioModal(false)` após parar:

```tsx
// No auto-stop dentro do setInterval (linha 839-841):
if (elapsed >= MAX_RECORDING_SECONDS) {
  mr.stop()
  setIsRecording(false)
  setShowAudioModal(false) // ← adicionar
}
```

No botão "Parar gravação" do modal, já incluir `setShowAudioModal(false)` no onClick (como mostrado acima).

**4. Impedir fechar o modal durante gravação**

No `<Dialog>` do `showAudioModal`, impedir fechar clicando fora enquanto grava:

```tsx
<Dialog
  open={showAudioModal}
  onOpenChange={(open) => {
    if (!open && isRecording) return // bloqueia fechar durante gravação
    setShowAudioModal(open)
  }}
>
```

---

## Task 7: Botão "Completo" do Quick Action deve enviar cliente e serviço

### Contexto
No popup de agendamento rápido (quick create), o botão "Completo" redireciona para `/appointments/new` passando apenas `date`, `hour`, `minute`. Não envia `clientId` nem `serviceId`, então o formulário completo abre vazio.

### Arquivos
- `voro-salon-crm-front/app/appointments/page.tsx` (link do botão Completo, linha 1154)
- `voro-salon-crm-front/app/appointments/new/page.tsx` (leitura dos searchParams, linhas 89-115)

### Implementação

**1. Atualizar o href do botão "Completo" (linha 1153-1156 de `appointments/page.tsx`)**

Substituir:
```tsx
<Link href={quickCreateSlot ? `/appointments/new?date=${format(quickCreateSlot.date, "yyyy-MM-dd")}&hour=${quickCreateSlot.hour}&minute=${quickCreateSlot.minute}` : "/appointments/new"}>
```

Por:
```tsx
<Link href={quickCreateSlot ? `/appointments/new?date=${format(quickCreateSlot.date, "yyyy-MM-dd")}&hour=${quickCreateSlot.hour}&minute=${quickCreateSlot.minute}${qcForm.clientId ? `&clientId=${qcForm.clientId}` : ""}${qcForm.serviceId && qcForm.serviceId !== "none" ? `&serviceId=${qcForm.serviceId}` : ""}` : "/appointments/new"}>
```

**2. Ler `clientId` e `serviceId` nos searchParams do `new/page.tsx`**

No `useEffect` de pré-preenchimento (linhas 89-115), adicionar:

```tsx
const clientIdParam = searchParams.get("clientId")
const serviceIdParam = searchParams.get("serviceId")

if (clientIdParam) updates.clientId = clientIdParam
if (serviceIdParam) {
  updates.serviceId = serviceIdParam
  // Se serviceIds array é usado, popular também
  // Buscar dados do serviço para preencher amount/duration
}
```

Verificar se o hook `useAppointmentForm` aceita `serviceId` via `setForm`. Caso use `serviceIds` (array), adaptar para `updates.serviceIds = [serviceIdParam]`.

---

## Task 8: Header dos dias da semana desalinhado na grade (Calendar)

### Contexto
Na visualização de grade semanal (`CalendarWeekView`), o header com os dias da semana está deslocado para a direita em relação às colunas do body. Isso acontece porque o body tem `overflow-y-auto` (barra de scroll vertical), e o header não. A scrollbar do body reduz a largura útil das colunas, causando desalinhamento.

### Arquivo
- `voro-salon-crm-front/app/appointments/page.tsx` — função `CalendarWeekView` (linhas 362-491)

### Implementação

**Abordagem: esconder a scrollbar nativa e manter scroll funcional**

Adicionar uma classe CSS utilitária para esconder a scrollbar. No div do body (linha 394):

```tsx
<div className="overflow-y-auto scrollbar-hide" style={{ maxHeight: "calc(100vh - 300px)" }}>
```

Adicionar o CSS globalmente (em `globals.css` ou equivalente):

```css
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

**OU abordagem alternativa: adicionar `overflow-y: scroll` ao header**

Forçar o header a ter a mesma scrollbar (invisível) que o body:

```tsx
{/* Header */}
<div className="grid grid-cols-8 border-b bg-muted/30 sticky top-0 z-10 overflow-y-scroll scrollbar-hide">
```

E aplicar `overflow-y: scroll` no body também (em vez de `auto`), para que ambos sempre reservem espaço para scrollbar.

**Verificar também a versão mobile** — o mobile usa `grid-cols-2` e provavelmente não tem esse problema, mas conferir.

---

## Task 9: Hover verde pisca e desaparece em horários passados na grade

### Contexto
Na grade semanal, quando o mouse passa sobre um slot de horário que já passou, o hover verde aparece brevemente e some. O problema está na combinação de classes CSS nos slots passados.

### Arquivo
- `voro-salon-crm-front/app/appointments/page.tsx` — slots da `CalendarWeekView`

### Análise
Slots passados (linhas 438-440, desktop / 304-309, mobile) têm:
```
"bg-muted/30 cursor-pointer opacity-60 hover:bg-amber-50/50"
```

O `opacity-60` afeta TODA a div incluindo o hover. Combinado com `transition-colors duration-150`, o efeito hover fica quase invisível. Se o tema usa `accent` verde, pode haver conflito com slots vizinhos.

### Implementação

**1. Remover `opacity-60` dos slots passados e usar cor de fundo mais escura como indicador de "passado"**

Substituir (em AMBOS desktop e mobile, linhas ~438 e ~304):

De:
```
past ? "bg-muted/30 cursor-pointer opacity-60 hover:bg-amber-50/50"
```

Para:
```
past ? "bg-muted/40 cursor-pointer hover:bg-accent/15"
```

Isso remove o `opacity-60` que causa o efeito fantasma e usa `hover:bg-accent/15` que é consistente com os slots disponíveis (que usam `hover:bg-accent/10`), só um pouco mais suave.

**2. Aplicar nos dois locais (desktop e mobile)**

- Desktop: linha ~438 dentro do `days.map()` → `hours.flatMap()` → slot div
- Mobile: linha ~304 dentro do `hours.flatMap()` → slot div

---

## Task 10: Grade deve abrir Quick Action em vez de navegar para nova página

### Contexto
Na grade semanal, ao clicar num slot de horário **futuro**, o sistema navega para `/appointments/new`. Deveria abrir o popup de Quick Action (agendamento rápido) igual faz para slots passados.

### Arquivo
- `voro-salon-crm-front/app/appointments/page.tsx` — callback `onSlotClick` da `CalendarWeekView` (linhas 1471-1479)

### Implementação

Substituir o callback `onSlotClick` passado ao `CalendarWeekView` (linhas 1471-1479):

De:
```tsx
onSlotClick={(date, hour, minute) => {
  const slotTime = new Date(date)
  slotTime.setHours(hour, minute, 0, 0)
  if (slotTime < new Date()) {
    openQuickCreate(date, hour, minute)
  } else {
    const iso = format(date, "yyyy-MM-dd")
    router.push(`/appointments/new?date=${iso}&hour=${hour}&minute=${minute}`)
  }
}}
```

Para:
```tsx
onSlotClick={(date, hour, minute) => {
  openQuickCreate(date, hour, minute)
}}
```

Isso faz a grade funcionar igual à agenda (`AgendaDayView`), que já usa `openQuickCreate` para todos os slots (linha 1490).

A função `openQuickCreate` já detecta se o slot é passado ou futuro (via `isHistoric`) e ajusta o status padrão do formulário.

---

## Task 11: Relatórios mensais para acompanhamento

### Contexto
Adicionar uma página de relatórios mensais no frontend. No futuro, esses relatórios serão enviados por e-mail em PDF automaticamente. Por enquanto, criar a visualização na plataforma.

### Dados já disponíveis na API

O endpoint `GET /api/v1/dashboard/metrics` já retorna:
- `monthlyRevenue` — faturamento do mês
- `monthlyServiceCount` — qtd de serviços no mês
- `totalClients` — total de clientes
- `revenueByMonth` — array com `{ month, monthLabel, total, count }` dos últimos meses
- `topClients` — array com `{ name, serviceCount, totalSpent }`

### Arquivos a criar/modificar

- **Criar:** `voro-salon-crm-front/app/reports/page.tsx`
- **Criar:** `voro-salon-crm-front/app/reports/layout.tsx` (com AuthGuard)
- **Modificar:** `voro-salon-crm-front/components/layout/admin/sidebar.tsx` — adicionar link "Relatórios"
- **Modificar:** `voro-salon-crm-front/middleware.ts` — adicionar `/reports` em `PROTECTED_PATHS`
- **Modificar:** `voro-salon-crm-front/app/settings/page.tsx` — adicionar `/reports` no `DEFAULT_PAGE_OPTIONS`

### Implementação da página

**1. Layout (`reports/layout.tsx`)**
```tsx
import { AuthGuard } from "@/components/auth/auth.guard"
export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard requiredRoles={["SalonOwner", "Owner"]}>{children}</AuthGuard>
}
```

**2. Página (`reports/page.tsx`)**

Estrutura:
- `PageHeader` com título "Relatórios"
- Seletor de mês/ano (usar `date-fns` para navegar entre meses)
- Cards de métricas: Faturamento, Serviços realizados, Novos clientes
- Gráfico de faturamento mensal (últimos 6 meses) — usar `recharts` se já instalado, senão barras CSS simples
- Tabela de top clientes

Usar `useSWR` com `API_CONFIG.ENDPOINTS.DASHBOARD_METRICS` (ou `/api/v1/dashboard/metrics`).

Verificar se `API_CONFIG.ENDPOINTS` já tem `DASHBOARD_METRICS`. Caso não, adicionar em `lib/api.ts`:
```ts
DASHBOARD_METRICS: `${BASE}/dashboard/metrics`,
```

**3. Estilo dos cards de métrica**
```tsx
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
  <Card>
    <CardContent className="p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">Faturamento</p>
      <p className="text-2xl font-bold">{formatCurrency(metrics.monthlyRevenue)}</p>
    </CardContent>
  </Card>
  {/* ... mais cards */}
</div>
```

**4. Gráfico de barras simples (sem dependência extra)**
```tsx
{metrics.revenueByMonth.map((m) => (
  <div key={m.month} className="flex items-end gap-1">
    <div
      className="bg-primary rounded-t w-full min-h-[4px]"
      style={{ height: `${(m.total / maxRevenue) * 100}%` }}
    />
    <span className="text-[10px] text-muted-foreground">{m.monthLabel}</span>
  </div>
))}
```

**5. Tabela de top clientes**
```tsx
<table className="w-full text-sm">
  <thead>
    <tr className="border-b text-left text-xs text-muted-foreground">
      <th className="py-2">Cliente</th>
      <th className="py-2 text-right">Serviços</th>
      <th className="py-2 text-right">Total gasto</th>
    </tr>
  </thead>
  <tbody>
    {metrics.topClients.map((c) => (
      <tr key={c.name} className="border-b">
        <td className="py-2 font-medium">{c.name}</td>
        <td className="py-2 text-right">{c.serviceCount}</td>
        <td className="py-2 text-right">{formatCurrency(c.totalSpent)}</td>
      </tr>
    ))}
  </tbody>
</table>
```

**6. Sidebar**
Adicionar item no array de navegação da sidebar:
```tsx
{ href: "/reports", label: "Relatórios", icon: BarChart3 }
```
Importar `BarChart3` de `lucide-react`. Posicionar após "Finanças".

**7. Middleware**
Em `PROTECTED_PATHS` (linha 48-64 de `middleware.ts`), adicionar:
```ts
"/reports",
```

### Considerações
- Somente `SalonOwner` e `Owner` têm acesso (não `SalonEmployee`)
- O endpoint de métricas já filtra por tenant automaticamente
- Para o envio por e-mail em PDF no futuro, a API precisará de um endpoint novo — não implementar agora
- Verificar se `recharts` está no `package.json`; se sim, usar para gráficos. Se não, usar barras CSS puras

---

## Task 12: Primeiro login redireciona para dashboard em vez da página configurada

### Contexto
Quando o usuário faz login e tem etapas de onboarding (aceitar termos, completar perfil), ao finalizar a última etapa ele é redirecionado para `/` (dashboard) em vez da página configurada como principal (`defaultPage` do tenant).

### Arquivos
- `voro-salon-crm-front/app/admin/complete-profile/page.tsx` — linha 70: `router.replace("/")`
- `voro-salon-crm-front/app/admin/terms/page.tsx` — linha 52: fallback `"/"`
- `voro-salon-crm-front/app/admin/change-password/page.tsx` — linha 73: mesma lógica
- `voro-salon-crm-front/hooks/use-sign-in.hook.ts` — onde `defaultPage` é resolvido
- `voro-salon-crm-front/app/admin/verify-2fa/page.tsx` — linha 166: usa `redirectTo` sem consultar `defaultPage`

### Causa raiz
As páginas de onboarding (`terms`, `complete-profile`, `change-password`) redirecionam com `router.replace("/")` quando terminam, sem consultar o `defaultPage` do tenant. O `verify-2fa` usa `redirectTo` (que por padrão é `/`) sem consultar o `defaultPage`.

### Implementação

**1. Salvar `defaultPage` no sessionStorage durante o login**

No `use-sign-in.hook.ts`, após buscar o tenant (linha 88), salvar:

```tsx
sessionStorage.setItem("post_login_flags", JSON.stringify({
  requiresPasswordChange: !!response.data.requiresPasswordChange,
  requiresTermsAcceptance: !!response.data.requiresTermsAcceptance,
  requiresProfileCompletion: !!response.data.requiresProfileCompletion,
  defaultPage: tenantRes.data?.defaultPage || "/",  // ← adicionar
}))
```

**2. No `verify-2fa/page.tsx`, salvar também:**

Na linha ~152, adicionar `defaultPage` ao `post_login_flags`:

```tsx
sessionStorage.setItem("post_login_flags", JSON.stringify({
  requiresPasswordChange: !!response.data.requiresPasswordChange,
  requiresTermsAcceptance: !!response.data.requiresTermsAcceptance,
  requiresProfileCompletion: !!response.data.requiresProfileCompletion,
  defaultPage: tenantRes.data?.defaultPage || redirectTo || "/",  // ← adicionar
}))
```

E na linha 166, usar `defaultPage` do tenant:
```tsx
const defaultPage = tenantRes.data?.defaultPage || redirectTo || "/"
// ...
: defaultPage  // em vez de apenas redirectTo
```

**3. `complete-profile/page.tsx` — usar `defaultPage` do flags (linha 70)**

Substituir:
```tsx
setTimeout(() => router.replace("/"), 1500)
```

Por:
```tsx
const flagsRaw = sessionStorage.getItem("post_login_flags")
const defaultPage = flagsRaw ? (JSON.parse(flagsRaw).defaultPage || "/") : "/"
sessionStorage.removeItem("post_login_flags")
setTimeout(() => router.replace(defaultPage), 1500)
```

**4. `terms/page.tsx` — usar `defaultPage` quando é a última etapa (linha 52)**

Substituir:
```tsx
const next = flags.requiresProfileCompletion ? "/admin/complete-profile" : "/"
```

Por:
```tsx
const next = flags.requiresProfileCompletion ? "/admin/complete-profile" : (flags.defaultPage || "/")
```

**5. `change-password/page.tsx` — mesma lógica (linha 73)**

Substituir o redirect final para ler `defaultPage` dos flags, similar ao `terms/page.tsx`.

### Teste
1. Configurar a página principal como `/appointments` nas configurações
2. Fazer logout
3. Fazer login novamente
4. Completar etapas de onboarding (se houver)
5. Verificar que redireciona para `/appointments` e não para `/`

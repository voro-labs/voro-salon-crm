# WhatsApp Evolution Go — Correções de Status e Avisos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ocultar avisos de configuração Meta quando o meio de conexão é Evolution Go, e exibir status de conexão em tempo real (não cacheado do banco) na página de gerenciamento da instância Evolution.

**Architecture:** Duas correções independentes no frontend Next.js. A primeira adiciona um guard na condição do banner de aviso em `/app/whatsapp/page.tsx`. A segunda adiciona polling de status em tempo real via endpoint `/status` na página de instância Evolution e na aba WhatsApp da página de configurações, usando estado local para sobrescrever o status vindo do banco.

**Tech Stack:** Next.js 14 App Router, React hooks, SWR, TypeScript, `secureApiCall`

---

## Mapa de Arquivos

| Arquivo | O que muda |
|---|---|
| `voro-salon-crm-front/app/whatsapp/page.tsx` | Adiciona fetch de `evolutionInstances`, usa para suprimir banner Meta |
| `voro-salon-crm-front/app/settings/whatsapp/evolution/page.tsx` | Adiciona `liveState` + polling periódico do endpoint `/status`, usa `effectiveStatus` na renderização |
| `voro-salon-crm-front/app/settings/page.tsx` | Adiciona polling de status em tempo real para `evolutionInstance` na aba WhatsApp |

---

## Tarefa 1 — Ocultar aviso Meta quando Evolution Go está conectado (`/app/whatsapp/page.tsx`)

**Files:**
- Modify: `voro-salon-crm-front/app/whatsapp/page.tsx:528-530` (hook do tenant) e `:599` (condição do banner)

### Contexto
O banner de "Integração WhatsApp não configurada" aparece quando o tenant não tem `whatsappPhoneNumberId` ou `whatsappBusinessAccountId`. Mas quando o tenant usa Evolution Go (instância com `status === 2`), esse aviso é irrelevante e confunde o usuário.

A função `WhatsAppPage` já busca `tenant`. Precisamos também buscar `evolutionInstances` e usar para suprimir o banner.

- [ ] **Passo 1: Adicionar o hook SWR de evolutionInstances no componente WhatsAppPage**

No arquivo `app/whatsapp/page.tsx`, na função `WhatsAppPage` (linha ~526), após o hook `useSWR` do tenant (linha 528), adicionar:

```tsx
const { data: evolutionInstances } = useSWR<{ id: string; status: 0 | 1 | 2 }[]>(
  API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES,
  fetcher
)
const evolutionConnected = (evolutionInstances ?? []).some((i) => i.status === 2)
```

- [ ] **Passo 2: Atualizar a condição do banner de aviso Meta**

Na linha ~599, a condição atual é:
```tsx
{tenant !== undefined && (!tenant?.whatsappPhoneNumberId || !tenant?.whatsappBusinessAccountId) && (
```

Atualizar para:
```tsx
{tenant !== undefined && !evolutionConnected && (!tenant?.whatsappPhoneNumberId || !tenant?.whatsappBusinessAccountId) && (
```

- [ ] **Passo 3: Verificar funcionamento**

Abrir `/whatsapp` com uma conta que tenha Evolution Go conectado (status=2). Confirmar que o banner não aparece.
Abrir com uma conta sem Evolution e sem Meta configurado. Confirmar que o banner ainda aparece.

- [ ] **Passo 4: Commit**

```bash
git add voro-salon-crm-front/app/whatsapp/page.tsx
git commit -m "fix: ocultar aviso Meta quando Evolution Go está conectado na página de mensagens"
```

---

## Tarefa 2 — Status em tempo real na página de instância Evolution (`/app/settings/whatsapp/evolution/page.tsx`)

**Files:**
- Modify: `voro-salon-crm-front/app/settings/whatsapp/evolution/page.tsx`

### Contexto
O status da instância vem do banco de dados (campo `status: 0|1|2`). Quando o usuário desconecta diretamente na plataforma Evolution Go (sem passar pelo app), o banco não é atualizado. A página continua mostrando "Conectado".

O endpoint `/EvolutionInstance/{id}/status` retorna o status em tempo real (`{ state: "open" | "close" | "connecting" | "timeout" }`). Precisamos chamar esse endpoint ao carregar a página e periodicamente, derivando um `effectiveStatus` que sobrescreve o status do banco.

### Estratégia
- Novo estado local `liveState: string | null`
- `useEffect` que chama o endpoint `/status` quando `instance` existe — uma vez ao montar e depois a cada 20 segundos
- `effectiveStatus` computado: prefere `liveState`, cai de volta para `instance.status`
- Trocar todos os `instance.status` no render por `effectiveStatus`

- [ ] **Passo 1: Adicionar estado `liveState` e derivar `effectiveStatus`**

Após a declaração do estado `disconnecting` (por volta da linha 158), adicionar:

```ts
// Status em tempo real vindo do endpoint /status da Evolution API
const [liveState, setLiveState] = useState<string | null>(null)

// effectiveStatus: usa liveState quando disponível, cai para o valor do banco
const effectiveStatus: 0 | 1 | 2 = (() => {
  if (!instance) return 0
  if (liveState === "open") return 2
  if (liveState === "connecting") return 1
  if (liveState === "close" || liveState === "timeout") return 0
  return instance.status
})()
```

- [ ] **Passo 2: Adicionar polling de status em tempo real**

Substituir o `useEffect` existente de "Polling de status (status=Connecting)" (por volta da linha 304–317) pelo seguinte, que cobre todos os estados:

```ts
// Polling de status em tempo real — roda sempre que a instância existe
useEffect(() => {
  if (!instance) return

  const poll = async () => {
    const res = await secureApiCall<EvolutionStatus>(
      `${API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES}/${instance.id}/status`
    )
    if (!res.hasError && res.data?.state) {
      setLiveState(res.data.state)
      // Se voltou a ficar "open" sem estar conectado no banco, sincroniza
      if (res.data.state === "open" && instance.status !== 2) mutate()
    }
  }

  poll() // verificação imediata ao montar
  const intervalId = setInterval(poll, 20000) // polling a cada 20 s

  return () => clearInterval(intervalId)
}, [instance?.id]) // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Passo 3: Substituir `instance.status` por `effectiveStatus` no render**

No bloco de renderização do `instance card` (a partir da linha ~389), substituir todas as ocorrências de `instance.status` por `effectiveStatus`. São 4 lugares:

1. Badge/header do card (~linha 401):
```tsx
{(() => {
  const s = statusLabel(effectiveStatus)
  return (
    <Badge variant={s.variant} className={s.className}>
      {effectiveStatus === 1 && (
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
      )}
      {s.label}
    </Badge>
  )
})()}
```

2. Condição para botões de conectar (~linha 437):
```tsx
{effectiveStatus !== 2 && (
```

3. Condição para botão desconectar (~linha 449):
```tsx
{effectiveStatus === 2 && (
```

4. Também substituir no `useEffect` de cleanup (que verifica `instance.status !== 1`) — mas como removemos esse useEffect no Passo 2, não é necessário.

- [ ] **Passo 4: Resetar `liveState` ao fechar o dialog QR**

No `handleCloseQr`, após `setQrOpen(false)`, adicionar `setLiveState(null)` para forçar nova verificação:
```ts
const handleCloseQr = () => {
  stopQrPoll()
  stopStatusPoll()
  setQrOpen(false)
  setLiveState(null)
}
```

- [ ] **Passo 5: Verificar funcionamento**

1. Abrir `/settings/whatsapp/evolution` com instância conectada
2. Desconectar diretamente na plataforma Evolution Go
3. Aguardar até 20 segundos — o badge deve mudar para "Desconectado" sem reload
4. Verificar que os botões de "Conectar via QR" e "Conectar via Código" aparecem

- [ ] **Passo 6: Commit**

```bash
git add voro-salon-crm-front/app/settings/whatsapp/evolution/page.tsx
git commit -m "fix: polling de status em tempo real na página de instância Evolution Go"
```

---

## Tarefa 3 — Status em tempo real na aba WhatsApp da página de configurações (`/app/settings/page.tsx`)

**Files:**
- Modify: `voro-salon-crm-front/app/settings/page.tsx`

### Contexto
A aba WhatsApp em `/settings?tab=whatsapp` mostra o status do `evolutionInstance` vindas do SWR (`evolutionInstances`). O SWR não faz polling de status em tempo real; o valor vem do banco. Quando o usuário desconecta fora do app, a aba ainda mostra "Conectado".

### Estratégia
Adicionar um estado `evolutionLiveState` e um `useEffect` que chama `/status` ao abrir a aba WhatsApp quando há instância com status=2, e a cada 30 segundos. Usar `evolutionEffectiveStatus` para sobrescrever o display.

- [ ] **Passo 1: Adicionar estado `evolutionLiveState`**

Após a declaração de `disconnecting` (~linha 175), adicionar:

```ts
const [evolutionLiveState, setEvolutionLiveState] = useState<string | null>(null)

const evolutionEffectiveStatus: 0 | 1 | 2 = (() => {
  if (!evolutionInstance) return 0
  if (evolutionLiveState === "open") return 2
  if (evolutionLiveState === "connecting") return 1
  if (evolutionLiveState === "close" || evolutionLiveState === "timeout") return 0
  return evolutionInstance.status
})()
```

- [ ] **Passo 2: Adicionar polling de status para evolutionInstance**

Após os `useEffect` existentes relacionados a tenant/user (por volta da linha 225), adicionar:

```ts
// Polling de status em tempo real para a instância Evolution Go
useEffect(() => {
  if (!evolutionInstance) return

  const poll = async () => {
    const res = await secureApiCall<{ state: string; instanceId: string }>(
      `${API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES}/${evolutionInstance.id}/status`
    )
    if (!res.hasError && res.data?.state) {
      setEvolutionLiveState(res.data.state)
    }
  }

  poll()
  const intervalId = setInterval(poll, 30000)
  return () => clearInterval(intervalId)
}, [evolutionInstance?.id]) // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Passo 3: Substituir `evolutionInstance?.status` por `evolutionEffectiveStatus` no render**

Na seção "Opção 2: Evolution Go" (~linhas 1268–1314), substituir todas as 6 ocorrências de `evolutionInstance?.status` por `evolutionEffectiveStatus`:

Linha ~1268 (classe do container):
```tsx
<div className={`... ${evolutionEffectiveStatus === 2 ? "border-emerald-300 ..." : "bg-muted/20"}`}>
```

Linha ~1271 (classe do ícone):
```tsx
<div className={`... ${evolutionEffectiveStatus === 2 ? "bg-emerald-100 ..." : evolutionEffectiveStatus === 1 ? "bg-amber-100 ..." : "bg-muted"}`}>
```

Linha ~1272 (ícone condicional):
```tsx
{evolutionEffectiveStatus === 2
  ? <CheckCircle className="h-4 w-4 text-emerald-600" />
  : evolutionEffectiveStatus === 1
    ? <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
    : <WifiOff className="h-4 w-4 text-muted-foreground" />}
```

Linha ~1284 (badge Conectado):
```tsx
{evolutionEffectiveStatus === 2 && (
  <Badge ...>Conectado</Badge>
)}
```

Linha ~1289 (badge Conectando):
```tsx
{evolutionEffectiveStatus === 1 && (
  <Badge ...>Conectando</Badge>
)}
```

Linha ~1297 (badge Desconectado):
```tsx
{evolutionInstance && evolutionEffectiveStatus === 0 && (
  <Badge ...>Desconectado</Badge>
)}
```

Linha ~1308 (exibição do número de telefone):
```tsx
{evolutionEffectiveStatus === 2 && evolutionInstance?.phoneNumber && (
```

- [ ] **Passo 4: Verificar funcionamento**

1. Abrir `/settings?tab=whatsapp` com instância conectada
2. Desconectar na plataforma Evolution Go
3. Aguardar até 30 segundos — status deve mudar para "Desconectado" sem reload
4. Confirmar que o badge "Sem instância" e o texto explicativo só aparecem quando correto

- [ ] **Passo 5: Commit**

```bash
git add voro-salon-crm-front/app/settings/page.tsx
git commit -m "fix: polling de status em tempo real para Evolution Go na aba de configurações WhatsApp"
```

---

## Revisão do plano

**Cobertura da spec:**
- [x] Tarefa 1: Banner Meta oculto para Evolution Go → `whatsapp/page.tsx`
- [x] Tarefa 2: Status real-time em `evolution/page.tsx`
- [x] Tarefa 3: Status real-time em `settings/page.tsx`

**Verificação de placeholders:** Nenhum.

**Consistência de tipos:** `effectiveStatus` e `evolutionEffectiveStatus` usam `0 | 1 | 2`, compatíveis com `EvolutionInstance["status"]` e a função `statusLabel()`.

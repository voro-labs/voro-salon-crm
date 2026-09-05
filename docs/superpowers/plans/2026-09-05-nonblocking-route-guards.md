# Non-blocking Route Guards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the last blocking API call from the first render of a guarded route, so the screen paints as soon as React hydrates instead of one round trip later.

**Architecture:** `ModuleGuard` stops holding its children behind a spinner while `/tenant/modules` loads. It keeps the same SWR call and the same redirect effect, so a tenant without the module still lands on `/not-authorized` — it just gets there while looking at the screen instead of at a spinner. One component, seven call sites, no other file touched.

**Tech Stack:** Next.js 16 App Router, React 19, SWR 2, TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-05-nonblocking-route-guards-design.md`

**Commands:**
- Type check: `cd voro-salon-crm-front && npx tsc --noEmit`
- Build: `cd voro-salon-crm-front && npm run build`

## Global Constraints

- Only `voro-salon-crm-front/components/auth/module-guard.tsx` changes. If the work seems to need another file, stop and report — that is the signal that the scope grew past what was agreed.
- Module availability is **UX, not a security barrier**: the API refuses callers who lack the module either way.
- **Leave the redirect effect byte-for-byte alone**, including `m.module === moduleId` — a number compared to an array, which never matches, so the redirect has never fired. Fixing it would turn this cleanup into a production behavior change. The spec's "Open question" section says what has to be answered first.
- `AuthGuard`, `Main`, the sign-in gate and the token refresh flow stay exactly as they are. Their blocking is load-bearing — the spec's table says why, and reopening it is out of scope.
- `npm run lint` does not run in this project (`eslint` is not in `devDependencies`). Type check plus build is the gate.
- Invoke `jasmim-plugin:task-git-workflow` before any git operation, and follow `jasmim-plugin:source-control` for the branch name and commit message.

---

## File Structure

**Modify:**
- `voro-salon-crm-front/components/auth/module-guard.tsx:33-36` — delete the `isLoading` early return. Everything else in the file stays: the SWR call that feeds the decision, and the effect that redirects when the loaded list says the module is disabled.

**Read but do not change** (the call sites that inherit the fix):
- `voro-salon-crm-front/app/appointments/layout.tsx`, `app/clients/layout.tsx`, `app/employees/layout.tsx`, `app/finance/layout.tsx`, `app/services/layout.tsx` — five section layouts.
- `voro-salon-crm-front/app/funnel/page.tsx`, `app/whatsapp/page.tsx` — two pages that use the guard directly.

### Test note

There is no unit test runner in this project, and the Playwright suite needs the API plus `TEST_EMAIL` / `TEST_PASSWORD` / `TEST_2FA_CODE`. The verification that matters here is a **measurement**, not an assertion: how many API round trips happen before a guarded screen paints. Task 1 builds the harness for it, takes the baseline, makes the change, and re-measures — which is why it is one task and not three. A baseline with nothing to compare it to is not a reviewable deliverable.

---

### Task 1: Let the guarded screen render while the module list loads

**Files:**
- Modify: `voro-salon-crm-front/components/auth/module-guard.tsx:33-36`
- Harness (throwaway, do **not** commit): a stub API and a browser script, both under your scratchpad directory

**Interfaces:**
- Consumes: nothing.
- Produces: nothing importable. This is the whole plan.

The measurement uses an artificially slow `/tenant/modules` (3 s) so the result is
deterministic instead of a race against real network timing. With the delay in place, the
question "does the screen wait for the module list?" answers itself: check whether the page
heading exists one second in.

- [ ] **Step 1: Write the stub API**

Save as `stub-api.js` in your scratchpad directory. `/tenant/modules` answers after 3 s;
everything else answers immediately, in the `ResponseViewModel` shape the front expects.

```javascript
const http = require("http")

const CLIENTS = [
  { id: "11111111-1111-1111-1111-111111111111", name: "Ana Stub", phone: "11999990001", email: "ana@stub.dev", notes: "", serviceCount: 3 },
]

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost")
  const send = (data) => {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ status: 200, message: null, hasError: false, data }))
  }

  console.log(`[stub] ${new Date().toISOString()} ${req.method} ${url.pathname}`)

  if (url.pathname.endsWith("/tenant/me/modules")) {
    // atraso proposital: e ele que torna a medicao deterministica
    setTimeout(() => send([{ module: 1, isEnabled: true }]), 3000)
    return
  }

  if (url.pathname.endsWith("/client")) {
    send({ items: CLIENTS, totalCount: 1, page: 1, pageSize: 10, totalPages: 1 })
    return
  }

  send({})
})

server.listen(4000, () => console.log("[stub] api em http://localhost:4000"))
```

The path matches `API_CONFIG.ENDPOINTS.TENANT_MODULES` in `voro-salon-crm-front/lib/api.ts`,
which is `/tenant/me/modules` (checked while writing this plan). If that constant ever moves,
fix the `endsWith` here too — a stub that never matches turns the measurement into noise that
looks like a pass.

- [ ] **Step 2: Forge the session cookie**

The middleware only base64-decodes the JWT and checks `exp`, so an unsigned token is enough
to get past the redirect. Run this and keep the output:

```bash
node -e "
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 3600;
console.log([b64({alg:'HS256',typ:'JWT'}), b64({exp, roles:'SalonOwner', userId:'u1', userName:'stub', email:'stub@teste.dev'}), 'assinatura-falsa'].join('.'))
"
```

- [ ] **Step 3: Write the measurement script**

Save as `measure-guard.js` in your scratchpad directory, pasting the token from Step 2 into
`TOKEN`. It loads `/clients`, waits one second — well inside the stub's 3 s delay — and
reports whether the screen rendered and how many times the browser asked for the modules.

```javascript
const { chromium } = require("D:/GitHub/softwares/clients/salon-crm/voro-salon-crm-front/node_modules/@playwright/test")

const TOKEN = "<cole o token do passo 2>"

;(async () => {
  const browser = await chromium.launch()
  const context = await browser.newContext()
  await context.addCookies([{ name: "vorolabs_salon_token", value: TOKEN, domain: "localhost", path: "/" }])
  await context.addInitScript((t) => localStorage.setItem("vorolabs_salon_token", t), TOKEN)

  const page = await context.newPage()
  const moduleCalls = []
  page.on("request", (r) => {
    if (r.url().includes("modules")) moduleCalls.push(r.url())
  })

  await page.goto("http://localhost:3100/clients")
  await page.waitForTimeout(1000)

  const heading = await page.locator("h1", { hasText: "Clientes" }).count()
  console.log("cabecalho renderizado em 1s:", heading > 0 ? "SIM" : "NAO")
  console.log("chamadas a /modules ate aqui:", moduleCalls.length)

  await browser.close()
})().catch((e) => { console.error("falhou:", e.message); process.exit(1) })
```

The `require` uses an absolute path on purpose: the script lives in your scratchpad, outside
the project, so Node will not resolve `@playwright/test` by name from there. Point it at the
`node_modules` of whichever checkout you are running.

If Chromium is missing, `npx playwright install chromium` fetches it (~150 MB). Without it,
the fallback is manual: open `http://localhost:3100/clients` in a browser with the stub
running and watch whether the screen sits on a full-screen spinner for three seconds.

- [ ] **Step 4: Take the baseline**

```bash
node <scratchpad>/stub-api.js &
cd voro-salon-crm-front
NEXT_PUBLIC_BASE_API_URL=http://localhost:4000 NEXT_PUBLIC_VERSION_API=v1 npm run build
NEXT_PUBLIC_BASE_API_URL=http://localhost:4000 NEXT_PUBLIC_VERSION_API=v1 npx next start -p 3100 &
node <scratchpad>/measure-guard.js
```

Expected, before the change: `cabecalho renderizado em 1s: NAO` and one call to `/modules`.
That is the bug, measured — the screen is waiting on a request whose answer it discards.

Stop the app between runs by killing the process holding port 3100. On Windows,
`taskkill //PID <pid> //F` with the PID from `netstat -ano | grep ":3100.*LISTENING"`;
killing the npm wrapper alone leaves the Node process holding the port, and the next
`next start` fails with `EADDRINUSE` while your measurement silently hits the **old** build.

- [ ] **Step 5: Make the guard non-blocking**

In `voro-salon-crm-front/components/auth/module-guard.tsx`, delete these four lines:

```typescript
    if (isLoading) {
        return <LoadingSimple />
    }
```

and replace them with nothing. Then remove the now-unused import:

```typescript
import { LoadingSimple } from "../ui/custom/loading/loading-simple"
```

Leave the `useSWR` call and the `useEffect` exactly as they are — including
`m.module === moduleId`, which never matches. Fixing that comparison would turn a
performance cleanup into a production behavior change; the spec's "Open question" section
explains why it needs its own issue.

The file ends with `return <>{children}</>`, which now runs on every render.

- [ ] **Step 6: Re-measure**

```bash
cd voro-salon-crm-front
NEXT_PUBLIC_BASE_API_URL=http://localhost:4000 NEXT_PUBLIC_VERSION_API=v1 npm run build
NEXT_PUBLIC_BASE_API_URL=http://localhost:4000 NEXT_PUBLIC_VERSION_API=v1 npx next start -p 3100 &
node <scratchpad>/measure-guard.js
```

Expected, after the change: `cabecalho renderizado em 1s: SIM`, still one call to
`/modules`. Same requests, same data, three seconds earlier on screen. If the heading still
reports `NAO`, something else is blocking — find it and report it rather than editing
another guard, since the agreed scope is this one file.

- [ ] **Step 7: Type check and build**

Run: `cd voro-salon-crm-front && npx tsc --noEmit && npm run build`
Expected: no new type errors (six pre-existing ones about missing modules are dead code,
removed in PR #131), build exits 0.

- [ ] **Step 8: Manual pass against the real API**

With the real backend, walk through `/clients`, `/appointments`, `/employees`, `/finance`,
`/services`, `/funnel` and `/whatsapp`. Expected: every screen renders normally and nobody
lands on `/not-authorized`. The only visible difference is that the full-screen spinner
between navigations is gone.

- [ ] **Step 9: Commit**

Invoke `jasmim-plugin:task-git-workflow` first, then:

```bash
git add voro-salon-crm-front/components/auth/module-guard.tsx
git commit -m "perf(front): stop blocking guarded screens on the module list"
```

Do not commit the stub or the measurement script — they are throwaway harness.

---

## Self-review

**Spec coverage:**

| Spec section | Where it lands |
|---|---|
| "What changes" — delete the `isLoading` gate | Task 1, Step 5 |
| "There is no flash..." — leave the redirect effect untouched | Task 1, Step 5, stated as a constraint on the edit |
| "Open question" — do not fix the comparison | Task 1, Step 5, and Global Constraints |
| "What stays blocking" — `AuthGuard`, `Main`, sign-in gate | Global Constraints; no task touches them |
| "Testing" — round-trip measurement, then manual pass | Task 1, Steps 1-4, 6 and 8 |

**Placeholder scan:** the only bracketed value is `<cole o token do passo 2>` in the
measurement script and `<scratchpad>` in the shell snippets, both of which are values the
executor produces in an earlier step, not decisions left open.

**Type consistency:** no new types, functions or props are introduced. The edit only removes
an early return and an import.

**Known gap:** the measurement needs Chromium. The manual fallback in Step 3 covers an
environment without it, but it produces an observation rather than a number — say which one
you used in the task report.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-05-nonblocking-route-guards.md`.
One task, one file, one commit — inline execution with `superpowers:executing-plans` fits it
better than dispatching a subagent, since there is no second task to review against.

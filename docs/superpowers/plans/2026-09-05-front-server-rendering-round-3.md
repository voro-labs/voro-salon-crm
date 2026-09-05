# Front Server Rendering (Performance Round 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut the serial cascade `dynamic HTML → download JS → hydrate → resolve auth → fetch API → render` on the admin app by freeing routes from forced dynamic rendering, running the middleware only where it guards something, and serving the first page of the main listings from the server.

**Architecture:** Three independent levers, in rising order of risk. (1) The middleware `matcher` shrinks from "every path" to exactly the prefixes `PROTECTED_PATHS` already guards, so landing, booking, receipt and the blob proxy stop paying an edge invocation. (2) The per-hostname branding/SEO that today calls `headers()` in the root layout moves down into the landing route group, which is the only place it is read by crawlers — the root layout stops opting every route out of static generation. (3) The listings keep their current client components and SWR behavior, but a thin Server Component wrapper fetches page 1 with the token cookie and hands it to SWR as `fallbackData`, so the first paint carries data instead of a skeleton.

**Tech Stack:** Next.js 16 App Router (React 19, server components), SWR 2, TypeScript, Tailwind; Playwright for e2e.

**Spec:** GitHub issue [#123](https://github.com/voro-labs/voro-salon-crm/issues/123), items 1–3, under the audit umbrella [#126](https://github.com/voro-labs/voro-salon-crm/issues/126). There is no separate design doc: the issue carries the measurements and the proposed fix, and the design decisions this plan makes on top of it are recorded in "Design decisions" below.

**Commands:**
- Type check: `cd voro-salon-crm-front && npx tsc --noEmit`
- Build: `cd voro-salon-crm-front && npm run build`
- E2E (needs the API up and `e2e/fixtures/.auth/user.json` seeded by the setup project): `cd voro-salon-crm-front && npm run test:e2e`

## Global Constraints

- Everything in `voro-salon-crm-front`. No API change belongs to this plan; if a task seems to need one, stop and report.
- Item 4 of #123 (`next/dynamic` for recharts and xlsx) is already done in PR #132 — do not redo it.
- Behavior parity is the bar: no route may become more permissive or more restrictive than it is today. The middleware guards the same prefixes, `AuthGuard` stays on every screen it is on now, and no redirect changes.
- The token cookie is `vorolabs_salon_token`, written by `setAuthToken` in `lib/api.ts` with `SameSite=Lax` and **not** `httpOnly` (the client reads it too). Server code only ever reads it.
- Server-side fetching never refreshes tokens. Refresh rotation lives in `AuthTokenManager` on the client and stays there.
- `npm run lint` does not run in this project (`eslint` is not in `devDependencies`) — do not add it as a verification step. Type check plus build is the gate.
- Commit after every task, one commit per task, following `jasmim-plugin:source-control` (English, `type(scope): subject`, no trailing period). Invoke `jasmim-plugin:task-git-workflow` before any git operation.

---

## Design decisions

These are the calls this plan makes that the issue leaves open. An executor should not silently reverse them.

**1. The landing group keeps dynamic rendering; the admin app is what gets freed.** The per-hostname branding exists because one deployment serves six hostnames (`salon-crm`, `barber-crm`, `nails-crm`, `esthetic-crm`, `spa-crm`, `petshop-crm`, plus the `dev-` variants). A statically generated page cannot vary by `Host` at request time, so `/prices`, `/privacy`, `/terms`, `/refund` and `/cookies` stay dynamic — they need the hostname for SEO, and they are the pages crawlers read. What is currently paid for nothing is the *rest* of the app: `/admin/sign-in`, the dashboard shell and every listing are opted out of static generation only because the **root** layout calls `headers()`, and none of them are indexed. Task 2 moves the cost to where the benefit is.

**2. Converted listings will be dynamic on purpose.** Task 4 makes `/clients` a Server Component that reads the cookie, which opts that route back into dynamic rendering. That is not a regression of Task 2: the route stops being dynamic-for-a-shell and becomes dynamic-with-data, removing a full round trip (hydrate → read token → call API) from the critical path. Do not try to have both on the same route.

**3. Server fetch degrades to the current behavior instead of erroring.** `serverApiGet` returns `null` on a missing cookie, a non-2xx response, an expired access token or a network failure. The page then renders exactly what it renders today — client component, SWR skeleton, client-side fetch with refresh support. This is the reason the conversion is safe to ship listing by listing.

**4. Only page 1 with no search gets server data.** The SWR key includes page, page size, search and extra params. `fallbackData` is handed over only when the mounted key is the one the server fetched. Any interaction (paging, searching, filtering) is a normal client fetch, exactly as today.

**5. No unit test runner is added.** The front has no jest/vitest and this plan does not introduce one — that decision deserves its own PR. Verification is the type check, the production build and the existing Playwright specs, which is the convention the repo already follows for frontend work.

---

## File Structure

All paths are relative to `voro-salon-crm-front/`.

**Create:**
- `lib/seo.ts` — the per-hostname SEO maps, moved out of the root layout so the landing group can own them.
- `lib/server-api.ts` — the only server-side fetch helper. Reads the token cookie, calls the API, unwraps `ResponseViewModel.data`, returns `null` on any failure. It may import `API_CONFIG` from `lib/api.ts`: that module's browser work (`localStorage`, `document.cookie`) is all inside functions guarded by `typeof window === "undefined"`, and neither `WebTokenAdapter` nor `AuthTokenManager` touches a browser API in its constructor — verified by reading both, so a server import is safe.
- `app/clients/clients-view.tsx` — the current `app/clients/page.tsx` body, verbatim, as a client component that accepts `initialData`.

**Modify:**
- `middleware.ts` — replace the catch-all `matcher` with the guarded prefixes; the runtime logic (`PUBLIC_PATHS`, `PROTECTED_PATHS`, token decode, `x-user-role`) does not change.
- `app/layout.tsx` — drop `generateMetadata`'s `headers()` call, the JSON-LD block and the branding lookup; keep the providers, fonts, `Toaster` and analytics. The hostname maps (`SEO_BY_HOSTNAME`, `FEATURE_LIST_BY_HOSTNAME`, `OG_IMAGE_BY_HOSTNAME`) move out of this file.
- `app/(landing)/layout.tsx` — becomes the owner of per-hostname SEO: `generateMetadata` plus the `SoftwareApplication` JSON-LD, both moved from the root layout unchanged.
- `hooks/use-data-list.hook.ts` — accept `initialData` and pass it to SWR as `fallbackData` only when the mounted key equals the key the server fetched.
- `app/clients/page.tsx` — becomes a Server Component that fetches page 1 and renders `<ClientsView initialData={...} />`.
- `app/employees/page.tsx`, `app/services/page.tsx` — same conversion as clients, after the pilot is reviewed.

**Create (alongside the two conversions above):**
- `app/employees/employees-view.tsx`, `app/services/services-view.tsx`.

**Do not touch:**
- `app/sitemap.ts` — it calls `headers()` and must stay dynamic; the sitemap has to vary by hostname.
- `components/auth/auth.guard.tsx` — the guard stays exactly as it is on every converted screen.
- `lib/api.ts` — client-side token handling and refresh are out of scope.

### Test note

There is no unit test runner in this project. Each task is verified by `npx tsc --noEmit`, `npm run build`, and — where a spec already exists for the screen — the matching Playwright file (`e2e/tests/clients.spec.ts`, `employees.spec.ts`, `services.spec.ts`). The e2e suite needs the API reachable and the `setup` project able to log in; if it cannot run in your environment, say so in the task report rather than marking the step done.

---

### Task 1: Middleware runs only where it guards something

**Files:**
- Modify: `voro-salon-crm-front/middleware.ts:105-107` (the `config` export only)
- Test: `voro-salon-crm-front/e2e/tests/auth.spec.ts` (add two guard tests)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: nothing later tasks import. Task 4 relies on the fact that `/clients` is still matched by the middleware, so the redirect for a missing token keeps happening before the Server Component runs.

Today `matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]` invokes the middleware on **every** request — landing pages, `/booking/[slug]`, `/receipt/[id]`, `/api/blob/proxy`, `sitemap.xml` — and then `PUBLIC_PATHS`/`PROTECTED_PATHS` throw most of them away at runtime. The matcher should express what the runtime logic already decides.

Note the semantic difference this introduces, and keep it: `pathname.startsWith("/clients")` also matched a hypothetical `/clientsomething`, while `/clients/:path*` does not. No such route exists; the new form is the intended reading.

- [ ] **Step 1: Write the guard tests**

These are regression guards, not red-first tests: they must pass **before** the change (proving they describe today's behavior) and after (proving the matcher did not alter it).

Append to `voro-salon-crm-front/e2e/tests/auth.spec.ts`, inside the existing `test.describe('Autenticação', ...)` block:

```typescript
  test('rota pública não é redirecionada sem auth', async ({ page }) => {
    await page.goto('/prices')
    await page.waitForLoadState('domcontentloaded')
    expect(page.url()).toContain('/prices')
  })

  test('rota protegida de admin redireciona sem auth', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForURL('**/admin/sign-in**', { timeout: 10000 })
    expect(page.url()).toContain('/admin/sign-in')
  })
```

- [ ] **Step 2: Run them against the current code**

Run: `cd voro-salon-crm-front && npx playwright test e2e/tests/auth.spec.ts --project=frontend`
Expected: PASS (4 tests). If the suite cannot run here (no API, or `TEST_EMAIL` / `TEST_PASSWORD` / `TEST_2FA_CODE` unset), record that in the task report and fall back to the manual check in Step 5 — do not mark this step done.

- [ ] **Step 3: Replace the matcher**

In `voro-salon-crm-front/middleware.ts`, replace the whole `config` export:

```typescript
// O matcher lista exatamente os prefixos que PROTECTED_PATHS guarda. Antes ele casava
// com toda requisição e o runtime descartava a maioria — landing, /booking, /receipt e
// o proxy de imagem pagavam uma invocação de edge para nada (issue #123, item 2).
export const config = {
  matcher: [
    "/",
    "/appointments/:path*",
    "/clients/:path*",
    "/dashboard/:path*",
    "/employees/:path*",
    "/finance/:path*",
    "/my-commissions/:path*",
    "/my-profile/:path*",
    "/notifications/:path*",
    "/reports/:path*",
    "/services/:path*",
    "/settings/:path*",
    "/admin/change-password/:path*",
    "/admin/complete-profile/:path*",
    "/admin/terms/:path*",
    // /api continua guardado, menos o proxy de imagem: ele responde com cache imutável
    // e não deve pagar middleware por request (PR #129)
    "/api/((?!blob/proxy).*)",
  ],
}
```

- [ ] **Step 4: Type check and build**

Run: `cd voro-salon-crm-front && npx tsc --noEmit && npm run build`
Expected: no new type errors, build exits 0. An invalid matcher pattern fails the build, so a green build is what validates the syntax.

- [ ] **Step 5: Manual check that public routes stopped hitting the middleware**

Run `npm run start` and, in another shell:

```bash
curl -s -o /dev/null -D - http://localhost:3000/prices | head -1
curl -s -o /dev/null -D - "http://localhost:3000/api/blob/proxy?url=https://x.blob.vercel-storage.com/a" | head -1
curl -s -o /dev/null -D - http://localhost:3000/settings | head -1
```

Expected: `/prices` returns 200, the proxy returns its own 400/404 (it is reached, not redirected), `/settings` returns a 307 to `/admin/sign-in`.

- [ ] **Step 6: Commit**

```bash
git add voro-salon-crm-front/middleware.ts voro-salon-crm-front/e2e/tests/auth.spec.ts
git commit -m "perf(front): run the middleware only on guarded routes"
```

---

### Task 2: Wrap `useSearchParams` pages in Suspense

**Files:**
- Modify: `voro-salon-crm-front/app/admin/sign-in/page.tsx:17`
- Modify: `voro-salon-crm-front/app/admin/confirm-email/page.tsx:11`
- Modify: `voro-salon-crm-front/app/admin/reset-password/page.tsx:13`
- Modify: `voro-salon-crm-front/app/admin/verify-code/page.tsx:9`
- Modify: `voro-salon-crm-front/app/appointments/new/page.tsx:57`
- Modify: `voro-salon-crm-front/app/settings/page.tsx:160`
- Test: build only (no behavior change)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing importable. Task 3 **depends on this task being done first** — without it, Task 3's build fails.

This task is preparation, and it is the reason Task 3 is not a one-file change. Today every route is dynamic because the root layout calls `headers()`, which is what keeps these six pages building: `useSearchParams()` in a client component with no Suspense boundary above it is an error during static prerendering. The moment Task 3 frees the routes, Next tries to prerender them and these six fail. Doing it separately keeps the build green at every commit and makes Task 3 reviewable on its own.

Eight files call `useSearchParams`; the two under `app/(landing)/` (`prices/page.tsx`, `prices/feedback/page.tsx`) stay dynamic after Task 3 and are left alone.

The recipe is identical for all six: rename the exported component, then re-export a wrapper. Nothing inside the component changes.

- [ ] **Step 1: Apply the wrapper to `app/admin/sign-in/page.tsx`**

Rename the default export to an inner component and add the wrapper at the bottom of the file:

```typescript
// era: export default function SignInPage() {
function SignInPageContent() {
  const searchParams = useSearchParams()
  // ...corpo inalterado...
}

// useSearchParams() força render no cliente; sem um limite de Suspense acima dele, a rota
// inteira deixa de poder ser pré-renderizada. O fallback é o mesmo loading que a tela já usa.
export default function SignInPage() {
  return (
    <Suspense fallback={<LoadingSimple />}>
      <SignInPageContent />
    </Suspense>
  )
}
```

Add `Suspense` to the existing React import at the top of the file:

```typescript
import { useState, useEffect, Suspense } from "react"
```

`LoadingSimple` is already imported in this file. For the files that do not import it, add:

```typescript
import { LoadingSimple } from "@/components/ui/custom/loading/loading-simple"
```

- [ ] **Step 2: Repeat for the remaining five pages**

Same rename-and-wrap in `app/admin/confirm-email/page.tsx` (`ConfirmEmailPage`), `app/admin/reset-password/page.tsx` (`ResetPasswordPage`), `app/admin/verify-code/page.tsx` (`VerifyCodePage`), `app/appointments/new/page.tsx` (`NovoAgendamentoPage`) and `app/settings/page.tsx` (`ConfiguracoesPage`). Keep each file's existing component name for the inner component with a `Content` suffix, and give the wrapper the original name so nothing else has to change.

- [ ] **Step 3: Type check and build**

Run: `cd voro-salon-crm-front && npx tsc --noEmit && npm run build`
Expected: no new type errors, build exits 0, every route still listed as `ƒ` (dynamic) — this task alone changes nothing about rendering mode.

- [ ] **Step 4: Manual smoke check**

Run `npm run start` and open `/admin/sign-in?redirect=/clients`, then `/appointments/new?clientId=<any-guid>`. Expected: both screens render as before and still read their query parameters — the redirect target is honored after login, and the appointment form preselects the client.

- [ ] **Step 5: Commit**

```bash
git add voro-salon-crm-front/app/admin/sign-in/page.tsx voro-salon-crm-front/app/admin/confirm-email/page.tsx voro-salon-crm-front/app/admin/reset-password/page.tsx voro-salon-crm-front/app/admin/verify-code/page.tsx voro-salon-crm-front/app/appointments/new/page.tsx voro-salon-crm-front/app/settings/page.tsx
git commit -m "refactor(front): wrap search-param pages in a suspense boundary"
```

---

### Task 3: Take `headers()` out of the root layout

**Files:**
- Create: `voro-salon-crm-front/lib/seo.ts`
- Modify: `voro-salon-crm-front/app/layout.tsx:1-380` (most of the file)
- Modify: `voro-salon-crm-front/app/(landing)/layout.tsx:1-12`
- Test: build output (rendering mode per route)

**Interfaces:**
- Consumes: Task 2 (the six Suspense boundaries). Without them this build fails.
- Produces: `lib/seo.ts` exporting
  - `SEO_BY_HOSTNAME: Record<string, { title: string; titleTemplate: string; keywords: string[] }>`
  - `FEATURE_LIST_BY_HOSTNAME: Record<string, string[]>`
  - `OG_IMAGE_BY_HOSTNAME: Record<string, string>`
  - `DEFAULT_SEO: { title: string; titleTemplate: string; keywords: string[] }`
  - `DEFAULT_HOSTNAME: string` (the value `"salon-crm.vorolabs.app"`)

  These are the names the landing layout imports; keep them exactly.

`app/layout.tsx` calls `await headers()` in both `generateMetadata` and the layout body, to pick per-hostname SEO copy and to build the `SoftwareApplication` JSON-LD. A dynamic API anywhere in a route's render path opts that route out of static generation — and because this is the **root** layout, that means all 47 routes. The copy it produces is only read by crawlers on the public marketing pages, which live in `app/(landing)/`.

- [ ] **Step 1: Move the hostname maps into `lib/seo.ts`**

Create `voro-salon-crm-front/lib/seo.ts` and move, **verbatim**, these blocks out of `app/layout.tsx`: the `SEO_BY_HOSTNAME` map (lines 18-131), `FEATURE_LIST_BY_HOSTNAME` (133-194), `OG_IMAGE_BY_HOSTNAME` (196-209), the two "dev hostnames inherit" assignment blocks (211-225) and `DEFAULT_SEO` (227). Export all four, add `DEFAULT_HOSTNAME`, and change none of the values:

```typescript
export const SEO_BY_HOSTNAME: Record<string, {
  title: string
  titleTemplate: string
  keywords: string[]
}> = {
  // ...conteudo movido sem alteracao...
}

export const FEATURE_LIST_BY_HOSTNAME: Record<string, string[]> = {
  // ...conteudo movido sem alteracao...
}

export const OG_IMAGE_BY_HOSTNAME: Record<string, string> = {
  // ...conteudo movido sem alteracao...
}

// os dois blocos "dev hostnames inherit" vem logo abaixo, tambem sem alteracao

export const DEFAULT_HOSTNAME = "salon-crm.vorolabs.app"
export const DEFAULT_SEO = SEO_BY_HOSTNAME[DEFAULT_HOSTNAME]
```

- [ ] **Step 2: Rewrite the root layout without dynamic APIs**

`app/layout.tsx` keeps the font, the providers, `Toaster` and the analytics scripts. It loses `headers()`, `getBrandingByHostname`, `generateMetadata` and the JSON-LD `<script>`, and gains a static `metadata` export:

```typescript
import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { AuthProvider } from '@/contexts/auth.context'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Main } from "@/components/layout/admin/main"
import { TenantThemeProvider } from "@/contexts/tenant-theme.context"
import { BrowserNotificationsProvider } from "@/contexts/browser-notifications.context"
import { WebPushManager } from "@/components/providers/web-push-manager"
import { Toaster } from "sonner"

const _geist = Geist({ subsets: ["latin"] });

// SEO por hostname vive em app/(landing)/layout.tsx. Aqui ficam so os metadados que nao
// dependem do host: ler headers() na raiz tirava as 47 rotas da geracao estatica para
// beneficiar cinco paginas de marketing (issue #123, item 1).
export const metadata: Metadata = {
  title: "Voro Salon",
  description: "Sistema de gestao para salao de beleza, barbearia, studio de unhas, estetica, SPA e pet shop.",
  authors: [{ name: "VoroLabs", url: "https://vorolabs.app" }],
  creator: "VoroLabs",
  publisher: "VoroLabs",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon-light.ico", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark.ico", media: "(prefers-color-scheme: dark)" },
      { url: "/icon.ico" },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className=" scroll-smooth" suppressHydrationWarning>
      <body className={`${_geist.className} font-sans antialiased`}>
        {/* a mesma arvore de providers de hoje, sem alteracao */}
      </body>
    </html>
  )
}
```

Copy the provider tree exactly as the file has it at the time you edit — it is wrapped in `SwrProvider` only if PR #129 is already merged. Do not add or remove providers here.

- [ ] **Step 3: Give the landing group the per-hostname SEO**

`app/(landing)/layout.tsx` becomes async, owns `generateMetadata` (moved from the root, with the `getBrandingByHostname` and map lookups intact) and renders the JSON-LD it inherited:

```typescript
import type { Metadata } from "next"
import type { ReactNode } from "react"
import { headers } from "next/headers"
import { CookieBanner } from "@/components/legal/cookie-banner"
import { getBrandingByHostname } from "@/lib/branding"
import {
  SEO_BY_HOSTNAME,
  FEATURE_LIST_BY_HOSTNAME,
  OG_IMAGE_BY_HOSTNAME,
  DEFAULT_SEO,
  DEFAULT_HOSTNAME,
} from "@/lib/seo"

async function resolveHostname() {
  const headersList = await headers()
  return headersList.get("host")?.split(":")[0] ?? "localhost"
}

export async function generateMetadata(): Promise<Metadata> {
  // corpo identico ao que estava em app/layout.tsx, lendo os mapas de @/lib/seo
}

export default async function LandingLayout({ children }: { children: ReactNode }) {
  const hostname = await resolveHostname()
  const canonicalUrl = hostname !== "localhost" ? `https://${hostname}` : `https://${DEFAULT_HOSTNAME}`
  const branding = getBrandingByHostname(hostname)
  const featureList = FEATURE_LIST_BY_HOSTNAME[hostname] ?? FEATURE_LIST_BY_HOSTNAME[DEFAULT_HOSTNAME]

  const jsonLd = {
    // objeto identico ao que estava em RootLayout
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
      <CookieBanner />
    </>
  )
}
```

- [ ] **Step 4: Build and read the rendering mode per route**

Run: `cd voro-salon-crm-front && npx tsc --noEmit && npm run build`
Expected: build exits 0, and the route table changes — routes such as `/admin/sign-in`, `/admin/forgot-password`, `/not-authorized` and `/_not-found` are listed as prerendered instead of dynamic. `/prices`, `/privacy`, `/terms`, `/refund`, `/cookies` and `/sitemap.xml` stay dynamic, which is intended. If **every** route is still dynamic, something else in the render path is calling a dynamic API — find it before continuing, and do not paper over it with `export const dynamic`.

- [ ] **Step 5: Verify the SEO output did not regress**

Run `npm run start`, then compare a landing page against an app page:

```bash
curl -s -H "Host: barber-crm.vorolabs.app" http://localhost:3000/prices | grep -o "<title>[^<]*</title>"
curl -s -H "Host: barber-crm.vorolabs.app" http://localhost:3000/prices | grep -c "SoftwareApplication"
curl -s http://localhost:3000/admin/sign-in | grep -o "<title>[^<]*</title>"
```

Expected: the `/prices` title is the barbearia copy from `SEO_BY_HOSTNAME` and the JSON-LD block is present (count 1); `/admin/sign-in` returns the generic "Voro Salon" title and no JSON-LD. Repeat the first two commands with `Host: nails-crm.vorolabs.app` and confirm the copy follows the host.

- [ ] **Step 6: Commit**

```bash
git add voro-salon-crm-front/lib/seo.ts voro-salon-crm-front/app/layout.tsx "voro-salon-crm-front/app/(landing)/layout.tsx"
git commit -m "perf(front): scope per-hostname seo to the landing routes"
```

---

### Task 4: Serve the first page of `/clients` from the server (pilot)

**Files:**
- Create: `voro-salon-crm-front/lib/server-api.ts`
- Create: `voro-salon-crm-front/app/clients/clients-view.tsx`
- Modify: `voro-salon-crm-front/hooks/use-data-list.hook.ts:24-63`
- Modify: `voro-salon-crm-front/app/clients/page.tsx` (becomes a Server Component)
- Test: `voro-salon-crm-front/e2e/tests/clients.spec.ts` (add one test)

**Interfaces:**
- Consumes: nothing from Tasks 1-3; this task is independent of them and can be reviewed on its own.
- Produces, for Task 5:
  - `serverApiGet<T>(endpoint: string): Promise<T | null>` from `@/lib/server-api`
  - `useDataList<T>(endpoint, options?: { pageSize?: number; extraParams?: Record<string, string>; initialData?: PagedResult<T> })` — the third option is new; the return shape does not change
  - the page/view split pattern that `employees` and `services` copy

This is the pilot for item 3 of the issue. It removes the `hydrate -> read token -> call API` round trip from the first paint of one screen, while keeping the screen's component, its `AuthGuard`, its SWR key and every interaction exactly as they are.

- [ ] **Step 1: Write the server fetch helper**

Create `voro-salon-crm-front/lib/server-api.ts`:

```typescript
import { cookies } from "next/headers"
import { API_CONFIG } from "@/lib/api"

const TOKEN_COOKIE = "vorolabs_salon_token"

/**
 * GET no servidor usando o token do cookie que o cliente já mantém para o middleware.
 *
 * Devolve null em qualquer problema — sem cookie, token expirado, resposta de erro ou
 * falha de rede. Quem chama trata null como "sem dado inicial" e cai no comportamento
 * atual: o componente cliente busca via SWR, com refresh de token, como sempre fez.
 * Renovação de token é responsabilidade do AuthTokenManager, no browser; o servidor
 * não renova nada.
 */
export async function serverApiGet<T>(endpoint: string): Promise<T | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(TOKEN_COOKIE)?.value
  if (!token) return null

  try {
    const response = await fetch(`${API_CONFIG.BASE_API_URL}${endpoint}`, {
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })

    if (!response.ok) return null

    const json = await response.json()
    if (json?.hasError) return null

    return (json?.data ?? null) as T | null
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Teach `useDataList` to accept server data**

In `voro-salon-crm-front/hooks/use-data-list.hook.ts`, add the option and hand it to SWR. Only these three edits; the rest of the hook is untouched:

```typescript
export function useDataList<T>(
  endpoint: string,
  options?: {
    pageSize?: number
    extraParams?: Record<string, string>
    /** Página 1 buscada no servidor. Ignorada assim que o usuário pagina, busca ou filtra. */
    initialData?: PagedResult<T>
  }
) {
  const initialPageSize = options?.pageSize ?? 20
  const [pageSize, setPageSize] = useState(initialPageSize)
```

then, right after the existing `const key = ...` line:

```typescript
  // A chave que o servidor buscou. Só ela recebe fallbackData: qualquer paginação, busca
  // ou filtro muda a chave e volta a ser uma requisição normal do cliente.
  const initialKey = `${endpoint}?${new URLSearchParams({
    page: "1",
    pageSize: String(initialPageSize),
    ...(options?.extraParams ?? {}),
  }).toString()}`

  const { data, isLoading, error, mutate } = useSWR<PagedResult<T>>(key, fetcher, {
    fallbackData: key === initialKey ? options?.initialData : undefined,
  })
```

replacing the current `useSWR` call. `PagedResult<T>` is already exported from this file, so callers can type the server fetch with it.

- [ ] **Step 3: Move the clients screen into a client view**

Create `voro-salon-crm-front/app/clients/clients-view.tsx` with the entire current content of `app/clients/page.tsx`, changing only these four things:

1. keep `"use client"` at the top;
2. export the `ClientItem` interface (`export interface ClientItem {`), so the page can type the server fetch;
3. rename the default export to a named one that takes the prop:

```typescript
export function ClientsView({ initialData }: { initialData?: PagedResult<ClientItem> }) {
```

4. pass the prop through to the hook:

```typescript
  } = useDataList<ClientItem>(API_CONFIG.ENDPOINTS.CLIENTS, { pageSize: 10, initialData })
```

Add the type import at the top: `import type { PagedResult } from "@/hooks/use-data-list.hook"`. Everything else — the `AuthGuard` wrapper, `usePlanLimits`, the export menu, the JSX — moves across unchanged.

- [ ] **Step 4: Turn the page into a Server Component**

Replace `voro-salon-crm-front/app/clients/page.tsx` entirely:

```typescript
import { API_CONFIG } from "@/lib/api"
import { serverApiGet } from "@/lib/server-api"
import type { PagedResult } from "@/hooks/use-data-list.hook"
import { ClientsView, type ClientItem } from "./clients-view"

const PAGE_SIZE = 10

// Busca a primeira página no servidor, com o token do cookie, e entrega pronta para o SWR.
// Sem isso a tela só começava a pedir dados depois de baixar o JS, hidratar e resolver o
// AuthContext (issue #123, item 3). Se a busca falhar, initialData vem undefined e a tela
// se comporta exatamente como antes.
export default async function ClientsPage() {
  const initialData = await serverApiGet<PagedResult<ClientItem>>(
    `${API_CONFIG.ENDPOINTS.CLIENTS}?page=1&pageSize=${PAGE_SIZE}`
  )

  return <ClientsView initialData={initialData ?? undefined} />
}
```

Note the query string is built in the same order the hook builds it (`page`, then `pageSize`), because the key has to match character for character for `fallbackData` to apply.

- [ ] **Step 5: Type check and build**

Run: `cd voro-salon-crm-front && npx tsc --noEmit && npm run build`
Expected: no new type errors; build exits 0; `/clients` is listed as dynamic (expected — it reads cookies now).

- [ ] **Step 6: Prove the server actually fetched, and know what you get**

> **Corrigido durante a execucao (PR #137).** A versao original deste passo mandava
> conferir que os cards aparecem no HTML. Eles **nao** aparecem: `AuthGuard`
> (`app/clients/layout.tsx`) e `Main` (layout raiz) decidem o que renderizar a partir do
> estado de auth, que so existe depois da hidratacao, entao no servidor eles nao renderizam
> os filhos e o corpo do HTML volta vazio. O que a conversao entrega e **uma ida a API a
> menos no caminho critico**: o dado viaja no payload do RSC e o SWR o usa sem buscar de
> novo. Para o HTML pintar a lista sem JS, o portao de auth precisa renderizar no servidor
> — mudanca a parte, com issue propria.

Run `npm run start`, log in through the browser, copy the `vorolabs_salon_token` cookie
value, then:

```bash
curl -s -H "Cookie: vorolabs_salon_token=<valor>" http://localhost:3000/clients | grep -c "<nome de um cliente real>"
curl -s -o /dev/null -w "%{http_code} %{redirect_url}" http://localhost:3000/clients
```

Expected: with the cookie, the client names appear in the response (inside the RSC
payload, not as rendered cards). Without it, a 307 to `/admin/sign-in`.

Where there is no API to log into, a stub is enough: serve
`{"status":200,"hasError":false,"data":{"items":[...],"totalCount":2,"page":1,"pageSize":10,"totalPages":1}}`
on the `NEXT_PUBLIC_BASE_API_URL` used at build time, and forge a cookie whose JWT payload
carries a future `exp` — the middleware only base64-decodes it.

- [ ] **Step 7: Add the e2e guard and run the clients suite**

Append to `voro-salon-crm-front/e2e/tests/clients.spec.ts`, inside the existing describe block:

```typescript
  test('primeira página vem renderizada do servidor', async ({ page }) => {
    const response = await page.goto('/clients')
    const html = (await response?.text()) ?? ''
    // o cabeçalho da tela chega no HTML inicial, não só depois da hidratação
    expect(html).toContain('Clientes')
    const clientsPage = new ClientsPage(page)
    await clientsPage.expectPageLoaded()
  })
```

Run: `cd voro-salon-crm-front && npx playwright test e2e/tests/clients.spec.ts --project=frontend`
Expected: PASS (5 tests). The `setup` project stores the token cookie in `storageState`, so the server fetch runs under test too. If the suite cannot run in your environment, say so in the report and rely on Step 6.

- [ ] **Step 8: Manual check of the interactions that must not change**

With the app running and logged in, on `/clients`: search for a name (list filters), change the page size, go to page 2 and back to page 1, then create a client and confirm it appears. Expected: identical behavior to `dev`, and no duplicated or stale first page after navigating back.

- [ ] **Step 9: Commit**

```bash
git add voro-salon-crm-front/lib/server-api.ts voro-salon-crm-front/app/clients/clients-view.tsx voro-salon-crm-front/app/clients/page.tsx voro-salon-crm-front/hooks/use-data-list.hook.ts voro-salon-crm-front/e2e/tests/clients.spec.ts
git commit -m "perf(front): render the first page of clients on the server"
```

---

### Task 5: Apply the same conversion to `/employees` and `/services`

**Files:**
- Create: `voro-salon-crm-front/app/employees/employees-view.tsx`
- Create: `voro-salon-crm-front/app/services/services-view.tsx`
- Modify: `voro-salon-crm-front/app/employees/page.tsx` (becomes a Server Component)
- Modify: `voro-salon-crm-front/app/services/page.tsx` (becomes a Server Component)
- Test: `voro-salon-crm-front/e2e/tests/employees.spec.ts`, `voro-salon-crm-front/e2e/tests/services.spec.ts`

**Interfaces:**
- Consumes: `serverApiGet` and the `initialData` option, both from Task 4. Do not start this task before Task 4 is reviewed — if the pilot gets reworked, this doubles the rework.
- Produces: nothing new. This is the same pattern applied twice.

Both screens use `useDataList(..., { pageSize: 10 })` and both are behind `AuthGuard`, so the conversion is mechanical. `/appointments` also uses `useDataList` and is deliberately **not** in this task: it carries a second SWR query (`?page=1&pageSize=500` for overdue appointments) and status filters, so it deserves its own review after these two land.

- [ ] **Step 1: Convert `/employees`**

Move the whole body of `app/employees/page.tsx` into `app/employees/employees-view.tsx` following the Task 4 recipe: keep `"use client"`, rename the default export to `export function EmployeesView({ initialData }: { initialData?: PagedResult<EmployeeItem> })`, pass `initialData` into `useDataList`, and add the type import.

This file has no item interface today (it maps over `items` with `(emp: any)`), so declare and export a minimal one at the top of the view — the fields the JSX reads. Leave the `(emp: any)` annotations in the JSX alone:

```typescript
export interface EmployeeItem {
  id: string
  name: string
  photoUrl?: string
  isActive: boolean
  hireDate: string
  specialtyIds?: string[]
}
```

The hook call becomes:

```typescript
  } = useDataList(API_CONFIG.ENDPOINTS.EMPLOYEES, { pageSize: 10, initialData })
```

Then replace `app/employees/page.tsx`:

```typescript
import { API_CONFIG } from "@/lib/api"
import { serverApiGet } from "@/lib/server-api"
import type { PagedResult } from "@/hooks/use-data-list.hook"
import { EmployeesView, type EmployeeItem } from "./employees-view"

const PAGE_SIZE = 10

export default async function EmployeesPage() {
  const initialData = await serverApiGet<PagedResult<EmployeeItem>>(
    `${API_CONFIG.ENDPOINTS.EMPLOYEES}?page=1&pageSize=${PAGE_SIZE}`
  )

  return <EmployeesView initialData={initialData ?? undefined} />
}
```

Leave the second query in this screen (`useSWR(API_CONFIG.ENDPOINTS.SERVICES + "?pageSize=500", fetcher)`) exactly where it is — it feeds `getServiceName` and is not part of this conversion.

- [ ] **Step 2: Convert `/services`**

Same recipe. `ServiceItem` is already declared in `app/services/page.tsx` — move it to the view file and export it. The hook call becomes:

```typescript
  } = useDataList<ServiceItem>(API_CONFIG.ENDPOINTS.SERVICES, { pageSize: 10, initialData })
```

And `app/services/page.tsx`:

```typescript
import { API_CONFIG } from "@/lib/api"
import { serverApiGet } from "@/lib/server-api"
import type { PagedResult } from "@/hooks/use-data-list.hook"
import { ServicesView, type ServiceItem } from "./services-view"

const PAGE_SIZE = 10

export default async function ServicesPage() {
  const initialData = await serverApiGet<PagedResult<ServiceItem>>(
    `${API_CONFIG.ENDPOINTS.SERVICES}?page=1&pageSize=${PAGE_SIZE}`
  )

  return <ServicesView initialData={initialData ?? undefined} />
}
```

Keep `ServicePromotion` and any promotion lookup in the view file — that logic does not move to the server here.

- [ ] **Step 3: Type check and build**

Run: `cd voro-salon-crm-front && npx tsc --noEmit && npm run build`
Expected: no new type errors, build exits 0. If typing `EmployeeItem` surfaces an error in the JSX, fix the interface to match what the screen actually reads — do not widen it to `any` to silence the check.

- [ ] **Step 4: Prove the data is in the HTML for both screens**

With `npm run start` and a valid token cookie (same procedure as Task 4, Step 6):

```bash
curl -s -H "Cookie: vorolabs_salon_token=<valor>" http://localhost:3000/employees | grep -c "data-slot=\"card\""
curl -s -H "Cookie: vorolabs_salon_token=<valor>" http://localhost:3000/services | grep -c "data-slot=\"card\""
```

Expected: both counts greater than 0.

- [ ] **Step 5: Run the two suites**

Run: `cd voro-salon-crm-front && npx playwright test e2e/tests/employees.spec.ts e2e/tests/services.spec.ts --project=frontend`
Expected: PASS. If the suite cannot run in your environment, say so in the report and rely on Step 4 plus the manual check.

- [ ] **Step 6: Manual check**

On both screens: search, change page size, page forward and back, and create one record. Expected: same behavior as `dev`. On `/employees` specifically, confirm the specialty names still resolve (that is the second query, which must be untouched).

- [ ] **Step 7: Commit**

```bash
git add voro-salon-crm-front/app/employees/employees-view.tsx voro-salon-crm-front/app/employees/page.tsx voro-salon-crm-front/app/services/services-view.tsx voro-salon-crm-front/app/services/page.tsx
git commit -m "perf(front): render the first page of employees and services on the server"
```

---

## Self-review

Run through this before handing the plan to an executor.

**Spec coverage (issue #123):**

| Issue item | Task |
|---|---|
| 1 — resolve `headers()` in the root layout, restore static HTML | Tasks 2 and 3 (Task 2 is the prerequisite that makes Task 3 buildable) |
| 2 — restrict the middleware matcher | Task 1 |
| 3 — listings as Server Components that fetch on the server | Tasks 4 and 5 |
| 4 — `next/dynamic` for recharts and xlsx | Already shipped in PR #132, out of scope here |

The issue's item 3 says "as telas de listagem"; this plan converts clients, employees and services and explicitly defers `/appointments` (second query plus filters) to its own review. That is a narrowing, and it is stated in Task 5 rather than left implicit.

**Type consistency:**
- `serverApiGet<T>(endpoint: string): Promise<T | null>` — declared in Task 4, used with the same signature in Task 5.
- `PagedResult<T>` — already exported by `hooks/use-data-list.hook.ts`; used unchanged in Tasks 4 and 5.
- `useDataList(endpoint, { pageSize, extraParams, initialData })` — the third option is added in Task 4 and consumed in Task 5.
- `lib/seo.ts` exports `SEO_BY_HOSTNAME`, `FEATURE_LIST_BY_HOSTNAME`, `OG_IMAGE_BY_HOSTNAME`, `DEFAULT_SEO`, `DEFAULT_HOSTNAME` — declared in Task 3, Step 1 and imported in Task 3, Step 3 under those exact names.
- View components: `ClientsView` / `ClientItem`, `EmployeesView` / `EmployeeItem`, `ServicesView` / `ServiceItem` — each named the same in the task that creates it and in the page that imports it.

**Ordering:** Task 2 must precede Task 3 (Suspense boundaries before static prerendering). Task 4 must precede Task 5. Task 1 is independent of everything else and can ship first or last.

**Known gaps, on purpose:**
- No unit tests, because the project has no runner (Design decision 5).
- The e2e suite needs the API plus `TEST_EMAIL`, `TEST_PASSWORD` and `TEST_2FA_CODE`; every task that calls for it also gives a curl-level check that works without it.
- **The auth gate blocks server rendering.** `AuthGuard` and `Main` render from client-side
  auth state, so a converted listing ships its data in the RSC payload but still paints only
  after hydration. Tasks 4 and 5 remove one API round trip each, not the wait for JS. Making
  the gate server-renderable is the change that unlocks the rest — the middleware already
  guards these routes, so the client guard there is defensive redundancy. It deserves its own
  issue and is a prerequisite for the full payoff of item 3.
- Server-side rendering of listings depends on a token cookie that is **not** `httpOnly`. That is how the middleware already works today and this plan does not change it, but making the session cookie `httpOnly` is a security improvement worth its own issue — and it would not break anything here, since the server only reads the cookie.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-05-front-server-rendering-round-3.md`. Two execution options:

1. **Subagent-driven (recommended)** — a fresh subagent per task, with review between tasks. Suits this plan because Task 3 and Task 4 are independently rejectable and each ends in its own commit.
2. **Inline execution** — run the tasks in one session with checkpoints, using `superpowers:executing-plans`.

Suggested PR split, whichever route is chosen: Task 1 alone, Tasks 2+3 together (the Suspense prep is meaningless on its own), Task 4 alone (the pilot deserves a focused review), Task 5 alone.

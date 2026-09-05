# Non-blocking Route Guards — Design

**Date:** 2026-09-05
**Status:** Approved (pending spec review)
**Issue:** [#123](https://github.com/voro-labs/voro-salon-crm/issues/123), item 3 (follow-up found while executing PR #137)

## Problem

A guarded screen only starts rendering after a chain of client-side waits:

```
baixa o JS → hidrata → resolve auth → ModuleGuard busca /tenant/modules → página monta → busca dados
```

PR #137 removed the last link for `/clients` by fetching the first page on the server. What
remains is `ModuleGuard`, in `app/<section>/layout.tsx` for every guarded section:

```typescript
// components/auth/module-guard.tsx:34-36
if (isLoading) {
    return <LoadingSimple />
}
```

`isLoading` is an SWR request to `/tenant/modules`. Until it answers, the guard renders a
full-screen spinner and the page below it never mounts — so the data the server already
fetched sits unused, and every guarded route pays one API round trip before showing
anything. Against a warm API that is the measured 66–85 ms of TTFB plus TLS; against a cold
machine it is the multi-second wait of #114.

## Goal

Remove the last blocking API call from the first render of a guarded route, so that a
screen paints as soon as React hydrates instead of one round trip later.

**Not a goal:** painting the screen before the JS loads. That requires the authenticated
shell to render on the server, which is a larger restructure — see "What stays blocking"
and "Out of scope".

## Decisions

- **Module availability is UX, not a security barrier.** The API refuses callers who lack
  the module; the guard exists to keep people out of a screen they did not contract. So it
  may render optimistically and correct itself when the answer arrives.
- **The correction stays exactly as it is:** the existing effect redirects to
  `/not-authorized` when the loaded module list says the module is disabled.
- **No server-side module fetch.** Feeding modules from the server would remove even the
  brief flash, but it means converting every guarded layout into a server component — a
  scope deliberately left out of this round.
- **Nothing else changes.** `AuthGuard`, `Main` and the token refresh flow keep their
  current behavior, because their blocking is load-bearing (see below).

## What changes

`components/auth/module-guard.tsx` — delete the `isLoading` gate. The component keeps its
SWR call and its redirect effect, and always renders `children`.

That is the whole change. One edit covers all seven call sites: five section layouts
(`appointments`, `clients`, `employees`, `finance`, `services`) and two pages that use the
guard directly (`funnel`, `whatsapp`). Sections without a module gate — `settings`,
`reports`, `notifications`, the dashboard — never paid this round trip and are unaffected.

### Why the flash is acceptable

Someone browsing to a module they do not have will see the screen for about one round trip
before being redirected. Today they see a full-screen spinner for the same duration and
then the same redirect — the wait is identical, only what fills it changes. The screen they
glimpse renders no privileged data: every request it makes is refused by the API for the
same reason the module is disabled.

The SWR key is `API_CONFIG.ENDPOINTS.TENANT_MODULES`, shared across all sections, so only
the first guarded screen of a session issues the request. Later navigations read the cache
and the redirect (when it applies) is immediate, with no flash at all.

## What stays blocking, and why

Recorded here so the next person does not reopen the question.

| Gate | Blocks on | Verdict |
|---|---|---|
| `AuthGuard` (`auth.guard.tsx:55,59`) | `loading` from `AuthContext` | **Keep.** With a valid token in `localStorage`, `checkAuth` decodes it, calls `applyToken` and clears `loading` in the same tick — no network. It only awaits when the token is expired or missing, and then blocking is correct: the session is unknown. |
| `Main` (`main.tsx:111`) | the same `loading`, plus `needsLoginRedirect` | **Keep.** Same reasoning; it also covers the redirect to sign-in for a session that turned out to be invalid. |
| Sign-in page (`sign-in/page.tsx:95`) | `authLoading \|\| loading \|\| user?.token` | **Keep.** It guards the transition into the app; blocking is the point. |
| `usePlanLimits` | nothing | Already non-blocking — it returns defaults while loading, and screens read them as "no limit". |
| `Main`'s tenant query, `useSubscription` | nothing | Already non-blocking — they feed styling, sidebar props and the paywall branch, none of which gate the first render. |

## Testing

The project has no unit test runner for the front, and the Playwright suite needs the API
plus `TEST_EMAIL` / `TEST_PASSWORD` / `TEST_2FA_CODE`. Verification therefore is:

- `npx tsc --noEmit` and `npm run build` clean.
- **Round-trip count, measured against a stub API.** Serve the API on a local port, forge a
  cookie whose JWT payload carries a future `exp` (the middleware only base64-decodes it),
  and load a guarded route in a browser with the network log open. Before the change the
  stub receives `/tenant/modules` and the screen paints only after it answers; after the
  change the screen paints without waiting for it. This is the measurement that decides
  whether the change did what it claims.
- Manual, against the real API: a user whose tenant has every module sees no behavior
  change; a user whose tenant lacks a module still lands on `/not-authorized`.

## Out of scope

- **Server-rendering the authenticated shell.** Painting before hydration needs `Main` to
  render on the server, which needs the cookie, which — read in the root layout — would
  make all 47 routes dynamic again and undo PR #136. Doing it properly means moving the
  authenticated screens into an `app/(app)/` route group with its own dynamic layout, and
  splitting `Main`'s four shells (public, onboarding, paywall, authenticated) across the
  groups. The mechanical part is cheap (a route group does not change URLs, and the `@/`
  aliases survive a folder move); the risk lives in the paywall and onboarding paths, which
  are revenue- and auth-critical. It deserves its own spec.
- **Feeding modules and tenant from the server** in the guarded layouts.
- **Converting `/employees` and `/services`** to server-fetched first pages — that is task 5
  of the round 3 plan.

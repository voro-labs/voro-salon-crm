import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyToken, getTokenFromCookieHeader } from "@/lib/auth"

// Rotas que não precisam de autenticação
const PUBLIC_PATHS = [
  "/login",
  "/prices",
  "/booking",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/blob/proxy",
  "/api/v1/public",
  // Fluxo de autenticação admin (pré-login)
  "/admin/sign-in",
  "/admin/verify-2fa",
  "/admin/forgot-password",
  "/admin/reset-password",
  "/admin/confirm-email",
  "/admin/verify-code",
]

// Rotas da aplicação que requerem token válido
const PROTECTED_PATHS = [
  "/",
  "/clients",
  "/employees",
  "/services",
  "/finance",
  "/appointments",
  "/settings",
  "/admin/change-password",
  "/admin/terms",
  "/dashboard",
  "/api",
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permite estáticos e públicos
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next()
  }

  // Verifica token nas rotas protegidas
  const isProtected = PROTECTED_PATHS.some((p) =>
    p === "/" ? pathname === "/" : pathname.startsWith(p)
  )

  if (isProtected) {
    const cookieHeader = request.headers.get("cookie")
    const token = getTokenFromCookieHeader(cookieHeader)

    if (!token) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
      }
      return NextResponse.redirect(new URL("/admin/sign-in", request.url))
    }

    const session = await verifyToken(token)
    if (!session) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Sessao expirada" }, { status: 401 })
      }
      return NextResponse.redirect(new URL("/admin/sign-in", request.url))
    }

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("x-user-id", session.userId)
    requestHeaders.set("x-tenant-id", session.tenantId)
    requestHeaders.set("x-user-role", session.role)

    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}

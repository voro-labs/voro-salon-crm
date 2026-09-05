import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const TOKEN_COOKIE = "vorolabs_salon_token"

function getTokenFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  const match = cookieHeader.split(";").find((c) => c.trim().startsWith(`${TOKEN_COOKIE}=`))
  if (!match) return null
  return match.split("=").slice(1).join("=").trim()
}

function decodeToken(token: string): { exp?: number; roles?: string } | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"))
    return payload
  } catch {
    return null
  }
}

// Rotas que não precisam de autenticação
const PUBLIC_PATHS = [
  "/login",
  "/prices",
  "/booking",
  "/receipt",
  "/privacy",
  "/cookies",
  "/terms",
  "/refund",
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
  "/reports",
  "/admin/change-password",
  "/admin/terms",
  "/admin/complete-profile",
  "/dashboard",
  "/notifications",
  "/my-commissions",
  "/my-profile",
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
    const token = getTokenFromCookies(cookieHeader)

    if (!token) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
      }
      return NextResponse.redirect(new URL("/admin/sign-in", request.url))
    }

    const payload = decodeToken(token)
    if (!payload || (payload.exp && payload.exp * 1000 < Date.now())) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Sessao expirada" }, { status: 401 })
      }
      return NextResponse.redirect(new URL("/admin/sign-in", request.url))
    }

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("x-user-role", payload.roles ?? "")

    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  return NextResponse.next()
}

// O matcher lista exatamente os prefixos que PROTECTED_PATHS guarda. Antes ele casava
// com toda requisicao e o runtime descartava a maioria - landing, /booking, /receipt e
// o proxy de imagem pagavam uma invocacao de edge para nada (issue #123, item 2).
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
    // /api continua guardado, menos o proxy de imagem: ele responde com cache imutavel
    // e nao deve pagar middleware por request (PR #129)
    "/api/((?!blob/proxy).*)",
  ],
}

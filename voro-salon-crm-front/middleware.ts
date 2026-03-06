import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyToken, getTokenFromCookieHeader } from "@/lib/auth"

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout", "/api/blob/proxy", "/booking", "/api/v1/public"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths and static assets
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/"
  ) {
    return NextResponse.next()
  }

  // Protect /dashboard and /api routes (except auth)
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/api")) {
    const cookieHeader = request.headers.get("cookie")
    const token = getTokenFromCookieHeader(cookieHeader)

    if (!token) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
      }
      return NextResponse.redirect(new URL("/login", request.url))
    }

    const session = await verifyToken(token)
    if (!session) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Sessao expirada" }, { status: 401 })
      }
      return NextResponse.redirect(new URL("/login", request.url))
    }

    // Add session info to headers for API routes
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("x-user-id", session.userId)
    requestHeaders.set("x-tenant-id", session.tenantId)
    requestHeaders.set("x-user-role", session.role)

    return NextResponse.next({
      request: { headers: requestHeaders },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}

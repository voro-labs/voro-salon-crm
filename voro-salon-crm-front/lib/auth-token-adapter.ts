import { TokenAdapter } from "./auth-token-manager"

export class WebTokenAdapter implements TokenAdapter {
  getAuthToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem("vorolabs_salon_token")
  }

  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem("vorolabs_salon_refresh_token")
  }

  saveTokens(token: string, refreshToken?: string): void {
    if (typeof window === "undefined") return
    
    localStorage.setItem("vorolabs_salon_token", token)
    if (refreshToken) {
      localStorage.setItem("vorolabs_salon_refresh_token", refreshToken)
    }

    // Atualiza o cookie para o middleware
    try {
      const parts = token.split(".")
      const payload = JSON.parse(atob(parts[1]))
      const expires = payload.exp ? new Date(payload.exp * 1000).toUTCString() : ""
      document.cookie = `vorolabs_salon_token=${token}; path=/; expires=${expires}; SameSite=Lax`
    } catch {
      document.cookie = `vorolabs_salon_token=${token}; path=/; SameSite=Lax`
    }
  }

  clearTokens(): void {
    if (typeof window === "undefined") return
    localStorage.removeItem("vorolabs_salon_token")
    localStorage.removeItem("vorolabs_salon_refresh_token")
    document.cookie = "vorolabs_salon_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax"
  }

  onLogout(): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("voro:auth:clear"))
      // Opcional: Redirecionar se estiver em uma rota admin
      if (window.location.pathname.startsWith("/admin") && !window.location.pathname.includes("/sign-in")) {
        window.location.href = "/admin/sign-in"
      }
    }
  }
}

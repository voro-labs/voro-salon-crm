import { jwtDecode } from "jwt-decode"

export interface TokenAdapter {
  getAuthToken(): Promise<string | null>
  getRefreshToken(): Promise<string | null>
  saveTokens(token: string, refreshToken?: string): Promise<void>
  clearTokens(): Promise<void>
  onLogout?(): void
}

export class AuthTokenManager {
  private refreshPromise: Promise<string | null> | null = null
  private adapter: TokenAdapter
  private refreshEndpoint: string

  constructor(adapter: TokenAdapter, refreshEndpoint: string) {
    this.adapter = adapter
    this.refreshEndpoint = refreshEndpoint
  }

  /**
   * Verifica se o token está expirado ou prestes a expirar dentro do buffer.
   */
  isTokenExpiring(token: string, bufferSeconds: number = 60): boolean {
    try {
      const decoded = jwtDecode<{ exp?: number }>(token)
      if (!decoded.exp) return true
      const now = Math.floor(Date.now() / 1000)
      return decoded.exp < now + bufferSeconds
    } catch {
      return true
    }
  }

  /**
   * Retorna um token válido. Se o atual estiver expirando, inicia a renovação
   * ou espera por uma renovação já em curso.
   * @param force Se true, ignora a validade do token atual e força um refresh.
   */
  async getValidToken(force: boolean = false): Promise<string | null> {
    const token = await this.adapter.getAuthToken()
    if (!token) return null

    // Se o token ainda é válido e não estamos forçando, retorna ele
    if (!force && !this.isTokenExpiring(token)) {
      return token
    }

    // Se já existe uma renovação em curso, aguarda a mesma Promise
    if (this.refreshPromise) {
      console.log("[AuthTokenManager] Aguardando renovação em curso...")
      return this.refreshPromise
    }

    const refreshToken = await this.adapter.getRefreshToken()
    if (!refreshToken) {
      console.warn("[AuthTokenManager] Refresh token não encontrado, limpando sessão.")
      await this.adapter.clearTokens()
      this.adapter.onLogout?.()
      return null
    }

    // Inicia a renovação e guarda a Promise globalmente
    console.log("[AuthTokenManager] Iniciando renovação proativa do token...")
    this.refreshPromise = (async () => {
      try {
        const response = await fetch(this.refreshEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, refreshToken }),
        })

        if (response.status === 401 || response.status === 400) {
          console.error("[AuthTokenManager] Refresh rejeitado pelo servidor.")
          await this.adapter.clearTokens()
          this.adapter.onLogout?.()
          return null
        }

        const result = await response.json()

        if (response.ok && !result.hasError && result.data?.token) {
          const newToken = result.data.token
          const newRefresh = result.data.refreshToken
          await this.adapter.saveTokens(newToken, newRefresh)
          
          // Notifica interessados (como o AuthContext) que o token mudou
          // Import dinâmico para evitar problemas de dependência circular no app
          const { DeviceEventEmitter } = require("react-native")
          DeviceEventEmitter.emit("auth:tokenRefreshed", newToken)
          
          console.log("[AuthTokenManager] Token renovado com sucesso.")
          return newToken
        }

        return null
      } catch (err) {
        console.warn("[AuthTokenManager] Erro de rede na renovação:", err)
        // Em erro de rede, retornamos o token atual para evitar logout precoce.
        // As requisições subsequentes falharão com erro de conexão em vez de 401.
        return token
      } finally {
        this.refreshPromise = null
      }
    })()

    return this.refreshPromise
  }
}

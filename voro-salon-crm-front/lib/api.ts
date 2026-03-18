import type { ResponseViewModel } from "@/types/response.interface"

// Configurações centralizadas da API
export const API_CONFIG = {
  BASE_URL: `${process.env.NEXT_PUBLIC_BASE_URL}/${process.env.NEXT_PUBLIC_API_URL}`,
  ENDPOINTS: {
    SIGNIN: "/auth/sign-in",
    REFRESH_TOKEN: "/auth/refresh-token",
    VERIFY_CODE: "/auth/verify-code",
    CONFIRM_EMAIL: "/auth/confirm-email",
    RESET_PASSWORD: "/auth/reset-password",
    FORGOT_PASSWORD: "/auth/forgot-password",
    SWITCH_TENANT: "/auth/switch-tenant",
    DASHBOARD: "/dashboard/metrics",
    ME: "/auth/me",
    TENANT: "/tenant",
    TENANT_ME: "/tenant/me",
    TENANT_MODULES: "/tenant/me/modules",
    EMPLOYEES: "/employee",
    CLIENTS: "/client",
    SERVICE_RECORDS: "/servicerecord",
    SERVICES: "/services",
    APPOINTMENTS: "/appointments",
    APPOINTMENTS_AVAILABILITY: "/appointments/availability",
    TRANSACTION_CATEGORIES: "/transactioncategories",
    TRANSACTIONS: "/transactions",
    ANAMNESIS: "/anamnesis",
    EXPORT_CLIENTS: "/export/clients",
    EXPORT_SERVICES: "/export/services",
    EXPORT_APPOINTMENTS: "/export/appointments",
    PUBLIC_TENANT: "/public/PublicBooking/tenant",
    PUBLIC_CHECK_CLIENT: "/public/PublicBooking/client/check",
    PUBLIC_SERVICES: "/public/PublicBooking/services",
    PUBLIC_EMPLOYEES: "/public/PublicBooking/employees",
    PUBLIC_BOOKING: "/public/PublicBooking/booking",
    PUBLIC_AVAILABILITY: "/public/PublicBooking/availability",
  },
  HEADERS: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  HEADERS_FORM: {
    Accept: "*/*",
  },
}

// Função para obter o token do localStorage
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("vorolabs_salon_token")
}

// Função para remover o token (logout)
export function removeAuthToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("vorolabs_salon_token")
  }
}

// Função para salvar o token
export function setAuthToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("vorolabs_salon_token", token)
  }
}

// Função para obter o refresh token
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("vorolabs_salon_refresh_token")
}

// Função para salvar o refresh token
export function setRefreshToken(refreshToken: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("vorolabs_salon_refresh_token", refreshToken)
  }
}

// Função para remover o refresh token
export function removeRefreshToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("vorolabs_salon_refresh_token")
  }
}

// Variáveis para controle da fila de refresh token
let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb)
}

function onRefreshed(token: string) {
  refreshSubscribers.map((cb) => cb(token))
  refreshSubscribers = []
}

// Função helper para fazer chamadas à API com ResponseViewModel
export async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<ResponseViewModel<T>> {
  try {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`
    const token = getAuthToken()
    const isFormData = options.body instanceof FormData

    const headers = {
      ...(isFormData ? API_CONFIG.HEADERS_FORM : API_CONFIG.HEADERS),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    }

    const response = await fetch(url, { ...options, headers })
    const status = response.status

    // Trata 401 ANTES de tentar parsear o body — garante que refresh funciona
    // mesmo quando o backend retorna 401 sem corpo JSON válido
    if (status === 401) {
      const refreshToken = getRefreshToken()

      if (refreshToken) {
        if (!isRefreshing) {
          isRefreshing = true

          try {
            const refreshResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REFRESH_TOKEN}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token, refreshToken }),
            })

            const refreshData = await refreshResponse.json()

            if (refreshResponse.ok && !refreshData.hasError && refreshData.data?.token) {
              const newToken = refreshData.data.token
              const newRefreshToken = refreshData.data.refreshToken

              setAuthToken(newToken)
              if (newRefreshToken) setRefreshToken(newRefreshToken)

              isRefreshing = false
              onRefreshed(newToken)

              // Refaz a requisição original com o novo token
              const retryResponse = await fetch(url, {
                ...options,
                headers: { ...headers, Authorization: `Bearer ${newToken}` },
              })
              const retryText = await retryResponse.text()

              try {
                const retryJson = JSON.parse(retryText) as ResponseViewModel<T>
                return {
                  status: retryResponse.status,
                  data: retryJson.data ?? null,
                  message: retryJson.message ?? null,
                  hasError: !retryResponse.ok || retryJson.hasError,
                }
              } catch {
                return {
                  status: retryResponse.status,
                  message: retryText || "Erro inesperado no servidor.",
                  data: null,
                  hasError: true,
                }
              }
            } else {
              // Refresh falhou — desloga e redireciona
              isRefreshing = false
              removeAuthToken()
              removeRefreshToken()
              if (typeof window !== "undefined") window.location.href = "/admin/sign-in"
              return {
                status: 401,
                message: "Sessão expirada. Faça login novamente.",
                data: null,
                hasError: true,
              }
            }
          } catch {
            isRefreshing = false
            removeAuthToken()
            removeRefreshToken()
            if (typeof window !== "undefined") window.location.href = "/admin/sign-in"
            return {
              status: 401,
              message: "Sessão expirada. Faça login novamente.",
              data: null,
              hasError: true,
            }
          }
        } else {
          // Já está renovando — coloca na fila e aguarda
          return new Promise((resolve) => {
            subscribeTokenRefresh(async (newToken: string) => {
              try {
                const retryResponse = await fetch(url, {
                  ...options,
                  headers: { ...headers, Authorization: `Bearer ${newToken}` },
                })
                const retryText = await retryResponse.text()
                try {
                  const retryJson = JSON.parse(retryText) as ResponseViewModel<T>
                  resolve({
                    status: retryResponse.status,
                    data: retryJson.data ?? null,
                    message: retryJson.message ?? null,
                    hasError: !retryResponse.ok || retryJson.hasError,
                  })
                } catch {
                  resolve({
                    status: retryResponse.status,
                    message: retryText || "Erro inesperado no servidor.",
                    data: null,
                    hasError: true,
                  })
                }
              } catch {
                resolve({
                  status: 0,
                  message: "Erro de conexão com o servidor ao repetir requisição.",
                  data: null,
                  hasError: true,
                })
              }
            })
          })
        }
      } else {
        // 401 sem refresh token — redireciona para login
        removeAuthToken()
        if (typeof window !== "undefined") window.location.href = "/admin/sign-in"
        return {
          status: 401,
          message: "Sessão expirada. Faça login novamente.",
          data: null,
          hasError: true,
        }
      }
    }

    // Resposta normal (não-401)
    const responseText = await response.text()
    let json: ResponseViewModel<T> | null = null

    try {
      json = JSON.parse(responseText)
    } catch {
      return {
        status,
        message: responseText || "Erro inesperado no servidor.",
        data: null,
        hasError: true,
      }
    }

    if (!response.ok || json?.hasError) {
      return {
        status,
        message: json?.message ?? `Erro ${status}: ${response.statusText}`,
        data: null,
        hasError: true,
      }
    }

    return {
      status,
      data: json?.data ?? null,
      message: json?.message ?? null,
      hasError: false,
    }
  } catch (error) {
    return {
      status: 0,
      message: "Erro de conexão com o servidor",
      data: null,
      hasError: true,
    }
  }
}

// Função específica para chamadas autenticadas (alias para apiCall, já que agora sempre inclui token)
export async function authenticatedApiCall<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ResponseViewModel<T>> {
  return apiCall<T>(endpoint, options)
}

// Interceptor para verificar se o token existe antes de fazer chamadas autenticadas
export async function secureApiCall<T>(endpoint: string, options: RequestInit = {}): Promise<ResponseViewModel<T>> {
  const token = getAuthToken()

  if (!token) {
    return {
      status: 401,
      message: "Token de autenticação não encontrado. Faça login novamente.",
      data: null,
      hasError: true,
    }
  }

  return apiCall<T>(endpoint, options)
}

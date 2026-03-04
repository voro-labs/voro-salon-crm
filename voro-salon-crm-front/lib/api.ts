import type { ResponseViewModel } from "@/types/response.interface"

// Configurações centralizadas da API
export const API_CONFIG = {
  BASE_URL: `${process.env.NEXT_PUBLIC_BASE_URL}/${process.env.NEXT_PUBLIC_API_URL}`,
  ENDPOINTS: {
    SIGNIN: "/auth/sign-in",
    VERIFY_CODE: "/auth/verify-code",
    CONFIRM_EMAIL: "/auth/confirm-email",
    RESET_PASSWORD: "/auth/reset-password",
    FORGOT_PASSWORD: "/auth/forgot-password",
    DASHBOARD: "/dashboard/metrics",
    ME: "/auth/me",
    TENANT: "/tenant",
    TENANT_ME: "/tenant/me",
    CLIENTS: "/client",
    SERVICES: "/servicerecord",
    EXPORT_CLIENTS: "/export/clients",
    EXPORT_SERVICES: "/export/services"
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

    const response = await fetch(url, {
      ...options,
      headers,
    })

    const status = response.status

    // 🔥 Se o backend retornar JSON SEMPRE,
    // mesmo em erro, vamos tentar decodificar o body primeiro.
    const responseText = await response.text()

    let json: ResponseViewModel<T> | null = null

    try {
      json = JSON.parse(responseText)
    } catch {
      // se não for JSON → erro do servidor
      return {
        status,
        message: responseText || "Erro inesperado no servidor.",
        data: null,
        hasError: true,
      }
    }

    // 🔥 Agora `json` com certeza está decodificado
    // e se sua API retorna ResponseViewModel no erro,
    // já temos uma estrutura pronta.

    if (!response.ok || json?.hasError) {
      // caso sua API não mande mensagem
      if (!json?.message) {
        json!.message = `Erro ${status}: ${response.statusText}`
      }

      // 🔥 Se for 401, remove o token localmente — o redirect é feito pelo Main
      if (status === 401) {
        removeAuthToken()
      }

      return {
        status,
        message: json?.message,
        data: null,
        hasError: true,
      }
    }

    // sucesso
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

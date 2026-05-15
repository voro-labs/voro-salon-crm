import type { ResponseViewModel } from "@/types/response.interface"

// Configurações centralizadas da API
export const API_CONFIG = {
  BASE_API_URL: `${process.env.NEXT_PUBLIC_BASE_API_URL}/${process.env.NEXT_PUBLIC_VERSION_API}`,
  ENDPOINTS: {
    SIGNIN: "/auth/sign-in",
    REFRESH_TOKEN: "/auth/refresh-token",
    VERIFY_CODE: "/auth/verify-code",
    VERIFY_2FA: "/auth/verify-2fa",
    CONFIRM_EMAIL: "/auth/confirm-email",
    RESET_PASSWORD: "/auth/reset-password",
    FORGOT_PASSWORD: "/auth/forgot-password",
    SWITCH_TENANT: "/auth/switch-tenant",
    CHANGE_PASSWORD: "/auth/change-password",
    ACCEPT_TERMS: "/auth/accept-terms",
    COMPLETE_PROFILE: "/auth/complete-profile",
    RESEND_CONFIRM_EMAIL: "/auth/resend-confirm-email",
    ENABLE_2FA_REQUEST: "/auth/2fa/enable/request",
    ENABLE_2FA_CONFIRM: "/auth/2fa/enable/confirm",
    DISABLE_2FA: "/auth/2fa/disable",
    DASHBOARD: "/dashboard/metrics",
    ME: "/auth/me",
    TENANT: "/tenant",
    TENANT_ME: "/tenant/me",
    TENANT_MODULES: "/tenant/me/modules",
    EMPLOYEES: "/employee",
    EMPLOYEE_ME: "/employee/me",
    CLIENTS: "/client",
    SERVICE_RECORDS: "/servicerecord",
    SERVICES: "/services",
    APPOINTMENTS: "/appointments",
    APPOINTMENTS_AVAILABILITY: "/appointments/availability",
    BUSINESS_HOURS: "/tenant/me/business-hours",
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
    PUBLIC_RECEIPT: "/public/PublicBooking/receipt",
    SUBSCRIPTION_PLANS: "/subscription/plans",
    SUBSCRIPTION_ME: "/subscription/me",
    SUBSCRIPTION_CHECKOUT: "/subscription/checkout",
    SUBSCRIPTION_CONFIRM: "/subscription/confirm",
    SUBSCRIPTION_COUPON: "/subscription/coupon",
    ADMIN_SUBSCRIPTIONS: "/admin/subscription",
    ADMIN_SUBSCRIPTION_GRANT: "/admin/subscription/grant",
    SUBSCRIPTION_ADMIN_EXTEND_TRIAL: "/subscription/admin/extend-trial",
    SUBSCRIPTION_ADMIN_COUPONS: "/subscription/admin/coupons",
    SUBSCRIPTION_PIX_STATUS: "/subscription/pix-status",
    SUBSCRIPTION_CHANGE_PLAN: "/subscription/change-plan",
    SUBSCRIPTION_PENDING_CANCEL: "/subscription/pending-change",
    SUBSCRIPTION_RESOLVED_PRICES: "/subscription/plans/resolved-prices",
    NOTIFICATIONS: "/notifications",
    NOTIFICATIONS_UNREAD_COUNT: "/notifications/unread-count",
    PUSH_TOKENS: "/push-tokens",
    TIME_SLOT_BLOCKS: "/timeslotblocks",
    WHATSAPP_MESSAGES: "/whatsapp/messages",
    WHATSAPP_CONVERSATIONS: "/whatsapp/conversations",
    WHATSAPP_TEMPLATES: "/whatsapp/templates",
    WHATSAPP_SEND_TEMPLATE: "/whatsapp/send-template",
    WHATSAPP_KANBAN_APPOINTMENTS: "/whatsapp/kanban-appointments",
    WHATSAPP_ONBOARDING_CONFIG: "/whatsapp/onboarding/config",
    WHATSAPP_ONBOARDING_EXCHANGE: "/whatsapp/onboarding/exchange",
    WHATSAPP_ONBOARDING_DISCONNECT: "/whatsapp/onboarding/disconnect",
    WHATSAPP_ONBOARDING_STATUS: "/whatsapp/onboarding/status",
    FUNNEL_APPOINTMENTS: "/funnel/appointments",
    PUBLIC_BOOKING_TRACK: "/public/PublicBooking/track",
    CLIENT_MEMBERSHIP_PLANS: "/clientmemberships/plans",
    CLIENT_MEMBERSHIPS: "/clientmemberships",
    EVOLUTION_INSTANCES: "/EvolutionInstance",
    EVOLUTION_AVAILABLE_TO_LINK: "/EvolutionInstance/available-to-link",
    EVOLUTION_LINK: "/EvolutionInstance/link",
    SUPPORT_TICKETS: "/support/tickets",
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
    // Remove também o cookie usado pelo middleware
    document.cookie = "vorolabs_salon_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax"
  }
}

// Função para salvar o token
export function setAuthToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("vorolabs_salon_token", token)
    // Seta também como cookie para o middleware conseguir verificar
    try {
      const parts = token.split(".")
      const payload = JSON.parse(atob(parts[1]))
      const expires = payload.exp ? new Date(payload.exp * 1000).toUTCString() : ""
      document.cookie = `vorolabs_salon_token=${token}; path=/; expires=${expires}; SameSite=Lax`
    } catch {
      document.cookie = `vorolabs_salon_token=${token}; path=/; SameSite=Lax`
    }
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

import { WebTokenAdapter } from "./auth-token-adapter"
import { AuthTokenManager } from "./auth-token-manager"
import { getOrGenerateIdempotencyKey } from "./idempotency"

// Instância única para gerenciar a renovação de tokens no navegador
const tokenAdapter = new WebTokenAdapter()
const tokenManager = new AuthTokenManager(
  tokenAdapter,
  `${API_CONFIG.BASE_API_URL}${API_CONFIG.ENDPOINTS.REFRESH_TOKEN}`
)

// Opções estendidas para suportar controle interno de retry
type ApiOptions = RequestInit & { _retry?: boolean }

// Função helper para fazer chamadas à API com ResponseViewModel
export async function apiCall<T>(endpoint: string, options: ApiOptions = {}): Promise<ResponseViewModel<T>> {
  try {
    const url = `${API_CONFIG.BASE_API_URL}${endpoint}`
    
    // 🔥 Ponto de interceptação proativo para garantir um token válido e tratar concorrência
    const token = await tokenManager.getValidToken()
    
    const isFormData = options.body instanceof FormData
    const method = options.method?.toUpperCase() || "GET"
    const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method)

    const headers: Record<string, string> = {
      ...(isFormData ? API_CONFIG.HEADERS_FORM : API_CONFIG.HEADERS),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options.headers as Record<string, string> | undefined),
    }

    // Adiciona o header Idempotency-Key nas requisições de mutação
    if (isMutation && !headers["Idempotency-Key"]) {
      headers["Idempotency-Key"] = getOrGenerateIdempotencyKey(endpoint, options.body)
    }

    const response = await fetch(url, { ...options, headers })
    const status = response.status

    // Se for 401, o token circulando pode estar inválido/revogado. Tentamos UM refresh forçado.
    if (status === 401 && !options._retry) {
      console.warn("[apiCall] 401 Detectado no Web. Tentando refresh forçado...")
      const newToken = await tokenManager.getValidToken(true)
      
      if (newToken) {
        console.log("[apiCall] Refresh forçado funcionou no Web. Refazendo requisição...")
        const retryHeaders = {
          ...headers,
          Authorization: `Bearer ${newToken}`,
        }
        return await apiCall(endpoint, { 
          ...options, 
          headers: retryHeaders,
          _retry: true // Evita loop infinito
        })
      }
      
      // Se não conseguiu novo token, limpa estado e redireciona (exceto para rotas públicas)
      const isPublicEndpoint = endpoint.startsWith("/public/") || endpoint.includes("/api/auth/login")
      
      if (!isPublicEndpoint) {
        tokenAdapter.clearTokens()
        tokenAdapter.onLogout?.()
      }
      
      return {
        status: 401,
        message: isPublicEndpoint ? "Sessão não autorizada." : "Sessão expirada. Faça login novamente.",
        data: null,
        hasError: true,
      }
    }

    if (status === 401 && options._retry) {
      console.error("[apiCall] 401 persistente após retry no Web. Limpando sessão...")
      tokenAdapter.clearTokens()
      tokenAdapter.onLogout?.()
      return {
        status: 401,
        message: "Sessão expirada.",
        data: null,
        hasError: true,
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

// Expõe o tokenManager para que o auth.context possa usar o mesmo caminho
// de renovação de token que o apiCall, evitando requests duplicados concorrentes.
export { tokenManager }

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

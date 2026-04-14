import type { ResponseViewModel } from "types/response.interface"
import * as SecureStore from "expo-secure-store"
import { DeviceEventEmitter } from "react-native"
export const API_CONFIG = {
  BASE_API_URL: `${process.env.EXPO_PUBLIC_BASE_API_URL}/${process.env.EXPO_PUBLIC_VERSION_API}`,
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
    TRANSACTION_CATEGORIES: "/transactioncategories",
    TRANSACTIONS: "/transactions",
    SUBSCRIPTION_ME: "/subscription/me",
    SUBSCRIPTION_PLANS: "/subscription/plans",
    SUBSCRIPTION_CHECKOUT: "/subscription/checkout",
    SUBSCRIPTION_PIX_STATUS: "/subscription/pix-status",
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
    PUSH_TOKENS: "/push-tokens",
    NOTIFICATIONS: "/notifications",
    NOTIFICATIONS_UNREAD_COUNT: "/notifications/unread-count",
    CLIENT_MEMBERSHIP_PLANS: "/clientmemberships/plans",
    CLIENT_MEMBERSHIPS: "/clientmemberships",
    WHATSAPP_CONVERSATIONS: "/whatsapp/conversations",
    WHATSAPP_MESSAGES: "/whatsapp/messages",
    WHATSAPP_TEMPLATES: "/whatsapp/templates",
    WHATSAPP_SEND_TEMPLATE: "/whatsapp/templates/send",
    WHATSAPP_ONBOARDING_CONFIG: "/whatsapp/onboarding/config",
    WHATSAPP_ONBOARDING_EXCHANGE: "/whatsapp/onboarding/exchange",
    WHATSAPP_ONBOARDING_DISCONNECT: "/whatsapp/onboarding/disconnect",
    WHATSAPP_ONBOARDING_STATUS: "/whatsapp/onboarding/status",
    TIME_SLOT_BLOCKS: "/timeslotblocks",
    BUSINESS_HOURS: "/business-hours",
    FUNNEL_APPOINTMENTS: "/funnel/appointments",
  },
  HEADERS: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  HEADERS_FORM: {
    Accept: "*/*",
  },
}

// Função para obter o token do SecureStore
export async function getAuthToken(): Promise<string | null> {
  return await SecureStore.getItemAsync("vorolabs_salon_token")
}

// Função para remover o token (logout)
export async function removeAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync("vorolabs_salon_token")
}

// Função para salvar o token
export async function setAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync("vorolabs_salon_token", token)
}

// Função para obter o refresh token
export async function getRefreshToken(): Promise<string | null> {
  return await SecureStore.getItemAsync("vorolabs_salon_refresh_token")
}

// Função para salvar o refresh token
export async function setRefreshToken(refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync("vorolabs_salon_refresh_token", refreshToken)
}

// Função para remover o refresh token
export async function removeRefreshToken(): Promise<void> {
  await SecureStore.deleteItemAsync("vorolabs_salon_refresh_token")
}

import { MobileTokenAdapter } from "./auth-token-adapter"
import { AuthTokenManager } from "./auth-token-manager"

// Instância única para gerenciar a renovação de tokens
export const tokenAdapter = new MobileTokenAdapter()
export const tokenManager = new AuthTokenManager(
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

    // Se for 401, o token circulando pode estar inválido/revogado. Tentamos UM refresh forçado.
    if (status === 401 && !options._retry) {
      console.warn("[apiCall] 401 Detectado. Tentando refresh forçado...")
      const newToken = await tokenManager.getValidToken(true)
      
      if (newToken) {
        console.log("[apiCall] Refresh forçado funcionou. Refazendo requisição...")
        const retryHeaders = {
          ...headers,
          Authorization: `Bearer ${newToken}`,
        }
        return await apiCall(endpoint, { 
          ...options, 
          headers: retryHeaders,
          _retry: true // Evita loop infinito
        } as any)
      }
      
      // Se não conseguiu novo token, desloga
      const isPublicEndpoint = endpoint.startsWith("/public/")
      if (!isPublicEndpoint) {
        await tokenAdapter.clearTokens()
        tokenAdapter.onLogout?.()
      }
      return {
        status: 401,
        message: "Sessão expirada. Faça login novamente.",
        data: null,
        hasError: true,
      }
    }

    if (status === 401 && options._retry) {
      console.error("[apiCall] 401 persistente após retry. Deslogando...")
      await tokenAdapter.clearTokens()
      tokenAdapter.onLogout?.()
      return {
        status: 401,
        message: "Sessão expirada.",
        data: null,
        hasError: true,
      }
    }

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
  const token = await getAuthToken()

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

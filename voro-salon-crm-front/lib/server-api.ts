import { cookies } from "next/headers"

import { API_CONFIG } from "@/lib/api"

const TOKEN_COOKIE = "vorolabs_salon_token"

/**
 * GET no servidor usando o token do cookie que o cliente já mantém para o middleware.
 *
 * Devolve `null` em qualquer problema — sem cookie, token expirado, resposta de erro ou
 * falha de rede. Quem chama trata `null` como "sem dado inicial" e cai no comportamento
 * atual: o componente cliente busca via SWR, com renovação de token, como sempre fez.
 * Renovar token é responsabilidade do AuthTokenManager, no browser; o servidor não renova.
 */
export async function serverApiGet<T>(endpoint: string): Promise<T | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(TOKEN_COOKIE)?.value
  if (!token) return null

  try {
    const response = await fetch(`${API_CONFIG.BASE_API_URL}${endpoint}`, {
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })

    if (!response.ok) return null

    const json = await response.json()
    if (json?.hasError) return null

    return (json?.data ?? null) as T | null
  } catch {
    return null
  }
}

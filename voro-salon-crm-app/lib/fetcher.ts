import { secureApiCall } from "lib/api"

/**
 * Shared SWR fetcher for secure (authenticated) API calls.
 * Use this everywhere instead of defining a local fetcher.
 */
export const fetcher = async (url: string) => {
  const result = await secureApiCall<any>(url, { method: "GET" })
  if (result.hasError) throw new Error(result.message || "Erro ao carregar dados.")
  return result.data
}

"use client"

import {
  createContext,
  useContext,
  type ReactNode,
} from "react"
import useSWR from "swr"

interface TenantData {
  id: string
  slug: string
  name: string
  logoUrl: string | null
  primaryColor: string | null
  secondaryColor: string | null
  contactPhone: string | null
  contactEmail: string | null
  themeMode: string
}

interface UserData {
  id: string
  name: string
  email: string
  role: string
}

interface TenantContextType {
  tenant: TenantData | null
  user: UserData | null
  isLoading: boolean
  mutate: () => void
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  user: null,
  isLoading: true,
  mutate: () => { },
})

import { API_CONFIG, secureApiCall } from "@/lib/api"

const fetcher = async () => {
  const result = await secureApiCall<{ user: UserData; tenant: TenantData }>(API_CONFIG.ENDPOINTS.ME, {
    method: "GET"
  })

  if (result.hasError) {
    throw new Error(result.message || "Failed to fetch session")
  }
  return result.data
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, mutate } = useSWR("/auth/me", fetcher)

  return (
    <TenantContext.Provider
      value={{
        tenant: data?.tenant || null,
        user: data?.user || null,
        isLoading,
        mutate: () => { mutate() },
      }}
    >
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  return useContext(TenantContext)
}

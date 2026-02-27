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
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  contact_phone: string | null
  contact_email: string | null
  theme_mode: string
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
  mutate: () => {},
})

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function TenantProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, mutate } = useSWR("/api/auth/session", fetcher)

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

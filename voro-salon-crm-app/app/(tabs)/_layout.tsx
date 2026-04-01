import React, { useEffect } from "react"
import { AppState, View, ActivityIndicator } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import useSWR, { useSWRConfig } from "swr"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { API_CONFIG } from "lib/api"
import { fetcher } from "lib/fetcher"
import { ScrollableTabBar } from "components/ScrollableTabBar"

type IconName = React.ComponentProps<typeof Ionicons>["name"]

const TAB_ICONS: Record<string, { active: IconName; inactive: IconName; label: string }> = {
  index: { active: "home", inactive: "home-outline", label: "Início" },
  clients: { active: "people", inactive: "people-outline", label: "Clientes" },
  appointments: { active: "calendar", inactive: "calendar-outline", label: "Agenda" },
  services: { active: "cut", inactive: "cut-outline", label: "Serviços" },
  employees: { active: "person", inactive: "person-outline", label: "Equipe" },
  finance: { active: "wallet", inactive: "wallet-outline", label: "Finanças" },
  whatsapp: { active: "chatbubbles", inactive: "chatbubbles-outline", label: "WhatsApp" },
  notifications: { active: "notifications", inactive: "notifications-outline", label: "Avisos" },
  settings: { active: "settings", inactive: "settings-outline", label: "Config." },
}

// Mesmos moduleIds do sidebar do front
const TAB_MODULE_IDS: Record<string, number> = {
  clients: 1,
  appointments: 2,
  services: 3,
  employees: 4,
  finance: 5,
  whatsapp: 9,
}

import { MaterialTopTabs } from "components/MaterialTopTabs"

import { useAuth } from "contexts/auth.context"
import { usePlanLimits } from "hooks/use-plan-limits.hook"

export default function TabsLayout() {
  const { hasBooking, hasWhatsAppBot, hasFinancial, isLoaded } = usePlanLimits()
  const { primaryColor } = useTenantTheme()
  const { mutate } = useSWRConfig()
  const { user } = useAuth()
  
  const roleNames = user?.roles?.map((r) => r.name) ?? []
  const isOwner = roleNames.includes("Owner")
  const isSalonOwner = roleNames.includes("SalonOwner") || isOwner

  const { data: modules } = useSWR(
    API_CONFIG.ENDPOINTS.TENANT_MODULES,
    fetcher,
    { shouldRetryOnError: false, refreshInterval: 30000 }
  )

  // Revalida módulos ao voltar ao foreground (reflete mudanças feitas pelo app web)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        mutate(API_CONFIG.ENDPOINTS.TENANT_MODULES)
      }
    })
    return () => subscription.remove()
  }, [mutate])

  function isTabEnabled(name: string): boolean {
    // 1. Hard restrictions based on plan limits (cannot be overridden by SalonOwner role)
    if (name === "appointments" && !hasBooking) return false
    if (name === "whatsapp" && !hasWhatsAppBot) return false
    if (name === "finance" && !hasFinancial) return false

    // 2. Soft restrictions based on module enablement (can be overridden by SalonOwner role)
    if (isSalonOwner) return true
    const moduleId = TAB_MODULE_IDS[name]
    if (!moduleId) return true
    if (!modules) return true
    const mod = (modules as any[]).find((m) => m.module === moduleId)
    return mod ? mod.isEnabled : true
  }

  function getTabLabel(name: string): string {
    const moduleId = TAB_MODULE_IDS[name]
    const defaultLabel = TAB_ICONS[name]?.label ?? name
    if (!moduleId || !modules) return defaultLabel
    const mod = (modules as any[]).find((m) => m.module === moduleId)
    if (mod?.configuration) {
      try {
        const config = JSON.parse(mod.configuration)
        if (config.displayName) return config.displayName
      } catch { }
    }
    return defaultLabel
  }

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "white" }}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    )
  }

  return (
    <MaterialTopTabs
      tabBarPosition="bottom"
      tabBar={ScrollableTabBar}
      screenOptions={({ route }) => {
        const icon = TAB_ICONS[route.name] ?? TAB_ICONS["index"]
        const enabled = isTabEnabled(route.name)
        return {
          tabBarActiveTintColor: primaryColor,
          tabBarInactiveTintColor: "#9ca3af",
          tabBarLabel: getTabLabel(route.name),
          tabBarIcon: ({ focused, color }: { focused: boolean; color: string }) => (
            <Ionicons name={focused ? icon.active : icon.inactive} size={22} color={color} />
          ),
          swipeEnabled: false, // Desativa swipe globalmente para evitar entrar em abas restritas
          href: enabled ? undefined : null, // Expo Router: esconde da tab bar se null
        } as any
      }}
    >
      <MaterialTopTabs.Screen name="index" />
      <MaterialTopTabs.Screen name="appointments" />
      <MaterialTopTabs.Screen name="clients" />
      <MaterialTopTabs.Screen name="services" />
      <MaterialTopTabs.Screen name="employees" />
      <MaterialTopTabs.Screen name="finance" />
      <MaterialTopTabs.Screen name="whatsapp" />
      <MaterialTopTabs.Screen name="notifications" />
      <MaterialTopTabs.Screen name="settings" />
    </MaterialTopTabs>
  )
}

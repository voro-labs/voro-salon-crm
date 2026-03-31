import React, { useEffect } from "react"
import { AppState } from "react-native"
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

export default function TabsLayout() {
  const { primaryColor } = useTenantTheme()
  const { mutate } = useSWRConfig()
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

  return (
    <MaterialTopTabs
      tabBarPosition="bottom"
      tabBar={(props) => <ScrollableTabBar {...props} />}
      screenOptions={({ route }) => {
        const icon = TAB_ICONS[route.name] ?? TAB_ICONS["index"]
        return {
          tabBarActiveTintColor: primaryColor,
          tabBarInactiveTintColor: "#9ca3af",
          tabBarLabel: getTabLabel(route.name),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? icon.active : icon.inactive} size={22} color={color} />
          ),
          swipeEnabled: route.name !== "whatsapp",
        }
      }}
    >
      <MaterialTopTabs.Screen name="index" />
      <MaterialTopTabs.Screen
        name="appointments"
        options={{ href: isTabEnabled("appointments") ? undefined : null } as any}
      />
      <MaterialTopTabs.Screen
        name="clients"
        options={{ href: isTabEnabled("clients") ? undefined : null } as any}
      />
      <MaterialTopTabs.Screen
        name="services"
        options={{ href: isTabEnabled("services") ? undefined : null } as any}
      />
      <MaterialTopTabs.Screen
        name="employees"
        options={{ href: isTabEnabled("employees") ? undefined : null } as any}
      />
      <MaterialTopTabs.Screen
        name="finance"
        options={{ href: isTabEnabled("finance") ? undefined : null } as any}
      />
      <MaterialTopTabs.Screen
        name="whatsapp"
        options={{ href: isTabEnabled("whatsapp") ? undefined : null } as any}
      />
      <MaterialTopTabs.Screen name="notifications" />
      <MaterialTopTabs.Screen name="settings" />
    </MaterialTopTabs>
  )
}

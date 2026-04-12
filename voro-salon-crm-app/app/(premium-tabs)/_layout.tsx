import React, { useEffect } from "react"
import { AppState, View, ActivityIndicator } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import useSWR, { useSWRConfig } from "swr"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { API_CONFIG } from "lib/api"
import { fetcher } from "lib/fetcher"
import { ScrollableTabBar } from "components/ScrollableTabBar"
import { MaterialTopTabs } from "components/MaterialTopTabs"
import { useAuth } from "contexts/auth.context"
import { usePlanLimits } from "hooks/use-plan-limits.hook"

type IconName = React.ComponentProps<typeof Ionicons>["name"]

const TAB_ICONS: Record<string, { active: IconName; inactive: IconName; label: string }> = {
  index: { active: "home", inactive: "home-outline", label: "Início" },
  appointments: { active: "calendar", inactive: "calendar-outline", label: "Agenda" },
  clients: { active: "people", inactive: "people-outline", label: "Clientes" },
  services: { active: "cut", inactive: "cut-outline", label: "Serviços" },
  employees: { active: "person", inactive: "person-outline", label: "Equipe" },
  finance: { active: "wallet", inactive: "wallet-outline", label: "Finanças" },
  whatsapp: { active: "chatbubbles", inactive: "chatbubbles-outline", label: "WhatsApp" },
  funnel: { active: "funnel", inactive: "funnel-outline", label: "Funil" },
  notifications: { active: "notifications", inactive: "notifications-outline", label: "Avisos" },
  settings: { active: "settings", inactive: "settings-outline", label: "Config." },
}

const TAB_MODULE_IDS: Record<string, number> = {
  clients: 1,
  appointments: 2,
  services: 3,
  employees: 4,
  finance: 5,
  whatsapp: 9,
}

export default function PremiumTabsLayout() {
  const { primaryColor } = useTenantTheme()
  const { mutate } = useSWRConfig()
  const { user } = useAuth()
  const { isLoaded } = usePlanLimits()
  
  const roleNames = user?.roles?.map((r) => r.name) ?? []
  const isOwner = roleNames.includes("Owner")
  const isSalonOwner = roleNames.includes("SalonOwner") || isOwner

  const { data: modules } = useSWR(
    API_CONFIG.ENDPOINTS.TENANT_MODULES,
    fetcher,
    { shouldRetryOnError: false, refreshInterval: 30000 }
  )

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        mutate(API_CONFIG.ENDPOINTS.TENANT_MODULES)
      }
    })
    return () => subscription.remove()
  }, [mutate])

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

  // Extrai o nome base da tab a partir do route.name, independente do formato:
  // "index", "appointments/index", "(premium-tabs)/settings/index", etc.
  function getTabKey(routeName: string): string {
    const segments = routeName.split("/").filter((s) => !s.startsWith("(") && s !== "index" && s !== "")
    if (segments.length === 0) return "index"
    return segments[segments.length - 1]
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
        const tabKey = getTabKey(route.name)
        const icon = TAB_ICONS[tabKey] ?? TAB_ICONS["index"]
        return {
          tabBarActiveTintColor: primaryColor,
          tabBarInactiveTintColor: "#9ca3af",
          tabBarLabel: getTabLabel(tabKey),
          tabBarIcon: ({ focused, color }: { focused: boolean; color: string }) => (
            <Ionicons name={focused ? icon.active : icon.inactive} size={22} color={color} />
          ),
          swipeEnabled: route.name !== "funnel",
          animationEnabled: true,
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
      <MaterialTopTabs.Screen name="funnel" />
      <MaterialTopTabs.Screen name="settings" />
      <MaterialTopTabs.Screen name="notifications" />
    </MaterialTopTabs>
  )
}

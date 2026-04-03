import { Ionicons } from "@expo/vector-icons"
import { MaterialTopTabs } from "components/MaterialTopTabs"
import { ScrollableTabBar } from "components/ScrollableTabBar"
import { useTenantTheme } from "contexts/tenant-theme.context"

export default function EmployeeTabsLayout() {
  const { primaryColor } = useTenantTheme()

  return (
    <MaterialTopTabs
      tabBarPosition="bottom"
      tabBar={ScrollableTabBar}
      screenOptions={({ route }) => {
        const icons: Record<string, { active: any; inactive: any; label: string }> = {
          appointments: { active: "calendar", inactive: "calendar-outline", label: "Agenda" },
          commissions: { active: "cash", inactive: "cash-outline", label: "Comissões" },
          settings: { active: "settings", inactive: "settings-outline", label: "Perfil" },
        }
        const icon = icons[route.name] ?? icons["appointments"]
        return {
          tabBarActiveTintColor: primaryColor,
          tabBarInactiveTintColor: "#9ca3af",
          tabBarLabel: icon.label,
          tabBarIcon: ({ focused, color }: { focused: boolean; color: string }) => (
            <Ionicons name={focused ? icon.active : icon.inactive} size={22} color={color} />
          ),
          swipeEnabled: true,
          animationEnabled: true,
        } as any
      }}
    >
      <MaterialTopTabs.Screen name="appointments" />
      <MaterialTopTabs.Screen name="commissions" />
      <MaterialTopTabs.Screen name="settings" />
    </MaterialTopTabs>
  )
}

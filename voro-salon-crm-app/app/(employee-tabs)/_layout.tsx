import { Ionicons } from "@expo/vector-icons"
import { Dimensions } from "react-native"
import { MaterialTopTabs } from "components/MaterialTopTabs"
import { ScrollableTabBar } from "components/ScrollableTabBar"
import { useTenantTheme } from "contexts/tenant-theme.context"

const TAB_WIDTH = Dimensions.get("window").width / 5

export default function EmployeeTabsLayout() {
  const { primaryColor } = useTenantTheme()

  const common = {
    tabBarActiveTintColor: primaryColor,
    tabBarInactiveTintColor: "#9ca3af",
    tabBarItemStyle: { width: TAB_WIDTH },
    swipeEnabled: true,
    animationEnabled: true,
  }

  return (
    <MaterialTopTabs
      tabBarPosition="bottom"
      tabBar={ScrollableTabBar}
      screenOptions={common as any}
    >
      <MaterialTopTabs.Screen
        name="appointments"
        options={{
          ...common,
          tabBarLabel: "Agenda",
          tabBarIcon: ({ focused, color }: any) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} size={22} color={color} />
          ),
        } as any}
      />
      <MaterialTopTabs.Screen
        name="commissions"
        options={{
          ...common,
          tabBarLabel: "Comissões",
          tabBarIcon: ({ focused, color }: any) => (
            <Ionicons name={focused ? "cash" : "cash-outline"} size={22} color={color} />
          ),
        } as any}
      />
      <MaterialTopTabs.Screen
        name="notifications"
        options={{
          ...common,
          tabBarLabel: "Avisos",
          tabBarIcon: ({ focused, color }: any) => (
            <Ionicons name={focused ? "notifications" : "notifications-outline"} size={22} color={color} />
          ),
        } as any}
      />
      <MaterialTopTabs.Screen
        name="profile"
        options={{
          ...common,
          tabBarLabel: "Perfil",
          tabBarIcon: ({ focused, color }: any) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
          ),
        } as any}
      />
      <MaterialTopTabs.Screen
        name="settings"
        options={{
          ...common,
          tabBarLabel: "Config",
          tabBarIcon: ({ focused, color }: any) => (
            <Ionicons name={focused ? "settings" : "settings-outline"} size={22} color={color} />
          ),
        } as any}
      />
    </MaterialTopTabs>
  )
}

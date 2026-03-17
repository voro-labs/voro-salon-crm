import { Tabs } from "expo-router"
import { Ionicons } from "@expo/vector-icons"

type IconName = React.ComponentProps<typeof Ionicons>["name"]

const TAB_ICONS: Record<string, { active: IconName; inactive: IconName; label: string }> = {
  index: { active: "home", inactive: "home-outline", label: "Início" },
  clients: { active: "people", inactive: "people-outline", label: "Clientes" },
  appointments: { active: "calendar", inactive: "calendar-outline", label: "Agenda" },
  services: { active: "cut", inactive: "cut-outline", label: "Serviços" },
  finance: { active: "wallet", inactive: "wallet-outline", label: "Finanças" },
  settings: { active: "settings", inactive: "settings-outline", label: "Config." },
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => {
        const icon = TAB_ICONS[route.name] ?? TAB_ICONS["index"]
        return {
          headerShown: false,
          tabBarActiveTintColor: "#7c3aed",
          tabBarInactiveTintColor: "#9ca3af",
          tabBarStyle: {
            backgroundColor: "#ffffff",
            borderTopWidth: 1,
            borderTopColor: "#f4f4f5",
            paddingBottom: 6,
            paddingTop: 6,
            height: 64,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
          tabBarLabel: icon.label,
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? icon.active : icon.inactive} size={size} color={color} />
          ),
        }
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="clients" />
      <Tabs.Screen name="appointments" />
      <Tabs.Screen name="services" />
      <Tabs.Screen name="finance" />
      <Tabs.Screen name="settings" />
    </Tabs>
  )
}

import { Stack, useRouter, useSegments } from "expo-router"
import { useEffect } from "react"
import { View, ActivityIndicator } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { AuthProvider, useAuth } from "contexts/auth.context"
import { TenantThemeProvider, useTenantTheme } from "contexts/tenant-theme.context"
import "../global.css"

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth()
  const { primaryColor } = useTenantTheme()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    const inAuthGroup = segments[0] === "(auth)"
    const inBookingGroup = segments[0] === "booking"
    if (!isAuthenticated && !inAuthGroup && !inBookingGroup) {
      router.replace("/(auth)/welcome")
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)")
    }
  }, [isAuthenticated, isLoading, segments])

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    )
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="booking" />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <TenantThemeProvider>
          <RootLayoutNav />
        </TenantThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  )
}

import { Stack, useRouter, useSegments } from "expo-router"
import { useEffect } from "react"
import { View, ActivityIndicator } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { AuthProvider, useAuth } from "contexts/auth.context"
import { TenantThemeProvider, useTenantTheme } from "contexts/tenant-theme.context"
import * as SecureStore from "expo-secure-store"
import * as Notifications from "expo-notifications"
import "../global.css"

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth()
  const { primaryColor } = useTenantTheme()
  const segments = useSegments()
  const router = useRouter()

  const inAuthGroup = segments[0] === "(auth)"
  const inBookingGroup = segments[0] === "booking"
  const inOnboardingGroup = segments[0] === "(onboarding)"
  const pendingRedirect = !isAuthenticated && !inAuthGroup && !inBookingGroup && !inOnboardingGroup

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated && !inAuthGroup && !inBookingGroup && !inOnboardingGroup) {
      router.replace("/(auth)/welcome")
    } else if (isAuthenticated && inAuthGroup) {
      // Verifica flags de onboarding antes de redirecionar
      SecureStore.getItemAsync("post_login_flags").then((raw) => {
        const flags = raw ? JSON.parse(raw) : null
        if (flags?.requiresPasswordChange) {
          router.replace("/(onboarding)/change-password")
        } else if (flags?.requiresTermsAcceptance) {
          router.replace("/(onboarding)/terms")
        } else if (flags?.requiresProfileCompletion) {
          router.replace("/(onboarding)/complete-profile")
        } else {
          router.replace("/(tabs)")
        }
      })
    }
    // Se está em /(onboarding), não redireciona — usuário está completando o cadastro
  }, [isAuthenticated, isLoading, segments])

  if (isLoading || pendingRedirect) {
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
      <Stack.Screen name="(onboarding)" />
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

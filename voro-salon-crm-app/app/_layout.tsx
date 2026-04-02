import { Stack, useRouter, useSegments } from "expo-router"
import { useEffect, useRef } from "react"
import { View, ActivityIndicator, Platform } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { KeyboardProvider } from "react-native-keyboard-controller"
import { AuthProvider, useAuth } from "contexts/auth.context"
import { TenantThemeProvider, useTenantTheme } from "contexts/tenant-theme.context"
import * as SecureStore from "expo-secure-store"
import * as Notifications from "expo-notifications"
import { usePushNotifications } from "hooks/use-push-notifications.hook"
import { useSubscription } from "hooks/use-subscription.hook"
import { SubscriptionPaywall } from "components/SubscriptionPaywall"
import { usePlanLimits } from "hooks/use-plan-limits.hook"
import ToastManager from "toastify-react-native"
import "../global.css"

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

// Canal Android precisa existir antes de qualquer notificação chegar
if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("default", {
    name: "default",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FF231F7C",
  })
}

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth()
  const { primaryColor } = useTenantTheme()
  const { isPaywalled, isLoading: isSubscriptionLoading } = useSubscription()
  const { hasFinancial, hasWhatsAppBot, isLoaded: isPlanLoaded } = usePlanLimits()
  const segments = useSegments()
  const router = useRouter()
  const { registerPushToken, unregisterPushToken, handleNotificationResponse } = usePushNotifications()
  const notificationResponseListener = useRef<ReturnType<typeof Notifications.addNotificationResponseReceivedListener> | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      registerPushToken()
      notificationResponseListener.current = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse)
    } else {
      unregisterPushToken()
    }

    return () => {
      notificationResponseListener.current?.remove()
      notificationResponseListener.current = null
    }
  }, [isAuthenticated])

  const inAuthGroup = segments[0] === "(auth)"
  const inBookingGroup = segments[0] === "booking"
  const inOnboardingGroup = segments[0] === "(onboarding)"
  const inTabsGroup = segments[0] === "(tabs)"
  const inPremiumTabsGroup = segments[0] === "(premium-tabs)"
  
  const pendingRedirect = !isAuthenticated && !inAuthGroup && !inBookingGroup && !inOnboardingGroup

  useEffect(() => {
    if (isLoading || !isPlanLoaded) return

    const isPremium = hasFinancial || hasWhatsAppBot
    const targetTabs = isPremium ? "/(premium-tabs)" : "/(tabs)"

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
          router.replace(targetTabs as any)
        }
      })
    } else if (isAuthenticated && isPlanLoaded) {
      // Redireciona se estiver no grupo de abas errado baseado no plano atual
      if (isPremium && inTabsGroup) {
        router.replace("/(premium-tabs)")
      } else if (!isPremium && inPremiumTabsGroup) {
        router.replace("/(tabs)")
      }
    }
  }, [isAuthenticated, isLoading, isPlanLoaded, segments, hasFinancial, hasWhatsAppBot])

  if (isLoading || pendingRedirect || (isAuthenticated && (isSubscriptionLoading || !isPlanLoaded))) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    )
  }

  if (isAuthenticated && isPaywalled) {
    return <SubscriptionPaywall />
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(premium-tabs)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="booking" />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <AuthProvider>
          <TenantThemeProvider>
            <RootLayoutNav />
            <ToastManager />
          </TenantThemeProvider>
        </AuthProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  )
}

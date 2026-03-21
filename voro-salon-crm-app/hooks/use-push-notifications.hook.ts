import { useCallback } from "react"
import { Platform } from "react-native"
import * as Notifications from "expo-notifications"
import * as SecureStore from "expo-secure-store"
import Constants from "expo-constants"
import { useRouter } from "expo-router"
import { API_CONFIG, secureApiCall } from "lib/api"

const PUSH_TOKEN_KEY = "push_token"

export function usePushNotifications() {
  const router = useRouter()

  const registerPushToken = useCallback(async () => {
    try {
      // Verifica se já há um token salvo para evitar re-registro
      const existingToken = await SecureStore.getItemAsync(PUSH_TOKEN_KEY)
      if (existingToken) return

      // Pede permissão de notificação ao usuário
      const { status } = await Notifications.requestPermissionsAsync()
      if (status !== "granted") return

      // Configuração específica para Android
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        })
      }

      // Obtém o Expo Push Token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId })
      const token = tokenData.data

      // Registra o token no backend
      const result = await secureApiCall(API_CONFIG.ENDPOINTS.PUSH_TOKENS, {
        method: "POST",
        body: JSON.stringify({ token, platform: Platform.OS }),
      })

      if (!result.hasError) {
        // Salva o token no SecureStore para evitar re-registro
        await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token)
      }
    } catch (err) {
      console.error("Erro ao registrar push token:", err)
    }
  }, [])

  const unregisterPushToken = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY)
      if (!token) return

      await secureApiCall(`${API_CONFIG.ENDPOINTS.PUSH_TOKENS}/${encodeURIComponent(token)}`, {
        method: "DELETE",
      })

      await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY)
    } catch (err) {
      console.error("Erro ao remover push token:", err)
    }
  }, [])

  // Handler para quando o usuário toca em uma notificação
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as Record<string, any>
      if (data?.appointmentId) {
        router.push(`/(tabs)/appointments/${data.appointmentId}` as any)
      } else if (data?.relatedEntityId && data?.type === "appointment") {
        router.push(`/(tabs)/appointments/${data.relatedEntityId}` as any)
      }
    },
    [router],
  )

  return { registerPushToken, unregisterPushToken, handleNotificationResponse }
}

import React, { useEffect, useState } from "react"
import { View, Text, Pressable, ActivityIndicator } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { apiCall, API_CONFIG } from "lib/api"
import { useTenantTheme } from "contexts/tenant-theme.context"

type State = "confirming" | "success" | "error"

export default function ConfirmEmailScreen() {
  const router = useRouter()
  const { primaryColor } = useTenantTheme()
  const { email, token } = useLocalSearchParams<{ email: string; token: string }>()

  const [state, setState] = useState<State>("confirming")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    if (!email || !token) {
      setErrorMessage("Link de confirmação inválido.")
      setState("error")
      return
    }

    async function confirm() {
      try {
        const res = await apiCall(API_CONFIG.ENDPOINTS.CONFIRM_EMAIL, {
          method: "POST",
          body: JSON.stringify({ email, token }),
        })
        if (res.hasError || res.status !== 200) {
          setErrorMessage(res.message ?? "Erro ao confirmar e-mail.")
          setState("error")
        } else {
          setState("success")
        }
      } catch {
        setErrorMessage("Erro de conexão. Tente novamente.")
        setState("error")
      }
    }

    confirm()
  }, [])

  // ── Confirming ───────────────────────────────────────────────────────────────
  if (state === "confirming") {
    return (
      <SafeAreaView className="flex-1 bg-zinc-50 items-center justify-center px-8">
        <ActivityIndicator size="large" color={primaryColor} />
        <Text className="text-zinc-500 font-semibold mt-4 text-center">Confirmando e-mail...</Text>
      </SafeAreaView>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (state === "error") {
    return (
      <SafeAreaView className="flex-1 bg-zinc-50 items-center justify-center px-8">
        <View className="bg-white rounded-3xl w-full p-8 shadow-sm shadow-zinc-200 items-center">
          <View className="h-20 w-20 rounded-3xl items-center justify-center mb-6" style={{ backgroundColor: "#fee2e2" }}>
            <Ionicons name="close-circle-outline" size={44} color="#ef4444" />
          </View>
          <Text className="text-2xl font-black text-zinc-900 tracking-tighter text-center mb-2">
            Falha na confirmação
          </Text>
          <Text className="text-zinc-500 font-medium text-center mb-8">{errorMessage}</Text>
          <Pressable
            onPress={() => router.replace("/(auth)/sign-in")}
            className="h-14 rounded-2xl items-center justify-center w-full"
            style={{ backgroundColor: primaryColor }}
          >
            <Text className="text-white font-black text-base">Voltar ao Login</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  // ── Success ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-zinc-50 items-center justify-center px-8">
      <View className="bg-white rounded-3xl w-full p-8 shadow-sm shadow-zinc-200 items-center">
        <View
          className="h-20 w-20 rounded-3xl items-center justify-center mb-6"
          style={{ backgroundColor: primaryColor + "20" }}
        >
          <Ionicons name="checkmark-circle-outline" size={44} color={primaryColor} />
        </View>
        <Text className="text-2xl font-black text-zinc-900 tracking-tighter text-center mb-2">
          E-mail <Text style={{ color: primaryColor }}>confirmado!</Text>
        </Text>
        <Text className="text-zinc-500 font-medium text-center mb-8">
          Seu endereço de e-mail foi verificado com sucesso. Já pode fazer login.
        </Text>
        <Pressable
          onPress={() => router.replace("/(auth)/sign-in")}
          className="h-14 rounded-2xl items-center justify-center w-full flex-row gap-2"
          style={{ backgroundColor: primaryColor }}
        >
          <Ionicons name="log-in-outline" size={20} color="white" />
          <Text className="text-white font-black text-base">Ir para Login</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

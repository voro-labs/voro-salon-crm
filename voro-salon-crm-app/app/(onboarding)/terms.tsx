import React, { useState } from "react"
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import * as SecureStore from "expo-secure-store"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { API_CONFIG, apiCall } from "lib/api"

export default function OnboardingTermsScreen() {
  const router = useRouter()
  const { primaryColor } = useTenantTheme()

  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleAccept() {
    if (!accepted) return
    setError(null)
    setLoading(true)

    try {
      const res = await apiCall<null>(API_CONFIG.ENDPOINTS.ACCEPT_TERMS, {
        method: "POST",
      })

      if (res.hasError) {
        setError(res.message ?? "Erro ao registrar aceitação.")
        return
      }

      setSuccess(true)

      const flagsRaw = await SecureStore.getItemAsync("post_login_flags")
      const flags = flagsRaw ? JSON.parse(flagsRaw) : {}
      flags.requiresTermsAcceptance = false
      await SecureStore.setItemAsync("post_login_flags", JSON.stringify(flags))

      setTimeout(() => {
        if (flags.requiresProfileCompletion) {
          router.replace("/(onboarding)/complete-profile")
        } else {
          SecureStore.deleteItemAsync("post_login_flags")
          router.replace("/(tabs)")
        }
      }, 1200)
    } catch {
      setError("Erro inesperado. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">

      <View className="bg-white px-8 pt-12 pb-8 rounded-b-[40px] shadow-sm shadow-zinc-200">
        <View className="items-center mb-2">
          <View
            className="h-20 w-20 rounded-3xl items-center justify-center shadow-lg"
            style={{ backgroundColor: primaryColor }}
          >
            <Ionicons name="document-text" size={40} color="white" />
          </View>
          <Text className="text-3xl font-black text-zinc-900 mt-6 tracking-tighter">
            Termos de Uso
          </Text>
          <Text className="text-zinc-500 font-medium mt-2 text-center">
            Leia e aceite os termos para continuar.
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-8 mt-6" showsVerticalScrollIndicator={false}>
        <View className="bg-white rounded-3xl border border-zinc-100 p-5 mb-4">
          <Text className="text-base font-bold text-zinc-900 mb-2">1. Aceitação dos Termos</Text>
          <Text className="text-sm text-zinc-500 leading-relaxed mb-4">
            Ao acessar e utilizar o Voro Salon CRM, você concorda com estes Termos de Uso e com nossa Política de Privacidade. Se você não concordar com qualquer parte destes termos, não deverá usar o sistema.
          </Text>

          <Text className="text-base font-bold text-zinc-900 mb-2">2. Uso do Sistema</Text>
          <Text className="text-sm text-zinc-500 leading-relaxed mb-4">
            O sistema é disponibilizado para uso exclusivo da sua empresa e dos seus colaboradores autorizados. É proibido compartilhar credenciais de acesso com terceiros ou utilizá-las para fins não autorizados.
          </Text>

          <Text className="text-base font-bold text-zinc-900 mb-2">3. Privacidade e Dados</Text>
          <Text className="text-sm text-zinc-500 leading-relaxed mb-4">
            Os dados de clientes e do salão armazenados no sistema são de responsabilidade do titular da conta. Tratamos todos os dados em conformidade com a Lei Geral de Proteção de Dados (LGPD).
          </Text>

          <Text className="text-base font-bold text-zinc-900 mb-2">4. Responsabilidades</Text>
          <Text className="text-sm text-zinc-500 leading-relaxed mb-4">
            O titular é responsável por manter a confidencialidade das senhas e por todas as atividades realizadas sob sua conta.
          </Text>

          <Text className="text-base font-bold text-zinc-900 mb-2">5. Alterações</Text>
          <Text className="text-sm text-zinc-500 leading-relaxed">
            Reservamo-nos o direito de atualizar estes termos periodicamente. O uso continuado implica aceitação dos novos termos.
          </Text>
        </View>

        {error && (
          <View className="bg-red-50 p-4 rounded-2xl flex-row items-center border border-red-100 mb-4">
            <Ionicons name="alert-circle" size={20} color="#ef4444" />
            <Text className="ml-3 text-red-600 text-sm font-bold flex-1">{error}</Text>
          </View>
        )}

        {success && (
          <View className="bg-green-50 p-4 rounded-2xl flex-row items-center border border-green-100 mb-4">
            <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
            <Text className="ml-3 text-green-700 text-sm font-bold flex-1">Termos aceitos!</Text>
          </View>
        )}

        {/* Checkbox de aceite */}
        <Pressable
          onPress={() => setAccepted(!accepted)}
          className="flex-row items-center gap-3 mb-6"
          disabled={loading || success}
        >
          <View
            className="h-6 w-6 rounded-lg border-2 items-center justify-center"
            style={{ borderColor: accepted ? primaryColor : "#d4d4d8", backgroundColor: accepted ? primaryColor : "white" }}
          >
            {accepted && <Ionicons name="checkmark" size={14} color="white" />}
          </View>
          <Text className="text-sm text-zinc-600 flex-1">
            Li e concordo com os{" "}
            <Text className="font-bold text-zinc-900">Termos de Uso</Text>
            {" "}e a{" "}
            <Text className="font-bold text-zinc-900">Política de Privacidade</Text>.
          </Text>
        </Pressable>

        <Pressable
          onPress={handleAccept}
          disabled={!accepted || loading || success}
          className="h-16 rounded-2xl items-center justify-center mb-8"
          style={{ backgroundColor: primaryColor, opacity: !accepted || loading || success ? 0.5 : 1 }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <View className="flex-row items-center gap-2">
              <Text className="text-white text-lg font-black">
                {success ? "Aceito!" : "Aceitar e continuar"}
              </Text>
              {!success && <Ionicons name="arrow-forward" size={20} color="white" />}
            </View>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

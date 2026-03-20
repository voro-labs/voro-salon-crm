import React, { useState } from "react"
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import * as SecureStore from "expo-secure-store"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { API_CONFIG, apiCall } from "lib/api"
import { flags } from "@/lib/flag-utils"
import { CountrySelector } from "@/components/CountrySelector"
import { PhoneInput } from "@/components/PhoneInput"

export default function OnboardingCompleteProfileScreen() {
  const router = useRouter()
  const { primaryColor } = useTenantTheme()

  const [phoneNumber, setPhoneNumber] = useState("")
  const [countryCode, setCountryCode] = useState("BR")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit() {
    setError(null)

    if (!phoneNumber.trim()) {
      setError("O número de telefone é obrigatório.")
      return
    }

    setLoading(true)
    try {
      const dialCode = flags[countryCode]?.dialCode;

      const res = await apiCall<null>(API_CONFIG.ENDPOINTS.COMPLETE_PROFILE, {
        method: "POST",
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          countryCode: dialCode,
        }),
      })

      if (res.hasError) {
        setError(res.message ?? "Erro ao salvar perfil.")
        return
      }

      setSuccess(true)
      await SecureStore.deleteItemAsync("post_login_flags")

      setTimeout(() => router.replace("/(tabs)"), 1200)
    } catch {
      setError("Erro inesperado. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>

          <View className="bg-white px-8 pt-12 pb-10 rounded-b-[40px] shadow-sm shadow-zinc-200">
            <View className="items-center mb-8">
              <View
                className="h-20 w-20 rounded-3xl items-center justify-center shadow-lg"
                style={{ backgroundColor: primaryColor }}
              >
                <Ionicons name="person-circle" size={40} color="white" />
              </View>
              <Text className="text-3xl font-black text-zinc-900 mt-6 tracking-tighter">
                Complete seu perfil
              </Text>
              <Text className="text-zinc-500 font-medium mt-2 text-center">
                Precisamos de mais algumas informações.
              </Text>
            </View>
          </View>

          <View className="px-8 mt-8 flex-1 pb-8">
            {error && (
              <View className="bg-red-50 p-4 rounded-2xl flex-row items-center border border-red-100 mb-4">
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <Text className="ml-3 text-red-600 text-sm font-bold flex-1">{error}</Text>
              </View>
            )}

            {success && (
              <View className="bg-green-50 p-4 rounded-2xl flex-row items-center border border-green-100 mb-4">
                <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                <Text className="ml-3 text-green-700 text-sm font-bold flex-1">Perfil salvo!</Text>
              </View>
            )}

            <View className="mb-4">
              <Text className="text-zinc-500 text-sm font-semibold mb-2">Telefone *</Text>
              <View className="flex-row gap-2 items-center">
                <CountrySelector value={countryCode} onChange={setCountryCode} />
                <View className="flex-1">
                  <PhoneInput
                    value={phoneNumber}
                    countryCode={countryCode}
                    onChange={setPhoneNumber}
                  />
                </View>
              </View>
            </View>

            <Text className="text-xs text-zinc-400 text-center mb-6">
              * Campo obrigatório
            </Text>

            <Pressable
              onPress={handleSubmit}
              disabled={loading || success}
              className="h-16 rounded-2xl items-center justify-center"
              style={{ backgroundColor: primaryColor, opacity: loading || success ? 0.5 : 1 }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <View className="flex-row items-center gap-2">
                  <Text className="text-white text-lg font-black">
                    {success ? "Salvo!" : "Salvar e entrar"}
                  </Text>
                  {!success && <Ionicons name="arrow-forward" size={20} color="white" />}
                </View>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

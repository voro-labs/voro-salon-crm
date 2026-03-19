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

export default function OnboardingChangePasswordScreen() {
  const router = useRouter()
  const { primaryColor } = useTenantTheme()

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit() {
    setError(null)

    if (newPassword.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.")
      return
    }

    setLoading(true)
    try {
      const res = await apiCall<null>(API_CONFIG.ENDPOINTS.CHANGE_PASSWORD, {
        method: "POST",
        body: JSON.stringify({ newPassword }),
      })

      if (res.hasError) {
        setError(res.message ?? "Erro ao alterar senha.")
        return
      }

      setSuccess(true)

      // Avançar para o próximo passo
      const flagsRaw = await SecureStore.getItemAsync("post_login_flags")
      const flags = flagsRaw ? JSON.parse(flagsRaw) : {}
      flags.requiresPasswordChange = false
      await SecureStore.setItemAsync("post_login_flags", JSON.stringify(flags))

      setTimeout(() => {
        if (flags.requiresTermsAcceptance) {
          router.replace("/(onboarding)/terms")
        } else if (flags.requiresProfileCompletion) {
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
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>

          <View className="bg-white px-8 pt-12 pb-10 rounded-b-[40px] shadow-sm shadow-zinc-200">
            <View className="items-center mb-8">
              <View
                className="h-20 w-20 rounded-3xl items-center justify-center shadow-lg"
                style={{ backgroundColor: primaryColor }}
              >
                <Ionicons name="key" size={40} color="white" />
              </View>
              <Text className="text-3xl font-black text-zinc-900 mt-6 tracking-tighter">
                Criar nova senha
              </Text>
              <Text className="text-zinc-500 font-medium mt-2 text-center">
                Defina uma senha segura para sua conta.
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
                <Text className="ml-3 text-green-700 text-sm font-bold flex-1">Senha alterada!</Text>
              </View>
            )}

            <Text className="text-zinc-500 text-sm font-semibold mb-1">Nova senha</Text>
            <View className="flex-row items-center bg-white border border-zinc-200 rounded-2xl px-4 mb-4">
              <TextInput
                className="flex-1 h-14 text-zinc-900 text-base"
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#a1a1aa"
                secureTextEntry={!showNew}
                value={newPassword}
                onChangeText={setNewPassword}
                editable={!loading && !success}
                autoComplete="new-password"
              />
              <Pressable onPress={() => setShowNew(!showNew)}>
                <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={20} color="#71717a" />
              </Pressable>
            </View>

            <Text className="text-zinc-500 text-sm font-semibold mb-1">Confirmar senha</Text>
            <View className="flex-row items-center bg-white border border-zinc-200 rounded-2xl px-4 mb-6">
              <TextInput
                className="flex-1 h-14 text-zinc-900 text-base"
                placeholder="Repita a nova senha"
                placeholderTextColor="#a1a1aa"
                secureTextEntry={!showConfirm}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!loading && !success}
                autoComplete="new-password"
              />
              <Pressable onPress={() => setShowConfirm(!showConfirm)}>
                <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={20} color="#71717a" />
              </Pressable>
            </View>

            <Text className="text-xs text-zinc-400 text-center mb-6">
              A nova senha não pode ser igual às últimas senhas usadas.
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
                    {success ? "Salvo!" : "Salvar senha"}
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

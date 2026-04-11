import React, { useState } from "react"
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { apiCall, API_CONFIG } from "lib/api"
import { useTenantTheme } from "contexts/tenant-theme.context"

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const { primaryColor } = useTenantTheme()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string }>({})

  function validate() {
    const errors: { email?: string } = {}
    if (!email.trim()) {
      errors.email = "E-mail é obrigatório."
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Informe um e-mail válido."
    }
    return errors
  }

  const handleForgot = async () => {
    const errors = validate()
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return }
    setFieldErrors({})
    setLoading(true)
    setError(null)
    try {
      const res = await apiCall(API_CONFIG.ENDPOINTS.FORGOT_PASSWORD, {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), redirectUri: `${process.env.EXPO_PUBLIC_BASE_API_URL}/${process.env.EXPO_PUBLIC_VERSION_API}/auth/reset-password-redirect` }),
      })
      if (res.hasError) { setError(res.message ?? "Erro ao enviar e-mail"); return }
      setSuccess(true)
    } catch { setError("Erro inesperado. Tente novamente.") }
    finally { setLoading(false) }
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView className="flex-1 bg-zinc-50" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
          <View className="bg-white px-8 pt-8 pb-10 rounded-b-[40px] shadow-sm shadow-zinc-200">
            <Pressable onPress={() => router.back()} className="h-10 w-10 bg-zinc-50 border border-zinc-100 rounded-xl items-center justify-center mb-6">
              <Ionicons name="chevron-back" size={20} color="#18181b" />
            </Pressable>
            <View className="items-center mb-8">
              <View className="h-20 w-20 rounded-3xl items-center justify-center shadow-lg" style={{ backgroundColor: primaryColor }}>
                <Ionicons name="mail-unread-outline" size={40} color="white" />
              </View>
              <Text className="text-3xl font-black text-zinc-900 mt-6 tracking-tighter text-center">
                Recuperar<Text style={{ color: primaryColor }}> Senha</Text>
              </Text>
              <Text className="text-zinc-500 font-medium mt-2 text-center">Informe seu e-mail para receber o link de redefinição</Text>
            </View>

            <View className="mt-2 gap-3">
              <View className="gap-1">
                <View
                  className="bg-zinc-50 rounded-2xl px-4 py-3 flex-row items-center"
                  style={{ borderWidth: 1, borderColor: fieldErrors.email ? "#fca5a5" : "#f4f4f5" }}
                >
                  <Ionicons name="mail-outline" size={20} color={fieldErrors.email ? "#ef4444" : "#71717a"} />
                  <TextInput
                    className="flex-1 ml-3 text-zinc-900 font-semibold text-base py-0"
                    placeholder="Seu e-mail"
                    placeholderTextColor="#a1a1aa"
                    value={email}
                    onChangeText={(t) => { setEmail(t); setError(null); setFieldErrors({}) }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="done"
                    onSubmitEditing={handleForgot}
                  />
                </View>
                {fieldErrors.email && (
                  <Text className="text-red-500 text-xs font-semibold ml-1">{fieldErrors.email}</Text>
                )}
              </View>

              {error && (
                <View className="bg-red-50 p-4 rounded-2xl flex-row items-center border border-red-100">
                  <Ionicons name="alert-circle" size={20} color="#ef4444" />
                  <Text className="ml-3 text-red-600 text-sm font-bold flex-1">{error}</Text>
                </View>
              )}
              {success && (
                <View className="bg-emerald-950 p-4 rounded-2xl border border-emerald-900 gap-1">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="checkmark-circle" size={20} color="#34d399" />
                    <Text className="text-emerald-300 text-sm font-bold flex-1">E-mail enviado!</Text>
                  </View>
                  <Text className="text-emerald-400 text-xs leading-5">
                    Verifique sua caixa de entrada e clique no link para redefinir sua senha.
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View className="px-8 mt-10 pb-8">
            <Pressable
              onPress={handleForgot}
              disabled={loading || success}
              className="h-16 rounded-2xl items-center justify-center"
              style={{ backgroundColor: primaryColor, opacity: loading || success ? 0.6 : 1 }}
            >
              {loading
                ? <ActivityIndicator color="white" />
                : <View className="flex-row items-center gap-2"><Text className="text-white text-lg font-black">Enviar Código</Text><Ionicons name="paper-plane" size={20} color="white" /></View>
              }
            </Pressable>
            <View className="flex-row justify-center mt-6">
              <Text className="text-zinc-500 font-bold">Lembrou a senha? </Text>
              <Pressable onPress={() => router.back()}>
                <Text className="font-black" style={{ color: primaryColor }}>Voltar ao login</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

import React, { useState } from "react"
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { apiCall, API_CONFIG } from "lib/api"

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleForgot = async () => {
    if (!email) return
    setLoading(true)
    setError(null)
    try {
      const res = await apiCall(API_CONFIG.ENDPOINTS.FORGOT_PASSWORD, {
        method: "POST",
        body: JSON.stringify({ email }),
      })
      if (res.hasError) { setError(res.message ?? "Erro ao enviar e-mail"); return }
      setSuccess(true)
      setTimeout(() => router.push({ pathname: "/(auth)/reset-password", params: { email } }), 2000)
    } catch { setError("Erro inesperado. Tente novamente.") }
    finally { setLoading(false) }
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
          <View className="bg-white px-8 pt-8 pb-10 rounded-b-[40px] shadow-sm shadow-zinc-200">
            <Pressable onPress={() => router.back()} className="h-10 w-10 bg-zinc-50 border border-zinc-100 rounded-xl items-center justify-center mb-6">
              <Ionicons name="chevron-back" size={20} color="#18181b" />
            </Pressable>
            <View className="items-center mb-8">
              <View className="h-20 w-20 bg-purple-600 rounded-3xl items-center justify-center shadow-lg shadow-purple-200">
                <Ionicons name="mail-unread-outline" size={40} color="white" />
              </View>
              <Text className="text-3xl font-black text-zinc-900 mt-6 tracking-tighter text-center">
                Recuperar<Text className="text-purple-600"> Senha</Text>
              </Text>
              <Text className="text-zinc-500 font-medium mt-2 text-center">Informe seu e-mail para receber o código</Text>
            </View>
            <View className="gap-3">
              <View className="bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 flex-row items-center">
                <Ionicons name="mail-outline" size={20} color="#71717a" />
                <TextInput className="flex-1 ml-3 text-zinc-900 font-semibold text-base py-0" placeholder="Seu e-mail" placeholderTextColor="#a1a1aa" value={email} onChangeText={(t) => { setEmail(t); setError(null) }} autoCapitalize="none" keyboardType="email-address" />
              </View>
              {error && <View className="bg-red-50 p-4 rounded-2xl flex-row items-center border border-red-100"><Ionicons name="alert-circle" size={20} color="#ef4444" /><Text className="ml-3 text-red-600 text-sm font-bold flex-1">{error}</Text></View>}
              {success && <View className="bg-green-50 p-4 rounded-2xl flex-row items-center border border-green-100"><Ionicons name="checkmark-circle" size={20} color="#10b981" /><Text className="ml-3 text-green-600 text-sm font-bold flex-1">Código enviado! Redirecionando...</Text></View>}
            </View>
          </View>
          <View className="px-8 mt-10 pb-8">
            <Pressable onPress={handleForgot} disabled={loading || success} className={`h-16 rounded-2xl items-center justify-center shadow-lg ${loading || success ? "bg-purple-400" : "bg-purple-600 shadow-purple-200"}`}>
              {loading ? <ActivityIndicator color="white" /> : <View className="flex-row items-center gap-2"><Text className="text-white text-lg font-black">Enviar Código</Text><Ionicons name="paper-plane" size={20} color="white" /></View>}
            </Pressable>
            <View className="flex-row justify-center mt-6">
              <Text className="text-zinc-500 font-bold">Lembrou a senha? </Text>
              <Pressable onPress={() => router.replace("/(auth)/sign-in")}><Text className="text-purple-600 font-black">Voltar ao login</Text></Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

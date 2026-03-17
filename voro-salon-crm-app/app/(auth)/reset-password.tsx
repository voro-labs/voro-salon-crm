import React, { useState } from "react"
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { apiCall, API_CONFIG } from "lib/api"

export default function ResetPasswordScreen() {
  const router = useRouter()
  const { email } = useLocalSearchParams<{ email: string }>()
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleReset = async () => {
    if (!code || !newPassword) return
    if (newPassword !== confirmPassword) { setError("As senhas não coincidem"); return }
    setLoading(true)
    setError(null)
    try {
      const res = await apiCall(API_CONFIG.ENDPOINTS.RESET_PASSWORD, {
        method: "POST",
        body: JSON.stringify({ email, code, newPassword }),
      })
      if (res.hasError) { setError(res.message ?? "Erro ao redefinir senha"); return }
      setSuccess(true)
      setTimeout(() => router.replace("/(auth)/sign-in"), 2000)
    } catch { setError("Erro inesperado.") }
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
                <Ionicons name="key-outline" size={40} color="white" />
              </View>
              <Text className="text-3xl font-black text-zinc-900 mt-6 tracking-tighter text-center">
                Nova <Text className="text-purple-600">Senha</Text>
              </Text>
              <Text className="text-zinc-500 font-medium mt-2 text-center">Digite o código recebido e sua nova senha</Text>
            </View>
            <View className="gap-3">
              <View className="bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 flex-row items-center">
                <Ionicons name="keypad-outline" size={20} color="#71717a" />
                <TextInput className="flex-1 ml-3 text-zinc-900 font-semibold text-base py-0" placeholder="Código de verificação" placeholderTextColor="#a1a1aa" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
              </View>
              <View className="bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 flex-row items-center">
                <Ionicons name="lock-closed-outline" size={20} color="#71717a" />
                <TextInput className="flex-1 ml-3 text-zinc-900 font-semibold text-base py-0" placeholder="Nova senha" placeholderTextColor="#a1a1aa" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
              </View>
              <View className="bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 flex-row items-center">
                <Ionicons name="lock-closed-outline" size={20} color="#71717a" />
                <TextInput className="flex-1 ml-3 text-zinc-900 font-semibold text-base py-0" placeholder="Confirmar nova senha" placeholderTextColor="#a1a1aa" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
              </View>
              {error && <View className="bg-red-50 p-4 rounded-2xl flex-row items-center border border-red-100"><Ionicons name="alert-circle" size={20} color="#ef4444" /><Text className="ml-3 text-red-600 text-sm font-bold flex-1">{error}</Text></View>}
              {success && <View className="bg-green-50 p-4 rounded-2xl flex-row items-center border border-green-100"><Ionicons name="checkmark-circle" size={20} color="#10b981" /><Text className="ml-3 text-green-600 text-sm font-bold flex-1">Senha redefinida! Redirecionando...</Text></View>}
            </View>
          </View>
          <View className="px-8 mt-10 pb-8">
            <Pressable onPress={handleReset} disabled={loading || success} className={`h-16 rounded-2xl items-center justify-center shadow-lg ${loading || success ? "bg-purple-400" : "bg-purple-600 shadow-purple-200"}`}>
              {loading ? <ActivityIndicator color="white" /> : <Text className="text-white text-lg font-black">Redefinir Senha</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

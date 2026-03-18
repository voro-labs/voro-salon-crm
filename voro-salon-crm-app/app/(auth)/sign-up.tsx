import React, { useState } from "react"
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { apiCall, API_CONFIG } from "lib/api"
import { useTenantTheme } from "contexts/tenant-theme.context"

export default function SignUpScreen() {
  const router = useRouter()
  const { primaryColor } = useTenantTheme()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSignUp = async () => {
    if (!firstName || !email || !password) return
    setLoading(true)
    setError(null)
    try {
      const res = await apiCall(API_CONFIG.ENDPOINTS.SIGNIN.replace("sign-in", "sign-up"), {
        method: "POST",
        body: JSON.stringify({ firstName, lastName, email, password }),
      })
      if (res.hasError) {
        setError(res.message ?? "Erro ao criar conta")
        return
      }
      setSuccess(true)
      setTimeout(() => router.replace("/(auth)/sign-in"), 2000)
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
          <View className="bg-white px-8 pt-8 pb-10 rounded-b-[40px] shadow-sm shadow-zinc-200">
            <Pressable onPress={() => router.back()} className="h-10 w-10 bg-zinc-50 border border-zinc-100 rounded-xl items-center justify-center mb-6">
              <Ionicons name="chevron-back" size={20} color="#18181b" />
            </Pressable>
            <View className="items-center mb-8">
              <Text className="text-3xl font-black text-zinc-900 tracking-tighter">
                Criar <Text style={{ color: primaryColor }}>conta</Text>
              </Text>
              <Text className="text-zinc-500 font-medium mt-2 text-center">Preencha seus dados para começar</Text>
            </View>

            <View className="mt-2 gap-3">
              <View className="bg-zinc-50 border border-zinc-100 rounded-2xl mt-2 px-4 py-3 flex-row items-center">
                <Ionicons name="person-outline" size={20} color="#71717a" />
                <TextInput className="flex-1 ml-3 text-zinc-900 font-semibold text-base py-0" placeholder="Nome" placeholderTextColor="#a1a1aa" value={firstName} onChangeText={setFirstName} />
              </View>
              <View className="bg-zinc-50 border border-zinc-100 rounded-2xl mt-2 px-4 py-3 flex-row items-center">
                <Ionicons name="person-outline" size={20} color="#71717a" />
                <TextInput className="flex-1 ml-3 text-zinc-900 font-semibold text-base py-0" placeholder="Sobrenome" placeholderTextColor="#a1a1aa" value={lastName} onChangeText={setLastName} />
              </View>
              <View className="bg-zinc-50 border border-zinc-100 rounded-2xl mt-2 px-4 py-3 flex-row items-center">
                <Ionicons name="mail-outline" size={20} color="#71717a" />
                <TextInput className="flex-1 ml-3 text-zinc-900 font-semibold text-base py-0" placeholder="E-mail" placeholderTextColor="#a1a1aa" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
              </View>
              <View className="bg-zinc-50 border border-zinc-100 rounded-2xl mt-2 px-4 py-3 flex-row items-center">
                <Ionicons name="lock-closed-outline" size={20} color="#71717a" />
                <TextInput className="flex-1 ml-3 text-zinc-900 font-semibold text-base py-0" placeholder="Senha" placeholderTextColor="#a1a1aa" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
                <Pressable onPress={() => setShowPassword(v => !v)} className="ml-2 p-1">
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#71717a" />
                </Pressable>
              </View>

              {error && (
                <View className="bg-red-50 p-4 rounded-2xl flex-row items-center border border-red-100">
                  <Ionicons name="alert-circle" size={20} color="#ef4444" />
                  <Text className="ml-3 text-red-600 text-sm font-bold flex-1">{error}</Text>
                </View>
              )}
              {success && (
                <View className="bg-green-50 p-4 rounded-2xl flex-row items-center border border-green-100">
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text className="ml-3 text-green-600 text-sm font-bold flex-1">Conta criada! Redirecionando...</Text>
                </View>
              )}
            </View>
          </View>

          <View className="px-8 mt-10 pb-8">
            <Pressable
              onPress={handleSignUp}
              disabled={loading || success}
              className="h-16 rounded-2xl items-center justify-center shadow-lg"
              style={{ backgroundColor: loading || success ? primaryColor + "99" : primaryColor }}
            >
              {loading ? <ActivityIndicator color="white" /> : <Text className="text-white text-lg font-black">Criar conta</Text>}
            </Pressable>
            <View className="flex-row justify-center mt-6">
              <Text className="text-zinc-500 font-bold">Já tem conta? </Text>
              <Pressable onPress={() => router.replace("/(auth)/sign-in")}>
                <Text className="font-black" style={{ color: primaryColor }}>Entrar</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

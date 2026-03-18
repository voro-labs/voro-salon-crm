import React, { useState } from "react"
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useSignIn } from "hooks/use-sign-in.hook"
import { useTenantTheme } from "contexts/tenant-theme.context"

export default function SignInScreen() {
  const router = useRouter()
  const { signIn, loading, error, clearError } = useSignIn()
  const { primaryColor } = useTenantTheme()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  function validate() {
    const errors: { email?: string; password?: string } = {}
    if (!email.trim()) {
      errors.email = "E-mail é obrigatório."
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Informe um e-mail válido."
    }
    if (!password) {
      errors.password = "Senha é obrigatória."
    }
    return errors
  }

  const handleSignIn = async () => {
    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    await signIn({ email: email.trim(), password })
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView className="flex-1 bg-zinc-50" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
          <View className="bg-white px-8 pt-12 pb-10 rounded-b-[40px] shadow-sm shadow-zinc-200">
            <View className="items-center mb-10">
              <Pressable
                onPress={() => router.replace("/(auth)/welcome")}
                className="self-start mb-4 flex-row items-center gap-1"
              >
                <Ionicons name="chevron-back" size={18} color="#71717a" />
                <Text className="text-zinc-400 font-semibold text-sm">Voltar</Text>
              </Pressable>
              <View className="h-20 w-20 rounded-3xl items-center justify-center shadow-lg" style={{ backgroundColor: primaryColor }}>
                <Ionicons name="cut" size={40} color="white" />
              </View>
              <Text className="text-3xl font-black text-zinc-900 mt-6 tracking-tighter">
                Voro <Text style={{ color: primaryColor }}>Salon</Text>
              </Text>
              <Text className="text-zinc-500 font-medium mt-2">Entre para gerenciar seu salão</Text>
            </View>

            <View className="space-y-6 gap-2">
              <View className="gap-1">
                <View
                  className="bg-zinc-50 rounded-2xl px-4 py-3 flex-row items-center"
                  style={{ borderWidth: 1, borderColor: fieldErrors.email ? "#fca5a5" : "#f4f4f5" }}
                >
                  <Ionicons name="mail-outline" size={20} color={fieldErrors.email ? "#ef4444" : "#71717a"} />
                  <TextInput
                    className="flex-1 ml-3 text-zinc-900 font-semibold text-base py-0"
                    placeholder="E-mail"
                    placeholderTextColor="#a1a1aa"
                    value={email}
                    onChangeText={(t) => { setEmail(t); clearError(); setFieldErrors((p) => ({ ...p, email: undefined })) }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="next"
                  />
                </View>
                {fieldErrors.email && (
                  <Text className="text-red-500 text-xs font-semibold ml-1">{fieldErrors.email}</Text>
                )}
              </View>

              <View className="gap-1">
                <View
                  className="bg-zinc-50 rounded-2xl px-4 py-3 flex-row items-center"
                  style={{ borderWidth: 1, borderColor: fieldErrors.password ? "#fca5a5" : "#f4f4f5" }}
                >
                  <Ionicons name="lock-closed-outline" size={20} color={fieldErrors.password ? "#ef4444" : "#71717a"} />
                  <TextInput
                    className="flex-1 ml-3 text-zinc-900 font-semibold text-base py-0"
                    placeholder="Senha"
                    placeholderTextColor="#a1a1aa"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(t) => { setPassword(t); clearError(); setFieldErrors((p) => ({ ...p, password: undefined })) }}
                    returnKeyType="done"
                    onSubmitEditing={handleSignIn}
                  />
                  <Pressable onPress={() => setShowPassword(v => !v)} className="ml-2 p-1">
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#71717a" />
                  </Pressable>
                </View>
                {fieldErrors.password && (
                  <Text className="text-red-500 text-xs font-semibold ml-1">{fieldErrors.password}</Text>
                )}
              </View>

              <Pressable onPress={() => router.push("/(auth)/forgot-password")} className="self-end">
                <Text className="text-xs font-black uppercase tracking-wider" style={{ color: primaryColor }}>Esqueceu a senha?</Text>
              </Pressable>

              {error && (
                <View className="bg-red-50 p-4 rounded-2xl flex-row items-center border border-red-100">
                  <Ionicons name="alert-circle" size={20} color="#ef4444" />
                  <Text className="ml-3 text-red-600 text-sm font-bold flex-1">{error}</Text>
                </View>
              )}
            </View>
          </View>

          <View className="px-8 mt-10 flex-1 justify-between pb-8">
            <Pressable
              onPress={handleSignIn}
              disabled={loading}
              className="h-16 rounded-2xl items-center justify-center shadow-lg"
              style={{ backgroundColor: loading ? primaryColor + "99" : primaryColor }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <View className="flex-row items-center gap-2">
                  <Text className="text-white text-lg font-black">Entrar</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </View>
              )}
            </Pressable>

            {/* <View className="flex-row justify-center mt-12">
              <Text className="text-zinc-500 font-bold text-base">Não tem conta? </Text>
              <Pressable onPress={() => router.push("/(auth)/sign-up")}>
                <Text className="text-base font-black" style={{ color: primaryColor }}>Cadastre-se</Text>
              </Pressable>
            </View> */}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

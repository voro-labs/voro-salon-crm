import React, { useState } from "react"
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { apiCall, API_CONFIG } from "lib/api"
import { useTenantTheme } from "contexts/tenant-theme.context"

type FieldErrors = {
  firstName?: string
  email?: string
  password?: string
}

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  function validate(): FieldErrors {
    const errors: FieldErrors = {}
    if (!firstName.trim()) {
      errors.firstName = "Nome é obrigatório."
    }
    if (!email.trim()) {
      errors.email = "E-mail é obrigatório."
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Informe um e-mail válido."
    }
    if (!password) {
      errors.password = "Senha é obrigatória."
    } else if (password.length < 6) {
      errors.password = "A senha deve ter pelo menos 6 caracteres."
    }
    return errors
  }

  function clearField(field: keyof FieldErrors) {
    setFieldErrors((p) => ({ ...p, [field]: undefined }))
    setError(null)
  }

  const handleSignUp = async () => {
    const errors = validate()
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return }
    setFieldErrors({})
    setLoading(true)
    setError(null)
    try {
      const res = await apiCall(API_CONFIG.ENDPOINTS.SIGNIN.replace("sign-in", "sign-up"), {
        method: "POST",
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), password }),
      })
      if (res.hasError) { setError(res.message ?? "Erro ao criar conta"); return }
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
              {/* Nome */}
              <View className="gap-1">
                <View
                  className="bg-zinc-50 rounded-2xl px-4 py-3 flex-row items-center"
                  style={{ borderWidth: 1, borderColor: fieldErrors.firstName ? "#fca5a5" : "#f4f4f5" }}
                >
                  <Ionicons name="person-outline" size={20} color={fieldErrors.firstName ? "#ef4444" : "#71717a"} />
                  <TextInput
                    className="flex-1 ml-3 text-zinc-900 font-semibold text-base py-0"
                    placeholder="Nome *"
                    placeholderTextColor="#a1a1aa"
                    value={firstName}
                    onChangeText={(t) => { setFirstName(t); clearField("firstName") }}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
                {fieldErrors.firstName && (
                  <Text className="text-red-500 text-xs font-semibold ml-1">{fieldErrors.firstName}</Text>
                )}
              </View>

              {/* Sobrenome (opcional) */}
              <View
                className="bg-zinc-50 rounded-2xl px-4 py-3 flex-row items-center"
                style={{ borderWidth: 1, borderColor: "#f4f4f5" }}
              >
                <Ionicons name="person-outline" size={20} color="#71717a" />
                <TextInput
                  className="flex-1 ml-3 text-zinc-900 font-semibold text-base py-0"
                  placeholder="Sobrenome"
                  placeholderTextColor="#a1a1aa"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              {/* E-mail */}
              <View className="gap-1">
                <View
                  className="bg-zinc-50 rounded-2xl px-4 py-3 flex-row items-center"
                  style={{ borderWidth: 1, borderColor: fieldErrors.email ? "#fca5a5" : "#f4f4f5" }}
                >
                  <Ionicons name="mail-outline" size={20} color={fieldErrors.email ? "#ef4444" : "#71717a"} />
                  <TextInput
                    className="flex-1 ml-3 text-zinc-900 font-semibold text-base py-0"
                    placeholder="E-mail *"
                    placeholderTextColor="#a1a1aa"
                    value={email}
                    onChangeText={(t) => { setEmail(t); clearField("email") }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="next"
                  />
                </View>
                {fieldErrors.email && (
                  <Text className="text-red-500 text-xs font-semibold ml-1">{fieldErrors.email}</Text>
                )}
              </View>

              {/* Senha */}
              <View className="gap-1">
                <View
                  className="bg-zinc-50 rounded-2xl px-4 py-3 flex-row items-center"
                  style={{ borderWidth: 1, borderColor: fieldErrors.password ? "#fca5a5" : "#f4f4f5" }}
                >
                  <Ionicons name="lock-closed-outline" size={20} color={fieldErrors.password ? "#ef4444" : "#71717a"} />
                  <TextInput
                    className="flex-1 ml-3 text-zinc-900 font-semibold text-base py-0"
                    placeholder="Senha * (mín. 6 caracteres)"
                    placeholderTextColor="#a1a1aa"
                    value={password}
                    onChangeText={(t) => { setPassword(t); clearField("password") }}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleSignUp}
                  />
                  <Pressable onPress={() => setShowPassword(v => !v)} className="ml-2 p-1">
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#71717a" />
                  </Pressable>
                </View>
                {fieldErrors.password && (
                  <Text className="text-red-500 text-xs font-semibold ml-1">{fieldErrors.password}</Text>
                )}
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

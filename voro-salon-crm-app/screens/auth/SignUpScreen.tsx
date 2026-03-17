import React, { useState } from "react"
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native"
import { useAuth } from "../../contexts/auth.context"
import { Ionicons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"

export function SignUpScreen({ navigation }: any) {
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const clearError = () => setError(null)

  const [form, setForm] = useState({
    UserName: "",
    FirstName: "",
    LastName: "",
    Email: "",
    Password: "",
    CountryCode: "BR",
    PhoneNumber: "",
    AvatarUrl: "https://i.pravatar.cc/150?u=voro",
  })

  const updateForm = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
    clearError()
  }

  const handleSignUp = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { apiCall, API_CONFIG } = await import("../../lib/api")
      const response = await apiCall<any>("/auth/sign-up", { // Note: SIGNUP missing in API_CONFIG.ENDPOINTS in web, hardcoding for now
        method: "POST",
        body: JSON.stringify(form)
      })

      if (response.hasError) {
        setError(response.message || "Erro ao criar conta")
        return
      }

      const authData = response.data
      if (authData?.token) {
        await login(authData.token, authData.refreshToken, authData.tenants)
      } else {
        navigation.navigate("SignIn")
      }

    } catch (e) {
      setError("Ocorreu um erro ao criar conta.")
    } finally {
      setIsLoading(false)
    }
  }

  const InputField = ({ icon, placeholder, value, onChangeText, ...props }: any) => (
    <View className="bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 flex-row items-center mb-4">
      <Ionicons name={icon} size={20} color="#71717a" />
      <TextInput
        className="flex-1 ml-3 text-zinc-900 font-semibold text-base py-0"
        placeholder={placeholder}
        placeholderTextColor="#a1a1aa"
        value={value}
        onChangeText={onChangeText}
        textAlignVertical="center"
        {...props}
      />
    </View>
  )

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Header & Main Card */}
          <View className="bg-white px-8 pt-8 pb-10 rounded-b-[40px] shadow-sm shadow-zinc-200">
            <Pressable
              onPress={() => navigation.goBack()}
              className="h-10 w-10 bg-zinc-50 border border-zinc-100 rounded-xl items-center justify-center mb-6"
            >
              <Ionicons name="chevron-back" size={20} color="#18181b" />
            </Pressable>

            <View className="items-center mb-10">
              <View className="h-20 w-20 bg-purple-600 rounded-3xl items-center justify-center shadow-lg shadow-purple-200">
                <Ionicons name="flame" size={40} color="white" />
              </View>
              <Text className="text-3xl font-black text-zinc-900 mt-6 tracking-tighter text-center">
                Criar<Text className="text-purple-600"> Conta</Text>
              </Text>
              <Text className="text-zinc-500 mt-2 font-medium text-center">
                Preencha os dados e comece sua jornada
              </Text>
            </View>

            <View className="space-y-1">
              <View className="flex-row gap-x-4">
                <View className="flex-1">
                  <InputField
                    icon="person-outline"
                    placeholder="Nome"
                    value={form.FirstName}
                    onChangeText={(v: string) => updateForm("FirstName", v)}
                  />
                </View>
                <View className="flex-1">
                  <InputField
                    icon="person-outline"
                    placeholder="Sobrenome"
                    value={form.LastName}
                    onChangeText={(v: string) => updateForm("LastName", v)}
                  />
                </View>
              </View>

              <InputField
                icon="at-outline"
                placeholder="Usuário"
                autoCapitalize="none"
                value={form.UserName}
                onChangeText={(v: string) => updateForm("UserName", v)}
              />

              <InputField
                icon="mail-outline"
                placeholder="E-mail"
                keyboardType="email-address"
                autoCapitalize="none"
                value={form.Email}
                onChangeText={(v: string) => updateForm("Email", v)}
              />

              <InputField
                icon="call-outline"
                placeholder="Telefone"
                keyboardType="phone-pad"
                value={form.PhoneNumber}
                onChangeText={(v: string) => updateForm("PhoneNumber", v)}
              />

              <InputField
                icon="lock-closed-outline"
                placeholder="Sua senha"
                secureTextEntry
                value={form.Password}
                onChangeText={(v: string) => updateForm("Password", v)}
              />

              {error && (
                <View className="bg-red-50 p-4 rounded-2xl flex-row items-center border border-red-100 mt-2">
                  <Ionicons name="alert-circle" size={20} color="#ef4444" />
                  <Text className="ml-3 text-red-600 text-sm font-bold flex-1">{error}</Text>
                </View>
              )}
            </View>
          </View>

          <View className="px-8 mt-10 pb-12">
            <Pressable
              onPress={handleSignUp}
              disabled={isLoading}
              className={`h-16 rounded-2xl items-center justify-center shadow-lg ${isLoading ? "bg-purple-400" : "bg-purple-600 shadow-purple-200"
                }`}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <View className="flex-row items-center">
                  <Text className="text-white text-lg font-black mr-2">Criar Conta</Text>
                  <Ionicons name="person-add" size={20} color="white" />
                </View>
              )}
            </Pressable>

            <View className="flex-row justify-center mt-10">
              <Text className="text-zinc-500 font-bold text-base">Já tem uma conta? </Text>
              <Pressable onPress={() => navigation.navigate("SignIn")}>
                <Text className="text-purple-600 text-base font-black">Entrar</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
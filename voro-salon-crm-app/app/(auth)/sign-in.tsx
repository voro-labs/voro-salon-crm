import React, { useState } from "react"
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useSignIn } from "hooks/use-sign-in.hook"

export default function SignInScreen() {
  const router = useRouter()
  const { signIn, loading, error, clearError } = useSignIn()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSignIn = async () => {
    if (!email || !password) return
    await signIn({ email, password })
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
          <View className="bg-white px-8 pt-12 pb-10 rounded-b-[40px] shadow-sm shadow-zinc-200">
            <View className="items-center mb-10">
              <View className="h-20 w-20 bg-purple-600 rounded-3xl items-center justify-center shadow-lg shadow-purple-200">
                <Ionicons name="cut" size={40} color="white" />
              </View>
              <Text className="text-3xl font-black text-zinc-900 mt-6 tracking-tighter">
                Voro <Text className="text-purple-600">Salon</Text>
              </Text>
              <Text className="text-zinc-500 font-medium mt-2">Entre para gerenciar seu salão</Text>
            </View>

            <View className="gap-3">
              <View className="bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 flex-row items-center">
                <Ionicons name="mail-outline" size={20} color="#71717a" />
                <TextInput
                  className="flex-1 ml-3 text-zinc-900 font-semibold text-base py-0"
                  placeholder="E-mail"
                  placeholderTextColor="#a1a1aa"
                  value={email}
                  onChangeText={(t) => { setEmail(t); clearError() }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View className="bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 flex-row items-center">
                <Ionicons name="lock-closed-outline" size={20} color="#71717a" />
                <TextInput
                  className="flex-1 ml-3 text-zinc-900 font-semibold text-base py-0"
                  placeholder="Senha"
                  placeholderTextColor="#a1a1aa"
                  secureTextEntry
                  value={password}
                  onChangeText={(t) => { setPassword(t); clearError() }}
                />
              </View>

              <Pressable onPress={() => router.push("/(auth)/forgot-password")} className="self-end">
                <Text className="text-purple-600 text-xs font-black uppercase tracking-wider">Esqueceu a senha?</Text>
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
              className={`h-16 rounded-2xl items-center justify-center shadow-lg ${loading ? "bg-purple-400" : "bg-purple-600 shadow-purple-200"}`}
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

            <View className="flex-row justify-center mt-12">
              <Text className="text-zinc-500 font-bold text-base">Não tem conta? </Text>
              <Pressable onPress={() => router.push("/(auth)/sign-up")}>
                <Text className="text-purple-600 text-base font-black">Cadastre-se</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

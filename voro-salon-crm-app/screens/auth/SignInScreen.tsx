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
import { useSignIn } from "../../hooks/use-sign-in.hook"
import { Ionicons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"

export function SignInScreen({ navigation }: any) {
  const { signIn, loading: isLoading, error, clearError } = useSignIn()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSignIn = async () => {
    if (!email || !password) return
    try {
      await signIn({ email, password })
    } catch (e) {
      // Error handled by hook
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {/* Header & Main Card */}
          <View className="bg-white px-8 pt-12 pb-10 rounded-b-[40px] shadow-sm shadow-zinc-200">
            <View className="items-center mb-10">
              <View className="h-20 w-20 bg-purple-600 rounded-3xl items-center justify-center shadow-lg shadow-purple-200">
                <Ionicons name="flame" size={40} color="white" />
              </View>
              <Text className="text-3xl font-black text-zinc-900 mt-6 tracking-tighter">
                Voro<Text className="text-purple-600">Swipe</Text>
              </Text>
              <Text className="text-zinc-500 font-medium mt-2">
                Entre para continuar sua jornada
              </Text>
            </View>

            {/* Form Section */}
            <View className="space-y-6 gap-2">
              <View className="bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 flex-row items-center">
                <Ionicons name="mail-outline" size={20} color="#71717a" />
                <TextInput
                  className="flex-1 ml-3 text-zinc-900 font-semibold text-base py-0"
                  placeholder="E-mail ou Telefone"
                  placeholderTextColor="#a1a1aa"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text)
                    clearError()
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textAlignVertical="center"
                />
              </View>

              <View className="bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 flex-row items-center">
                <Ionicons name="lock-closed-outline" size={20} color="#71717a" />
                <TextInput
                  className="flex-1 ml-3 text-zinc-900 font-semibold text-base py-0"
                  placeholder="Sua senha"
                  placeholderTextColor="#a1a1aa"
                  secureTextEntry
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text)
                    clearError()
                  }}
                  textAlignVertical="center"
                />
              </View>

              <View className="flex-row items-center justify-between mt-1">
                <Pressable className="flex-row items-center">
                  <View className="h-5 w-5 rounded-md border border-zinc-200 items-center justify-center mr-2 bg-zinc-50">
                    <Ionicons name="checkmark" size={12} color="#7c3aed" />
                  </View>
                  <Text className="text-zinc-500 font-bold text-xs uppercase tracking-wider">Lembrar de mim</Text>
                </Pressable>
                <Pressable onPress={() => navigation.navigate("ForgotPassword")}>
                  <Text className="text-purple-600 text-xs font-black uppercase tracking-wider">Esqueceu a senha?</Text>
                </Pressable>
              </View>

              {error && (
                <View className="bg-red-50 p-4 rounded-2xl flex-row items-center border border-red-100">
                  <Ionicons name="alert-circle" size={20} color="#ef4444" />
                  <Text className="ml-3 text-red-600 text-sm font-bold flex-1">
                    {error}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Action Section */}
          <View className="px-8 mt-10 flex-1 justify-between pb-8">
            <View>
              <Pressable
                onPress={handleSignIn}
                disabled={isLoading}
                className={`h-16 rounded-2xl items-center justify-center shadow-lg ${isLoading ? "bg-purple-400" : "bg-purple-600 shadow-purple-200"
                  }`}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <View className="flex-row items-center">
                    <Text className="text-white text-lg font-black mr-2">Entrar</Text>
                    <Ionicons name="arrow-forward" size={20} color="white" />
                  </View>
                )}
              </Pressable>

              {/* Social Login */}
              <View className="mt-10 items-center">
                <Text className="text-zinc-400 text-[10px] font-black uppercase tracking-[2px] mb-6">Ou entre com</Text>
                <View className="flex-row gap-x-4">
                  <Pressable className="h-14 w-14 rounded-2xl bg-white border border-zinc-100 items-center justify-center shadow-sm shadow-zinc-200">
                    <Ionicons name="logo-google" size={24} color="#EA4335" />
                  </Pressable>
                  <Pressable className="h-14 w-14 rounded-2xl bg-white border border-zinc-100 items-center justify-center shadow-sm shadow-zinc-200">
                    <Ionicons name="logo-apple" size={24} color="#000000" />
                  </Pressable>
                  <Pressable className="h-14 w-14 rounded-2xl bg-white border border-zinc-100 items-center justify-center shadow-sm shadow-zinc-200">
                    <Ionicons name="logo-facebook" size={24} color="#1877F2" />
                  </Pressable>
                </View>
              </View>
            </View>

            <View className="flex-row justify-center mt-12">
              <Text className="text-zinc-500 font-bold text-base">Não tem conta? </Text>
              <Pressable onPress={() => navigation.navigate("SignUp")}>
                <Text className="text-purple-600 text-base font-black">Cadastre-se</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

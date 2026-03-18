import React, { useState } from "react"
import {
  View, Text, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { API_CONFIG } from "lib/api"

const PRIMARY = "#8B4513"

export default function BookingEntryScreen() {
  const router = useRouter()
  const [slug, setSlug] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleContinue() {
    const trimmed = slug.trim().toLowerCase()
    if (!trimmed) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PUBLIC_TENANT}/${trimmed}`
      )
      if (!res.ok) {
        setError("Salão não encontrado. Verifique o código informado.")
        return
      }
      router.push(`/booking/${trimmed}`)
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-4 flex-row items-center gap-3 border-b border-zinc-100">
          <Pressable
            onPress={() => router.back()}
            className="h-9 w-9 bg-zinc-50 rounded-xl items-center justify-center border border-zinc-100"
          >
            <Ionicons name="chevron-back" size={20} color="#18181b" />
          </Pressable>
          <Text className="text-xl font-black text-zinc-900">Agendar</Text>
        </View>

        <View className="flex-1 px-6 pt-10">
          <View
            className="h-16 w-16 rounded-2xl items-center justify-center mb-6"
            style={{ backgroundColor: PRIMARY + "18" }}
          >
            <Ionicons name="calendar-outline" size={32} color={PRIMARY} />
          </View>

          <Text className="text-2xl font-black text-zinc-900 mb-2">
            Qual é o código do salão?
          </Text>
          <Text className="text-zinc-500 font-medium mb-8">
            Insira o código do estabelecimento onde deseja agendar seu serviço.
          </Text>

          <View className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 flex-row items-center gap-3 mb-3">
            <Ionicons name="search-outline" size={20} color="#a1a1aa" />
            <TextInput
              className="flex-1 text-zinc-900 font-semibold text-base py-0"
              placeholder="Ex: meu-salao"
              placeholderTextColor="#a1a1aa"
              value={slug}
              onChangeText={(t) => { setSlug(t); setError("") }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleContinue}
            />
          </View>

          {error ? (
            <View className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 flex-row items-center gap-2 mb-3">
              <Ionicons name="alert-circle" size={18} color="#ef4444" />
              <Text className="text-red-600 font-semibold text-sm flex-1">{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleContinue}
            disabled={loading || !slug.trim()}
            className="h-14 rounded-2xl items-center justify-center mt-2"
            style={{ backgroundColor: (!slug.trim() || loading) ? PRIMARY + "55" : PRIMARY }}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : (
                <View className="flex-row items-center gap-2">
                  <Text className="text-white font-black text-base">Continuar</Text>
                  <Ionicons name="arrow-forward" size={18} color="white" />
                </View>
              )
            }
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

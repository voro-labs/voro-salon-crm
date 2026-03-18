import React, { useState, useEffect } from "react"
import {
  View, Text, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter, useLocalSearchParams } from "expo-router"
import * as SecureStore from "expo-secure-store"
import { API_CONFIG } from "lib/api"
import { useTenantTheme } from "@/contexts/tenant-theme.context"

const { primaryColor: PRIMARY } = useTenantTheme()

const KEY_SLUG = "voro_booking_slug"
const KEY_TENANT_NAME = "voro_booking_tenant_name"

export default function BookingEntryScreen() {
  const router = useRouter()
  const { change } = useLocalSearchParams<{ change?: string }>()

  const [initializing, setInitializing] = useState(true)
  const [savedSlug, setSavedSlug] = useState<string | null>(null)
  const [savedTenantName, setSavedTenantName] = useState<string | null>(null)
  const [changing, setChanging] = useState(false)
  const [slug, setSlug] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Carrega slug salvo ao abrir
  useEffect(() => {
    async function loadSaved() {
      const s = await SecureStore.getItemAsync(KEY_SLUG)
      const name = await SecureStore.getItemAsync(KEY_TENANT_NAME)
      if (s) {
        setSavedSlug(s)
        setSavedTenantName(name)
        // Se vier de "Trocar salão", mostra a tela em vez de redirecionar
        if (change === "1") {
          setChanging(true)
          setSlug(s)
          setInitializing(false)
          return
        }
        // Navega automaticamente para o salão salvo
        router.replace(`/booking/${s}`)
        return
      }
      setInitializing(false)
    }
    loadSaved()
  }, [])

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
      const json = await res.json()
      const tenantName: string = json.data?.name ?? json.name ?? trimmed

      // Salva para uso futuro
      await Promise.all([
        SecureStore.setItemAsync(KEY_SLUG, trimmed),
        SecureStore.setItemAsync(KEY_TENANT_NAME, tenantName),
      ])

      router.push(`/booking/${trimmed}`)
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  async function handleUseSaved() {
    if (!savedSlug) return
    router.push(`/booking/${savedSlug}`)
  }

  async function handleChangeSlug() {
    setChanging(true)
    setSlug(savedSlug ?? "")
    setError("")
  }

  async function handleConfirmChange() {
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
      const json = await res.json()
      const tenantName: string = json.data?.name ?? json.name ?? trimmed

      await Promise.all([
        SecureStore.setItemAsync(KEY_SLUG, trimmed),
        SecureStore.setItemAsync(KEY_TENANT_NAME, tenantName),
      ])

      setSavedSlug(trimmed)
      setSavedTenantName(tenantName)
      setChanging(false)
      router.push(`/booking/${trimmed}`)
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  // Enquanto verifica slug salvo
  if (initializing) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    )
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
            onPress={() => {
              if (changing) { setChanging(false); setError("") }
              else router.back()
            }}
            className="h-9 w-9 rounded-xl items-center justify-center border border-zinc-100"
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

          {/* ── Salão salvo ──────────────────────────────────────────────── */}
          {savedSlug && !changing ? (
            <>
              <Text className="text-2xl font-black text-zinc-900 mb-2">Seu salão</Text>
              <Text className="text-zinc-500 font-medium mb-8">
                Já temos o código do seu salão salvo. Pode continuar diretamente!
              </Text>

              {/* Saved salon card */}
              <View className="border border-zinc-200 rounded-2xl px-4 py-4 flex-row items-center gap-3 mb-4">
                <View
                  className="h-10 w-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: PRIMARY + "18" }}
                >
                  <Ionicons name="storefront-outline" size={20} color={PRIMARY} />
                </View>
                <View className="flex-1">
                  <Text className="text-zinc-900 font-black text-base">
                    {savedTenantName ?? savedSlug}
                  </Text>
                  <Text className="text-zinc-400 font-medium text-sm">{savedSlug}</Text>
                </View>
                <View
                  className="px-2 py-1 rounded-lg"
                  style={{ backgroundColor: "#22c55e18" }}
                >
                  <Text className="text-xs font-bold" style={{ color: "#16a34a" }}>Salvo</Text>
                </View>
              </View>

              <Pressable
                onPress={handleUseSaved}
                className="h-14 rounded-2xl items-center justify-center mb-3"
                style={{ backgroundColor: PRIMARY }}
              >
                <View className="flex-row items-center gap-2">
                  <Text className="text-white font-black text-base">Continuar para agendamento</Text>
                  <Ionicons name="arrow-forward" size={18} color="white" />
                </View>
              </Pressable>

              <Pressable
                onPress={handleChangeSlug}
                className="h-12 rounded-2xl items-center justify-center border border-zinc-200 flex-row gap-2"
              >
                <Ionicons name="swap-horizontal-outline" size={18} color="#71717a" />
                <Text className="text-zinc-600 font-bold text-sm">Trocar salão</Text>
              </Pressable>
            </>
          ) : (
            /* ── Entrada de slug ──────────────────────────────────────────── */
            <>
              <Text className="text-2xl font-black text-zinc-900 mb-2">
                {changing ? "Trocar de salão" : "Qual é o código do salão?"}
              </Text>
              <Text className="text-zinc-500 font-medium mb-8">
                {changing
                  ? "Insira o código do novo estabelecimento."
                  : "Insira o código do estabelecimento onde deseja agendar seu serviço."
                }
              </Text>

              <View className="border border-zinc-200 rounded-2xl px-4 py-3 flex-row items-center gap-3 mb-3">
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
                  onSubmitEditing={changing ? handleConfirmChange : handleContinue}
                  autoFocus={changing}
                />
              </View>

              {error ? (
                <View className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 flex-row items-center gap-2 mb-3">
                  <Ionicons name="alert-circle" size={18} color="#ef4444" />
                  <Text className="text-red-600 font-semibold text-sm flex-1">{error}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={changing ? handleConfirmChange : handleContinue}
                disabled={loading || !slug.trim()}
                className="h-14 rounded-2xl items-center justify-center mt-2"
                style={{ backgroundColor: (!slug.trim() || loading) ? PRIMARY + "55" : PRIMARY }}
              >
                {loading
                  ? <ActivityIndicator color="white" />
                  : (
                    <View className="flex-row items-center gap-2">
                      <Text className="text-white font-black text-base">
                        {changing ? "Confirmar" : "Continuar"}
                      </Text>
                      <Ionicons name="arrow-forward" size={18} color="white" />
                    </View>
                  )
                }
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

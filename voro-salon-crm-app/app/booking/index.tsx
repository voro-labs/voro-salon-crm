import React, { useState, useEffect } from "react"
import {
  View, Text, TextInput, Pressable, ActivityIndicator, ScrollView,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { Ionicons } from "@expo/vector-icons"
import { useRouter, useLocalSearchParams } from "expo-router"
import * as SecureStore from "expo-secure-store"
import { API_CONFIG } from "lib/api"
import { useTenantTheme } from "@/contexts/tenant-theme.context"

export const KEY_SLUG = "voro_booking_slug"
export const KEY_TENANT_NAME = "voro_booking_tenant_name"
export const KEY_HISTORY = "voro_booking_history"

export type HistoryEntry = {
  slug: string
  name: string
  visitedAt: string
  lastServices?: string[]
}

export async function saveToHistory(slug: string, name: string, newServices?: string[]) {
  try {
    const raw = await SecureStore.getItemAsync(KEY_HISTORY)
    const history: HistoryEntry[] = raw ? JSON.parse(raw) : []
    const existing = history.find((h) => h.slug === slug)
    let services = existing?.lastServices ?? []
    if (newServices?.length) {
      // Adiciona novos serviços ao início, sem duplicatas, máximo 3
      for (const s of [...newServices].reverse()) {
        services = [s, ...services.filter((x) => x !== s)].slice(0, 3)
      }
    }
    const filtered = history.filter((h) => h.slug !== slug)
    const updated = [{ slug, name, visitedAt: new Date().toISOString(), lastServices: services.length ? services : undefined }, ...filtered].slice(0, 5)
    await SecureStore.setItemAsync(KEY_HISTORY, JSON.stringify(updated))
  } catch {}
}

async function removeFromHistory(slug: string): Promise<HistoryEntry[]> {
  const raw = await SecureStore.getItemAsync(KEY_HISTORY)
  const history: HistoryEntry[] = raw ? JSON.parse(raw) : []
  const updated = history.filter((h) => h.slug !== slug)
  await SecureStore.setItemAsync(KEY_HISTORY, JSON.stringify(updated))
  return updated
}

export default function BookingEntryScreen() {
  const router = useRouter()
  const { change } = useLocalSearchParams<{ change?: string }>()
  const { primaryColor: PRIMARY } = useTenantTheme()

  const [initializing, setInitializing] = useState(true)
  const [savedSlug, setSavedSlug] = useState<string | null>(null)
  const [savedTenantName, setSavedTenantName] = useState<string | null>(null)
  const [changing, setChanging] = useState(false)
  const [slug, setSlug] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [warning, setWarning] = useState("")
  const [history, setHistory] = useState<HistoryEntry[]>([])

  useEffect(() => {
    async function loadSaved() {
      const [s, name, historyRaw] = await Promise.all([
        SecureStore.getItemAsync(KEY_SLUG),
        SecureStore.getItemAsync(KEY_TENANT_NAME),
        SecureStore.getItemAsync(KEY_HISTORY),
      ])
      if (historyRaw) {
        try { setHistory(JSON.parse(historyRaw)) } catch {}
      }
      if (s) {
        setSavedSlug(s)
        setSavedTenantName(name)
        if (change === "1") {
          setChanging(true)
          setSlug(s)
          setInitializing(false)
          return
        }
        // Verifica isBooking antes de redirecionar automaticamente
        try {
          const tenant = await fetchTenant(s)
          if (tenant && tenant.isBooking) {
            router.replace(`/booking/${s}`)
            return
          }
          if (tenant && !tenant.isBooking) {
            setWarning("Este estabelecimento não possui agendamento online disponível.")
          }
        } catch {}
      }
      setInitializing(false)
    }
    loadSaved()
  }, [])

  async function navigateToSlug(trimmed: string, tenantName: string) {
    await Promise.all([
      SecureStore.setItemAsync(KEY_SLUG, trimmed),
      SecureStore.setItemAsync(KEY_TENANT_NAME, tenantName),
      saveToHistory(trimmed, tenantName),
    ])
  }

  async function fetchTenant(trimmed: string): Promise<{ name: string; isBooking: boolean } | null> {
    const res = await fetch(`${API_CONFIG.BASE_API_URL}${API_CONFIG.ENDPOINTS.PUBLIC_TENANT}/${trimmed}`)
    if (!res.ok) return null
    const json = await res.json()
    const data = json.data ?? json
    return {
      name: data.name ?? trimmed,
      isBooking: data.isBookingEnabled === true,
    }
  }

  async function handleContinue() {
    const trimmed = slug.trim().toLowerCase()
    if (!trimmed) return
    setLoading(true)
    setError("")
    setWarning("")
    try {
      const tenant = await fetchTenant(trimmed)
      if (!tenant) {
        setError("Salão não encontrado. Verifique o código informado.")
        return
      }
      if (!tenant.isBooking) {
        setWarning("Este estabelecimento não possui agendamento online disponível.")
        return
      }
      await navigateToSlug(trimmed, tenant.name)
      router.push(`/booking/${trimmed}`)
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  async function handleUseSaved() {
    if (!savedSlug) return
    setLoading(true)
    setError("")
    setWarning("")
    try {
      const tenant = await fetchTenant(savedSlug)
      if (!tenant) {
        setError("Salão não encontrado.")
        return
      }
      if (!tenant.isBooking) {
        setWarning("Este estabelecimento não possui agendamento online disponível.")
        return
      }
      router.push(`/booking/${savedSlug}`)
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  function handleChangeSlug() {
    setChanging(true)
    setSlug(savedSlug ?? "")
    setError("")
    setWarning("")
  }

  async function handleConfirmChange() {
    const trimmed = slug.trim().toLowerCase()
    if (!trimmed) return
    setLoading(true)
    setError("")
    setWarning("")
    try {
      const tenant = await fetchTenant(trimmed)
      if (!tenant) {
        setError("Salão não encontrado. Verifique o código informado.")
        return
      }
      if (!tenant.isBooking) {
        setWarning("Este estabelecimento não possui agendamento online disponível.")
        return
      }
      await navigateToSlug(trimmed, tenant.name)
      setSavedSlug(trimmed)
      setSavedTenantName(tenant.name)
      setChanging(false)
      router.push(`/booking/${trimmed}`)
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  async function handleSelectHistory(entry: HistoryEntry) {
    setLoading(true)
    setError("")
    setWarning("")
    try {
      const tenant = await fetchTenant(entry.slug)
      if (!tenant) {
        setError("Salão não encontrado.")
        return
      }
      if (!tenant.isBooking) {
        setWarning("Este estabelecimento não possui agendamento online disponível.")
        return
      }
      await navigateToSlug(entry.slug, entry.name)
      setSavedSlug(entry.slug)
      setSavedTenantName(entry.name)
      router.push(`/booking/${entry.slug}`)
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  async function handleRemoveHistory(slug: string) {
    const updated = await removeFromHistory(slug)
    setHistory(updated)
  }

  if (initializing) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-4 pb-4 flex-row items-center gap-3 border-b border-zinc-100">
        <Pressable
          onPress={() => {
            if (changing) { setChanging(false); setError(""); setWarning("") }
            else router.back()
          }}
          className="h-9 w-9 rounded-xl items-center justify-center border border-zinc-100"
        >
          <Ionicons name="chevron-back" size={20} color="#18181b" />
        </Pressable>
        <Text className="text-xl font-black text-zinc-900">Agendar</Text>
      </View>

      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
              <View className="px-2 py-1 rounded-lg" style={{ backgroundColor: "#22c55e18" }}>
                <Text className="text-xs font-bold" style={{ color: "#16a34a" }}>Salvo</Text>
              </View>
            </View>

            {error ? (
              <View className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 flex-row items-center gap-2 mb-3">
                <Ionicons name="alert-circle" size={18} color="#ef4444" />
                <Text className="text-red-600 font-semibold text-sm flex-1">{error}</Text>
              </View>
            ) : null}

            {warning ? (
              <View className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex-row items-center gap-2 mb-3">
                <Ionicons name="warning-outline" size={18} color="#d97706" />
                <Text className="text-amber-700 font-semibold text-sm flex-1">{warning}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleUseSaved}
              disabled={loading}
              className="h-14 rounded-2xl items-center justify-center mb-3"
              style={{ backgroundColor: loading ? PRIMARY + "55" : PRIMARY }}
            >
              {loading
                ? <ActivityIndicator color="white" />
                : (
                  <View className="flex-row items-center gap-2">
                    <Text className="text-white font-black text-base">Continuar para agendamento</Text>
                    <Ionicons name="arrow-forward" size={18} color="white" />
                  </View>
                )
              }
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
                onChangeText={(t) => { setSlug(t); setError(""); setWarning("") }}
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

            {warning ? (
              <View className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex-row items-center gap-2 mb-3">
                <Ionicons name="warning-outline" size={18} color="#d97706" />
                <Text className="text-amber-700 font-semibold text-sm flex-1">{warning}</Text>
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

            {/* Histórico de estabelecimentos */}
            {history.length > 0 && (
              <View className="mt-8">
                <Text className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                  Usados recentemente
                </Text>
                <View className="gap-2">
                  {history.map((entry) => (
                    <Pressable
                      key={entry.slug}
                      onPress={() => handleSelectHistory(entry)}
                      className="border border-zinc-100 rounded-2xl px-4 py-3 bg-zinc-50"
                    >
                      <View className="flex-row items-center gap-3">
                        <View
                          className="h-9 w-9 rounded-xl items-center justify-center shrink-0"
                          style={{ backgroundColor: PRIMARY + "15" }}
                        >
                          <Ionicons name="storefront-outline" size={18} color={PRIMARY} />
                        </View>
                        <View className="flex-1 min-w-0">
                          <Text className="text-zinc-900 font-bold text-sm">{entry.name}</Text>
                          <Text className="text-zinc-400 text-xs font-medium">{entry.slug}</Text>
                        </View>
                        <Pressable
                          onPress={(e) => { e.stopPropagation(); handleRemoveHistory(entry.slug) }}
                          hitSlop={8}
                          className="h-7 w-7 rounded-lg items-center justify-center"
                          style={{ backgroundColor: "#fef2f2" }}
                        >
                          <Ionicons name="trash-outline" size={14} color="#ef4444" />
                        </Pressable>
                      </View>

                      {entry.lastServices && entry.lastServices.length > 0 && (
                        <View className="flex-row flex-wrap gap-1.5 mt-2.5 ml-12">
                          {entry.lastServices.map((service, i) => (
                            <View
                              key={i}
                              className="px-2 py-0.5 rounded-lg"
                              style={{ backgroundColor: PRIMARY + "12" }}
                            >
                              <Text className="text-xs font-semibold" style={{ color: PRIMARY }}>
                                {service}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  )
}

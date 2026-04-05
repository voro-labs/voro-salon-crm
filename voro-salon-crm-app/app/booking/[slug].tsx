import React, { useState, useEffect } from "react"
import {
  View, Text, Pressable, ScrollView, TextInput,
  ActivityIndicator, Image, KeyboardAvoidingView,
  Platform, FlatList, Modal, Linking,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter, useLocalSearchParams } from "expo-router"
import * as SecureStore from "expo-secure-store"
import { API_CONFIG } from "lib/api"
import { flags } from "lib/flag-utils"
import { saveToHistory, KEY_SLUG, KEY_TENANT_NAME } from "./index"
import { PhoneInput } from "components/PhoneInput"
import { formatPhone } from "@/lib/mask-utils"
import { CountrySelector } from "@/components/CountrySelector"

// ─── Types ────────────────────────────────────────────────────────────────────

type Step =
  | "LOADING"
  | "SERVICE"
  | "PROFESSIONAL"
  | "DATE"
  | "TIME"
  | "CLIENT_INFO"
  | "CONFIRM"
  | "SUCCESS"

interface Tenant {
  id: string
  name: string
  slug: string
  logoUrl?: string
  primaryColor?: string
  secondaryColor?: string
  contactPhone?: string
  isBookingEnabled?: boolean
}

interface Service {
  id: string
  name: string
  price: number
  durationMinutes: number
  promotionalPrice?: number
  hasPromotion?: boolean
}

interface Employee {
  id: string
  name: string
  photoUrl?: string
}

interface Slot {
  startTime: string
  endTime: string
  isAvailable: boolean
}

interface FormState {
  serviceId: string
  serviceName: string
  employeeId: string
  employeeName: string
  date: string
  time: string
  name: string
  phone: string
  description: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function publicFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_CONFIG.BASE_API_URL}${url}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.message ?? "Erro na requisição")
  return (json.data ?? json) as T
}

function formatDate(iso: string): string {
  if (!iso) return ""
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

function formatTime(iso: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function generateCalendarDates(count = 30): string[] {
  const dates: string[] = []
  const today = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
const MONTHS_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function buildCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = Array(firstDay).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

// ─── Component ────────────────────────────────────────────────────────────────

const STORAGE_KEY_NAME = "voro_booking_name"
const STORAGE_KEY_PHONE = "voro_booking_phone"
const STORAGE_KEY_COUNTRY = "voro_booking_country"

export default function BookingScreen() {
  const router = useRouter()
  const { slug } = useLocalSearchParams<{ slug: string }>()

  const [step, setStep] = useState<Step>("LOADING")
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [countryCode, setCountryCode] = useState("BR")
  const [countryModalOpen, setCountryModalOpen] = useState(false)
  const [countrySearch, setCountrySearch] = useState("")

  const [calendarOpen, setCalendarOpen] = useState(false)
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(new Date().getMonth())

  const [form, setForm] = useState<FormState>({
    serviceId: "",
    serviceName: "",
    employeeId: "",
    employeeName: "",
    date: "",
    time: "",
    name: "",
    phone: "",
    description: "",
  })

  const primary = tenant?.primaryColor ?? "#8B4513"
  const COUNTRIES = Object.entries(flags).map(([code, data]) => ({ code, ...data }))
  const filteredCountries = countrySearch.trim()
    ? COUNTRIES.filter((c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.dialCode.includes(countrySearch)
    )
    : COUNTRIES

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!slug) return
    async function init() {
      try {
        const [tenantData, servicesData] = await Promise.all([
          publicFetch<Tenant>(`${API_CONFIG.ENDPOINTS.PUBLIC_TENANT}/${slug}`),
          publicFetch<Service[]>(`${API_CONFIG.ENDPOINTS.PUBLIC_SERVICES}?tenantSlug=${slug}`),
        ])
        if (tenantData.isBookingEnabled === false) {
          setError("Este estabelecimento não possui agendamento online disponível.")
          setStep("SERVICE")
          return
        }
        setTenant(tenantData)
        setServices(servicesData)
        // Restore saved info
        const [savedName, savedPhone, savedCountry] = await Promise.all([
          SecureStore.getItemAsync(STORAGE_KEY_NAME),
          SecureStore.getItemAsync(STORAGE_KEY_PHONE),
          SecureStore.getItemAsync(STORAGE_KEY_COUNTRY),
        ])
        if (savedName) setForm((p) => ({ ...p, name: savedName }))
        if (savedPhone) setForm((p) => ({ ...p, phone: savedPhone }))
        if (savedCountry) setCountryCode(savedCountry)
        setStep("SERVICE")
      } catch {
        setError("Não foi possível carregar os dados do salão.")
        setStep("SERVICE")
      }
    }
    init()
  }, [slug])

  // ── Fetch slots when date changes ─────────────────────────────────────────

  useEffect(() => {
    if (!form.date || step !== "TIME") return
    async function loadSlots() {
      setLoadingSlots(true)
      try {
        const params = new URLSearchParams({ tenantSlug: slug, date: form.date })
        if (form.employeeId && form.employeeId !== "none") params.set("employeeId", form.employeeId)
        const data = await publicFetch<Slot[]>(
          `${API_CONFIG.ENDPOINTS.PUBLIC_AVAILABILITY}?${params.toString()}`
        )
        // Check if today and filter past slots
        const todayStr = new Date().toLocaleDateString('en-CA')
        const isToday = form.date === todayStr
        const now = new Date()

        const availableSlots = data.filter((s) => {
          if (!s.isAvailable) return false
          if (isToday && new Date(s.startTime) < now) return false
          return true
        })

        setSlots(availableSlots)
      } catch {
        setSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }
    loadSlots()
  }, [form.date, step])

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleServiceSelect(service: Service) {
    setForm((p) => ({ ...p, serviceId: service.id, serviceName: service.name, employeeId: "", employeeName: "" }))
    try {
      const data = await publicFetch<Employee[]>(
        `${API_CONFIG.ENDPOINTS.PUBLIC_EMPLOYEES}?tenantSlug=${slug}&serviceId=${service.id}`
      )
      setEmployees(data)
      setStep(data.length > 0 ? "PROFESSIONAL" : "DATE")
    } catch {
      setEmployees([])
      setStep("DATE")
    }
  }

  function handleProfessionalSelect(employee: Employee | null) {
    setForm((p) => ({
      ...p,
      employeeId: employee?.id ?? "none",
      employeeName: employee?.name ?? "Qualquer profissional",
    }))
    setStep("DATE")
  }

  function handleDateSelect(date: string) {
    setForm((p) => ({ ...p, date, time: "" }))
    setSlots([])
    setStep("TIME")
  }

  function handleTimeSelect(slot: Slot) {
    setForm((p) => ({ ...p, time: formatTime(slot.startTime) }))
    setStep("CLIENT_INFO")
  }

  async function handleClientInfoNext() {
    if (!form.name.trim()) { setError("Por favor, informe seu nome."); return }
    if (!form.phone.trim()) { setError("Por favor, informe seu telefone."); return }
    setError("")
    await Promise.all([
      SecureStore.setItemAsync(STORAGE_KEY_NAME, form.name),
      SecureStore.setItemAsync(STORAGE_KEY_PHONE, form.phone),
      SecureStore.setItemAsync(STORAGE_KEY_COUNTRY, countryCode),
    ])
    setStep("CONFIRM")
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError("")
    try {
      const dialCode = flags[countryCode]?.dialCodeOnlyNumber ?? "55"
      const phoneForApi = `${dialCode}${form.phone}`
      const scheduledDateTime = new Date(`${form.date}T${form.time}:00`).toISOString()

      await publicFetch(`${API_CONFIG.ENDPOINTS.PUBLIC_BOOKING}`, {
        method: "POST",
        body: JSON.stringify({
          tenantSlug: slug,
          clientName: form.name,
          clientPhone: phoneForApi,
          serviceId: form.serviceId,
          employeeId: form.employeeId === "none" ? null : form.employeeId || null,
          scheduledDateTime,
          description: form.description,
        }),
      })
      // Salva o último serviço no histórico de estabelecimentos
      if (slug && tenant?.name && form.serviceName) {
        await saveToHistory(slug, tenant.name, [form.serviceName])
      }
      setStep("SUCCESS")
    } catch (err: any) {
      setError(err.message ?? "Erro ao criar agendamento.")
    } finally {
      setSubmitting(false)
    }
  }

  function openWhatsApp() {
    const rawPhone = tenant?.contactPhone?.replace(/\D/g, "") ?? ""
    if (!rawPhone) return
    const message = `Olá, acabei de solicitar um agendamento para *${form.serviceName}* no dia *${formatDate(form.date)} às ${form.time}*. Meu nome é ${form.name}.`
    Linking.openURL(`https://wa.me/${rawPhone}?text=${encodeURIComponent(message)}`)
  }

  function goBack() {
    const prev: Record<Step, Step> = {
      LOADING: "LOADING",
      SERVICE: "SERVICE",
      PROFESSIONAL: "SERVICE",
      DATE: employees.length > 0 ? "PROFESSIONAL" : "SERVICE",
      TIME: "DATE",
      CLIENT_INFO: "TIME",
      CONFIRM: "CLIENT_INFO",
      SUCCESS: "SUCCESS",
    }
    setStep(prev[step])
    setError("")
  }

  // ─── UI ────────────────────────────────────────────────────────────────────

  const STEPS: Step[] = ["SERVICE", "PROFESSIONAL", "DATE", "TIME", "CLIENT_INFO", "CONFIRM"]
  const visibleSteps = employees.length > 0 ? STEPS : STEPS.filter((s) => s !== "PROFESSIONAL")
  const stepIndex = visibleSteps.indexOf(step)
  const progress = stepIndex >= 0 ? (stepIndex + 1) / visibleSteps.length : 0

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      {/* Header */}
      {step !== "LOADING" && step !== "SUCCESS" && (
        <View className="bg-white px-5 pt-4 pb-3 border-b border-zinc-100">
          <View className="flex-row items-center gap-3 mb-3">
            {step !== "SERVICE" ? (
              <Pressable
                onPress={goBack}
                className="h-9 w-9 bg-zinc-50 rounded-xl items-center justify-center border border-zinc-100"
              >
                <Ionicons name="chevron-back" size={20} color="#18181b" />
              </Pressable>
            ) : (
              <Pressable
                onPress={() => router.back()}
                className="h-9 w-9 bg-zinc-50 rounded-xl items-center justify-center border border-zinc-100"
              >
                <Ionicons name="chevron-back" size={20} color="#18181b" />
              </Pressable>
            )}
            <View className="flex-1 flex-row items-center gap-2">
              {tenant?.logoUrl ? (
                <Image
                  source={{ uri: tenant.logoUrl }}
                  style={{ width: 24, height: 24, borderRadius: 6 }}
                  resizeMode="contain"
                />
              ) : null}
              <Text className="text-base font-black text-zinc-900 flex-1" numberOfLines={1}>
                {tenant?.name ?? "Agendamento"}
              </Text>
            </View>
            <Pressable
              onPress={async () => {
                await SecureStore.deleteItemAsync("voro_booking_slug")
                await SecureStore.deleteItemAsync("voro_booking_tenant_name")
                router.replace("/booking?change=1")
              }}
              className="flex-row items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200"
            >
              <Ionicons name="swap-horizontal-outline" size={14} color="#71717a" />
              <Text className="text-zinc-500 font-bold text-xs">Trocar salão</Text>
            </Pressable>
          </View>
          {/* Progress bar */}
          <View className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <View
              className="h-full rounded-full"
              style={{ width: `${progress * 100}%`, backgroundColor: primary }}
            />
          </View>
        </View>
      )}

      {/* ── LOADING ─────────────────────────────────────────────────────── */}
      {step === "LOADING" && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={primary} />
          <Text className="text-zinc-400 font-semibold mt-4">Carregando salão...</Text>
        </View>
      )}

      {/* ── SERVICE ─────────────────────────────────────────────────────── */}
      {step === "SERVICE" && (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 mb-4 flex-row items-center gap-2">
              <Ionicons name="alert-circle" size={18} color="#ef4444" />
              <Text className="text-red-600 font-semibold text-sm flex-1">{error}</Text>
            </View>
          ) : null}

          <Text className="text-2xl font-black text-zinc-900 mb-1">Escolha o serviço</Text>
          <Text className="text-zinc-500 font-medium mb-6">
            Qual serviço você deseja realizar?
          </Text>

          {services.length === 0 ? (
            <View className="items-center py-16">
              <Ionicons name="cut-outline" size={48} color="#d4d4d8" />
              <Text className="text-zinc-400 font-semibold mt-3">Nenhum serviço disponível</Text>
            </View>
          ) : (
            <View className="gap-3">
              {services.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => handleServiceSelect(s)}
                  className="bg-white rounded-2xl p-4 border border-zinc-100 flex-row items-center gap-4 active:opacity-70"
                >
                  <View
                    className="h-12 w-12 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: primary + "18" }}
                  >
                    <Ionicons name="cut-outline" size={22} color={primary} />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 flex-wrap">
                      <Text className="text-zinc-900 font-bold text-base">{s.name}</Text>
                      {s.hasPromotion && (
                        <View className="bg-emerald-100 rounded-full px-2 py-0.5">
                          <Text className="text-emerald-700 font-bold text-[10px]">PROMOÇÃO</Text>
                        </View>
                      )}
                    </View>
                    <View className="flex-row gap-3 mt-0.5 flex-wrap">
                      {s.hasPromotion && s.promotionalPrice != null ? (
                        <>
                          <Text className="text-zinc-400 font-medium text-sm line-through">
                            R$ {s.price.toFixed(2)}
                          </Text>
                          <Text className="text-emerald-600 font-bold text-sm">
                            R$ {s.promotionalPrice.toFixed(2)}
                          </Text>
                        </>
                      ) : s.price != null ? (
                        <Text className="text-zinc-500 font-medium text-sm">
                          R$ {s.price.toFixed(2)}
                        </Text>
                      ) : null}
                      {s.durationMinutes != null && (
                        <Text className="text-zinc-400 font-medium text-sm">
                          {s.durationMinutes} min
                        </Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#d4d4d8" />
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── PROFESSIONAL ────────────────────────────────────────────────── */}
      {step === "PROFESSIONAL" && (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-2xl font-black text-zinc-900 mb-1">Escolha o profissional</Text>
          <Text className="text-zinc-500 font-medium mb-6">
            Tem preferência por algum profissional?
          </Text>

          <View className="gap-3">
            {/* Any professional option */}
            <Pressable
              onPress={() => handleProfessionalSelect(null)}
              className="bg-white rounded-2xl p-4 border border-zinc-100 flex-row items-center gap-4 active:opacity-70"
            >
              <View className="h-12 w-12 rounded-full bg-zinc-100 items-center justify-center">
                <Ionicons name="shuffle-outline" size={22} color="#71717a" />
              </View>
              <View className="flex-1">
                <Text className="text-zinc-900 font-bold text-base">Qualquer profissional</Text>
                <Text className="text-zinc-400 font-medium text-sm">Primeiro disponível</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#d4d4d8" />
            </Pressable>

            {employees.map((e) => (
              <Pressable
                key={e.id}
                onPress={() => handleProfessionalSelect(e)}
                className="bg-white rounded-2xl p-4 border border-zinc-100 flex-row items-center gap-4 active:opacity-70"
              >
                {e.photoUrl ? (
                  <Image
                    source={{ uri: e.photoUrl }}
                    style={{ width: 48, height: 48, borderRadius: 24 }}
                  />
                ) : (
                  <View
                    className="h-12 w-12 rounded-full items-center justify-center"
                    style={{ backgroundColor: primary + "18" }}
                  >
                    <Ionicons name="person-outline" size={22} color={primary} />
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-zinc-900 font-bold text-base">{e.name}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#d4d4d8" />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ── DATE ────────────────────────────────────────────────────────── */}
      {step === "DATE" && (
        <View className="flex-1">
          <View className="px-5 py-8 items-center justify-center">
            <Pressable
              onPress={() => {
                const base = form.date ? new Date(form.date + "T12:00:00") : new Date()
                setViewYear(base.getFullYear())
                setViewMonth(base.getMonth())
                setCalendarOpen(true)
              }}
              className="w-full bg-white border border-zinc-200 rounded-3xl p-6 items-center shadow-sm active:bg-zinc-50"
            >
              <View className="h-16 w-16 rounded-full bg-zinc-50 items-center justify-center mb-4 border border-zinc-100">
                <Ionicons name="calendar-outline" size={32} color={primary} />
              </View>

              <Text className="text-zinc-400 font-bold text-xs uppercase tracking-widest mb-1">
                Data selecionada
              </Text>

              <Text className="text-2xl font-black text-zinc-900 text-center">
                {form.date ? formatDate(form.date) : "Nenhuma data selecionada"}
              </Text>

              <View className="mt-4 px-4 py-2 bg-zinc-100 rounded-xl flex-row items-center gap-2">
                <Text className="text-zinc-600 font-bold text-sm">Alterar data</Text>
                <Ionicons name="chevron-down" size={14} color="#71717a" />
              </View>
            </Pressable>
          </View>

          {form.date ? (
            <View className="px-5 mt-auto pb-10">
              <Pressable
                onPress={() => setStep("TIME")}
                className="h-14 rounded-2xl items-center justify-center flex-row gap-2"
                style={{ backgroundColor: primary }}
              >
                <Text className="text-white font-black text-base">Ver horários disponíveis</Text>
                <Ionicons name="arrow-forward" size={18} color="white" />
              </Pressable>
            </View>
          ) : null}
        </View>
      )}

      {/* ── TIME ────────────────────────────────────────────────────────── */}
      {step === "TIME" && (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-2xl font-black text-zinc-900 mb-1">Escolha o horário</Text>
          <Text className="text-zinc-500 font-medium mb-6">
            {formatDate(form.date)} — horários disponíveis
          </Text>

          {loadingSlots ? (
            <View className="items-center py-12">
              <ActivityIndicator color={primary} />
            </View>
          ) : slots.length === 0 ? (
            <View className="items-center py-12">
              <Ionicons name="time-outline" size={48} color="#d4d4d8" />
              <Text className="text-zinc-400 font-semibold mt-3 text-center">
                Nenhum horário disponível neste dia
              </Text>
              <Pressable
                onPress={() => setStep("DATE")}
                className="mt-4 px-5 py-2.5 rounded-xl"
                style={{ backgroundColor: primary + "18" }}
              >
                <Text className="font-bold" style={{ color: primary }}>Escolher outro dia</Text>
              </Pressable>
            </View>
          ) : (
            <View className="flex-row flex-wrap justify-center gap-3">
              {slots.map((slot) => {
                const time = formatTime(slot.startTime)
                const isSelected = form.time === time
                return (
                  <Pressable
                    key={slot.startTime}
                    onPress={() => handleTimeSelect(slot)}
                    className="py-3 px-4 rounded-2xl border"
                    style={{
                      backgroundColor: isSelected ? primary : "white",
                      borderColor: isSelected ? primary : "#f4f4f5",
                      minWidth: "28%",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      className="font-black text-base"
                      style={{ color: isSelected ? "white" : "#18181b" }}
                    >
                      {time}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── CLIENT INFO ─────────────────────────────────────────────────── */}
      {step === "CLIENT_INFO" && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 20 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text className="text-2xl font-black text-zinc-900 mb-1">Seus dados</Text>
            <Text className="text-zinc-500 font-medium mb-6">
              Para confirmar o agendamento, precisamos de algumas informações.
            </Text>

            {error ? (
              <View className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 mb-4 flex-row items-center gap-2">
                <Ionicons name="alert-circle" size={18} color="#ef4444" />
                <Text className="text-red-600 font-semibold text-sm flex-1">{error}</Text>
              </View>
            ) : null}

            <View className="gap-4">
              <View>
                <Text className="text-zinc-700 font-bold text-sm mb-1.5">Seu nome *</Text>
                <View className="bg-white border border-zinc-200 rounded-2xl px-4 py-3 flex-row items-center gap-3">
                  <Ionicons name="person-outline" size={18} color="#a1a1aa" />
                  <TextInput
                    className="flex-1 text-zinc-900 font-semibold text-base py-0"
                    placeholder="Ex: João Silva"
                    placeholderTextColor="#a1a1aa"
                    value={form.name}
                    onChangeText={(t) => { setForm((p) => ({ ...p, name: t })); setError("") }}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View>
                <Text className="text-zinc-700 font-bold text-sm mb-1.5">Telefone / WhatsApp *</Text>
                <View className="flex-row gap-2">
                  {/* Country selector inline button */}
                  <CountrySelector value={countryCode} onChange={setCountryCode} />
                  <View className="flex-1">
                    <PhoneInput
                      value={form.phone}
                      countryCode={countryCode}
                      onChange={(v) => { setForm((p) => ({ ...p, phone: v })); setError("") }}
                    />
                  </View>
                </View>
              </View>
            </View>

            <Pressable
              onPress={handleClientInfoNext}
              className="h-14 rounded-2xl items-center justify-center mt-8"
              style={{ backgroundColor: primary }}
            >
              <View className="flex-row items-center gap-2">
                <Text className="text-white font-black text-base">Continuar</Text>
                <Ionicons name="arrow-forward" size={18} color="white" />
              </View>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ── CONFIRM ─────────────────────────────────────────────────────── */}
      {step === "CONFIRM" && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 20 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text className="text-2xl font-black text-zinc-900 mb-1">Confirmar agendamento</Text>
            <Text className="text-zinc-500 font-medium mb-6">
              Verifique os detalhes antes de confirmar.
            </Text>

            {/* Summary card */}
            <View className="bg-white rounded-2xl border border-zinc-100 overflow-hidden mb-6">
              <SummaryRow icon="cut-outline" label="Serviço" value={form.serviceName} primary={primary} />
              <SummaryRow icon="person-outline" label="Profissional" value={form.employeeName || "Qualquer profissional"} primary={primary} />
              <SummaryRow icon="calendar-outline" label="Data" value={formatDate(form.date)} primary={primary} />
              <SummaryRow icon="time-outline" label="Horário" value={form.time} primary={primary} last />
            </View>

            {/* Client info */}
            <View className="bg-white rounded-2xl border border-zinc-100 overflow-hidden mb-6">
              <SummaryRow icon="person-circle-outline" label="Nome" value={form.name} primary={primary} />
              <SummaryRow
                icon="call-outline"
                label="Telefone"
                value={`${flags[countryCode]?.dialCode} ${formatPhone(form.phone)}`}
                primary={primary}
                last
              />
            </View>

            {/* Notes */}
            <View className="mb-6">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">
                Observações <Text className="text-zinc-400 font-medium">(opcional)</Text>
              </Text>
              <TextInput
                className="bg-white border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base h-24"
                placeholder="Alguma observação especial?"
                placeholderTextColor="#a1a1aa"
                value={form.description}
                onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
                multiline
                textAlignVertical="top"
              />
            </View>

            {error ? (
              <View className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 mb-4 flex-row items-center gap-2">
                <Ionicons name="alert-circle" size={18} color="#ef4444" />
                <Text className="text-red-600 font-semibold text-sm flex-1">{error}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              className="h-14 rounded-2xl items-center justify-center"
              style={{ backgroundColor: submitting ? primary + "99" : primary }}
            >
              {submitting
                ? <ActivityIndicator color="white" />
                : (
                  <View className="flex-row items-center gap-2">
                    <Text className="text-white font-black text-base">Confirmar Agendamento</Text>
                    <Ionicons name="checkmark" size={18} color="white" />
                  </View>
                )
              }
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ── SUCCESS ─────────────────────────────────────────────────────── */}
      {step === "SUCCESS" && (
        <View className="flex-1 items-center justify-center px-8">
          <View
            className="h-24 w-24 rounded-full items-center justify-center mb-6"
            style={{ backgroundColor: "#22c55e18" }}
          >
            <Ionicons name="checkmark-circle" size={56} color="#22c55e" />
          </View>
          <Text className="text-3xl font-black text-zinc-900 text-center mb-2">
            Agendamento Solicitado!
          </Text>
          <Text className="text-zinc-500 font-medium text-center mb-2">
            Sua solicitação foi enviada para{" "}
            <Text className="font-bold text-zinc-700">{tenant?.name}</Text>.
          </Text>
          <Text className="text-zinc-400 font-medium text-center text-sm mb-8">
            Aguarde a confirmação do estabelecimento.
          </Text>

          {/* Summary chip */}
          <View className="bg-white rounded-2xl border border-zinc-100 px-5 py-4 w-full mb-8 gap-1.5">
            <Text className="text-zinc-900 font-black text-base">{form.serviceName}</Text>
            <Text className="text-zinc-500 font-semibold text-sm">
              {formatDate(form.date)} às {form.time}
            </Text>
            {form.employeeName && form.employeeName !== "Qualquer profissional" && (
              <Text className="text-zinc-400 font-medium text-sm">com {form.employeeName}</Text>
            )}
          </View>

          {tenant?.contactPhone ? (
            <Pressable
              onPress={openWhatsApp}
              className="h-14 rounded-2xl items-center justify-center w-full flex-row gap-2 mb-3"
              style={{ backgroundColor: "#25D366" }}
            >
              <Ionicons name="logo-whatsapp" size={22} color="white" />
              <Text className="text-white font-black text-base">Enviar comprovante via WhatsApp</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => router.replace("/booking")}
            className="h-14 rounded-2xl items-center justify-center w-full"
            style={{ backgroundColor: primary }}
          >
            <Text className="text-white font-black text-base">Novo Agendamento</Text>
          </Pressable>

          <Pressable
            onPress={() => router.replace("/(auth)/welcome")}
            className="mt-4 py-3"
          >
            <Text className="text-zinc-400 font-semibold text-sm">Voltar ao início</Text>
          </Pressable>
        </View>
      )}

      {/* ── Country Modal ───────────────────────────────────────────────── */}
      <Modal
        visible={countryModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCountryModalOpen(false)}
      >
        <View className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-5 pt-6 pb-3 border-b border-zinc-100">
            <Text className="text-lg font-black text-zinc-900">Selecionar País</Text>
            <Pressable
              onPress={() => { setCountryModalOpen(false); setCountrySearch("") }}
              className="h-9 w-9 bg-zinc-100 rounded-xl items-center justify-center"
            >
              <Ionicons name="close" size={20} color="#71717a" />
            </Pressable>
          </View>
          <View className="px-5 py-3 border-b border-zinc-100">
            <View className="bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-2 flex-row items-center gap-2">
              <Ionicons name="search" size={16} color="#a1a1aa" />
              <TextInput
                className="flex-1 text-zinc-900 font-medium text-sm py-1"
                placeholder="Buscar país..."
                placeholderTextColor="#a1a1aa"
                value={countrySearch}
                onChangeText={setCountrySearch}
                autoFocus
              />
            </View>
          </View>
          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.code}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = item.code === countryCode
              return (
                <Pressable
                  onPress={() => {
                    setCountryCode(item.code)
                    setCountryModalOpen(false)
                    setCountrySearch("")
                  }}
                  className="flex-row items-center gap-3 px-5 py-3.5 border-b border-zinc-50 active:bg-zinc-50"
                  style={isSelected ? { backgroundColor: primary + "15" } : undefined}
                >
                  <Image
                    source={{ uri: item.flagUrl }}
                    style={{ width: 28, height: 19, borderRadius: 3 }}
                    resizeMode="cover"
                  />
                  <Text className="flex-1 text-zinc-900 font-semibold text-base">{item.name}</Text>
                  <Text className="text-zinc-400 font-medium text-sm">{item.dialCode}</Text>
                  {isSelected && <Ionicons name="checkmark" size={18} color={primary} />}
                </Pressable>
              )
            }}
          />
        </View>
      </Modal>

      {/* ── Month Calendar Modal ───────────────────────────────────────── */}
      <Modal
        visible={calendarOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCalendarOpen(false)}
      >
        <View className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-5 pt-6 pb-3 border-b border-zinc-100">
            <Text className="text-lg font-black text-zinc-900">Selecionar Data</Text>
            <Pressable
              onPress={() => setCalendarOpen(false)}
              className="h-9 w-9 bg-zinc-100 rounded-xl items-center justify-center"
            >
              <Ionicons name="close" size={20} color="#71717a" />
            </Pressable>
          </View>

          <View className="px-5 py-6">
            <View className="flex-row items-center justify-between mb-8">
              <Pressable
                onPress={() => {
                  if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
                  else setViewMonth(m => m - 1)
                }}
                className="h-10 w-10 bg-zinc-50 rounded-2xl items-center justify-center border border-zinc-100"
              >
                <Ionicons name="chevron-back" size={20} color="#18181b" />
              </Pressable>
              <Text className="text-lg font-black text-zinc-900">
                {MONTHS_FULL[viewMonth]} {viewYear}
              </Text>
              <Pressable
                onPress={() => {
                  if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
                  else setViewMonth(m => m + 1)
                }}
                className="h-10 w-10 bg-zinc-50 rounded-2xl items-center justify-center border border-zinc-100"
              >
                <Ionicons name="chevron-forward" size={20} color="#18181b" />
              </Pressable>
            </View>

            <View className="flex-row mb-4">
              {WEEKDAYS.map((d) => (
                <View key={d} className="flex-1 items-center">
                  <Text className="text-xs font-bold text-zinc-400">{d}</Text>
                </View>
              ))}
            </View>

            {Array.from({ length: Math.ceil(buildCalendarDays(viewYear, viewMonth).length / 7) }, (_, row) => (
              <View key={row} className="flex-row mb-2">
                {buildCalendarDays(viewYear, viewMonth).slice(row * 7, row * 7 + 7).map((day, col) => {
                  const dObj = day ? new Date(viewYear, viewMonth, day) : null
                  const iso = dObj ? toISODate(dObj) : null
                  const isSelected = iso === form.date
                  const isPast = dObj ? dObj < new Date(new Date().setHours(0, 0, 0, 0)) : false

                  return (
                    <View key={col} className="flex-1 items-center">
                      {day ? (
                        <Pressable
                          onPress={() => {
                            if (isPast) return
                            handleDateSelect(iso!)
                            setCalendarOpen(false)
                          }}
                          className="h-11 w-11 rounded-2xl items-center justify-center"
                          style={[
                            isSelected ? { backgroundColor: primary } : {},
                            isPast ? { opacity: 0.2 } : {}
                          ]}
                        >
                          <Text
                            className="text-sm font-bold"
                            style={{ color: isSelected ? "white" : "#18181b" }}
                          >
                            {day}
                          </Text>
                        </Pressable>
                      ) : (
                        <View className="h-11 w-11" />
                      )}
                    </View>
                  )
                })}
              </View>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

// ─── Summary Row ──────────────────────────────────────────────────────────────

function SummaryRow({
  icon, label, value, primary, last = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"]
  label: string
  value: string
  primary: string
  last?: boolean
}) {
  return (
    <View
      className={`flex-row items-center gap-3 px-4 py-3.5 ${!last ? "border-b border-zinc-50" : ""}`}
    >
      <View
        className="h-8 w-8 rounded-xl items-center justify-center"
        style={{ backgroundColor: primary + "18" }}
      >
        <Ionicons name={icon} size={16} color={primary} />
      </View>
      <View className="flex-1">
        <Text className="text-zinc-400 font-medium text-xs">{label}</Text>
        <Text className="text-zinc-900 font-bold text-sm">{value}</Text>
      </View>
    </View>
  )
}

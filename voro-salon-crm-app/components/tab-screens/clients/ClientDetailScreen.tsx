import React, { useState } from "react"
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  RefreshControl, Modal, TextInput, Alert, TouchableOpacity,
} from "react-native"
import { ConfirmModal } from "components/ConfirmModal"
import { SafeAreaView } from "react-native-safe-area-context"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import useSWR from "swr"
import { useClientDetails } from "hooks/use-client-details.hook"
import { usePlanLimits } from "hooks/use-plan-limits.hook"
import { ScreenHeader } from "components/ScreenHeader"
import { PhoneInput } from "components/PhoneInput"
import { CountrySelector } from "components/CountrySelector"
import { CurrencyInput } from "components/CurrencyInput"
import { DatePickerInput } from "components/DatePickerInput"
import { flags, getCountryFromPhone } from "lib/flag-utils"
import { formatPhone } from "lib/mask-utils"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { fetcher } from "lib/fetcher"
import { API_CONFIG, secureApiCall } from "lib/api"

// ── Anamnesis types ──────────────────────────────────────────────────────────
enum AnamnesisFieldType { ShortText = 1, LongText = 2, Number = 3, SingleSelection = 4, MultipleSelection = 5, Boolean = 6 }
enum AnamnesisSection { ClientData = 1, MainComplaint = 2, HairHistory = 3, HairRoutine = 4, GeneralHealth = 5, MedicationUse = 6, Lifestyle = 7, FamilyHistory = 8, ScalpEvaluation = 9, CapillaryDiagnosis = 10, TreatmentProtocol = 11 }
const SECTION_LABELS: Record<number, string> = {
  1: "Dados do Cliente", 2: "Queixa Principal", 3: "Histórico Capilar",
  4: "Rotina Capilar", 5: "Saúde Geral", 6: "Uso de Medicamentos",
  7: "Estilo de Vida", 8: "Histórico Familiar", 9: "Avaliação do Couro Cabeludo",
  10: "Diagnóstico Capilar", 11: "Protocolo de Tratamento",
}
interface AnamnesisQuestion { id: string; label: string; placeholder?: string; fieldType: AnamnesisFieldType; options?: string; section: AnamnesisSection; order: number; isRequired: boolean }

function parseOptions(opts?: string): string[] {
  if (!opts) return []
  try { const p = JSON.parse(opts); return Array.isArray(p) ? p : [opts] } catch { return opts.split(",").map(s => s.trim()).filter(Boolean) }
}

function formatCurrency(val: number) {
  return `R$ ${val.toFixed(2).replace(".", ",")}`
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}

function isRecent(dateStr?: string) {
  if (!dateStr) return false
  return Date.now() - new Date(dateStr).getTime() < 7 * 24 * 60 * 60 * 1000
}

type TabType = "services" | "anamnesis" | "memberships"

export function ClientDetailScreen({ id, rootPath = "/(tabs)" }: { id: string; rootPath?: string }) {
  const router = useRouter()
  const {
    client, services, anamnesisHistory, anamnesisError, catalogServices,
    isLoading, isClientLoading, isAnamnesisLoading, isSaving,
    isDeleting, isAddingAnamnesis, isAddingService,
    updateClient, deleteClient, addAnamnesis, addService, deleteService,
  } = useClientDetails(id, () => router.replace(`${rootPath}/clients` as any))
  const { primaryColor } = useTenantTheme()
  const { hasAnamnesis } = usePlanLimits()

  const [tab, setTab] = useState<TabType>("services")

  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", notes: "", birthDate: "" })
  const [editCountryCode, setEditCountryCode] = useState("BR")

  // Anamnesis modal
  const [anamnesisOpen, setAnamnesisOpen] = useState(false)
  const [anamnesisResponses, setAnamnesisResponses] = useState<Record<string, string>>({})
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({ [AnamnesisSection.ClientData]: true })
  const { data: anamnesisQuestions, isLoading: isQuestionsLoading } = useSWR<AnamnesisQuestion[]>(
    anamnesisOpen ? `${API_CONFIG.ENDPOINTS.ANAMNESIS}/questions` : null,
    fetcher
  )

  // Membership state
  const [membershipOpen, setMembershipOpen] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState<string>("")
  const [isCreatingMembership, setIsCreatingMembership] = useState(false)
  const [cancellingMembershipId, setCancellingMembershipId] = useState<string | null>(null)

  // Confirm modals
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [confirmCancelMembershipId, setConfirmCancelMembershipId] = useState<string | null>(null)
  const [confirmDeleteServiceId, setConfirmDeleteServiceId] = useState<string | null>(null)

  const { data: memberships, mutate: mutateMemberships } = useSWR<any[]>(
    id ? `${API_CONFIG.ENDPOINTS.CLIENT_MEMBERSHIPS}/client/${id}` : null,
    fetcher
  )
  const { data: membershipPlans } = useSWR<any[]>(
    membershipOpen ? API_CONFIG.ENDPOINTS.CLIENT_MEMBERSHIP_PLANS : null,
    fetcher
  )

  async function handleCreateMembership() {
    if (!selectedPlanId || !id) return
    setIsCreatingMembership(true)
    try {
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.CLIENT_MEMBERSHIPS}`, {
        method: "POST",
        body: JSON.stringify({ clientId: id, planId: selectedPlanId, startDate: new Date().toISOString() }),
      })
      if (!res.hasError) {
        await mutateMemberships()
        setMembershipOpen(false)
        setSelectedPlanId("")
      }
    } finally {
      setIsCreatingMembership(false)
    }
  }

  function handleCancelMembership(membershipId: string) {
    setConfirmCancelMembershipId(membershipId)
  }

  async function executeCancelMembership() {
    if (!confirmCancelMembershipId) return
    const membershipId = confirmCancelMembershipId
    setConfirmCancelMembershipId(null)
    setCancellingMembershipId(membershipId)
    try {
      await secureApiCall(`${API_CONFIG.ENDPOINTS.CLIENT_MEMBERSHIPS}/${membershipId}/cancel`, {
        method: "PATCH",
      })
      await mutateMemberships()
    } finally {
      setCancellingMembershipId(null)
    }
  }

  function toggleSection(section: number) {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  function handleAnamnesisResponse(questionId: string, value: string) {
    setAnamnesisResponses(prev => ({ ...prev, [questionId]: value }))
  }

  async function handleAnamnesisSubmit() {
    const responses = Object.entries(anamnesisResponses).map(([questionId, value]) => ({ questionId, value }))
    if (responses.length === 0) {
      Alert.alert("Atenção", "Preencha pelo menos uma resposta antes de salvar.")
      return
    }
    const success = await addAnamnesis({ date: new Date().toISOString(), responses, signatures: [], evidences: [] })
    if (success) {
      setAnamnesisOpen(false)
      setAnamnesisResponses({})
      setExpandedSections({ [AnamnesisSection.ClientData]: true })
    }
  }

  const [svcOpen, setSvcOpen] = useState(false)
  const [svcForm, setSvcForm] = useState({
    serviceId: "" as string,
    description: "",
    amount: 0,
    serviceDate: new Date().toISOString().split("T")[0],
    notes: "",
  })

  function openEdit() {
    if (!client) return
    const c = client as any
    const { countryCode, phoneNumber } = getCountryFromPhone(c.phone ?? "")
    setEditCountryCode(countryCode)
    setEditForm({
      name: c.name ?? "",
      email: c.email ?? "",
      phone: phoneNumber,
      notes: c.notes ?? "",
      birthDate: c.birthDate ? c.birthDate.slice(0, 10) : "",
    })
    setEditOpen(true)
  }

  async function handleEditSubmit() {
    if (!editForm.name.trim()) return
    const { dialCodeOnlyNumber } = flags[editCountryCode] ?? { dialCodeOnlyNumber: "55" }
    const success = await updateClient({
      name: editForm.name,
      email: editForm.email,
      phone: `${dialCodeOnlyNumber}${editForm.phone}`,
      notes: editForm.notes,
      birthDate: editForm.birthDate || null,
    })
    if (success) setEditOpen(false)
  }

  function handleDelete() {
    setConfirmDeleteOpen(true)
  }

  async function handleAddService() {
    if (!svcForm.description.trim()) return
    const success = await addService({
      serviceId: svcForm.serviceId || null,
      description: svcForm.description,
      amount: svcForm.amount,
      serviceDate: svcForm.serviceDate,
      notes: svcForm.notes,
    })
    if (success) {
      setSvcOpen(false)
      setSvcForm({ serviceId: "", description: "", amount: 0, serviceDate: new Date().toISOString().split("T")[0], notes: "" })
    }
  }

  function handleDeleteService(serviceId: string) {
    setConfirmDeleteServiceId(serviceId)
  }

  if (isClientLoading) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-50" edges={[]}>
        <ScreenHeader title="Cliente" showBack onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={primaryColor} size="large" />
        </View>
      </SafeAreaView>
    )
  }

  if (!client) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-50" edges={[]}>
        <ScreenHeader title="Cliente" showBack onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="person-outline" size={48} color="#d4d4d8" />
          <Text className="text-zinc-400 font-semibold mt-3">Cliente não encontrado</Text>
        </View>
      </SafeAreaView>
    )
  }

  const c = client as any
  const fullName = `${c.name ?? ""} ${c.lastName ?? ""}`.trim()
  const initials = `${c.name?.[0] ?? ""}${c.lastName?.[0] ?? ""}`.toUpperCase()
  const totalSpent = (services ?? []).reduce((sum: number, s: any) => sum + (s.amount ?? 0), 0)

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={[]}>
      <ScreenHeader title={fullName} showBack onBack={() => router.back()} />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => {}} tintColor={primaryColor} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* Profile Card */}
        <View className="bg-white rounded-3xl p-4 border border-zinc-100 mb-4">
          <View className="flex-row items-start gap-4">
            <View className="w-16 mb-3 items-center justify-center rounded-2xl py-4 px-4 shrink-0" style={{ backgroundColor: primaryColor + "25" }}>
              <Text className="font-black text-xl" style={{ color: primaryColor }}>{initials}</Text>
            </View>
            <View className="flex-1 p-4 min-w-0">
              <Text className="text-lg font-black text-zinc-900" numberOfLines={1}>{fullName}</Text>
              <View className="mt-1 gap-1">
                {c.phone ? (
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="call-outline" size={13} color="#71717a" />
                    <Text className="text-zinc-500 text-sm">{formatPhone(c.phone)}</Text>
                  </View>
                ) : null}
                {c.email ? (
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="mail-outline" size={13} color="#71717a" />
                    <Text className="text-zinc-500 text-sm" numberOfLines={1}>{c.email}</Text>
                  </View>
                ) : null}
                {c.birthDate ? (
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="gift-outline" size={13} color="#71717a" />
                    <Text className="text-zinc-500 text-sm">{formatDate(c.birthDate)}</Text>
                  </View>
                ) : null}
              </View>
              {c.notes ? (
                <Text className="text-zinc-400 text-xs mt-2" numberOfLines={2}>{c.notes}</Text>
              ) : null}
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-2 mt-4">
            <Pressable
              onPress={openEdit}
              className="flex-1 flex-row items-center justify-center gap-2 h-10 bg-zinc-50 border border-zinc-200 rounded-xl"
            >
              <Ionicons name="pencil-outline" size={15} color="#18181b" />
              <Text className="text-zinc-800 font-bold text-sm">Editar</Text>
            </Pressable>
            <Pressable
              onPress={handleDelete}
              disabled={isDeleting}
              className="flex-1 flex-row items-center justify-center gap-2 h-10 bg-red-50 border border-red-100 rounded-xl"
            >
              {isDeleting
                ? <ActivityIndicator size="small" color="#ef4444" />
                : <>
                    <Ionicons name="trash-outline" size={15} color="#ef4444" />
                    <Text className="text-red-600 font-bold text-sm">Excluir</Text>
                  </>
              }
            </Pressable>
          </View>

          {/* Stats */}
          <View className="flex-row mt-4 pt-4 border-t border-zinc-100">
            <View className="flex-1 items-center">
              <Text className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Serviços</Text>
              <Text className="text-lg font-black text-zinc-900 mt-0.5">{(services ?? []).length}</Text>
            </View>
            <View className="w-px bg-zinc-100" />
            <View className="flex-1 items-center">
              <Text className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Total Gasto</Text>
              <Text className="text-lg font-black text-zinc-900 mt-0.5">{formatCurrency(totalSpent)}</Text>
            </View>
            <View className="w-px bg-zinc-100" />
            <View className="flex-1 items-center">
              <Text className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider text-center">Cliente desde</Text>
              <Text className="text-sm font-black text-zinc-900 mt-0.5 text-center">{formatDate(c.createdAt)}</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: "row", backgroundColor: "#f4f4f5", borderRadius: 16, padding: 4, marginBottom: 16 }}>
          {(["services", "memberships", ...(hasAnamnesis ? ["anamnesis"] : [])] as TabType[]).map((t) => {
            const icon = t === "services" ? "calendar-outline" : t === "memberships" ? "card-outline" : "clipboard-outline"
            const label = t === "services" ? "Serviços" : t === "memberships" ? "Planos" : "Anamnese"
            return (
              <TouchableOpacity
                key={t}
                activeOpacity={0.7}
                onPress={() => setTab(t)}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: tab === t ? "#ffffff" : "transparent",
                  shadowColor: tab === t ? "#000" : "transparent",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: tab === t ? 0.06 : 0,
                  shadowRadius: 2,
                  elevation: tab === t ? 1 : 0,
                }}
              >
                <Ionicons
                  name={icon}
                  size={15}
                  color={tab === t ? primaryColor : "#71717a"}
                />
                <Text style={{ fontSize: 14, fontWeight: "700", color: tab === t ? primaryColor : "#71717a" }}>
                  {label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Services Tab */}
        <View style={{ display: tab === "services" ? "flex" : "none" }}>
          <View className="bg-white rounded-3xl border border-zinc-100">
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-zinc-100">
              <View>
                <Text className="text-base font-black text-zinc-900">Histórico de Serviços</Text>
                <Text className="text-xs text-zinc-400 mt-0.5">Serviços realizados para este cliente</Text>
              </View>
              <Pressable
                onPress={() => setSvcOpen(true)}
                className="flex-row items-center gap-1 px-3 h-9 rounded-xl"
                style={{ backgroundColor: primaryColor }}
              >
                <Ionicons name="add" size={16} color="white" />
                <Text className="text-white font-bold text-sm">Registrar</Text>
              </Pressable>
            </View>

            {isLoading ? (
              <View className="py-10 items-center"><ActivityIndicator color={primaryColor} /></View>
            ) : (services ?? []).length === 0 ? (
              <View className="py-12 items-center px-6">
                <Ionicons name="time-outline" size={40} color="#d4d4d8" />
                <Text className="text-zinc-400 font-semibold mt-3 text-center">Nenhum serviço registrado ainda</Text>
              </View>
            ) : (
              <View className="px-4 py-3 gap-2">
                {(services as any[]).map((svc) => (
                  <View
                    key={svc.id}
                    className="flex-row items-start gap-3 rounded-2xl border p-4 border-zinc-100"
                    style={isRecent(svc.serviceDate) ? { borderColor: primaryColor + "25", backgroundColor: primaryColor + "08" } : undefined}
                  >
                    <View className="h-10 w-10 bg-zinc-100 rounded-xl items-center justify-center shrink-0">
                      <Ionicons name="calendar-outline" size={18} color="#71717a" />
                    </View>
                    <View className="flex-1 min-w-0">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-zinc-900 font-bold flex-1" numberOfLines={1}>
                          {svc.description ?? svc.serviceName ?? "Serviço"}
                        </Text>
                        {isRecent(svc.serviceDate) && (
                          <View className="bg-white rounded-2xl px-2 py-0.5 p-4" style={{ borderWidth: 1, borderColor: primaryColor + "40" }}>
                            <Text className="text-[10px] font-bold" style={{ color: primaryColor }}>Recente</Text>
                          </View>
                        )}
                      </View>
                      <View className="flex-row items-center gap-3 mt-0.5">
                        <Text className="text-zinc-400 text-xs">{formatDate(svc.serviceDate)}</Text>
                        {svc.amount > 0 && (
                          <View className="flex-row items-center gap-1">
                            <Ionicons name="cash-outline" size={11} color="#a1a1aa" />
                            <Text className="text-zinc-500 text-xs">{formatCurrency(svc.amount)}</Text>
                          </View>
                        )}
                      </View>
                      {svc.notes ? <Text className="text-zinc-400 text-xs mt-1">{svc.notes}</Text> : null}
                    </View>
                    <Pressable onPress={() => handleDeleteService(svc.id)} className="p-1.5">
                      <Ionicons name="trash-outline" size={16} color="#d4d4d8" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Memberships Tab */}
        <View style={{ display: tab === "memberships" ? "flex" : "none" }}>
          <View className="bg-white rounded-3xl border border-zinc-100">
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-zinc-100">
              <View>
                <Text className="text-base font-black text-zinc-900">Planos de Fidelidade</Text>
                <Text className="text-xs text-zinc-400 mt-0.5">Assinaturas ativas deste cliente</Text>
              </View>
              <Pressable
                onPress={() => setMembershipOpen(true)}
                className="flex-row items-center gap-1 px-3 h-9 rounded-xl"
                style={{ backgroundColor: primaryColor }}
              >
                <Ionicons name="add" size={16} color="white" />
                <Text className="text-white font-bold text-sm">Assinar</Text>
              </Pressable>
            </View>

            {/* Lista de memberships */}
            <View className="p-4 gap-3">
              {!memberships || memberships.length === 0 ? (
                <View className="items-center py-8 gap-2">
                  <Ionicons name="card-outline" size={36} color="#d4d4d8" />
                  <Text className="text-zinc-400 font-semibold text-center">Nenhum plano ativo</Text>
                  <Text className="text-zinc-300 text-xs text-center">Adicione um plano de fidelidade para este cliente</Text>
                </View>
              ) : (
                memberships.map((m: any) => {
                  const statusColor = m.status === 0 ? "#22c55e" : m.status === 1 ? "#f59e0b" : "#ef4444"
                  const statusLabel = m.status === 0 ? "Ativo" : m.status === 1 ? "Expirado" : "Cancelado"
                  const endDate = m.endDate ? new Date(m.endDate).toLocaleDateString("pt-BR") : "—"
                  return (
                    <View key={m.id} className="border border-zinc-100 rounded-2xl p-4 gap-3">
                      {/* Plan name + status badge */}
                      <View className="flex-row items-center justify-between">
                        <Text className="font-black text-zinc-900 text-base flex-1 mr-2" numberOfLines={1}>
                          {m.plan?.name ?? "Plano"}
                        </Text>
                        <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: statusColor + "20" }}>
                          <Text className="text-xs font-bold" style={{ color: statusColor }}>{statusLabel}</Text>
                        </View>
                      </View>

                      {/* Sessions + validity */}
                      <View className="flex-row gap-4">
                        <View className="flex-1 bg-zinc-50 rounded-xl p-3">
                          <Text className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Sessões</Text>
                          <Text className="text-xl font-black text-zinc-900 mt-0.5">
                            {m.remainingSessions != null ? m.remainingSessions : "∞"}
                          </Text>
                          <Text className="text-[10px] text-zinc-400">restantes</Text>
                        </View>
                        <View className="flex-1 bg-zinc-50 rounded-xl p-3">
                          <Text className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Validade</Text>
                          <Text className="text-sm font-bold text-zinc-900 mt-0.5">{endDate}</Text>
                          <Text className="text-[10px] text-zinc-400">vencimento</Text>
                        </View>
                      </View>

                      {/* Price */}
                      {m.plan?.price != null && (
                        <Text className="text-xs text-zinc-400 font-medium">
                          {`R$ ${Number(m.plan.price).toFixed(2).replace(".", ",")}/plano`}
                        </Text>
                      )}

                      {/* Cancel action — only for active memberships (status === 0) */}
                      {m.status === 0 && (
                        <Pressable
                          onPress={() => handleCancelMembership(m.id)}
                          disabled={cancellingMembershipId === m.id}
                          className="flex-row items-center justify-center gap-1.5 h-9 rounded-xl border border-red-100 bg-red-50"
                        >
                          {cancellingMembershipId === m.id
                            ? <ActivityIndicator size="small" color="#ef4444" />
                            : <>
                                <Ionicons name="close-circle-outline" size={15} color="#ef4444" />
                                <Text className="text-red-600 font-bold text-sm">Cancelar Plano</Text>
                              </>
                          }
                        </Pressable>
                      )}
                    </View>
                  )
                })
              )}
            </View>
          </View>
        </View>

        {/* Anamnesis Tab */}
        {hasAnamnesis && (
          <View style={{ display: tab === "anamnesis" ? "flex" : "none" }}>
            <View className="bg-white rounded-3xl border border-zinc-100">
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-zinc-100">
              <View>
                <Text className="text-base font-black text-zinc-900">Histórico de Anamnese</Text>
                <Text className="text-xs text-zinc-400 mt-0.5">Avaliações capilares registradas</Text>
              </View>
              <Pressable
                onPress={() => setAnamnesisOpen(true)}
                className="flex-row items-center gap-1 px-3 h-9 rounded-xl"
                style={{ backgroundColor: primaryColor }}
              >
                <Ionicons name="add" size={16} color="white" />
                <Text className="text-white font-bold text-sm">Nova Avaliação</Text>
              </Pressable>
            </View>

            {isAnamnesisLoading ? (
              <View className="py-10 items-center">
                <ActivityIndicator color={primaryColor} />
              </View>
            ) : anamnesisError ? (
              <View className="py-12 items-center px-6">
                <Ionicons name="cloud-offline-outline" size={40} color="#d4d4d8" />
                <Text className="text-zinc-400 font-semibold mt-3 text-center">Não foi possível carregar as fichas</Text>
                <Text className="text-zinc-400 text-xs mt-1 text-center">{anamnesisError?.message}</Text>
              </View>
            ) : anamnesisHistory.length === 0 ? (
              <View className="py-12 items-center px-6">
                <Ionicons name="clipboard-outline" size={40} color="#d4d4d8" />
                <Text className="text-zinc-400 font-semibold mt-3 text-center">Nenhuma ficha de anamnese registrada</Text>
              </View>
            ) : (
              <View className="px-4 py-3 gap-2">
                {anamnesisHistory.map((sheet: any) => (
                  <View key={sheet.id} className="flex-row items-center gap-3 p-4 rounded-2xl border border-zinc-100">
                    <View className="h-12 w-12 rounded-2xl items-center justify-center" style={{ backgroundColor: primaryColor + "15" }}>
                      <Ionicons name="time-outline" size={22} color={primaryColor} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-zinc-900 font-bold">{formatDate(sheet.date)}</Text>
                      <View className="flex-row items-center gap-1 mt-0.5">
                        <View className="h-2 w-2 rounded-2xl bg-green-500" />
                        <Text className="text-zinc-400 text-xs">{sheet.responses?.length ?? 0} respostas registradas</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditOpen(false)}>
        <View className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-5 pt-6 pb-4 border-b border-zinc-100">
            <Text className="text-lg font-black text-zinc-900">Editar Cliente</Text>
            <Pressable onPress={() => setEditOpen(false)} className="h-9 w-9 bg-zinc-100 rounded-xl items-center justify-center">
              <Ionicons name="close" size={20} color="#71717a" />
            </Pressable>
          </View>
          <KeyboardAwareScrollView className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Nome *</Text>
              <TextInput
                className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base"
                placeholder="Nome"
                placeholderTextColor="#a1a1aa"
                value={editForm.name}
                onChangeText={(v) => setEditForm((p) => ({ ...p, name: v }))}
              />
            </View>

            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Telefone</Text>
              <View className="flex-row gap-2">
                <CountrySelector value={editCountryCode} onChange={setEditCountryCode} />
                <View className="flex-1">
                  <PhoneInput
                    value={editForm.phone}
                    countryCode={editCountryCode}
                    onChange={(v) => setEditForm((p) => ({ ...p, phone: v }))}
                  />
                </View>
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">E-mail</Text>
              <TextInput
                className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base"
                placeholder="email@exemplo.com"
                placeholderTextColor="#a1a1aa"
                value={editForm.email}
                onChangeText={(v) => setEditForm((p) => ({ ...p, email: v }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Data de Nascimento</Text>
              <DatePickerInput
                value={editForm.birthDate}
                onChange={(v) => setEditForm((p) => ({ ...p, birthDate: v ?? "" }))}
                placeholder="Selecionar data"
              />
            </View>

            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Observações</Text>
              <TextInput
                className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base h-24"
                placeholder="Anotações sobre o cliente..."
                placeholderTextColor="#a1a1aa"
                value={editForm.notes}
                onChangeText={(v) => setEditForm((p) => ({ ...p, notes: v }))}
                multiline
                textAlignVertical="top"
              />
            </View>
          </KeyboardAwareScrollView>
          <View className="px-5 pb-8 pt-3 border-t border-zinc-100">
            <Pressable
              onPress={handleEditSubmit}
              disabled={isSaving}
              className="h-14 rounded-2xl items-center justify-center"
              style={{ backgroundColor: isSaving ? primaryColor + "99" : primaryColor }}
            >
              {isSaving
                ? <ActivityIndicator color="white" />
                : <Text className="text-white font-black text-base">Salvar Alterações</Text>
              }
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Add Service Modal */}
      <Modal visible={svcOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSvcOpen(false)}>
        <View className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-5 p-4 pt-6 pb-4 border-b border-zinc-100">
            <Text className="text-lg font-black text-zinc-900">Registrar Serviço</Text>
            <Pressable onPress={() => setSvcOpen(false)} className="h-9 w-9 bg-zinc-100 rounded-xl items-center justify-center">
              <Ionicons name="close" size={20} color="#71717a" />
            </Pressable>
          </View>
          <KeyboardAwareScrollView className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Catalog picker */}
            {catalogServices && (catalogServices as any[]).length > 0 && (
              <View className="gap-3 mb-4">
                <Text className="text-zinc-700 font-bold text-sm mb-1.5">Serviço Predefinido</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
                  <View className="flex-row gap-3 px-1">
                    {[{ id: "", name: "Personalizado" }, ...(catalogServices as any[])].map((s) => (
                      <Pressable
                        key={s.id}
                        onPress={() => {
                          if (s.id) {
                            setSvcForm((p) => ({ ...p, serviceId: s.id, description: s.name, amount: s.price ?? 0 }))
                          } else {
                            setSvcForm((p) => ({ ...p, serviceId: "", description: "", amount: 0 }))
                          }
                        }}
                        className="px-3 py-2 rounded-xl border"
                        style={svcForm.serviceId === s.id
                          ? { backgroundColor: primaryColor, borderColor: primaryColor }
                          : { backgroundColor: "#fafafa", borderColor: "#e4e4e7" }}
                      >
                        <Text className={`text-sm font-bold ${svcForm.serviceId === s.id ? "text-white" : "text-zinc-700"}`}>
                          {s.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Descrição *</Text>
              <TextInput
                className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base"
                placeholder="Ex: Corte + Escova"
                placeholderTextColor="#a1a1aa"
                value={svcForm.description}
                onChangeText={(v) => setSvcForm((p) => ({ ...p, description: v }))}
              />
            </View>

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-zinc-700 font-bold text-sm mb-1.5">Valor</Text>
                <CurrencyInput
                  value={svcForm.amount}
                  onChange={(v) => setSvcForm((p) => ({ ...p, amount: v }))}
                />
              </View>
              <View className="flex-1">
                <Text className="text-zinc-700 font-bold text-sm mb-1.5">Data</Text>
                <DatePickerInput
                  value={svcForm.serviceDate}
                  onChange={(v) => setSvcForm((p) => ({ ...p, serviceDate: v }))}
                />
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Observações</Text>
              <TextInput
                className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base h-20"
                placeholder="Anotações sobre o serviço..."
                placeholderTextColor="#a1a1aa"
                value={svcForm.notes}
                onChangeText={(v) => setSvcForm((p) => ({ ...p, notes: v }))}
                multiline
                textAlignVertical="top"
              />
            </View>
          </KeyboardAwareScrollView>
          <View className="px-5 pb-8 pt-3 border-t border-zinc-100">
            <Pressable
              onPress={handleAddService}
              disabled={isAddingService || !svcForm.description.trim()}
              className="h-14 rounded-2xl items-center justify-center"
              style={{ backgroundColor: (isAddingService || !svcForm.description.trim()) ? primaryColor + "99" : primaryColor }}
            >
              {isAddingService
                ? <ActivityIndicator color="white" />
                : <Text className="text-white font-black text-base">Salvar Serviço</Text>
              }
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Anamnesis Modal */}
      {hasAnamnesis && (
        <Modal visible={anamnesisOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAnamnesisOpen(false)}>
          <View className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-5 pt-6 pb-4 border-b border-zinc-100">
            <View>
              <Text className="text-lg font-black text-zinc-900">Nova Ficha de Anamnese</Text>
              <Text className="text-xs text-zinc-400 mt-0.5">Avaliação capilar do cliente</Text>
            </View>
            <Pressable onPress={() => setAnamnesisOpen(false)} className="h-9 w-9 bg-zinc-100 rounded-xl items-center justify-center">
              <Ionicons name="close" size={20} color="#71717a" />
            </Pressable>
          </View>

          <KeyboardAwareScrollView className="flex-1 px-5 m-2" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {isQuestionsLoading ? (
              <View className="py-12 items-center">
                <ActivityIndicator color={primaryColor} />
                <Text className="text-zinc-400 text-sm mt-3">Carregando perguntas...</Text>
              </View>
            ) : !anamnesisQuestions || anamnesisQuestions.length === 0 ? (
              <View className="py-12 items-center px-4 border border-dashed border-zinc-200 rounded-2xl">
                <Ionicons name="clipboard-outline" size={40} color="#d4d4d8" />
                <Text className="text-zinc-400 font-semibold mt-3 text-center">Nenhuma pergunta configurada.</Text>
              </View>
            ) : (
              (() => {
                const sections = Array.from(new Set(anamnesisQuestions.map(q => q.section))).sort((a, b) => a - b)
                return (
                  <View className="gap-3">
                    {sections.map(section => {
                      const sectionQs = anamnesisQuestions.filter(q => q.section === section).sort((a, b) => a.order - b.order)
                      const isExpanded = !!expandedSections[section]
                      return (
                        <View key={section} className="bg-zinc-50 rounded-2xl overflow-hidden">
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => toggleSection(section)}
                            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: "700", color: "#71717a", textTransform: "uppercase", letterSpacing: 1 }}>
                              {SECTION_LABELS[section]}
                            </Text>
                            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color="#a1a1aa" />
                          </TouchableOpacity>

                          {isExpanded && (
                            <View className="px-3 pb-4 gap-4">
                              {sectionQs.map(question => {
                                const value = anamnesisResponses[question.id] ?? ""
                                const options = parseOptions(question.options)
                                return (
                                  <View key={question.id} className="gap-1.5">
                                    <Text className="text-zinc-700 font-bold text-sm">
                                      {question.label}{question.isRequired ? " *" : ""}
                                    </Text>
                                    {question.fieldType === AnamnesisFieldType.ShortText && (
                                      <TextInput
                                        className="bg-white border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 font-semibold text-sm"
                                        placeholder={question.placeholder ?? "Sua resposta..."}
                                        placeholderTextColor="#a1a1aa"
                                        value={value}
                                        onChangeText={v => handleAnamnesisResponse(question.id, v)}
                                      />
                                    )}
                                    {question.fieldType === AnamnesisFieldType.LongText && (
                                      <TextInput
                                        className="bg-white border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 font-semibold text-sm h-20"
                                        placeholder={question.placeholder ?? "Detalhes..."}
                                        placeholderTextColor="#a1a1aa"
                                        value={value}
                                        onChangeText={v => handleAnamnesisResponse(question.id, v)}
                                        multiline
                                        textAlignVertical="top"
                                      />
                                    )}
                                    {question.fieldType === AnamnesisFieldType.Number && (
                                      <TextInput
                                        className="bg-white border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 font-semibold text-sm"
                                        placeholder="0"
                                        placeholderTextColor="#a1a1aa"
                                        value={value}
                                        onChangeText={v => handleAnamnesisResponse(question.id, v)}
                                        keyboardType="numeric"
                                      />
                                    )}
                                    {question.fieldType === AnamnesisFieldType.Boolean && (
                                      <View style={{ flexDirection: "row", gap: 8 }}>
                                        {["true", "false"].map(opt => (
                                          <TouchableOpacity
                                            key={opt}
                                            activeOpacity={0.7}
                                            onPress={() => handleAnamnesisResponse(question.id, opt)}
                                            style={{
                                              flex: 1, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center",
                                              backgroundColor: value === opt ? primaryColor : "#ffffff",
                                              borderWidth: 1, borderColor: value === opt ? primaryColor : "#e4e4e7",
                                            }}
                                          >
                                            <Text style={{ fontSize: 14, fontWeight: "700", color: value === opt ? "#fff" : "#71717a" }}>
                                              {opt === "true" ? "Sim" : "Não"}
                                            </Text>
                                          </TouchableOpacity>
                                        ))}
                                      </View>
                                    )}
                                    {question.fieldType === AnamnesisFieldType.SingleSelection && (
                                      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
                                        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 4 }}>
                                          {options.map(opt => (
                                            <TouchableOpacity
                                              key={opt}
                                              activeOpacity={0.7}
                                              onPress={() => handleAnamnesisResponse(question.id, opt)}
                                              style={{
                                                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1,
                                                backgroundColor: value === opt ? primaryColor : "#ffffff",
                                                borderColor: value === opt ? primaryColor : "#e4e4e7",
                                              }}
                                            >
                                              <Text style={{ fontSize: 13, fontWeight: "700", color: value === opt ? "#fff" : "#52525b" }}>
                                                {opt}
                                              </Text>
                                            </TouchableOpacity>
                                          ))}
                                        </View>
                                      </ScrollView>
                                    )}
                                    {question.fieldType === AnamnesisFieldType.MultipleSelection && (() => {
                                      let selected: string[] = []
                                      try { selected = value ? JSON.parse(value) : [] } catch {}
                                      return (
                                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                                          {options.map(opt => {
                                            const isSelected = selected.includes(opt)
                                            return (
                                              <TouchableOpacity
                                                key={opt}
                                                activeOpacity={0.7}
                                                onPress={() => {
                                                  const next = isSelected ? selected.filter(o => o !== opt) : [...selected, opt]
                                                  handleAnamnesisResponse(question.id, JSON.stringify(next))
                                                }}
                                                style={{
                                                  flexDirection: "row", alignItems: "center", gap: 6,
                                                  paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, borderWidth: 1,
                                                  backgroundColor: isSelected ? primaryColor + "15" : "#ffffff",
                                                  borderColor: isSelected ? primaryColor : "#e4e4e7",
                                                }}
                                              >
                                                <View style={{
                                                  width: 16, height: 16, borderRadius: 4, borderWidth: 1.5,
                                                  borderColor: isSelected ? primaryColor : "#a1a1aa",
                                                  backgroundColor: isSelected ? primaryColor : "transparent",
                                                  alignItems: "center", justifyContent: "center",
                                                }}>
                                                  {isSelected && <Ionicons name="checkmark" size={10} color="white" />}
                                                </View>
                                                <Text style={{ fontSize: 13, fontWeight: "600", color: isSelected ? primaryColor : "#52525b" }}>
                                                  {opt}
                                                </Text>
                                              </TouchableOpacity>
                                            )
                                          })}
                                        </View>
                                      )
                                    })()}
                                  </View>
                                )
                              })}
                            </View>
                          )}
                        </View>
                      )
                    })}
                  </View>
                )
              })()
            )}
          </KeyboardAwareScrollView>

          <View className="px-5 pb-8 pt-3 border-t border-zinc-100">
            <Pressable
              onPress={handleAnamnesisSubmit}
              disabled={isAddingAnamnesis}
              className="h-14 rounded-2xl items-center justify-center"
              style={{ backgroundColor: isAddingAnamnesis ? primaryColor + "99" : primaryColor }}
            >
              {isAddingAnamnesis
                ? <ActivityIndicator color="white" />
                : <Text className="text-white font-black text-base">Salvar Avaliação</Text>
              }
            </Pressable>
          </View>
        </View>
      </Modal>
      )}

      {/* Confirm: Excluir cliente */}
      <ConfirmModal
        visible={confirmDeleteOpen}
        title="Excluir cliente?"
        message={`Isso irá remover ${c?.name} e todo o histórico de serviços. Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        destructive
        onConfirm={() => { setConfirmDeleteOpen(false); deleteClient() }}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      {/* Confirm: Cancelar plano */}
      <ConfirmModal
        visible={confirmCancelMembershipId !== null}
        title="Cancelar plano?"
        message="O plano será cancelado e o cliente perderá o acesso. Essa ação não pode ser desfeita."
        confirmLabel="Cancelar Plano"
        destructive
        onConfirm={executeCancelMembership}
        onCancel={() => setConfirmCancelMembershipId(null)}
      />

      {/* Confirm: Excluir serviço do histórico */}
      <ConfirmModal
        visible={confirmDeleteServiceId !== null}
        title="Excluir serviço?"
        message="Essa ação irá remover o registro permanentemente."
        confirmLabel="Excluir"
        destructive
        onConfirm={() => { const id = confirmDeleteServiceId!; setConfirmDeleteServiceId(null); deleteService(id) }}
        onCancel={() => setConfirmDeleteServiceId(null)}
      />

      {/* Modal: Assinar plano */}
      <Modal visible={membershipOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setMembershipOpen(false)}>
        <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-zinc-100">
            <Text className="text-xl font-black text-zinc-900">Escolher Plano</Text>
            <Pressable onPress={() => setMembershipOpen(false)} className="h-9 w-9 items-center justify-center rounded-xl bg-zinc-100">
              <Ionicons name="close" size={20} color="#18181b" />
            </Pressable>
          </View>

          <ScrollView className="flex-1 p-4" contentContainerStyle={{ gap: 12 }}>
            {!membershipPlans || membershipPlans.length === 0 ? (
              <View className="items-center py-12 gap-2">
                <Ionicons name="card-outline" size={36} color="#d4d4d8" />
                <Text className="text-zinc-400 font-semibold">Nenhum plano cadastrado</Text>
              </View>
            ) : (
              membershipPlans.filter((p: any) => p.isActive).map((plan: any) => (
                <Pressable
                  key={plan.id}
                  onPress={() => setSelectedPlanId(plan.id)}
                  className="rounded-2xl border p-4 gap-1"
                  style={{
                    borderColor: selectedPlanId === plan.id ? primaryColor : "#e4e4e7",
                    backgroundColor: selectedPlanId === plan.id ? primaryColor + "08" : "#ffffff",
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="font-black text-zinc-900 text-base">{plan.name}</Text>
                    {selectedPlanId === plan.id && <Ionicons name="checkmark-circle" size={20} color={primaryColor} />}
                  </View>
                  <Text className="text-xl font-black" style={{ color: primaryColor }}>
                    {`R$ ${Number(plan.price).toFixed(2).replace(".", ",")}`}
                  </Text>
                  <View className="flex-row gap-3 mt-1">
                    {plan.sessions != null && (
                      <Text className="text-xs text-zinc-400 font-semibold">{plan.sessions} sessões</Text>
                    )}
                    {plan.durationDays != null && (
                      <Text className="text-xs text-zinc-400 font-semibold">{plan.durationDays} dias</Text>
                    )}
                  </View>
                  {plan.description ? (
                    <Text className="text-xs text-zinc-400 mt-1">{plan.description}</Text>
                  ) : null}
                </Pressable>
              ))
            )}
          </ScrollView>

          <View className="px-5 pb-8 pt-3 border-t border-zinc-100">
            <Pressable
              onPress={handleCreateMembership}
              disabled={isCreatingMembership || !selectedPlanId}
              className="h-14 rounded-2xl items-center justify-center"
              style={{ backgroundColor: (!selectedPlanId || isCreatingMembership) ? primaryColor + "55" : primaryColor }}
            >
              {isCreatingMembership
                ? <ActivityIndicator color="white" />
                : <Text className="text-white font-black text-base">Confirmar Assinatura</Text>
              }
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

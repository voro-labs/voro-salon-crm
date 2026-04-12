import React, { useState, useEffect } from "react"
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  Modal, TextInput, Alert, KeyboardAvoidingView, Platform, Switch,
  Image
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { ConfirmModal } from "components/ConfirmModal"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import useSWR, { mutate } from "swr"
import { useEmployeeDetail } from "hooks/use-employee-detail.hook"
import { ScreenHeader } from "components/ScreenHeader"
import { DatePickerInput } from "components/DatePickerInput"
import { ImagePickerInput } from "components/ImagePickerInput"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { API_CONFIG, secureApiCall } from "lib/api"
import { fetcher } from "lib/fetcher"

function formatDate(dateStr?: string) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}

export function EmployeeDetailScreen({ id, rootPath = "/(tabs)" }: { id: string; rootPath?: string }) {
  const router = useRouter()
  const {
    employee, services,
    form,
    isLoading, isSaving, isDeleting,
    saveEmployee, deleteEmployee,
    handlePhotoUpload, isUploadingPhoto
  } = useEmployeeDetail(id, () => router.replace(`${rootPath}/employees` as any))
  const { primaryColor } = useTenantTheme()

  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ ...form })

  // Confirm modals
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [confirmRevokeOpen, setConfirmRevokeOpen] = useState(false)

  // --- Acesso ao sistema ---
  const [accessModalOpen, setAccessModalOpen] = useState(false)
  const [accessEmail, setAccessEmail] = useState("")
  const [accessPassword, setAccessPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isCreatingAccess, setIsCreatingAccess] = useState(false)
  const [isRevokingAccess, setIsRevokingAccess] = useState(false)

  // --- Goals ---
  interface EmployeeGoalDto {
    id: string; month: number; year: number
    targetAmount: number; targetAppointments: number
    actualAmount: number; actualAppointments: number
    amountProgressPercent: number; appointmentsProgressPercent: number
  }
  const now0 = new Date()
  const [goalMonth, setGoalMonth] = useState({ year: now0.getFullYear(), month: now0.getMonth() + 1 })
  const [goal, setGoal] = useState<EmployeeGoalDto | null>(null)
  const [isFetchingGoal, setIsFetchingGoal] = useState(false)
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [goalTargetAmount, setGoalTargetAmount] = useState("")
  const [goalTargetAppointments, setGoalTargetAppointments] = useState("")
  const [isSavingGoal, setIsSavingGoal] = useState(false)

  useEffect(() => {
    if (!id) return
    setIsFetchingGoal(true)
    secureApiCall<EmployeeGoalDto>(`/EmployeeGoal/${id}?month=${goalMonth.month}&year=${goalMonth.year}`)
      .then((res) => setGoal((!res.hasError && res.data) ? res.data : null))
      .finally(() => setIsFetchingGoal(false))
  }, [id, goalMonth.month, goalMonth.year])

  async function handleSaveGoal() {
    const amount = parseFloat(goalTargetAmount.replace(",", ".")) || 0
    const appts = parseInt(goalTargetAppointments) || 0
    if (!amount && !appts) {
      Alert.alert("Atenção", "Defina pelo menos uma meta (valor ou atendimentos).")
      return
    }
    setIsSavingGoal(true)
    try {
      const body = JSON.stringify({ employeeId: id, month: goalMonth.month, year: goalMonth.year, targetAmount: amount, targetAppointments: appts })
      const res = goal?.id
        ? await secureApiCall<EmployeeGoalDto>(`/EmployeeGoal/${goal.id}`, { method: "PUT", body })
        : await secureApiCall<EmployeeGoalDto>("/EmployeeGoal", { method: "POST", body })
      if (res.hasError) { Alert.alert("Erro", res.message || "Erro ao salvar meta."); return }
      setGoal(res.data ?? null)
      setGoalModalOpen(false)
    } catch { Alert.alert("Erro", "Erro de conexão.") }
    finally { setIsSavingGoal(false) }
  }

  const [commissionMonth, setCommissionMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })

  const fromDate = `${commissionMonth.year}-${String(commissionMonth.month).padStart(2, "0")}-01`
  const lastDay = new Date(commissionMonth.year, commissionMonth.month, 0).getDate()
  const toDate = `${commissionMonth.year}-${String(commissionMonth.month).padStart(2, "0")}-${lastDay}`

  const { data: commissions, isLoading: isLoadingCommissions } = useSWR(
    id ? `${API_CONFIG.ENDPOINTS.EMPLOYEES}/${id}/commissions?from=${fromDate}&to=${toDate}` : null,
    fetcher
  )

  useEffect(() => {
    if (employee) {
      setEditForm({ ...form })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee])

  function generateTempPassword(): string {
    const upper   = "ABCDEFGHJKMNPQRSTUVWXYZ"
    const lower   = "abcdefghjkmnpqrstuvwxyz"
    const digits  = "23456789"
    const special = "!@#$"
    const all     = upper + lower + digits + special
    const pick = (src: string) => src[Math.floor(Math.random() * src.length)]
    const chars = [
      pick(upper), pick(lower), pick(digits), pick(special),
      pick(all), pick(all), pick(all), pick(all),
      pick(all), pick(all), pick(all), pick(all),
    ]
    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[chars[i], chars[j]] = [chars[j], chars[i]]
    }
    return chars.join("")
  }

  async function handleCreateAccess() {
    if (!accessEmail.trim() || !accessPassword.trim()) {
      Alert.alert("Campos obrigatórios", "Preencha o e-mail e a senha.")
      return
    }
    setIsCreatingAccess(true)
    try {
      const res = await secureApiCall<any>(`${API_CONFIG.ENDPOINTS.EMPLOYEES}/${id}/access`, {
        method: "POST",
        body: JSON.stringify({ email: accessEmail, password: accessPassword }),
      })
      if (res.hasError) {
        Alert.alert("Erro", res.message || "Erro ao criar acesso.")
        return
      }
      setAccessModalOpen(false)
      setAccessEmail("")
      setAccessPassword("")
      setShowPassword(false)
      mutate(`${API_CONFIG.ENDPOINTS.EMPLOYEES}/${id}`)
      mutate(API_CONFIG.ENDPOINTS.EMPLOYEES)
    } catch {
      Alert.alert("Erro", "Erro de conexão.")
    } finally {
      setIsCreatingAccess(false)
    }
  }

  function handleRevokeAccess() {
    setConfirmRevokeOpen(true)
  }

  async function executeRevokeAccess() {
    setConfirmRevokeOpen(false)
    setIsRevokingAccess(true)
    try {
      const res = await secureApiCall<any>(`${API_CONFIG.ENDPOINTS.EMPLOYEES}/${id}/access`, {
        method: "DELETE",
      })
      if (res.hasError) {
        Alert.alert("Erro", res.message || "Erro ao revogar acesso.")
        return
      }
      mutate(`${API_CONFIG.ENDPOINTS.EMPLOYEES}/${id}`)
      mutate(API_CONFIG.ENDPOINTS.EMPLOYEES)
    } catch {
      Alert.alert("Erro", "Erro de conexão.")
    } finally {
      setIsRevokingAccess(false)
    }
  }

  function openEdit() {
    setEditForm({ ...form })
    setEditOpen(true)
  }

  async function handleEditSubmit() {
    const success = await saveEmployee(editForm)
    if (success) setEditOpen(false)
  }

  function handleDelete() {
    setConfirmDeleteOpen(true)
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-50" edges={[]}>
        <ScreenHeader title="Funcionário" showBack onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={primaryColor} size="large" />
        </View>
      </SafeAreaView>
    )
  }

  if (!employee) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-50" edges={[]}>
        <ScreenHeader title="Funcionário" showBack onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="person-outline" size={48} color="#d4d4d8" />
          <Text className="text-zinc-400 font-semibold mt-3">Funcionário não encontrado</Text>
        </View>
      </SafeAreaView>
    )
  }

  const initials = employee.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const specialtyNames = (form.specialtyIds ?? [])
    .map((sid) => (services as any[])?.find((s: any) => s.id === sid)?.name)
    .filter(Boolean) as string[]

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={[]}>
      <ScreenHeader title={employee.name} showBack onBack={() => router.back()} />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* Profile card */}
        <View className="bg-white rounded-3xl p-4 border border-zinc-100 mb-4">
          <View className="flex-row items-center gap-4 mb-4">
            {form.photoUrl ? (
              <Image
                source={{ uri: form.photoUrl }}
                className="w-16 h-16 rounded-2xl shrink-0 border border-zinc-100"
              />
            ) : (
              <View
                className="w-16 h-16 items-center justify-center rounded-2xl shrink-0"
                style={{ backgroundColor: primaryColor + "20" }}
              >
                <Text className="font-black text-xl" style={{ color: primaryColor }}>{initials}</Text>
              </View>
            )}
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center gap-2">
                <Text className="text-lg font-black text-zinc-900 flex-1" numberOfLines={1}>{employee.name}</Text>
              </View>
              <View className="flex-row items-center gap-2 mt-0.5">
                <View
                  className="rounded-lg px-2 py-0.5"
                  style={{
                    backgroundColor: employee.isActive ? "#dcfce7" : "#f4f4f5",
                  }}
                >
                  <Text
                    className="text-[10px] font-bold uppercase tracking-wide"
                    style={{ color: employee.isActive ? "#16a34a" : "#71717a" }}
                  >
                    {employee.isActive ? "Ativo" : "Inativo"}
                  </Text>
                </View>
              </View>
              {employee.hireDate && (
                <View className="flex-row items-center gap-1 mt-1">
                  <Ionicons name="calendar-outline" size={12} color="#a1a1aa" />
                  <Text className="text-zinc-400 text-xs">Desde {formatDate(employee.hireDate)}</Text>
                </View>
              )}
              {employee.commissionPercentage != null && (
                <View className="flex-row items-center gap-1 mt-1">
                  <Ionicons name="cash-outline" size={12} color="#a1a1aa" />
                  <Text className="text-zinc-400 text-xs">Comissão: {employee.commissionPercentage}%</Text>
                </View>
              )}
            </View>
          </View>

          {/* Action buttons */}
          <View className="flex-row gap-2">
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
        </View>

        {/* Specialties card */}
        {specialtyNames.length > 0 && (
          <View className="bg-white rounded-3xl border border-zinc-100 p-5">
            <Text className="text-base font-black text-zinc-900 mb-3">Especialidades</Text>
            <View className="flex-row flex-wrap gap-2">
              {specialtyNames.map((name, i) => (
                <View
                  key={i}
                  className="rounded-xl px-3 py-1.5"
                  style={{ backgroundColor: primaryColor + "12", borderWidth: 1, borderColor: primaryColor + "25" }}
                >
                  <Text className="text-sm font-bold" style={{ color: primaryColor }}>{name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {specialtyNames.length === 0 && (
          <View className="bg-white rounded-3xl border border-zinc-100 p-5 items-center py-8">
            <Ionicons name="star-outline" size={32} color="#d4d4d8" />
            <Text className="text-zinc-400 font-semibold mt-2">Nenhuma especialidade definida</Text>
            <Text className="text-zinc-300 text-sm mt-1">Toque em Editar para adicionar</Text>
          </View>
        )}

        {/* Comissões */}
        {employee.commissionPercentage != null && (
          <View className="bg-white rounded-3xl border border-zinc-100 p-5 mt-4">
            <Text className="text-base font-black text-zinc-900 mb-3">Comissões</Text>

            {/* Navegação de mês */}
            <View className="flex-row items-center justify-between mb-4">
              <Pressable
                onPress={() => setCommissionMonth(p => {
                  const d = new Date(p.year, p.month - 2)
                  return { year: d.getFullYear(), month: d.getMonth() + 1 }
                })}
                className="h-8 w-8 bg-zinc-100 rounded-xl items-center justify-center"
              >
                <Ionicons name="chevron-back" size={16} color="#52525b" />
              </Pressable>
              <Text className="font-bold text-zinc-700 text-sm">
                {new Date(commissionMonth.year, commissionMonth.month - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </Text>
              <Pressable
                onPress={() => setCommissionMonth(p => {
                  const d = new Date(p.year, p.month)
                  return { year: d.getFullYear(), month: d.getMonth() + 1 }
                })}
                className="h-8 w-8 bg-zinc-100 rounded-xl items-center justify-center"
              >
                <Ionicons name="chevron-forward" size={16} color="#52525b" />
              </Pressable>
            </View>

            {isLoadingCommissions ? (
              <ActivityIndicator color={primaryColor} />
            ) : !commissions || (commissions as any[]).length === 0 ? (
              <View className="items-center py-6">
                <Ionicons name="cash-outline" size={32} color="#d4d4d8" />
                <Text className="text-zinc-400 font-semibold mt-2 text-sm">Nenhuma comissão neste período</Text>
              </View>
            ) : (
              <>
                {(commissions as any[]).map((c: any) => (
                  <View key={c.id} className="flex-row items-center justify-between py-2.5 border-b border-zinc-50">
                    <View className="flex-1 min-w-0">
                      <Text className="text-sm font-semibold text-zinc-800 leading-tight" numberOfLines={2}>{c.description}</Text>
                      <Text className="text-xs text-zinc-400 mt-0.5">
                        {new Date(c.dueDate ?? c.createdAt).toLocaleDateString("pt-BR")}
                      </Text>
                    </View>
                    <View className="items-end ml-3">
                      <Text className="text-sm font-black" style={{ color: primaryColor }}>
                        {(c.amount as number).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </Text>
                      <View className={`rounded-lg px-2 py-0.5 mt-0.5 ${c.status === "Paid" ? "bg-emerald-100" : "bg-amber-100"}`}>
                        <Text className={`text-[10px] font-bold ${c.status === "Paid" ? "text-emerald-700" : "text-amber-700"}`}>
                          {c.status === "Paid" ? "Pago" : "Pendente"}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}

                {/* Total */}
                <View className="flex-row justify-between items-center pt-3 mt-1">
                  <Text className="text-sm font-bold text-zinc-700">Total do período</Text>
                  <Text className="text-base font-black" style={{ color: primaryColor }}>
                    {(commissions as any[]).reduce((sum: number, c: any) => sum + (c.amount || 0), 0)
                      .toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </Text>
                </View>
              </>
            )}
          </View>
        )}
        {/* Metas */}
        <View className="bg-white rounded-3xl border border-zinc-100 p-5 mt-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <Ionicons name="trophy-outline" size={18} color="#18181b" />
              <Text className="text-base font-black text-zinc-900">Metas</Text>
            </View>
            <Pressable
              onPress={() => {
                setGoalTargetAmount(goal ? String(goal.targetAmount) : "")
                setGoalTargetAppointments(goal ? String(goal.targetAppointments) : "")
                setGoalModalOpen(true)
              }}
              className="h-8 px-3 bg-zinc-100 rounded-xl items-center justify-center"
            >
              <Text className="text-zinc-700 font-bold text-xs">{goal ? "Editar" : "Definir"}</Text>
            </Pressable>
          </View>

          {/* Navegação mês */}
          <View className="flex-row items-center justify-between mb-4">
            <Pressable
              onPress={() => setGoalMonth(p => { const d = new Date(p.year, p.month - 2); return { year: d.getFullYear(), month: d.getMonth() + 1 } })}
              className="h-8 w-8 bg-zinc-100 rounded-xl items-center justify-center"
            >
              <Ionicons name="chevron-back" size={16} color="#52525b" />
            </Pressable>
            <Text className="font-bold text-zinc-700 text-sm">
              {new Date(goalMonth.year, goalMonth.month - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </Text>
            <Pressable
              onPress={() => setGoalMonth(p => { const d = new Date(p.year, p.month); return { year: d.getFullYear(), month: d.getMonth() + 1 } })}
              className="h-8 w-8 bg-zinc-100 rounded-xl items-center justify-center"
            >
              <Ionicons name="chevron-forward" size={16} color="#52525b" />
            </Pressable>
          </View>

          {isFetchingGoal ? (
            <ActivityIndicator color={primaryColor} />
          ) : !goal ? (
            <View className="items-center py-6">
              <Ionicons name="trophy-outline" size={32} color="#d4d4d8" />
              <Text className="text-zinc-400 font-semibold mt-2 text-sm">Nenhuma meta para este período</Text>
              <Text className="text-zinc-300 text-xs mt-1">Toque em Definir para criar</Text>
            </View>
          ) : (
            <View className="gap-4">
              {/* Faturamento */}
              <View className="gap-1.5">
                <View className="flex-row justify-between">
                  <Text className="text-sm font-bold text-zinc-700">Faturamento</Text>
                  <Text className="text-sm text-zinc-500">
                    {goal.actualAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} / {goal.targetAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </Text>
                </View>
                <View className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <View className="h-2 rounded-full" style={{ width: `${Math.min(goal.amountProgressPercent, 100)}%`, backgroundColor: primaryColor }} />
                </View>
                <Text className="text-xs text-zinc-400 text-right">{Math.round(goal.amountProgressPercent)}%</Text>
              </View>
              {/* Atendimentos */}
              <View className="gap-1.5">
                <View className="flex-row justify-between">
                  <Text className="text-sm font-bold text-zinc-700">Atendimentos</Text>
                  <Text className="text-sm text-zinc-500">{goal.actualAppointments} / {goal.targetAppointments}</Text>
                </View>
                <View className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <View className="h-2 rounded-full bg-blue-500" style={{ width: `${Math.min(goal.appointmentsProgressPercent, 100)}%` }} />
                </View>
                <Text className="text-xs text-zinc-400 text-right">{Math.round(goal.appointmentsProgressPercent)}%</Text>
              </View>
            </View>
          )}
        </View>

        {/* Acesso ao Sistema */}
        <View className="bg-white rounded-3xl border border-zinc-100 p-5 mt-4">
          <View className="flex-row items-center gap-2 mb-4">
            <Ionicons name="shield-checkmark-outline" size={18} color="#18181b" />
            <Text className="text-base font-black text-zinc-900">Acesso ao Sistema</Text>
          </View>

          {employee.hasAccess ? (
            <View className="gap-3">
              <View className="flex-row items-center gap-2">
                <View className="h-7 px-2.5 bg-emerald-100 rounded-lg items-center justify-center flex-row gap-1.5">
                  <Ionicons name="shield-checkmark" size={13} color="#16a34a" />
                  <Text className="text-xs font-bold text-emerald-700">Acesso ativo</Text>
                </View>
              </View>
              {employee.userId && (
                <Text className="text-xs text-zinc-400" numberOfLines={1}>ID: {employee.userId}</Text>
              )}
              <Pressable
                onPress={handleRevokeAccess}
                disabled={isRevokingAccess}
                className="flex-row items-center justify-center gap-2 h-10 bg-red-50 border border-red-100 rounded-xl"
              >
                {isRevokingAccess
                  ? <ActivityIndicator size="small" color="#ef4444" />
                  : <>
                      <Ionicons name="shield-outline" size={15} color="#ef4444" />
                      <Text className="text-red-600 font-bold text-sm">Revogar Acesso</Text>
                    </>
                }
              </Pressable>
            </View>
          ) : (
            <View className="gap-3">
              <View className="flex-row items-center gap-2">
                <Ionicons name="shield-outline" size={15} color="#a1a1aa" />
                <Text className="text-sm text-zinc-400">Sem acesso ao sistema</Text>
              </View>
              <Pressable
                onPress={() => setAccessModalOpen(true)}
                className="flex-row items-center justify-center gap-2 h-10 bg-zinc-50 border border-zinc-200 rounded-xl"
              >
                <Ionicons name="shield-checkmark-outline" size={15} color="#18181b" />
                <Text className="text-zinc-800 font-bold text-sm">Criar Acesso</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create Access Modal */}
      <Modal visible={accessModalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAccessModalOpen(false)}>
        <SafeAreaView edges={["top"]} className="flex-1 bg-white">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
          <View className="flex-row items-center justify-between px-5 pt-4 pb-4 border-b border-zinc-100">
            <Text className="text-lg font-black text-zinc-900">Criar Acesso ao Sistema</Text>
            <Pressable
              onPress={() => { setAccessModalOpen(false); setAccessEmail(""); setAccessPassword(""); setShowPassword(false) }}
              className="h-9 w-9 bg-zinc-100 rounded-xl items-center justify-center"
            >
              <Ionicons name="close" size={20} color="#71717a" />
            </Pressable>
          </View>

          <ScrollView className="flex-1 px-5 py-5" keyboardShouldPersistTaps="handled">
            <Text className="text-sm text-zinc-500 mb-5">
              Defina o e-mail e a senha para que o funcionário acesse o sistema.
            </Text>

            {/* E-mail */}
            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">E-mail</Text>
              <TextInput
                className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base"
                placeholder="funcionario@exemplo.com"
                placeholderTextColor="#a1a1aa"
                value={accessEmail}
                onChangeText={setAccessEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Senha */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-zinc-700 font-bold text-sm">Senha</Text>
                <Pressable
                  onPress={() => { setAccessPassword(generateTempPassword()); setShowPassword(true) }}
                  className="flex-row items-center gap-1"
                >
                  <Ionicons name="refresh-outline" size={13} color="#7c3aed" />
                  <Text className="text-xs font-bold text-violet-600">Gerar senha</Text>
                </Pressable>
              </View>
              <View className="relative">
                <TextInput
                  className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base pr-12"
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor="#a1a1aa"
                  value={accessPassword}
                  onChangeText={setAccessPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-0 bottom-0 justify-center px-1"
                >
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#a1a1aa" />
                </Pressable>
              </View>
            </View>
          </ScrollView>

          <View className="px-5 pb-8 pt-3 border-t border-zinc-100 flex-row gap-3">
            <Pressable
              onPress={() => { setAccessModalOpen(false); setAccessEmail(""); setAccessPassword(""); setShowPassword(false) }}
              disabled={isCreatingAccess}
              className="flex-1 h-14 rounded-2xl items-center justify-center bg-zinc-100"
            >
              <Text className="text-zinc-700 font-black text-base">Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={handleCreateAccess}
              disabled={isCreatingAccess}
              className="flex-1 h-14 rounded-2xl items-center justify-center"
              style={{ backgroundColor: isCreatingAccess ? primaryColor + "99" : primaryColor }}
            >
              {isCreatingAccess
                ? <ActivityIndicator color="white" />
                : <Text className="text-white font-black text-base">Confirmar</Text>
              }
            </Pressable>
          </View>
        </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Goal Modal */}
      <Modal visible={goalModalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setGoalModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-5 pt-6 pb-4 border-b border-zinc-100">
            <Text className="text-lg font-black text-zinc-900">{goal ? "Editar Meta" : "Definir Meta"}</Text>
            <Pressable onPress={() => setGoalModalOpen(false)} className="h-9 w-9 bg-zinc-100 rounded-xl items-center justify-center">
              <Ionicons name="close" size={20} color="#71717a" />
            </Pressable>
          </View>
          <ScrollView className="flex-1 px-5 py-5" keyboardShouldPersistTaps="handled">
            <Text className="text-sm text-zinc-500 mb-5">
              {new Date(goalMonth.year, goalMonth.month - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </Text>
            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Meta de Faturamento (R$)</Text>
              <TextInput
                className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base"
                placeholder="Ex: 5000"
                placeholderTextColor="#a1a1aa"
                value={goalTargetAmount}
                onChangeText={setGoalTargetAmount}
                keyboardType="decimal-pad"
              />
            </View>
            <View className="mb-6">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Meta de Atendimentos</Text>
              <TextInput
                className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base"
                placeholder="Ex: 40"
                placeholderTextColor="#a1a1aa"
                value={goalTargetAppointments}
                onChangeText={setGoalTargetAppointments}
                keyboardType="number-pad"
              />
            </View>
          </ScrollView>
          <View className="px-5 pb-8 pt-3 border-t border-zinc-100 flex-row gap-3">
            <Pressable onPress={() => setGoalModalOpen(false)} disabled={isSavingGoal} className="flex-1 h-14 rounded-2xl items-center justify-center bg-zinc-100">
              <Text className="text-zinc-700 font-black text-base">Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={handleSaveGoal}
              disabled={isSavingGoal}
              className="flex-1 h-14 rounded-2xl items-center justify-center"
              style={{ backgroundColor: isSavingGoal ? primaryColor + "99" : primaryColor }}
            >
              {isSavingGoal ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-base">Salvar</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Confirm: Excluir funcionário */}
      <ConfirmModal
        visible={confirmDeleteOpen}
        title="Excluir funcionário?"
        message={`Isso irá remover ${employee?.name} permanentemente. Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        destructive
        onConfirm={() => { setConfirmDeleteOpen(false); deleteEmployee() }}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      {/* Confirm: Revogar acesso */}
      <ConfirmModal
        visible={confirmRevokeOpen}
        title="Revogar acesso?"
        message="O funcionário perderá o acesso ao sistema. Esta ação não pode ser desfeita sem criar um novo acesso."
        confirmLabel="Revogar"
        destructive
        onConfirm={executeRevokeAccess}
        onCancel={() => setConfirmRevokeOpen(false)}
      />

      {/* Edit Modal */}
      <Modal visible={editOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-5 pt-6 pb-4 border-b border-zinc-100">
            <Text className="text-lg font-black text-zinc-900">Editar Funcionário</Text>
            <Pressable onPress={() => setEditOpen(false)} className="h-9 w-9 bg-zinc-100 rounded-xl items-center justify-center">
              <Ionicons name="close" size={20} color="#71717a" />
            </Pressable>
          </View>

          <ScrollView className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false}>
            {/* Foto de Perfil */}
            <View className="mb-6">
              <Text className="text-zinc-700 font-bold text-sm mb-3">Foto de Perfil</Text>
              <ImagePickerInput
                value={form.photoUrl}
                onChange={handlePhotoUpload}
                isUploading={isUploadingPhoto}
                label="Atualizar Foto"
                fallbackIcon="person-outline"
                size={80}
              />
            </View>

            {/* Nome */}
            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Nome *</Text>
              <TextInput
                className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base"
                placeholder="Nome do funcionário"
                placeholderTextColor="#a1a1aa"
                value={editForm.name}
                onChangeText={(v) => setEditForm((p) => ({ ...p, name: v }))}
                autoCapitalize="words"
              />
            </View>

            {/* Data de contratação */}
            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Data de Contratação</Text>
              <DatePickerInput
                value={editForm.hireDate}
                onChange={(v) => setEditForm((p) => ({ ...p, hireDate: v }))}
              />
            </View>

            {/* Comissão */}
            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Comissão (%)</Text>
              <TextInput
                className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base"
                placeholder="Ex: 10 (opcional)"
                placeholderTextColor="#a1a1aa"
                value={editForm.commissionPercentage != null ? String(editForm.commissionPercentage) : ""}
                onChangeText={(v) => {
                  const num = parseFloat(v.replace(",", "."))
                  setEditForm((p) => ({ ...p, commissionPercentage: isNaN(num) ? undefined : num }))
                }}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Ativo */}
            <View className="flex-row items-center justify-between py-3 mb-4 bg-zinc-50 border border-zinc-200 rounded-2xl px-4">
              <View>
                <Text className="text-zinc-700 font-bold text-sm">Funcionário Ativo</Text>
                <Text className="text-zinc-400 text-xs mt-0.5">Aparece nos agendamentos</Text>
              </View>
              <Switch
                value={editForm.isActive}
                onValueChange={(v) => setEditForm((p) => ({ ...p, isActive: v }))}
                trackColor={{ false: "#e4e4e7", true: primaryColor + "60" }}
                thumbColor={editForm.isActive ? primaryColor : "#a1a1aa"}
              />
            </View>

            {/* Especialidades */}
            {(services as any[])?.length > 0 && (
              <View className="mb-4">
                <Text className="text-zinc-700 font-bold text-sm mb-2">Especialidades</Text>
                <View className="gap-2">
                  {(services as any[]).map((service) => {
                    const selected = editForm.specialtyIds.includes(service.id)
                    return (
                      <Pressable
                        key={service.id}
                        onPress={() => setEditForm((p) => ({
                          ...p,
                          specialtyIds: selected
                            ? p.specialtyIds.filter((sid) => sid !== service.id)
                            : [...p.specialtyIds, service.id],
                        }))}
                        className="flex-row items-center gap-3 p-3 rounded-2xl border"
                        style={{
                          borderColor: selected ? primaryColor + "40" : "#e4e4e7",
                          backgroundColor: selected ? primaryColor + "08" : "#fafafa",
                        }}
                      >
                        <View
                          className="h-5 w-5 rounded-md items-center justify-center"
                          style={{
                            backgroundColor: selected ? primaryColor : "transparent",
                            borderWidth: selected ? 0 : 1.5,
                            borderColor: "#d4d4d8",
                          }}
                        >
                          {selected && <Ionicons name="checkmark" size={13} color="white" />}
                        </View>
                        <Text
                          className="flex-1 text-sm font-semibold"
                          style={{ color: selected ? primaryColor : "#52525b" }}
                          numberOfLines={1}
                        >
                          {service.name}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              </View>
            )}
          </ScrollView>

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
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

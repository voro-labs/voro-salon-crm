import React, { useState } from "react"
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  RefreshControl, Modal, TextInput, Alert, KeyboardAvoidingView, Platform,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, router } from "expo-router"
import { useClientDetails } from "hooks/use-client-details.hook"
import { ScreenHeader } from "components/ScreenHeader"
import { PhoneInput } from "components/PhoneInput"
import { CountrySelector } from "components/CountrySelector"
import { CurrencyInput } from "components/CurrencyInput"
import { DatePickerInput } from "components/DatePickerInput"
import { flags, getCountryFromPhone } from "lib/flag-utils"
import { formatPhone } from "lib/mask-utils"
import { useTenantTheme } from "contexts/tenant-theme.context"

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

type TabType = "services" | "anamnesis"

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const {
    client, services, anamnesisHistory, anamnesisError, catalogServices,
    isLoading, isClientLoading, isAnamnesisLoading, isSaving,
    isDeleting, isAddingService,
    updateClient, deleteClient, addService, deleteService,
  } = useClientDetails(id, () => router.push("/(tabs)/clients" as any))
  const { primaryColor } = useTenantTheme()

  const [tab, setTab] = useState<TabType>("services")

  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", notes: "" })
  const [editCountryCode, setEditCountryCode] = useState("BR")

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
    })
    if (success) setEditOpen(false)
  }

  function handleDelete() {
    Alert.alert(
      "Excluir cliente?",
      `Isso irá remover ${(client as any)?.name} e todo o histórico de serviços. Essa ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: () => deleteClient() },
      ]
    )
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
    Alert.alert("Excluir serviço?", "Essa ação irá remover o registro permanentemente.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => deleteService(serviceId) },
    ])
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
              <Text className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Cliente desde</Text>
              <Text className="text-sm font-black text-zinc-900 mt-0.5">{formatDate(c.createdAt)}</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row bg-zinc-100 rounded-2xl p-1 mb-4">
          {(["services", "anamnesis"] as TabType[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              className={`flex-1 flex-row items-center justify-center gap-2 h-10 rounded-xl ${tab === t ? "bg-white shadow-sm" : ""}`}
            >
              <Ionicons
                name={t === "services" ? "calendar-outline" : "clipboard-outline"}
                size={15}
                color={tab === t ? primaryColor : "#71717a"}
              />
              <Text className={`text-sm font-bold ${tab === t ? "" : "text-zinc-500"}`} style={tab === t ? { color: primaryColor } : undefined}>
                {t === "services" ? "Serviços" : "Anamnese"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Services Tab */}
        {tab === "services" && (
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
                    className={`flex-row items-start gap-3 rounded-2xl border p-4 ${isRecent(svc.serviceDate) ? "border-zinc-100" : "border-zinc-100"}`}
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
        )}

        {/* Anamnesis Tab */}
        {tab === "anamnesis" && (
          <View className="bg-white rounded-3xl border border-zinc-100">
            <View className="px-5 py-4 border-b border-zinc-100">
              <Text className="text-base font-black text-zinc-900">Histórico de Anamnese</Text>
              <Text className="text-xs text-zinc-400 mt-0.5">Avaliações capilares registradas</Text>
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
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-5 pt-6 pb-4 border-b border-zinc-100">
            <Text className="text-lg font-black text-zinc-900">Editar Cliente</Text>
            <Pressable onPress={() => setEditOpen(false)} className="h-9 w-9 bg-zinc-100 rounded-xl items-center justify-center">
              <Ionicons name="close" size={20} color="#71717a" />
            </Pressable>
          </View>
          <ScrollView className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false}>
            {([
              { label: "Nome *", key: "name", placeholder: "Nome" },
            ] as const).map(({ label, key, placeholder }) => (
              <View key={key} className="mb-4">
                <Text className="text-zinc-700 font-bold text-sm mb-1.5">{label}</Text>
                <TextInput
                  className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base"
                  placeholder={placeholder}
                  placeholderTextColor="#a1a1aa"
                  value={editForm[key]}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, [key]: v }))}
                />
              </View>
            ))}

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

      {/* Add Service Modal */}
      <Modal visible={svcOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSvcOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-5 p-4 pt-6 pb-4 border-b border-zinc-100">
            <Text className="text-lg font-black text-zinc-900">Registrar Serviço</Text>
            <Pressable onPress={() => setSvcOpen(false)} className="h-9 w-9 bg-zinc-100 rounded-xl items-center justify-center">
              <Ionicons name="close" size={20} color="#71717a" />
            </Pressable>
          </View>
          <ScrollView className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false}>
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
          </ScrollView>
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
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

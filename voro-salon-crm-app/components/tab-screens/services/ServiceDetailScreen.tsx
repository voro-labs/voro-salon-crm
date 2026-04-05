import React, { useState, useEffect } from "react"
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, Modal, TextInput, Switch, KeyboardAvoidingView, Platform } from "react-native"
import { ConfirmModal } from "components/ConfirmModal"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useServiceDetail } from "hooks/use-service-detail.hook"
import { ScreenHeader } from "components/ScreenHeader"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { secureApiCall } from "lib/api"
import { DatePickerInput } from "components/DatePickerInput"

function fmtCurrency(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function StatCard({
  icon, label, value, color,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"]
  label: string
  value: string
  color: string
}) {
  return (
    <View className="flex-1 bg-white rounded-2xl p-4 border border-zinc-100 items-center gap-2">
      <View className="h-10 w-10 rounded-2xl items-center justify-center" style={{ backgroundColor: color + "18" }}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text className="text-xl font-black text-zinc-900">{value}</Text>
      <Text className="text-xs font-semibold text-zinc-400 text-center">{label}</Text>
    </View>
  )
}

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

interface ServicePromotionDto {
  id: string
  serviceId: string
  promotionalPrice: number
  daysOfWeek: number[]
  isActive: boolean
  validFrom?: string
  validUntil?: string
}

const emptyPromoForm = { promotionalPrice: "", daysOfWeek: [] as number[], isActive: true, validFrom: "", validUntil: "" }

export function ServiceDetailScreen({ id, rootPath = "/(tabs)" }: { id: string; rootPath?: string }) {
  const router = useRouter()
  const { service, isLoading, isDeleting, deleteService } = useServiceDetail(id)
  const { primaryColor } = useTenantTheme()

  const [promos, setPromos] = useState<ServicePromotionDto[]>([])
  const [isFetchingPromos, setIsFetchingPromos] = useState(false)
  const [promoModalOpen, setPromoModalOpen] = useState(false)
  const [editingPromo, setEditingPromo] = useState<ServicePromotionDto | null>(null)
  const [promoForm, setPromoForm] = useState(emptyPromoForm)
  const [isSavingPromo, setIsSavingPromo] = useState(false)
  const [confirmDeletePromoId, setConfirmDeletePromoId] = useState<string | null>(null)
  const [confirmDeleteServiceOpen, setConfirmDeleteServiceOpen] = useState(false)

  useEffect(() => {
    if (!id) return
    setIsFetchingPromos(true)
    secureApiCall<any>(`/ServicePromotion?serviceId=${id}`)
      .then((res) => {
        if (res.hasError || !res.data) { setPromos([]); return }
        const raw = res.data
        const all: ServicePromotionDto[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.items)
          ? raw.items
          : Array.isArray(raw?.data)
          ? raw.data
          : []
        setPromos(all.filter((p) => p.serviceId === id))
      })
      .finally(() => setIsFetchingPromos(false))
  }, [id])

  function openCreatePromo() {
    setEditingPromo(null)
    setPromoForm(emptyPromoForm)
    setPromoModalOpen(true)
  }

  function openEditPromo(p: ServicePromotionDto) {
    setEditingPromo(p)
    setPromoForm({
      promotionalPrice: String(p.promotionalPrice),
      daysOfWeek: p.daysOfWeek,
      isActive: p.isActive,
      validFrom: p.validFrom ?? "",
      validUntil: p.validUntil ?? "",
    })
    setPromoModalOpen(true)
  }

  async function handleSavePromo() {
    const price = parseFloat(promoForm.promotionalPrice.replace(",", "."))
    if (!price || price <= 0) { Alert.alert("Atenção", "Informe um preço promocional válido."); return }
    if (promoForm.daysOfWeek.length === 0) { Alert.alert("Atenção", "Selecione pelo menos um dia da semana."); return }
    setIsSavingPromo(true)
    try {
      const body = JSON.stringify({
        serviceId: id,
        promotionalPrice: price,
        daysOfWeek: promoForm.daysOfWeek,
        isActive: promoForm.isActive,
        validFrom: promoForm.validFrom || null,
        validUntil: promoForm.validUntil || null,
      })
      const res = editingPromo
        ? await secureApiCall<ServicePromotionDto>(`/ServicePromotion/${editingPromo.id}`, { method: "PUT", body })
        : await secureApiCall<ServicePromotionDto>("/ServicePromotion", { method: "POST", body })
      if (res.hasError) { Alert.alert("Erro", res.message || "Erro ao salvar promoção."); return }
      setPromos(prev => editingPromo
        ? prev.map(p => p.id === editingPromo.id ? res.data! : p)
        : [...prev, res.data!]
      )
      setPromoModalOpen(false)
    } catch { Alert.alert("Erro", "Erro de conexão.") }
    finally { setIsSavingPromo(false) }
  }

  function handleDeletePromo(promoId: string) {
    setConfirmDeletePromoId(promoId)
  }

  async function executeDeletePromo() {
    if (!confirmDeletePromoId) return
    const promoId = confirmDeletePromoId
    setConfirmDeletePromoId(null)
    const res = await secureApiCall(`/ServicePromotion/${promoId}`, { method: "DELETE" })
    if (res.hasError) { Alert.alert("Erro", res.message || "Erro ao excluir."); return }
    setPromos(prev => prev.filter(p => p.id !== promoId))
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-50 items-center justify-center">
        <ActivityIndicator color={primaryColor} size="large" />
      </SafeAreaView>
    )
  }

  if (!service) return null

  const svc = service as any

  function confirmDelete() {
    setConfirmDeleteServiceOpen(true)
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <ScreenHeader
        title="Serviço"
        showBack
        onBack={() => router.back()}
        right={
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => router.push(`${rootPath}/services/edit?id=${id}` as any)}
              className="h-9 w-9 rounded-xl items-center justify-center"
              style={{ backgroundColor: primaryColor + "15", borderWidth: 1, borderColor: primaryColor + "25" }}
            >
              <Ionicons name="create-outline" size={18} color={primaryColor} />
            </Pressable>
            <Pressable
              onPress={confirmDelete}
              disabled={isDeleting}
              className="h-9 w-9 bg-red-50 rounded-xl items-center justify-center border border-red-100"
            >
              {isDeleting
                ? <ActivityIndicator size="small" color="#dc2626" />
                : <Ionicons name="trash-outline" size={18} color="#dc2626" />
              }
            </Pressable>
          </View>
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity card */}
        <View className="bg-white rounded-3xl p-6 border border-zinc-100 items-center">
          <View className="h-20 w-20 rounded-3xl items-center justify-center mb-4" style={{ backgroundColor: primaryColor + "15" }}>
            <Ionicons name="cut-outline" size={36} color={primaryColor} />
          </View>
          <Text className="text-2xl font-black text-zinc-900 text-center">{svc.name}</Text>
          {svc.description ? (
            <Text className="text-zinc-500 text-sm text-center mt-2 leading-relaxed">{svc.description}</Text>
          ) : null}
        </View>

        {/* Stats row */}
        <View className="flex-row gap-3">
          {(svc.durationMinutes ?? svc.duration) ? (
            <StatCard
              icon="hourglass-outline"
              label="Duração"
              value={`${svc.durationMinutes ?? svc.duration} min`}
              color={primaryColor}
            />
          ) : null}
          {svc.price != null && svc.price > 0 ? (
            <StatCard
              icon="wallet-outline"
              label="Preço"
              value={fmtCurrency(svc.price)}
              color="#059669"
            />
          ) : null}
        </View>

        {/* Edit button */}
        <Pressable
          onPress={() => router.push(`${rootPath}/services/edit?id=${id}` as any)}
          className="h-14 rounded-2xl items-center justify-center flex-row gap-2 mt-2"
          style={{ backgroundColor: primaryColor }}
        >
          <Ionicons name="create-outline" size={20} color="white" />
          <Text className="text-white font-black text-base">Editar Serviço</Text>
        </Pressable>

        {/* Promotions section */}
        <View className="bg-white rounded-3xl border border-zinc-100 p-5 mt-4">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <Ionicons name="pricetag-outline" size={18} color="#18181b" />
              <Text className="text-base font-black text-zinc-900">Promoções</Text>
            </View>
            <Pressable onPress={openCreatePromo} className="h-8 px-3 bg-zinc-100 rounded-xl items-center justify-center flex-row gap-1">
              <Ionicons name="add" size={15} color="#18181b" />
              <Text className="text-zinc-700 font-bold text-xs">Nova</Text>
            </Pressable>
          </View>

          {isFetchingPromos ? (
            <ActivityIndicator color={primaryColor} />
          ) : promos.length === 0 ? (
            <View className="items-center py-6">
              <Ionicons name="pricetag-outline" size={32} color="#d4d4d8" />
              <Text className="text-zinc-400 font-semibold mt-2 text-sm">Nenhuma promoção cadastrada</Text>
            </View>
          ) : (
            <View className="gap-3">
              {promos.map((promo) => (
                <View key={promo.id} className="border border-zinc-100 rounded-2xl p-3 gap-2">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-black" style={{ color: "#059669" }}>
                      {promo.promotionalPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </Text>
                    <View className="flex-row gap-2">
                      <View className={`rounded-lg px-2 py-0.5 ${promo.isActive ? "bg-emerald-100" : "bg-zinc-100"}`}>
                        <Text className={`text-[10px] font-bold ${promo.isActive ? "text-emerald-700" : "text-zinc-500"}`}>
                          {promo.isActive ? "Ativa" : "Inativa"}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View className="flex-row flex-wrap gap-1">
                    {promo.daysOfWeek.map((d) => (
                      <View key={d} className="rounded-lg px-2 py-0.5" style={{ backgroundColor: primaryColor + "15" }}>
                        <Text className="text-[10px] font-bold" style={{ color: primaryColor }}>{DAY_NAMES[d]}</Text>
                      </View>
                    ))}
                  </View>
                  {(promo.validFrom || promo.validUntil) && (
                    <Text className="text-xs text-zinc-400 mt-0.5">
                      {promo.validFrom && promo.validUntil
                        ? `${promo.validFrom.split("-").reverse().join("/")} → ${promo.validUntil.split("-").reverse().join("/")}`
                        : promo.validFrom
                        ? `A partir de ${promo.validFrom.split("-").reverse().join("/")}`
                        : `Até ${promo.validUntil!.split("-").reverse().join("/")}`}
                    </Text>
                  )}
                  <View className="flex-row gap-2 mt-1">
                    <Pressable onPress={() => openEditPromo(promo)} className="flex-1 h-8 bg-zinc-50 border border-zinc-200 rounded-xl items-center justify-center flex-row gap-1">
                      <Ionicons name="pencil-outline" size={13} color="#52525b" />
                      <Text className="text-zinc-600 font-bold text-xs">Editar</Text>
                    </Pressable>
                    <Pressable onPress={() => handleDeletePromo(promo.id)} className="flex-1 h-8 bg-red-50 border border-red-100 rounded-xl items-center justify-center flex-row gap-1">
                      <Ionicons name="trash-outline" size={13} color="#dc2626" />
                      <Text className="text-red-600 font-bold text-xs">Excluir</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Promo Modal */}
      <Modal visible={promoModalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPromoModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-5 pt-6 pb-4 border-b border-zinc-100">
            <Text className="text-lg font-black text-zinc-900">{editingPromo ? "Editar Promoção" : "Nova Promoção"}</Text>
            <Pressable onPress={() => setPromoModalOpen(false)} className="h-9 w-9 bg-zinc-100 rounded-xl items-center justify-center">
              <Ionicons name="close" size={20} color="#71717a" />
            </Pressable>
          </View>
          <ScrollView className="flex-1 px-5 py-5" keyboardShouldPersistTaps="handled">
            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Preço Promocional (R$)</Text>
              <TextInput
                className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base"
                placeholder="Ex: 49,90"
                placeholderTextColor="#a1a1aa"
                value={promoForm.promotionalPrice}
                onChangeText={(v) => setPromoForm(p => ({ ...p, promotionalPrice: v }))}
                keyboardType="decimal-pad"
              />
            </View>

            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-2">Dias da Semana</Text>
              <View className="flex-row flex-wrap gap-2">
                {DAY_NAMES.map((name, idx) => {
                  const selected = promoForm.daysOfWeek.includes(idx)
                  return (
                    <Pressable
                      key={idx}
                      onPress={() => setPromoForm(p => ({
                        ...p,
                        daysOfWeek: selected ? p.daysOfWeek.filter(d => d !== idx) : [...p.daysOfWeek, idx]
                      }))}
                      className="h-9 px-3 rounded-xl items-center justify-center border"
                      style={{ backgroundColor: selected ? primaryColor + "15" : "#fafafa", borderColor: selected ? primaryColor + "40" : "#e4e4e7" }}
                    >
                      <Text className="text-sm font-bold" style={{ color: selected ? primaryColor : "#71717a" }}>{name}</Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Válido a partir de (opcional)</Text>
              <DatePickerInput
                value={promoForm.validFrom}
                onChange={(v) => setPromoForm(p => ({ ...p, validFrom: v }))}
                placeholder="Sem data de início"
              />
              {promoForm.validFrom ? (
                <Pressable onPress={() => setPromoForm(p => ({ ...p, validFrom: "" }))} className="mt-1.5 self-start">
                  <Text className="text-xs text-zinc-400 underline">Remover data de início</Text>
                </Pressable>
              ) : null}
            </View>

            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Válido até (opcional)</Text>
              <DatePickerInput
                value={promoForm.validUntil}
                onChange={(v) => setPromoForm(p => ({ ...p, validUntil: v }))}
                placeholder="Sem data de término"
              />
              {promoForm.validUntil ? (
                <Pressable onPress={() => setPromoForm(p => ({ ...p, validUntil: "" }))} className="mt-1.5 self-start">
                  <Text className="text-xs text-zinc-400 underline">Remover data de término</Text>
                </Pressable>
              ) : null}
            </View>

            <View className="flex-row items-center justify-between py-3 mb-4 bg-zinc-50 border border-zinc-200 rounded-2xl px-4">
              <Text className="text-zinc-700 font-bold text-sm">Promoção Ativa</Text>
              <Switch
                value={promoForm.isActive}
                onValueChange={(v) => setPromoForm(p => ({ ...p, isActive: v }))}
                trackColor={{ false: "#e4e4e7", true: primaryColor + "60" }}
                thumbColor={promoForm.isActive ? primaryColor : "#a1a1aa"}
              />
            </View>
          </ScrollView>
          <View className="px-5 pb-8 pt-3 border-t border-zinc-100 flex-row gap-3">
            <Pressable onPress={() => setPromoModalOpen(false)} disabled={isSavingPromo} className="flex-1 h-14 rounded-2xl items-center justify-center bg-zinc-100">
              <Text className="text-zinc-700 font-black text-base">Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={handleSavePromo}
              disabled={isSavingPromo}
              className="flex-1 h-14 rounded-2xl items-center justify-center"
              style={{ backgroundColor: isSavingPromo ? primaryColor + "99" : primaryColor }}
            >
              {isSavingPromo ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-base">Salvar</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Confirm: Excluir promoção */}
      <ConfirmModal
        visible={confirmDeletePromoId !== null}
        title="Excluir promoção?"
        message="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        destructive
        onConfirm={executeDeletePromo}
        onCancel={() => setConfirmDeletePromoId(null)}
      />

      {/* Confirm: Excluir serviço */}
      <ConfirmModal
        visible={confirmDeleteServiceOpen}
        title="Excluir serviço?"
        message={`"${svc.name}" será removido permanentemente.`}
        confirmLabel="Excluir"
        destructive
        onConfirm={() => { setConfirmDeleteServiceOpen(false); deleteService() }}
        onCancel={() => setConfirmDeleteServiceOpen(false)}
      />
    </SafeAreaView>
  )
}

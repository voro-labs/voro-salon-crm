import React, { useState } from "react"
import { View, Text, ScrollView, ActivityIndicator, Pressable, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, Switch } from "react-native"
import { ConfirmModal } from "components/ConfirmModal"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { ScreenHeader } from "components/ScreenHeader"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { CurrencyInput } from "components/CurrencyInput"
import { useMembershipPlans, defaultMembershipPlanForm, MembershipPlan } from "hooks/use-membership-plans.hook"

function formatCurrency(val: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val)
}

export default function MembershipPlansScreen() {
  const router = useRouter()
  const { primaryColor } = useTenantTheme()
  const insets = useSafeAreaInsets()

  const {
    plans, isLoading, isSaving, isDeleting,
    form, setForm, editingId, setEditingId, savePlan, deletePlan
  } = useMembershipPlans()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmDeletePlan, setConfirmDeletePlan] = useState<MembershipPlan | null>(null)

  function openCreate() {
    setEditingId(null)
    setForm(defaultMembershipPlanForm)
    setDialogOpen(true)
  }

  function openEdit(plan: MembershipPlan) {
    setEditingId(plan.id)
    setForm({
      name: plan.name,
      description: plan.description ?? "",
      price: plan.price,
      sessions: plan.sessions ?? "",
      durationDays: plan.durationDays,
      isActive: plan.isActive,
      unlimitedSessions: plan.sessions === null,
    })
    setDialogOpen(true)
  }

  function confirmDelete(plan: MembershipPlan) {
    setConfirmDeletePlan(plan)
  }

  async function handleSave() {
    const success = await savePlan(form)
    if (success) {
      setDialogOpen(false)
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-50 items-center justify-center">
        <ActivityIndicator color={primaryColor} size="large" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={["bottom"]}>
      <ScreenHeader
        title="Planos de Fidelidade"
        showBack
        onBack={() => router.back()}
        right={
          <Pressable onPress={openCreate} className="h-9 w-9 rounded-xl items-center justify-center bg-zinc-100">
            <Ionicons name="add" size={20} color="#18181b" />
          </Pressable>
        }
      />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {!plans || plans.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <View className="h-16 w-16 rounded-full bg-zinc-100 items-center justify-center mb-4">
              <Ionicons name="card-outline" size={32} color="#a1a1aa" />
            </View>
            <Text className="text-lg font-black text-zinc-900 mb-1">Nenhum plano cadastrado</Text>
            <Text className="text-zinc-500 text-sm text-center px-6">Crie pacotes e planos para fidelizar e reter mais clientes.</Text>
            <Pressable
              onPress={openCreate}
              className="mt-6 px-6 py-3 rounded-xl flex-row items-center gap-2"
              style={{ backgroundColor: primaryColor }}
            >
              <Ionicons name="add" size={18} color="white" />
              <Text className="text-white font-bold">Criar Plano</Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-3">
            {plans.map((plan) => (
              <View
                key={plan.id}
                className="bg-white rounded-3xl p-5 border flex-row gap-4"
                style={{
                  borderColor: plan.isActive ? "#f4f4f5" : "#e4e4e7",
                  opacity: plan.isActive ? 1 : 0.6
                }}
              >
                <View className="h-12 w-12 rounded-2xl items-center justify-center shrink-0" style={{ backgroundColor: primaryColor + "15" }}>
                  <Ionicons name="card-outline" size={24} color={primaryColor} />
                </View>
                
                <View className="flex-1">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className="text-base font-black text-zinc-900">{plan.name}</Text>
                    {!plan.isActive && (
                      <View className="px-2 border border-zinc-200 rounded-md">
                        <Text className="text-[10px] font-bold text-zinc-500 uppercase">Inativo</Text>
                      </View>
                    )}
                  </View>
                  
                  {plan.description && (
                    <Text className="text-sm text-zinc-500 mb-2" numberOfLines={2}>
                      {plan.description}
                    </Text>
                  )}
                  
                  <View className="flex-row flex-wrap items-center gap-2 mt-1">
                    <Text className="text-zinc-900 font-bold">{formatCurrency(plan.price)}</Text>
                    <Text className="text-zinc-300">•</Text>
                    <Text className="text-zinc-600 text-xs font-medium">{plan.durationDays} dias</Text>
                    <Text className="text-zinc-300">•</Text>
                    {plan.sessions === null ? (
                      <View className="flex-row items-center gap-1">
                        <Ionicons name="infinite" size={12} color="#52525b" />
                        <Text className="text-zinc-600 text-xs font-medium">sessões</Text>
                      </View>
                    ) : (
                      <Text className="text-zinc-600 text-xs font-medium">{plan.sessions} sessões</Text>
                    )}
                  </View>
                </View>

                <View className="justify-start items-center gap-1">
                  <Pressable onPress={() => openEdit(plan)} className="h-8 w-8 items-center justify-center bg-zinc-50 rounded-lg">
                    <Ionicons name="pencil" size={14} color="#52525b" />
                  </Pressable>
                  <Pressable onPress={() => confirmDelete(plan)} className="h-8 w-8 items-center justify-center bg-red-50 rounded-lg">
                    {isDeleting ? <ActivityIndicator size="small" color="#ef4444" /> : <Ionicons name="trash" size={14} color="#ef4444" />}
                  </Pressable>
                </View>

              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Confirm: Excluir plano */}
      <ConfirmModal
        visible={confirmDeletePlan !== null}
        title="Excluir plano?"
        message={`O plano "${confirmDeletePlan?.name}" será excluído. Assinaturas ativas não serão afetadas.`}
        confirmLabel="Excluir"
        destructive
        onConfirm={() => { const plan = confirmDeletePlan!; setConfirmDeletePlan(null); deletePlan(plan.id) }}
        onCancel={() => setConfirmDeletePlan(null)}
      />

      {/* Edit Modal */}
      <Modal visible={dialogOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDialogOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-5 pt-6 pb-4 border-b border-zinc-100">
            <Text className="text-lg font-black text-zinc-900">{editingId ? "Editar Plano" : "Novo Plano"}</Text>
            <Pressable onPress={() => setDialogOpen(false)} className="h-9 w-9 bg-zinc-100 rounded-xl items-center justify-center">
              <Ionicons name="close" size={20} color="#71717a" />
            </Pressable>
          </View>

          <ScrollView className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false}>
            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Nome do Plano *</Text>
              <TextInput
                className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base"
                placeholder="Ex: Pacote Escova 4x"
                placeholderTextColor="#a1a1aa"
                value={form.name}
                onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
              />
            </View>

            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Descrição</Text>
              <TextInput
                className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base h-20"
                placeholder="Descreva as vantagens do plano"
                placeholderTextColor="#a1a1aa"
                value={form.description}
                onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-zinc-700 font-bold text-sm mb-1.5">Duração (dias) *</Text>
                <TextInput
                  className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base"
                  placeholder="30"
                  placeholderTextColor="#a1a1aa"
                  keyboardType="number-pad"
                  value={form.durationDays.toString()}
                  onChangeText={(v) => setForm((p) => ({ ...p, durationDays: v ? Number(v) : 0 }))}
                />
              </View>
              <View className="flex-1">
                <Text className="text-zinc-700 font-bold text-sm mb-1.5">Preço *</Text>
                <CurrencyInput
                  value={form.price}
                  onChange={(v) => setForm((p) => ({ ...p, price: v }))}
                />
              </View>
            </View>

            <View className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 mb-4 gap-4">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-zinc-700 font-bold text-sm">Sessões Ilimitadas</Text>
                  <Text className="text-zinc-400 text-xs mt-0.5">O cliente pode marcar quantas vezes quiser no período.</Text>
                </View>
                <Switch
                  value={form.unlimitedSessions}
                  onValueChange={(v) => setForm((p) => ({ ...p, unlimitedSessions: v, sessions: v ? "" : p.sessions }))}
                  trackColor={{ false: "#e4e4e7", true: primaryColor + "60" }}
                  thumbColor={form.unlimitedSessions ? primaryColor : "#a1a1aa"}
                />
              </View>
              
              {!form.unlimitedSessions && (
                <View className="border-t border-zinc-200 pt-4">
                  <Text className="text-zinc-700 font-bold text-sm mb-1.5">Quantidade de Sessões</Text>
                  <TextInput
                    className="bg-white border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 font-semibold text-base"
                    placeholder="Ex: 4"
                    placeholderTextColor="#a1a1aa"
                    keyboardType="number-pad"
                    value={form.sessions.toString()}
                    onChangeText={(v) => setForm((p) => ({ ...p, sessions: v }))}
                  />
                </View>
              )}
            </View>

            <View className="flex-row items-center justify-between py-3 mb-8 bg-white border border-zinc-200 rounded-2xl px-4">
              <View>
                <Text className="text-zinc-700 font-bold text-sm">Plano Ativo</Text>
                <Text className="text-zinc-400 text-xs mt-0.5">Aparece para ser adicionado aos clientes.</Text>
              </View>
              <Switch
                value={form.isActive}
                onValueChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
                trackColor={{ false: "#e4e4e7", true: primaryColor + "60" }}
                thumbColor={form.isActive ? primaryColor : "#a1a1aa"}
              />
            </View>

          </ScrollView>

          <View className="px-5 pb-8 pt-3 border-t border-zinc-100">
            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              className="h-14 rounded-2xl items-center justify-center flex-row gap-2"
              style={{ backgroundColor: isSaving ? primaryColor + "99" : primaryColor }}
            >
              {isSaving
                ? <ActivityIndicator color="white" />
                : <Text className="text-white font-black text-base">Salvar Plano</Text>
              }
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

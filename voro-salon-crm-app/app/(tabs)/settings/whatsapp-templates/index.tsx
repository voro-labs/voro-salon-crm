import React, { useState } from "react"
import { View, Text, ScrollView, ActivityIndicator, Pressable, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, Switch } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { ScreenHeader } from "components/ScreenHeader"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { useWhatsAppTemplates, defaultWhatsAppTemplateForm, WhatsAppTemplate } from "hooks/use-whatsapp-templates.hook"

export default function WhatsAppTemplatesScreen() {
  const router = useRouter()
  const { primaryColor } = useTenantTheme()

  const {
    templates, isLoading, isSaving, isDeleting,
    form, setForm, editingId, setEditingId, saveTemplate, deleteTemplate
  } = useWhatsAppTemplates()

  const [dialogOpen, setDialogOpen] = useState(false)

  function openCreate() {
    setEditingId(null)
    setForm(defaultWhatsAppTemplateForm)
    setDialogOpen(true)
  }

  function openEdit(t: WhatsAppTemplate) {
    setEditingId(t.id)
    setForm({
      name: t.name,
      label: t.label,
      paramsCount: t.paramsCount,
      paramLabelsText: (t.paramLabels ?? []).join("\n"),
      isActive: t.isActive,
    })
    setDialogOpen(true)
  }

  function confirmDelete(t: WhatsAppTemplate) {
    Alert.alert(
      "Excluir template?",
      `O template "${t.label}" será removido e as mensagens que o utilizam poderão falhar.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: () => deleteTemplate(t.id) }
      ]
    )
  }

  async function handleSave() {
    const success = await saveTemplate(form)
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
        title="Templates de Mensagem"
        showBack
        onBack={() => router.back()}
        right={
          <Pressable onPress={openCreate} className="h-9 w-9 rounded-xl items-center justify-center bg-zinc-100">
            <Ionicons name="add" size={20} color="#18181b" />
          </Pressable>
        }
      />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {!templates || templates.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <View className="h-16 w-16 rounded-full bg-zinc-100 items-center justify-center mb-4">
              <Ionicons name="chatbubbles-outline" size={32} color="#a1a1aa" />
            </View>
            <Text className="text-lg font-black text-zinc-900 mb-1">Nenhum template</Text>
            <Text className="text-zinc-500 text-sm text-center px-6">Configure os templates do Meta Business para usá-los no bot.</Text>
            <Pressable
              onPress={openCreate}
              className="mt-6 px-6 py-3 rounded-xl flex-row items-center gap-2"
              style={{ backgroundColor: primaryColor }}
            >
              <Ionicons name="add" size={18} color="white" />
              <Text className="text-white font-bold">Criar Template</Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-3">
            {templates.map((t) => (
              <View
                key={t.id}
                className="bg-white rounded-3xl p-5 border flex-row gap-4"
                style={{
                  borderColor: t.isActive ? "#f4f4f5" : "#e4e4e7",
                  opacity: t.isActive ? 1 : 0.6
                }}
              >
                <View className="h-12 w-12 rounded-2xl items-center justify-center shrink-0" style={{ backgroundColor: primaryColor + "15" }}>
                  <Ionicons name="chatbubbles-outline" size={24} color={primaryColor} />
                </View>
                
                <View className="flex-1">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className="text-base font-black text-zinc-900" numberOfLines={1}>{t.label}</Text>
                    {!t.isActive && (
                      <View className="px-2 border border-zinc-200 rounded-md">
                        <Text className="text-[10px] font-bold text-zinc-500 uppercase">Inativo</Text>
                      </View>
                    )}
                  </View>
                  
                  <Text className="text-xs font-mono text-zinc-400 mb-2">{t.name}</Text>
                  
                  {t.paramLabels && t.paramLabels.length > 0 && (
                    <Text className="text-xs text-zinc-500 font-medium">
                      {t.paramsCount} param{t.paramsCount > 1 ? "s" : ""}: {t.paramLabels.join(", ")}
                    </Text>
                  )}
                </View>

                <View className="justify-start items-center gap-1">
                  <Pressable onPress={() => openEdit(t)} className="h-8 w-8 items-center justify-center bg-zinc-50 rounded-lg">
                    <Ionicons name="pencil" size={14} color="#52525b" />
                  </Pressable>
                  <Pressable onPress={() => confirmDelete(t)} className="h-8 w-8 items-center justify-center bg-red-50 rounded-lg">
                    {isDeleting ? <ActivityIndicator size="small" color="#ef4444" /> : <Ionicons name="trash" size={14} color="#ef4444" />}
                  </Pressable>
                </View>

              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={dialogOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDialogOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-5 pt-6 pb-4 border-b border-zinc-100">
            <Text className="text-lg font-black text-zinc-900">{editingId ? "Editar Template" : "Novo Template"}</Text>
            <Pressable onPress={() => setDialogOpen(false)} className="h-9 w-9 bg-zinc-100 rounded-xl items-center justify-center">
              <Ionicons name="close" size={20} color="#71717a" />
            </Pressable>
          </View>

          <ScrollView className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false}>
            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Nome Técnico (Meta) *</Text>
              <TextInput
                className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base"
                placeholder="Ex: appointment_reminder_1"
                placeholderTextColor="#a1a1aa"
                value={form.name}
                onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
                autoCapitalize="none"
              />
            </View>

            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Rótulo Dinâmico *</Text>
              <TextInput
                className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base"
                placeholder="Ex: Lembrete de Agendamento"
                placeholderTextColor="#a1a1aa"
                value={form.label}
                onChangeText={(v) => setForm((p) => ({ ...p, label: v }))}
              />
            </View>

            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Quantidade de Parâmetros</Text>
              <TextInput
                className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base"
                placeholder="0"
                placeholderTextColor="#a1a1aa"
                keyboardType="number-pad"
                value={form.paramsCount.toString()}
                onChangeText={(v) => setForm((p) => ({ ...p, paramsCount: v ? parseInt(v) : 0 }))}
              />
            </View>

            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Labels dos Parâmetros (um por linha)</Text>
              <TextInput
                className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base h-24"
                placeholder="Nome do cliente&#10;Data do agendamento"
                placeholderTextColor="#a1a1aa"
                value={form.paramLabelsText}
                onChangeText={(v) => setForm((p) => ({ ...p, paramLabelsText: v }))}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View className="flex-row items-center justify-between py-3 mb-8 bg-white border border-zinc-200 rounded-2xl px-4">
              <View>
                <Text className="text-zinc-700 font-bold text-sm">Template Ativo</Text>
                <Text className="text-zinc-400 text-xs mt-0.5">Visível na listagem de disparos da agenda.</Text>
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
                : <Text className="text-white font-black text-base">Salvar Template</Text>
              }
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

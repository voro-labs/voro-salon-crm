import React, { useState, useEffect } from "react"
import { View, Text, ScrollView, ActivityIndicator, Pressable, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, Switch } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { ScreenHeader } from "components/ScreenHeader"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { useWhatsAppTemplates, defaultWhatsAppTemplateForm, WhatsAppTemplate } from "hooks/use-whatsapp-templates.hook"
import { useSettings } from "hooks/use-settings.hook"

export default function WhatsAppSettingsScreen() {
  const router = useRouter()
  const { primaryColor } = useTenantTheme()
  const { form: settingsForm, setForm: setSettingsForm, saveTenant, isSaving: isSavingSettings } = useSettings()

  const {
    templates, isLoading: isLoadingTemplates, isSaving: isSavingTemplate, isDeleting,
    form: templateForm, setForm: setTemplateForm, editingId, setEditingId, saveTemplate, deleteTemplate
  } = useWhatsAppTemplates()

  const [dialogOpen, setDialogOpen] = useState(false)

  // Toggle useWhatsappBooking
  const handleToggleWhatsappBooking = async (value: boolean) => {
    if (!settingsForm) return
    const updatedForm = { ...settingsForm, useWhatsappBooking: value }
    setSettingsForm(updatedForm)
    await saveTenant(updatedForm)
  }

  function openCreate() {
    setEditingId(null)
    setTemplateForm(defaultWhatsAppTemplateForm)
    setDialogOpen(true)
  }

  function openEdit(t: WhatsAppTemplate) {
    setEditingId(t.id)
    setTemplateForm({
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

  async function handleSaveTemplate() {
    const success = await saveTemplate(templateForm)
    if (success) {
      setDialogOpen(false)
    }
  }

  if (isLoadingTemplates || !settingsForm) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-50 items-center justify-center">
        <ActivityIndicator color={primaryColor} size="large" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={["bottom"]}>
      <ScreenHeader
        title="Configurações do WhatsApp"
        showBack
        onBack={() => router.back()}
      />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        
        {/* Boolean Toggle Section */}
        <View className="mb-6">
          <Text className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2 px-1">
            Geral
          </Text>
          <View className="bg-white rounded-3xl border border-zinc-100 p-4 flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-zinc-900 font-bold text-base">Ativar Bot do WhatsApp</Text>
              <Text className="text-zinc-500 text-xs mt-0.5">
                Permite o agendamento automático e gestão de conversas via WhatsApp Business API.
              </Text>
            </View>
            {isSavingSettings ? (
              <ActivityIndicator size="small" color={primaryColor} />
            ) : (
              <Switch
                value={settingsForm.useWhatsappBooking}
                onValueChange={handleToggleWhatsappBooking}
                trackColor={{ false: "#e4e4e7", true: primaryColor + "60" }}
                thumbColor={settingsForm.useWhatsappBooking ? primaryColor : "#a1a1aa"}
              />
            )}
          </View>
        </View>

        {/* Templates Section */}
        <View>
          <View className="flex-row items-center justify-between mb-2 px-1">
            <Text className="text-zinc-500 text-xs font-bold uppercase tracking-wider">
              Templates de Mensagem
            </Text>
            <Pressable onPress={openCreate} className="flex-row items-center gap-1">
              <Ionicons name="add" size={14} color={primaryColor} />
              <Text className="text-xs font-bold" style={{ color: primaryColor }}>Adicionar</Text>
            </Pressable>
          </View>

          {!templates || templates.length === 0 ? (
            <View className="bg-white rounded-3xl border border-zinc-100 p-8 items-center justify-center">
              <View className="h-12 w-12 rounded-full bg-zinc-50 items-center justify-center mb-3">
                <Ionicons name="chatbubbles-outline" size={24} color="#d4d4d8" />
              </View>
              <Text className="text-base font-bold text-zinc-900 mb-1">Nenhum template</Text>
              <Text className="text-zinc-500 text-xs text-center">Configure os templates do Meta Business.</Text>
            </View>
          ) : (
            <View className="gap-3">
              {templates.map((t) => (
                <View
                  key={t.id}
                  className="bg-white rounded-3xl p-4 border flex-row gap-3 items-center"
                  style={{
                    borderColor: t.isActive ? "#f4f4f5" : "#e4e4e7",
                    opacity: t.isActive ? 1 : 0.6
                  }}
                >
                  <View className="h-10 w-10 rounded-xl items-center justify-center shrink-0" style={{ backgroundColor: primaryColor + "15" }}>
                    <Ionicons name="chatbubbles-outline" size={20} color={primaryColor} />
                  </View>
                  
                  <View className="flex-1 min-w-0">
                    <Text className="text-sm font-black text-zinc-900" numberOfLines={1}>{t.label}</Text>
                    <Text className="text-[10px] font-mono text-zinc-400" numberOfLines={1}>{t.name}</Text>
                  </View>

                  <View className="flex-row items-center gap-1.5">
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
        </View>
      </ScrollView>

      {/* Edit Modal (unchanged from whatsapp-templates/index.tsx but adjusted) */}
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
                value={templateForm.name}
                onChangeText={(v) => setTemplateForm((p) => ({ ...p, name: v }))}
                autoCapitalize="none"
              />
            </View>

            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Rótulo Dinâmico *</Text>
              <TextInput
                className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base"
                placeholder="Ex: Lembrete de Agendamento"
                placeholderTextColor="#a1a1aa"
                value={templateForm.label}
                onChangeText={(v) => setTemplateForm((p) => ({ ...p, label: v }))}
              />
            </View>

            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Quantidade de Parâmetros</Text>
              <TextInput
                className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base"
                placeholder="0"
                placeholderTextColor="#a1a1aa"
                keyboardType="number-pad"
                value={templateForm.paramsCount.toString()}
                onChangeText={(v) => setTemplateForm((p) => ({ ...p, paramsCount: v ? parseInt(v) : 0 }))}
              />
            </View>

            <View className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Labels dos Parâmetros (um por linha)</Text>
              <TextInput
                className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base h-24"
                placeholder="Nome do cliente&#10;Data do agendamento"
                placeholderTextColor="#a1a1aa"
                value={templateForm.paramLabelsText}
                onChangeText={(v) => setTemplateForm((p) => ({ ...p, paramLabelsText: v }))}
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
                value={templateForm.isActive}
                onValueChange={(v) => setTemplateForm((p) => ({ ...p, isActive: v }))}
                trackColor={{ false: "#e4e4e7", true: primaryColor + "60" }}
                thumbColor={templateForm.isActive ? primaryColor : "#a1a1aa"}
              />
            </View>
          </ScrollView>

          <View className="px-5 pb-8 pt-3 border-t border-zinc-100">
            <Pressable
              onPress={handleSaveTemplate}
              disabled={isSavingTemplate}
              className="h-14 rounded-2xl items-center justify-center flex-row gap-2"
              style={{ backgroundColor: isSavingTemplate ? primaryColor + "99" : primaryColor }}
            >
              {isSavingTemplate
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

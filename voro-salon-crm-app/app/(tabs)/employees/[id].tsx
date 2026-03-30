import React, { useState, useEffect } from "react"
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  Modal, TextInput, Alert, KeyboardAvoidingView, Platform, Switch,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, router } from "expo-router"
import { useEmployeeDetail } from "hooks/use-employee-detail.hook"
import { ScreenHeader } from "components/ScreenHeader"
import { DatePickerInput } from "components/DatePickerInput"
import { ImagePickerInput } from "components/ImagePickerInput"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { Image } from "react-native"

function formatDate(dateStr?: string) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}

export default function EmployeeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const {
    employee, services,
    form,
    isLoading, isSaving, isDeleting,
    saveEmployee, deleteEmployee,
    handlePhotoUpload, isUploadingPhoto
  } = useEmployeeDetail(id)
  const { primaryColor } = useTenantTheme()

  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ ...form })

  useEffect(() => {
    if (employee) {
      setEditForm({ ...form })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee])

  function openEdit() {
    setEditForm({ ...form })
    setEditOpen(true)
  }

  async function handleEditSubmit() {
    const success = await saveEmployee(editForm)
    if (success) setEditOpen(false)
  }

  function handleDelete() {
    Alert.alert(
      "Excluir funcionário?",
      `Isso irá remover ${employee?.name} permanentemente. Essa ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: () => deleteEmployee() },
      ]
    )
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
      </ScrollView>

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

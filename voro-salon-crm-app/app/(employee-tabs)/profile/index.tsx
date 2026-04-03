import React, { useState } from "react"
import { View, Text, Pressable, TextInput, Alert, ActivityIndicator, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { ScreenHeader } from "components/ScreenHeader"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { useAuth } from "contexts/auth.context"
import { secureApiCall, API_CONFIG } from "lib/api"
import { Toast } from "toastify-react-native"

export default function EmployeeProfile() {
  const { primaryColor } = useTenantTheme()
  const { user, logout } = useAuth()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Toast.error("Preencha todos os campos.")
      return
    }
    if (newPassword !== confirmPassword) {
      Toast.error("As senhas não coincidem.")
      return
    }
    if (newPassword.length < 6) {
      Toast.error("A senha deve ter pelo menos 6 caracteres.")
      return
    }
    setIsSaving(true)
    try {
      const res = await secureApiCall(API_CONFIG.ENDPOINTS.CHANGE_PASSWORD, {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      if (res.hasError) {
        Toast.error(res.message || "Erro ao alterar senha.")
      } else {
        Toast.success("Senha alterada com sucesso!")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      }
    } catch {
      Toast.error("Erro de conexão.")
    } finally {
      setIsSaving(false)
    }
  }

  function handleLogout() {
    Alert.alert("Sair", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: logout },
    ])
  }

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.userName || "Funcionário"
  const inputClass = "bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base"

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={[]}>
      <ScreenHeader title="Perfil" />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Info do usuário */}
        <View className="bg-white rounded-3xl border border-zinc-100 p-5 mb-4">
          <View className="flex-row items-center gap-4">
            <View className="w-14 h-14 rounded-2xl items-center justify-center" style={{ backgroundColor: primaryColor + "20" }}>
              <Text className="font-black text-lg" style={{ color: primaryColor }}>
                {displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
              </Text>
            </View>
            <View>
              <Text className="text-zinc-900 font-black text-base">{displayName}</Text>
              <Text className="text-zinc-400 text-sm">{user?.email}</Text>
            </View>
          </View>
        </View>

        {/* Alterar senha */}
        <View className="bg-white rounded-3xl border border-zinc-100 p-5 mb-4">
          <Text className="text-base font-black text-zinc-900 mb-4">Alterar Senha</Text>

          <View className="mb-4">
            <Text className="text-zinc-700 font-bold text-sm mb-1.5">Senha Atual</Text>
            <TextInput
              className={inputClass}
              placeholder="Senha atual"
              placeholderTextColor="#a1a1aa"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
            />
          </View>

          <View className="mb-4">
            <Text className="text-zinc-700 font-bold text-sm mb-1.5">Nova Senha</Text>
            <TextInput
              className={inputClass}
              placeholder="Nova senha"
              placeholderTextColor="#a1a1aa"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
          </View>

          <View className="mb-4">
            <Text className="text-zinc-700 font-bold text-sm mb-1.5">Confirmar Nova Senha</Text>
            <TextInput
              className={inputClass}
              placeholder="Confirmar nova senha"
              placeholderTextColor="#a1a1aa"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>

          <Pressable
            onPress={handleChangePassword}
            disabled={isSaving}
            className="h-14 rounded-2xl items-center justify-center"
            style={{ backgroundColor: isSaving ? primaryColor + "99" : primaryColor }}
          >
            {isSaving
              ? <ActivityIndicator color="white" />
              : <Text className="text-white font-black text-base">Alterar Senha</Text>
            }
          </Pressable>
        </View>

        {/* Sair */}
        <Pressable
          onPress={handleLogout}
          className="bg-white rounded-3xl border border-red-100 p-4 flex-row items-center justify-center gap-2"
        >
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text className="text-red-500 font-black text-base">Sair da Conta</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

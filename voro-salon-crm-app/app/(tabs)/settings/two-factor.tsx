import React, { useState } from "react"
import { View, Text, Pressable, Alert, TextInput, ActivityIndicator, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useAuth } from "contexts/auth.context"
import { ScreenHeader } from "components/ScreenHeader"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { apiCall, API_CONFIG } from "lib/api"

type Step = "idle" | "request" | "confirm"

export default function TwoFactorScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { primaryColor } = useTenantTheme()

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled ?? false)
  const [step, setStep] = useState<Step>("idle")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleRequestCode = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await apiCall<null>(API_CONFIG.ENDPOINTS.ENABLE_2FA_REQUEST, { method: "POST" })
      if (res.hasError) {
        setError(res.message ?? "Erro ao enviar código.")
        return
      }
      setStep("confirm")
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmCode = async () => {
    if (code.length !== 6) return
    setLoading(true)
    setError("")
    try {
      const res = await apiCall<null>(API_CONFIG.ENDPOINTS.ENABLE_2FA_CONFIRM, {
        method: "POST",
        body: JSON.stringify({ code }),
      })
      if (res.hasError) {
        setError(res.message ?? "Código inválido.")
        return
      }
      setTwoFactorEnabled(true)
      setStep("idle")
      setCode("")
      Alert.alert("2FA ativado", "Autenticação de dois fatores ativada com sucesso!")
    } finally {
      setLoading(false)
    }
  }

  const handleDisable = () => {
    Alert.alert(
      "Desativar 2FA",
      "Sua conta ficará protegida apenas por senha. Deseja continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desativar",
          style: "destructive",
          onPress: async () => {
            setLoading(true)
            setError("")
            try {
              const res = await apiCall<null>(API_CONFIG.ENDPOINTS.DISABLE_2FA, { method: "POST" })
              if (res.hasError) {
                setError(res.message ?? "Erro ao desativar.")
                return
              }
              setTwoFactorEnabled(false)
            } finally {
              setLoading(false)
            }
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={[]}>
      <ScreenHeader title="Autenticação de dois fatores" />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Status Card */}
        <View className="bg-white rounded-3xl p-4 border border-zinc-100">
          <View className="flex-row items-center gap-3 mb-1">
            <View
              className="h-10 w-10 rounded-2xl items-center justify-center"
              style={{ backgroundColor: twoFactorEnabled ? "#f0fdf4" : "#f4f4f5" }}
            >
              <Ionicons
                name={twoFactorEnabled ? "shield-checkmark" : "shield-outline"}
                size={20}
                color={twoFactorEnabled ? "#16a34a" : "#71717a"}
              />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-zinc-900 text-base">
                {twoFactorEnabled ? "2FA ativado" : "2FA desativado"}
              </Text>
              <Text className="text-zinc-500 text-xs mt-0.5">
                {twoFactorEnabled
                  ? "Um código será enviado por e-mail a cada login."
                  : "Ative para aumentar a segurança da sua conta."}
              </Text>
            </View>
          </View>
        </View>

        {error ? (
          <Text className="text-red-500 text-sm text-center">{error}</Text>
        ) : null}

        {/* Step: idle */}
        {step === "idle" && !twoFactorEnabled && (
          <Pressable
            onPress={() => { setError(""); setStep("request") }}
            className="bg-white rounded-3xl p-4 border border-zinc-100 flex-row items-center gap-3 active:bg-zinc-50"
          >
            <View
              className="h-9 w-9 rounded-xl items-center justify-center"
              style={{ backgroundColor: primaryColor + "20" }}
            >
              <Ionicons name="mail-outline" size={18} color={primaryColor} />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-zinc-900 text-base">Ativar via e-mail</Text>
              <Text className="text-zinc-500 text-xs mt-0.5">Enviar código para {user?.email}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#d4d4d8" />
          </Pressable>
        )}

        {step === "idle" && twoFactorEnabled && (
          <Pressable
            onPress={handleDisable}
            disabled={loading}
            className="bg-white rounded-3xl p-4 border border-red-100 flex-row items-center gap-3 active:bg-red-50"
          >
            <View className="h-9 w-9 rounded-xl items-center justify-center bg-red-50">
              <Ionicons name="shield-off-outline" size={18} color="#ef4444" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-red-600 text-base">Desativar 2FA</Text>
              <Text className="text-zinc-500 text-xs mt-0.5">Remover a verificação de dois fatores</Text>
            </View>
            {loading
              ? <ActivityIndicator size="small" color="#ef4444" />
              : <Ionicons name="chevron-forward" size={16} color="#d4d4d8" />
            }
          </Pressable>
        )}

        {/* Step: request confirmation */}
        {step === "request" && (
          <View className="bg-white rounded-3xl p-5 border border-zinc-100 gap-4">
            <Text className="font-bold text-zinc-900 text-base text-center">Enviar código de verificação</Text>
            <Text className="text-zinc-500 text-sm text-center">
              Um código de 6 dígitos será enviado para{"\n"}
              <Text className="font-semibold text-zinc-700">{user?.email}</Text>
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setStep("idle")}
                className="flex-1 py-3 rounded-2xl border border-zinc-200 items-center"
              >
                <Text className="font-bold text-zinc-700">Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleRequestCode}
                disabled={loading}
                className="flex-1 py-3 rounded-2xl items-center"
                style={{ backgroundColor: primaryColor }}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text className="font-bold text-white">Enviar</Text>
                }
              </Pressable>
            </View>
          </View>
        )}

        {/* Step: enter code */}
        {step === "confirm" && (
          <View className="bg-white rounded-3xl p-5 border border-zinc-100 gap-4">
            <Text className="font-bold text-zinc-900 text-base text-center">Digite o código</Text>
            <Text className="text-zinc-500 text-sm text-center">
              Insira o código de 6 dígitos enviado para {user?.email}.{"\n"}Válido por 10 minutos.
            </Text>
            <TextInput
              className="border border-zinc-200 rounded-2xl px-4 py-3 text-center text-2xl font-bold tracking-widest text-zinc-900"
              placeholder="000000"
              placeholderTextColor="#d4d4d8"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
              autoFocus
            />
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => { setStep("idle"); setCode("") }}
                className="flex-1 py-3 rounded-2xl border border-zinc-200 items-center"
              >
                <Text className="font-bold text-zinc-700">Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmCode}
                disabled={loading || code.length !== 6}
                className="flex-1 py-3 rounded-2xl items-center"
                style={{ backgroundColor: code.length === 6 ? primaryColor : "#d4d4d8" }}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text className="font-bold text-white">Confirmar</Text>
                }
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

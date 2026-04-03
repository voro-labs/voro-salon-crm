import React, { useEffect, useRef, useState } from "react"
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { ScreenHeader } from "components/ScreenHeader"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { useAuth } from "contexts/auth.context"
import { apiCall, API_CONFIG } from "lib/api"

const CODE_LENGTH = 6
type Step = "idle" | "request" | "confirm"

export default function EmployeeSettings() {
  const { primaryColor } = useTenantTheme()
  const { user, logout } = useAuth()

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled ?? false)
  const [step, setStep] = useState<Step>("idle")
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const inputRefs = useRef<(TextInput | null)[]>([])
  const code = digits.join("")

  useEffect(() => {
    if (step === "confirm" && code.length === CODE_LENGTH && !digits.includes("") && !loading) {
      handleConfirmCode()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  function handleChange(index: number, value: string) {
    const cleaned = value.replace(/\D/g, "")
    setError("")
    if (cleaned.length > 1) {
      const pasted = cleaned.slice(0, CODE_LENGTH).split("")
      const next = Array(CODE_LENGTH).fill("")
      pasted.forEach((d, i) => { next[i] = d })
      setDigits(next)
      const lastIndex = Math.min(pasted.length - 1, CODE_LENGTH - 1)
      setTimeout(() => inputRefs.current[lastIndex]?.focus(), 10)
      return
    }
    const digit = cleaned.slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleKeyPress(index: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) {
    if (e.nativeEvent.key === "Backspace") {
      if (digits[index]) {
        const next = [...digits]
        next[index] = ""
        setDigits(next)
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
    }
  }

  function resetDigits() {
    setDigits(Array(CODE_LENGTH).fill(""))
    setTimeout(() => inputRefs.current[0]?.focus(), 50)
  }

  const handleRequestCode = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await apiCall<null>(API_CONFIG.ENDPOINTS.ENABLE_2FA_REQUEST, { method: "POST" })
      if (res.hasError) { setError(res.message ?? "Erro ao enviar código."); return }
      setStep("confirm")
      setTimeout(() => inputRefs.current[0]?.focus(), 150)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmCode = async () => {
    const currentCode = digits.join("")
    if (currentCode.length !== CODE_LENGTH) return
    setLoading(true)
    setError("")
    try {
      const res = await apiCall<null>(API_CONFIG.ENDPOINTS.ENABLE_2FA_CONFIRM, {
        method: "POST",
        body: JSON.stringify({ code: currentCode }),
      })
      if (res.hasError) {
        setError(res.message ?? "Código inválido.")
        resetDigits()
        return
      }
      setTwoFactorEnabled(true)
      setStep("idle")
      setDigits(Array(CODE_LENGTH).fill(""))
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
              if (res.hasError) { setError(res.message ?? "Erro ao desativar."); return }
              setTwoFactorEnabled(false)
            } finally {
              setLoading(false)
            }
          },
        },
      ]
    )
  }

  function handleLogout() {
    Alert.alert("Sair", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: logout },
    ])
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={[]}>
      <ScreenHeader title="Configurações" />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* 2FA Status */}
        <View className="bg-white rounded-3xl p-5 border border-zinc-100 mb-4">
          <View className="flex-row items-center gap-4 mb-4">
            <View
              className="h-12 w-12 rounded-2xl items-center justify-center"
              style={{ backgroundColor: twoFactorEnabled ? "#f0fdf4" : "#f4f4f5" }}
            >
              <Ionicons
                name={twoFactorEnabled ? "shield-checkmark" : "shield-outline"}
                size={24}
                color={twoFactorEnabled ? "#16a34a" : "#71717a"}
              />
            </View>
            <View className="flex-1">
              <Text className="font-black text-zinc-900 text-base">
                {twoFactorEnabled ? "2FA Ativo" : "2FA Desativado"}
              </Text>
              <Text className="text-zinc-500 text-sm mt-0.5">
                {twoFactorEnabled
                  ? "Conta protegida com verificação em duas etapas."
                  : "Ative para maior segurança na sua conta."}
              </Text>
            </View>
          </View>

          {error ? (
            <View className="bg-red-50 px-4 py-3 rounded-2xl border border-red-100 flex-row items-center gap-2 mb-4">
              <Ionicons name="alert-circle" size={16} color="#ef4444" />
              <Text className="text-red-600 text-sm font-semibold flex-1">{error}</Text>
            </View>
          ) : null}

          {/* idle: ativar */}
          {step === "idle" && !twoFactorEnabled && (
            <Pressable
              onPress={() => { setError(""); setStep("request") }}
              className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 flex-row items-center gap-3 active:bg-zinc-100"
            >
              <View className="h-9 w-9 rounded-xl items-center justify-center" style={{ backgroundColor: primaryColor + "20" }}>
                <Ionicons name="mail-outline" size={18} color={primaryColor} />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-zinc-900 text-base">Ativar via e-mail</Text>
                <Text className="text-zinc-500 text-xs mt-0.5">Enviar código para {user?.email}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#d4d4d8" />
            </Pressable>
          )}

          {/* idle: desativar */}
          {step === "idle" && twoFactorEnabled && (
            <Pressable
              onPress={handleDisable}
              disabled={loading}
              className="bg-zinc-50 rounded-2xl p-4 border border-red-100 flex-row items-center gap-3 active:bg-red-50"
            >
              <View className="h-9 w-9 rounded-xl items-center justify-center bg-red-50">
                <Ionicons name="shield-half-outline" size={18} color="#ef4444" />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-red-600 text-base">Desativar 2FA</Text>
                <Text className="text-zinc-500 text-xs mt-0.5">Remover verificação de dois fatores</Text>
              </View>
              {loading
                ? <ActivityIndicator size="small" color="#ef4444" />
                : <Ionicons name="chevron-forward" size={16} color="#d4d4d8" />
              }
            </Pressable>
          )}

          {/* request */}
          {step === "request" && (
            <View className="gap-4">
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

          {/* confirm */}
          {step === "confirm" && (
            <View className="gap-5">
              <View className="items-center gap-1">
                <Text className="font-bold text-zinc-900 text-base">Digite o código</Text>
                <Text className="text-zinc-500 text-sm text-center">
                  Insira o código enviado para {user?.email}.{"\n"}Válido por 10 minutos.
                </Text>
              </View>
              <View className="flex-row justify-center gap-2">
                {digits.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el }}
                    value={digit}
                    onChangeText={(v) => handleChange(i, v)}
                    onKeyPress={(e) => handleKeyPress(i, e)}
                    keyboardType="number-pad"
                    maxLength={i === 0 ? CODE_LENGTH : 1}
                    editable={!loading}
                    selectTextOnFocus
                    className="text-center text-2xl font-black text-zinc-900"
                    style={{
                      width: 44,
                      height: 56,
                      borderRadius: 14,
                      borderWidth: 2,
                      borderColor: error ? "#fca5a5" : digit ? primaryColor : "#e4e4e7",
                      backgroundColor: digit ? `${primaryColor}10` : "#fafafa",
                      opacity: loading ? 0.5 : 1,
                    }}
                  />
                ))}
              </View>
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => { setStep("idle"); setDigits(Array(CODE_LENGTH).fill("")) }}
                  className="flex-1 py-3 rounded-2xl border border-zinc-200 items-center"
                >
                  <Text className="font-bold text-zinc-700">Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={handleConfirmCode}
                  disabled={loading || code.length !== CODE_LENGTH}
                  className="flex-1 py-3 rounded-2xl items-center"
                  style={{ backgroundColor: code.length === CODE_LENGTH ? primaryColor : "#d4d4d8" }}
                >
                  {loading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text className="font-bold text-white">Confirmar</Text>
                  }
                </Pressable>
              </View>
            </View>
          )}
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

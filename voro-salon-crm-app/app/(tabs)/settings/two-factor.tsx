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
import { useRouter } from "expo-router"
import { useAuth } from "contexts/auth.context"
import { ScreenHeader } from "components/ScreenHeader"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { apiCall, API_CONFIG } from "lib/api"

const CODE_LENGTH = 6
type Step = "idle" | "request" | "confirm"

export default function TwoFactorScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { primaryColor } = useTenantTheme()

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled ?? false)
  const [step, setStep] = useState<Step>("idle")
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const inputRefs = useRef<(TextInput | null)[]>([])
  const code = digits.join("")

  // Auto-submit ao preencher todos os dígitos
  useEffect(() => {
    if (step === "confirm" && code.length === CODE_LENGTH && !digits.includes("") && !loading) {
      handleConfirmCode()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  function handleChange(index: number, value: string) {
    const cleaned = value.replace(/\D/g, "")
    setError("")

    // Paste: distribui cada dígito nos campos em sequência
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

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={["top"]}>
      <ScreenHeader title="Autenticação de dois fatores" showBack onBack={() => router.back()} />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Status Card */}
        <View className="bg-white rounded-3xl p-4 border border-zinc-100">
          <View className="flex-row items-center gap-3">
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
          <View className="bg-red-50 px-4 py-3 rounded-2xl border border-red-100 flex-row items-center gap-2">
            <Ionicons name="alert-circle" size={16} color="#ef4444" />
            <Text className="text-red-600 text-sm font-semibold flex-1">{error}</Text>
          </View>
        ) : null}

        {/* Step: idle — ativar */}
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

        {/* Step: idle — desativar */}
        {step === "idle" && twoFactorEnabled && (
          <Pressable
            onPress={handleDisable}
            disabled={loading}
            className="bg-white rounded-3xl p-4 border border-red-100 flex-row items-center gap-3 active:bg-red-50"
          >
            <View className="h-9 w-9 rounded-xl items-center justify-center bg-red-50">
              <Ionicons name="shield-half-outline" size={18} color="#ef4444" />
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

        {/* Step: request */}
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

        {/* Step: confirm — digit inputs */}
        {step === "confirm" && (
          <View className="bg-white rounded-3xl p-5 border border-zinc-100 gap-5">
            <View className="items-center gap-1">
              <Text className="font-bold text-zinc-900 text-base">Digite o código</Text>
              <Text className="text-zinc-500 text-sm text-center">
                Insira o código enviado para {user?.email}.{"\n"}Válido por 10 minutos.
              </Text>
            </View>

            {/* Digit inputs */}
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
      </ScrollView>
    </SafeAreaView>
  )
}

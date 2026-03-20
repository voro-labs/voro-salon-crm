import React, { useEffect, useRef, useState } from "react"
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import * as SecureStore from "expo-secure-store"
import { useAuth } from "contexts/auth.context"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { API_CONFIG, apiCall } from "lib/api"
import { AuthDto } from "types/DTOs/auth.interface"
import { TWO_FACTOR_PENDING_KEY, TWO_FACTOR_EMAIL_KEY } from "hooks/use-sign-in.hook"

const CODE_LENGTH = 6

export default function VerifyTwoFactorScreen() {
  const router = useRouter()
  const { login } = useAuth()
  const { primaryColor, reload: reloadTheme } = useTenantTheme()

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pendingToken, setPendingToken] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)

  const inputRefs = useRef<(TextInput | null)[]>([])

  useEffect(() => {
    async function loadState() {
      const token = await SecureStore.getItemAsync(TWO_FACTOR_PENDING_KEY)
      const storedEmail = await SecureStore.getItemAsync(TWO_FACTOR_EMAIL_KEY)

      if (!token) {
        router.replace("/(auth)/sign-in")
        return
      }

      setPendingToken(token)
      setEmail(storedEmail)
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    }

    loadState()
  }, [])

  const code = digits.join("")

  function handleChange(index: number, value: string) {
    const cleaned = value.replace(/\D/g, "")
    setError(null)

    // Paste: valor com mais de 1 dígito → distribui pelos inputs
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

  async function handleVerify() {
    if (code.length < CODE_LENGTH || digits.includes("")) {
      setError("Digite todos os 6 dígitos do código.")
      return
    }
    if (!pendingToken) return

    setLoading(true)
    setError(null)

    try {
      const response = await apiCall<AuthDto>(API_CONFIG.ENDPOINTS.VERIFY_2FA, {
        method: "POST",
        body: JSON.stringify({ pendingToken, code }),
      })

      if (response.hasError || !response.data?.token) {
        setError(response.message ?? "Código inválido. Tente novamente.")
        setDigits(Array(CODE_LENGTH).fill(""))
        setTimeout(() => inputRefs.current[0]?.focus(), 50)
        return
      }

      setSuccess(true)

      await SecureStore.deleteItemAsync(TWO_FACTOR_PENDING_KEY)
      await SecureStore.deleteItemAsync(TWO_FACTOR_EMAIL_KEY)

      // Armazenar flags pós-login antes de chamar login (evita race condition)
      const hasPostLoginSteps =
        response.data.requiresPasswordChange ||
        response.data.requiresTermsAcceptance ||
        response.data.requiresProfileCompletion

      if (hasPostLoginSteps) {
        await SecureStore.setItemAsync("post_login_flags", JSON.stringify({
          requiresPasswordChange: !!response.data.requiresPasswordChange,
          requiresTermsAcceptance: !!response.data.requiresTermsAcceptance,
          requiresProfileCompletion: !!response.data.requiresProfileCompletion,
        }))
      }

      await login(response.data.token, response.data.refreshToken, response.data.tenants)
      reloadTheme()

      // Navegar para a tela de onboarding correta (fora do grupo /(auth))
      if (response.data.requiresPasswordChange) {
        router.replace("/(onboarding)/change-password")
      } else if (response.data.requiresTermsAcceptance) {
        router.replace("/(onboarding)/terms")
      } else if (response.data.requiresProfileCompletion) {
        router.replace("/(onboarding)/complete-profile")
      }
    } catch {
      setError("Erro inesperado. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  // Auto-submit quando todos os dígitos forem preenchidos
  useEffect(() => {
    if (code.length === CODE_LENGTH && !digits.includes("") && pendingToken && !loading && !success) {
      handleVerify()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView className="flex-1 bg-zinc-50" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>

          {/* Header card */}
          <View className="bg-white px-8 pt-12 pb-10 rounded-b-[40px] shadow-sm shadow-zinc-200">
            <Pressable
              onPress={() => router.replace("/(auth)/sign-in")}
              className="self-start mb-6 flex-row items-center gap-1"
              disabled={loading}
            >
              <Ionicons name="chevron-back" size={18} color="#71717a" />
              <Text className="text-zinc-400 font-semibold text-sm">Voltar ao login</Text>
            </Pressable>

            <View className="items-center mb-8">
              <View
                className="h-20 w-20 rounded-3xl items-center justify-center shadow-lg"
                style={{ backgroundColor: primaryColor }}
              >
                <Ionicons name="shield-checkmark" size={40} color="white" />
              </View>
              <Text className="text-3xl font-black text-zinc-900 mt-6 tracking-tighter">
                Verificação
              </Text>
              <Text className="text-zinc-500 font-medium mt-2 text-center">
                Autenticação em duas etapas
              </Text>
            </View>

            {/* E-mail info */}
            {email && (
              <View className="mb-6 flex-row items-center gap-2 bg-zinc-50 rounded-2xl px-4 py-3 border border-zinc-100">
                <Ionicons name="mail-outline" size={16} color="#71717a" />
                <Text className="text-sm text-zinc-500 flex-1 flex-wrap">
                  Código enviado para{" "}
                  <Text className="font-bold text-zinc-900">{email}</Text>
                </Text>
              </View>
            )}

            {/* Digit inputs */}
            <View className="flex-row justify-center gap-2 mb-4">
              {digits.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el }}
                  value={digit}
                  onChangeText={(v) => handleChange(i, v)}
                  onKeyPress={(e) => handleKeyPress(i, e)}
                  keyboardType="number-pad"
                  maxLength={i === 0 ? CODE_LENGTH : 1}
                  editable={!loading && !success}
                  selectTextOnFocus
                  className="text-center text-2xl font-black text-zinc-900"
                  style={{
                    width: 44,
                    height: 56,
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor: error ? "#fca5a5" : digit ? primaryColor : "#e4e4e7",
                    backgroundColor: digit ? `${primaryColor}10` : "#fafafa",
                    opacity: loading || success ? 0.5 : 1,
                  }}
                />
              ))}
            </View>
          </View>

          {/* Footer */}
          <View className="px-8 mt-10 flex-1 justify-between pb-8">

            {/* Error */}
            {error && (
              <View className="bg-red-50 p-4 rounded-2xl flex-row items-center border border-red-100 mb-4">
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <Text className="ml-3 text-red-600 text-sm font-bold flex-1">{error}</Text>
              </View>
            )}

            {/* Success */}
            {success && (
              <View className="bg-green-50 p-4 rounded-2xl flex-row items-center border border-green-100 mb-4">
                <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                <Text className="ml-3 text-green-700 text-sm font-bold flex-1">Verificado! Entrando...</Text>
              </View>
            )}

            {/* Verify button */}
            <Pressable
              onPress={handleVerify}
              disabled={loading || success || digits.includes("")}
              className="h-16 rounded-2xl items-center justify-center"
              style={{
                backgroundColor: primaryColor,
                opacity: loading || success || digits.includes("") ? 0.5 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <View className="flex-row items-center gap-2">
                  <Text className="text-white text-lg font-black">
                    {success ? "Verificado!" : "Verificar Código"}
                  </Text>
                  {!success && <Ionicons name="arrow-forward" size={20} color="white" />}
                </View>
              )}
            </Pressable>

            <Text className="text-xs text-zinc-400 text-center mt-6">
              O código expira em <Text className="font-bold">10 minutos</Text>.{"\n"}
              Verifique também a pasta de spam.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

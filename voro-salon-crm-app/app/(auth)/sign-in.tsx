import React, { useEffect, useRef, useState } from "react"
import {
  View, Text, TextInput, Pressable, KeyboardAvoidingView,
  Platform, ActivityIndicator, ScrollView, Animated,
  NativeSyntheticEvent, TextInputKeyPressEventData,
} from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useSignIn } from "hooks/use-sign-in.hook"
import { useTenantTheme } from "contexts/tenant-theme.context"

const CODE_LENGTH = 6

const ESTABLISHMENTS = [
  { word: "Salon", icon: "cut" as const, sub: "Entre para gerenciar seu salão" },
  { word: "Barbearia", icon: "cut" as const, sub: "Entre para gerenciar sua barbearia" },
  { word: "Unhas & Cílios", icon: "color-palette-outline" as const, sub: "Entre para gerenciar seu estúdio" },
  { word: "Estética", icon: "flower-outline" as const, sub: "Entre para gerenciar sua clínica" },
  { word: "Spa", icon: "leaf-outline" as const, sub: "Entre para gerenciar seu spa" },
]

export default function SignInScreen() {
  const router = useRouter()
  const { estIndex: estIndexParam } = useLocalSearchParams<{ estIndex?: string }>()
  const { signIn, verifyTwoFactor, loading, error, clearError } = useSignIn()
  const { primaryColor } = useTenantTheme()

  // ── Credentials step ────────────────────────────────────────────────────────
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const passwordRef = useRef<TextInput>(null)

  // ── Establishment cycling animation ─────────────────────────────────────────
  const [estIndex, setEstIndex] = useState(() => {
    const parsed = parseInt(estIndexParam ?? "0")
    return isNaN(parsed) ? 0 : parsed % ESTABLISHMENTS.length
  })
  const fadeAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        setEstIndex((prev) => (prev + 1) % ESTABLISHMENTS.length)
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }).start()
      })
    }, 2500)
    return () => clearInterval(interval)
  }, [fadeAnim])

  const current = ESTABLISHMENTS[estIndex]

  // ── 2FA step (inline — mesma tela para autofill funcionar) ──────────────────
  const [step, setStep] = useState<"credentials" | "twoFactor">("credentials")
  const [pendingToken, setPendingToken] = useState<string | null>(null)
  const [twoFactorEmail, setTwoFactorEmail] = useState<string | null>(null)
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""))
  const [verifySuccess, setVerifySuccess] = useState(false)
  const inputRefs = useRef<(TextInput | null)[]>([])

  function validate() {
    const errors: { email?: string; password?: string } = {}
    if (!email.trim()) {
      errors.email = "E-mail é obrigatório."
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Informe um e-mail válido."
    }
    if (!password) {
      errors.password = "Senha é obrigatória."
    }
    return errors
  }

  const handleSignIn = async () => {
    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    const result = await signIn({ email: email.trim(), password })
    if (result?.requiresTwoFactor && result.pendingToken) {
      setPendingToken(result.pendingToken)
      setTwoFactorEmail(result.email ?? email.trim())
      setStep("twoFactor")
      setTimeout(() => inputRefs.current[0]?.focus(), 150)
    }
  }

  // ── 2FA digit handlers ──────────────────────────────────────────────────────

  function handleDigitChange(index: number, value: string) {
    const cleaned = value.replace(/\D/g, "")
    clearError()

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

  function handleDigitKeyPress(index: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) {
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

  const handleVerify = async () => {
    const code = digits.join("")
    if (code.length < CODE_LENGTH || digits.includes("")) return
    if (!pendingToken) return

    const result = await verifyTwoFactor(pendingToken, code)
    if (result.success) {
      setVerifySuccess(true)
    } else {
      setDigits(Array(CODE_LENGTH).fill(""))
      setTimeout(() => inputRefs.current[0]?.focus(), 50)
    }
  }

  // Auto-submit ao preencher todos os dígitos
  const code = digits.join("")
  useEffect(() => {
    if (step === "twoFactor" && code.length === CODE_LENGTH && !digits.includes("") && pendingToken && !loading && !verifySuccess) {
      handleVerify()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  function backToCredentials() {
    setStep("credentials")
    setDigits(Array(CODE_LENGTH).fill(""))
    setPendingToken(null)
    clearError()
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView
          className="flex-1 bg-zinc-50"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="bg-white px-8 pt-12 pb-10 rounded-b-[40px] shadow-sm shadow-zinc-200">

            {/* Back button */}
            <Pressable
              onPress={step === "twoFactor" ? backToCredentials : () => router.back()}
              className="self-start mb-4 flex-row items-center gap-1"
              disabled={loading}
            >
              <Ionicons name="chevron-back" size={18} color="#71717a" />
              <Text className="text-zinc-400 font-semibold text-sm">
                {step === "twoFactor" ? "Voltar ao login" : "Voltar"}
              </Text>
            </Pressable>

            {/* Logo */}
            <View className="items-center mb-10">
              <Animated.View
                className="h-20 w-20 rounded-3xl items-center justify-center shadow-lg"
                style={{ backgroundColor: primaryColor, opacity: step === "credentials" ? fadeAnim : 1 }}
              >
                <Ionicons
                  name={step === "twoFactor" ? "shield-checkmark" : current.icon}
                  size={40}
                  color="white"
                />
              </Animated.View>
              <Text className="text-3xl font-black text-zinc-900 mt-6 tracking-tighter">
                {step === "twoFactor"
                  ? "Verificação"
                  : <>Voro{" "}<Animated.Text style={{ color: primaryColor, opacity: fadeAnim }}>{current.word}</Animated.Text></>
                }
              </Text>
              <Animated.Text
                className="text-zinc-500 font-medium mt-2 text-center"
                style={step === "credentials" ? { opacity: fadeAnim } : undefined}
              >
                {step === "twoFactor"
                  ? "Autenticação em duas etapas"
                  : current.sub
                }
              </Animated.Text>
            </View>

            {/* ── STEP 1: Credenciais ─────────────────────────────────────────── */}
            {step === "credentials" && (
              <View className="space-y-6 gap-2">
                <View className="gap-1">
                  <View
                    className="bg-zinc-50 rounded-2xl px-4 py-3 flex-row items-center"
                    style={{ borderWidth: 1, borderColor: fieldErrors.email ? "#fca5a5" : "#f4f4f5" }}
                  >
                    <Ionicons name="mail-outline" size={20} color={fieldErrors.email ? "#ef4444" : "#71717a"} />
                    <TextInput
                      className="flex-1 ml-3 text-zinc-900 font-semibold text-base py-0"
                      placeholder="E-mail"
                      placeholderTextColor="#a1a1aa"
                      value={email}
                      onChangeText={(t) => { setEmail(t); clearError(); setFieldErrors((p) => ({ ...p, email: undefined })) }}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      returnKeyType="next"
                      onSubmitEditing={() => passwordRef.current?.focus()}
                      textContentType="emailAddress"
                      autoComplete="email"
                    />
                  </View>
                  {fieldErrors.email && (
                    <Text className="text-red-500 text-xs font-semibold ml-1">{fieldErrors.email}</Text>
                  )}
                </View>

                <View className="gap-1">
                  <View
                    className="bg-zinc-50 rounded-2xl px-4 py-3 flex-row items-center"
                    style={{ borderWidth: 1, borderColor: fieldErrors.password ? "#fca5a5" : "#f4f4f5" }}
                  >
                    <Ionicons name="lock-closed-outline" size={20} color={fieldErrors.password ? "#ef4444" : "#71717a"} />
                    <TextInput
                      ref={passwordRef}
                      className="flex-1 ml-3 text-zinc-900 font-semibold text-base py-0"
                      placeholder="Senha"
                      placeholderTextColor="#a1a1aa"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={(t) => { setPassword(t); clearError(); setFieldErrors((p) => ({ ...p, password: undefined })) }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={handleSignIn}
                      textContentType="password"
                      autoComplete="current-password"
                    />
                    <Pressable onPress={() => setShowPassword(v => !v)} className="ml-2 p-1">
                      <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#71717a" />
                    </Pressable>
                  </View>
                  {fieldErrors.password && (
                    <Text className="text-red-500 text-xs font-semibold ml-1">{fieldErrors.password}</Text>
                  )}
                </View>

                <Pressable onPress={() => router.push("/(auth)/forgot-password")} className="self-end">
                  <Text className="text-xs font-black uppercase tracking-wider" style={{ color: primaryColor }}>Esqueceu a senha?</Text>
                </Pressable>
              </View>
            )}

            {/* ── STEP 2: Código 2FA (inline, mesma tela) ────────────────────── */}
            {step === "twoFactor" && (
              <View className="gap-4">
                {twoFactorEmail && (
                  <View className="flex-row items-center gap-2 bg-zinc-50 rounded-2xl px-4 py-3 border border-zinc-100">
                    <Ionicons name="mail-outline" size={16} color="#71717a" />
                    <Text className="text-sm text-zinc-500 flex-1 flex-wrap">
                      Código enviado para{" "}
                      <Text className="font-bold text-zinc-900">{twoFactorEmail}</Text>
                    </Text>
                  </View>
                )}

                <View className="flex-row justify-center gap-2">
                  {digits.map((digit, i) => (
                    <TextInput
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el }}
                      value={digit}
                      onChangeText={(v) => handleDigitChange(i, v)}
                      onKeyPress={(e) => handleDigitKeyPress(i, e)}
                      keyboardType="number-pad"
                      maxLength={i === 0 ? CODE_LENGTH : 1}
                      editable={!loading && !verifySuccess}
                      selectTextOnFocus
                      textContentType="oneTimeCode"
                      autoComplete="sms-otp"
                      className="text-center text-2xl font-black text-zinc-900"
                      style={{
                        width: 44,
                        height: 56,
                        borderRadius: 14,
                        borderWidth: 2,
                        borderColor: error ? "#fca5a5" : digit ? primaryColor : "#e4e4e7",
                        backgroundColor: digit ? `${primaryColor}10` : "#fafafa",
                        opacity: loading || verifySuccess ? 0.5 : 1,
                      }}
                    />
                  ))}
                </View>

                <Text className="text-xs text-zinc-400 text-center">
                  O código expira em <Text className="font-bold">10 minutos</Text>.{"\n"}
                  Verifique também a pasta de spam.
                </Text>
              </View>
            )}

            {/* Error */}
            {error && (
              <View className="bg-red-50 p-4 rounded-2xl flex-row items-center border border-red-100 mt-4">
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <Text className="ml-3 text-red-600 text-sm font-bold flex-1">{error}</Text>
              </View>
            )}

            {/* Success (2FA) */}
            {verifySuccess && (
              <View className="bg-green-50 p-4 rounded-2xl flex-row items-center border border-green-100 mt-4">
                <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                <Text className="ml-3 text-green-700 text-sm font-bold flex-1">Verificado! Entrando...</Text>
              </View>
            )}
          </View>

          {/* Footer: botão de ação */}
          <View className="px-8 mt-10 flex-1 justify-between pb-8">
            <Pressable
              onPress={step === "twoFactor" ? handleVerify : handleSignIn}
              disabled={loading || verifySuccess || (step === "twoFactor" && digits.includes(""))}
              className="h-16 rounded-2xl items-center justify-center"
              style={{
                backgroundColor: primaryColor,
                opacity: loading || verifySuccess || (step === "twoFactor" && digits.includes("")) ? 0.5 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <View className="flex-row items-center gap-2">
                  <Text className="text-white text-lg font-black">
                    {step === "twoFactor" ? (verifySuccess ? "Verificado!" : "Verificar Código") : "Entrar"}
                  </Text>
                  {!verifySuccess && <Ionicons name="arrow-forward" size={20} color="white" />}
                </View>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

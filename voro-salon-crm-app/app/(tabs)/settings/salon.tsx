import React, { useState, useRef, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter, useNavigation } from "expo-router"
import { useSettings } from "hooks/use-settings.hook"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { PhoneInput } from "components/PhoneInput"
import { CountrySelector } from "components/CountrySelector"
import { ImagePickerInput } from "components/ImagePickerInput"
import { SelectPickerInput } from "components/SelectPickerInput"

const ESTABLISHMENT_OPTIONS = [
  { label: "Cabeleireiro / Salão", value: 0 },
  { label: "Barbearia", value: 1 },
  { label: "Unhas e Cílios (Lashes)", value: 2 },
  { label: "Estética e Clínica", value: 3 },
  { label: "Spa e Massagem", value: 4 },
  { label: "Saúde / Médico", value: 5 },
  { label: "Dentista", value: 6 },
  { label: "Outros", value: 99 },
]

// ── Color palette for the picker ──────────────────────────────────────────────
const COLOR_PALETTE: { label: string; hex: string }[] = [
  // Reds
  { label: "Red 900",   hex: "#7f1d1d" }, { label: "Red 700",   hex: "#b91c1c" },
  { label: "Red 500",   hex: "#ef4444" }, { label: "Red 400",   hex: "#f87171" },
  // Pinks / Rose
  { label: "Rose 700",  hex: "#be123c" }, { label: "Rose 500",  hex: "#f43f5e" },
  { label: "Rose 400",  hex: "#fb7185" }, { label: "Pink 500",  hex: "#ec4899" },
  // Oranges / Amber
  { label: "Orange 800",hex: "#9a3412" }, { label: "Orange 600",hex: "#ea580c" },
  { label: "Orange 400",hex: "#fb923c" }, { label: "Amber 500", hex: "#f59e0b" },
  // Yellows
  { label: "Yellow 500",hex: "#eab308" }, { label: "Lime 600",  hex: "#65a30d" },
  { label: "Lime 500",  hex: "#84cc16" }, { label: "Yellow 300",hex: "#fde047" },
  // Greens
  { label: "Green 900", hex: "#14532d" }, { label: "Green 700", hex: "#15803d" },
  { label: "Green 500", hex: "#22c55e" }, { label: "Emerald 600",hex:"#059669" },
  { label: "Teal 700",  hex: "#0f766e" }, { label: "Teal 500",  hex: "#14b8a6" },
  { label: "Cyan 600",  hex: "#0891b2" }, { label: "Sky 500",   hex: "#0ea5e9" },
  // Blues
  { label: "Blue 900",  hex: "#1e3a5f" }, { label: "Blue 700",  hex: "#1d4ed8" },
  { label: "Blue 500",  hex: "#3b82f6" }, { label: "Blue 400",  hex: "#60a5fa" },
  // Indigo / Violet
  { label: "Indigo 700",hex: "#4338ca" }, { label: "Indigo 500",hex: "#6366f1" },
  { label: "Violet 700",hex: "#6d28d9" }, { label: "Violet 500",hex: "#8b5cf6" },
  // Purples
  { label: "Purple 900",hex: "#3b0764" }, { label: "Purple 700",hex: "#7e22ce" },
  { label: "Purple 500",hex: "#a855f7" }, { label: "Purple 400",hex: "#c084fc" },
  // Fuchsia / Mauve
  { label: "Fuchsia 700",hex:"#a21caf" }, { label: "Fuchsia 500",hex:"#d946ef" },
  { label: "Mauve",     hex: "#9f5f9f" }, { label: "Orchid",    hex: "#b768a2" },
  // Browns / Warmth
  { label: "Brown 900", hex: "#3b1d08" }, { label: "Brown 700", hex: "#6b3a1f" },
  { label: "Brown 500", hex: "#8B4513" }, { label: "Brown 400", hex: "#a0522d" },
  { label: "Sienna",    hex: "#b87333" }, { label: "Gold",      hex: "#d97706" },
  // Neutrals
  { label: "Slate 900", hex: "#0f172a" }, { label: "Slate 700", hex: "#334155" },
  { label: "Zinc 700",  hex: "#3f3f46" }, { label: "Zinc 500",  hex: "#71717a" },
  { label: "Zinc 400",  hex: "#a1a1aa" }, { label: "Stone 400", hex: "#a8a29e" },
  { label: "White",     hex: "#ffffff" }, { label: "Near Black",hex: "#111111" },
]

// ── Color Picker Modal ─────────────────────────────────────────────────────────
const SWATCH = 52   // px — fixed swatch size
const GAP    = 8    // px — gap between swatches
const ROWS   = 4    // number of rows visible

// Chunk palette into columns of ROWS so we can lay them left-to-right
function chunkByRows<T>(arr: T[], rows: number): T[][] {
  const cols: T[][] = []
  for (let i = 0; i < arr.length; i += rows) {
    cols.push(arr.slice(i, i + rows))
  }
  return cols
}

const PALETTE_COLS = chunkByRows(COLOR_PALETTE, ROWS)

interface ColorPickerModalProps {
  visible: boolean
  value: string
  title: string
  onSelect: (hex: string) => void
  onClose: () => void
}

function ColorPickerModal({ visible, value, title, onSelect, onClose }: ColorPickerModalProps) {
  const insets = useSafeAreaInsets()

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-100">
          <Text className="text-lg font-black text-zinc-900">{title}</Text>
          <Pressable
            onPress={onClose}
            className="h-9 w-9 bg-zinc-100 rounded-xl items-center justify-center"
          >
            <Ionicons name="close" size={20} color="#71717a" />
          </Pressable>
        </View>

        {/* Current color preview */}
        <View className="mx-5 mt-4 mb-5 flex-row items-center gap-4 bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3">
          <View
            className="h-12 w-12 rounded-2xl border border-black/10 shrink-0"
            style={{ backgroundColor: value }}
          />
          <View className="flex-1">
            <Text className="text-zinc-400 text-xs font-semibold">Cor selecionada</Text>
            <Text className="text-zinc-900 font-black text-base mt-0.5 uppercase">{value}</Text>
          </View>
          <View className="h-6 w-6 rounded-2xl items-center justify-center" style={{ borderWidth: 2, borderColor: "#7c3aed" }}>
            <View className="h-3 w-3 rounded-2xl" style={{ backgroundColor: value }} />
          </View>
        </View>

        {/* Label */}
        <Text className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-3 px-5">
          Paleta de cores
        </Text>

        {/* Horizontal scroll grid — 4 fixed rows, scroll left/right */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 24,
          }}
          style={{ flexGrow: 0 }}
        >
          <View style={{ flexDirection: "row", gap: GAP }}>
            {PALETTE_COLS.map((column, colIndex) => (
              <View key={colIndex} style={{ flexDirection: "column", gap: GAP }}>
                {column.map((color) => {
                  const selected = value.toLowerCase() === color.hex.toLowerCase()
                  return (
                    <Pressable
                      key={color.hex}
                      onPress={() => onSelect(color.hex)}
                      style={{
                        width: SWATCH,
                        height: SWATCH,
                        borderRadius: 14,
                        backgroundColor: color.hex,
                        borderWidth: selected ? 3 : 1,
                        borderColor: selected ? "#7c3aed" : "rgba(0,0,0,0.08)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {selected && (
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            backgroundColor: "rgba(255,255,255,0.85)",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Ionicons name="checkmark" size={14} color="#7c3aed" />
                        </View>
                      )}
                    </Pressable>
                  )
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

// ── Salon Settings Screen ──────────────────────────────────────────────────────
export default function SalonSettingsScreen() {
  const router = useRouter()
  const navigation = useNavigation()
  const {
    formData,
    setForm,
    countryCode,
    setCountryCode,
    isSaving,
    isLoading,
    saveTenant,
    handleLogoUpload,
    isUploadingLogo,
    setEstablishmentType,
  } = useSettings()
  const { primaryColor } = useTenantTheme()

  const [primaryPickerOpen, setPrimaryPickerOpen] = useState(false)
  const [secondaryPickerOpen, setSecondaryPickerOpen] = useState(false)

  // Detecção de alterações não salvas
  const originalFormRef = useRef<typeof formData | null>(null)
  useEffect(() => {
    if (!originalFormRef.current && formData.name) {
      originalFormRef.current = { ...formData }
    }
  }, [formData])

  const isDirty = !!(originalFormRef.current && (
    formData.name !== originalFormRef.current.name ||
    formData.slug !== originalFormRef.current.slug ||
    formData.logoUrl !== originalFormRef.current.logoUrl ||
    formData.primaryColor !== originalFormRef.current.primaryColor ||
    formData.secondaryColor !== originalFormRef.current.secondaryColor ||
    formData.contactPhone !== originalFormRef.current.contactPhone ||
    formData.contactEmail !== originalFormRef.current.contactEmail
  ))

  // Intercepta navegação de saída quando há alterações não salvas
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e: any) => {
      if (!isDirty) return
      e.preventDefault()
      Alert.alert(
        "Alterações não salvas",
        "Você tem alterações não salvas. Deseja sair e perder as modificações?",
        [
          { text: "Continuar editando", style: "cancel" },
          {
            text: "Sair sem salvar",
            style: "destructive",
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      )
    })
    return unsubscribe
  }, [navigation, isDirty])

  async function handleSave() {
    const ok = await saveTenant(formData)
    if (ok) originalFormRef.current = { ...formData }
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-50 items-center justify-center">
        <ActivityIndicator color={primaryColor} size="large" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="bg-white px-5 pt-4 pb-4 border-b border-zinc-100 flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="h-9 w-9 bg-zinc-50 rounded-xl items-center justify-center border border-zinc-100"
          >
            <Ionicons name="chevron-back" size={20} color="#18181b" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xl font-black text-zinc-900">Dados do Salão</Text>
            <Text className="text-zinc-400 text-xs font-semibold">Informações, contato e tema</Text>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Identificação ─────────────────────────────────────── */}
          <View className="flex-row items-center gap-2 mb-3">
            <View className="h-7 w-7 bg-purple-100 rounded-lg items-center justify-center">
              <Ionicons name="business-outline" size={14} color="#7c3aed" />
            </View>
            <Text className="text-zinc-700 font-black text-sm">Identificação</Text>
          </View>

          <View className="bg-white rounded-3xl border border-zinc-100 overflow-hidden mb-5">
            {/* Nome */}
            <View className="px-4 pt-4 pb-3 border-b border-zinc-50">
              <Text className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">
                Nome do Estabelecimento *
              </Text>
              <TextInput
                className="text-zinc-900 font-bold text-base"
                placeholder="Ex: Studio Hair, Beauty Salon..."
                placeholderTextColor="#d4d4d8"
                value={formData.name}
                onChangeText={(v) => setForm((p) => (p ? { ...p, name: v } : null))}
              />
            </View>

            {/* Slug */}
            <View className="px-4 pt-3 pb-3 border-b border-zinc-50">
              <Text className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">
                Slug (URL)
              </Text>
              <View className="flex-row items-center gap-2">
                <Text className="text-zinc-400 font-semibold text-sm">voro.app/</Text>
                <TextInput
                  className="flex-1 text-zinc-900 font-bold text-base"
                  placeholder="meu-salao"
                  placeholderTextColor="#d4d4d8"
                  autoCapitalize="none"
                  value={formData.slug}
                  onChangeText={(v) =>
                    setForm((p) =>
                      p ? { ...p, slug: v.toLowerCase().replace(/\s+/g, "-") } : null
                    )
                  }
                />
              </View>
            </View>

            {/* Business Type */}
            <View className="px-4 pt-4 pb-5 border-b border-zinc-50 z-10">
              <Text className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-3">
                Tipo do Negócio *
              </Text>
              <SelectPickerInput
                placeholder="Selecione o nicho do salão"
                value={formData.establishmentType?.toString()}
                onChange={(val) => setEstablishmentType(Number(val))}
                options={ESTABLISHMENT_OPTIONS.map((o) => ({ label: o.label, id: o.value.toString() }))}
              />
            </View>

            {/* Logo URL */}
            <View className="px-4 pt-4 pb-5">
              <Text className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-3">
                Logo do Estabelecimento
              </Text>
              <ImagePickerInput
                value={formData.logoUrl}
                onChange={handleLogoUpload}
                isUploading={isUploadingLogo}
                label="Trocar Logo"
                fallbackIcon="image-outline"
                rounded="2xl"
                size={80}
              />
            </View>
          </View>

          {/* ── Contato ───────────────────────────────────────────── */}
          <View className="flex-row items-center gap-2 mb-3">
            <View className="h-7 w-7 bg-blue-100 rounded-lg items-center justify-center">
              <Ionicons name="call-outline" size={14} color="#1d4ed8" />
            </View>
            <Text className="text-zinc-700 font-black text-sm">Contato</Text>
          </View>

          <View className="bg-white rounded-3xl border border-zinc-100 overflow-hidden mb-5">
            {/* Telefone */}
            <View className="px-4 pt-4 pb-3 border-b border-zinc-50">
              <Text className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">
                Telefone / WhatsApp
              </Text>
              <View className="flex-row items-center gap-2">
                <CountrySelector value={countryCode} onChange={setCountryCode} />
                <View className="flex-1">
                  <PhoneInput
                    value={formData.contactPhone}
                    countryCode={countryCode}
                    onChange={(v) =>
                      setForm((p) => (p ? { ...p, contactPhone: v } : null))
                    }
                  />
                </View>
              </View>
            </View>

            {/* Email */}
            <View className="px-4 pt-3 p-4 pb-4">
              <Text className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">
                E-mail de Contato
              </Text>
              <TextInput
                className="text-zinc-900 font-bold text-base"
                placeholder="contato@meusalao.com"
                placeholderTextColor="#d4d4d8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.contactEmail}
                onChangeText={(v) =>
                  setForm((p) => (p ? { ...p, contactEmail: v } : null))
                }
              />
            </View>
          </View>

          {/* ── Cores do Tema ─────────────────────────────────────── */}
          <View className="flex-row items-center gap-2 mb-3">
            <View className="h-7 w-7 bg-pink-100 rounded-lg items-center justify-center">
              <Ionicons name="color-palette-outline" size={14} color="#be123c" />
            </View>
            <Text className="text-zinc-700 font-black text-sm">Cores do Tema</Text>
          </View>

          <View className="bg-white rounded-3xl border border-zinc-100 overflow-hidden mb-6">
            {/* Primary color */}
            <Pressable
              onPress={() => setPrimaryPickerOpen(true)}
              className="flex-row items-center gap-4 px-4 py-4 border-b border-zinc-50 active:bg-zinc-50"
            >
              <View
                className="h-12 w-12 rounded-2xl border border-black/10 shrink-0"
                style={{ backgroundColor: formData.primaryColor || "#7c3aed" }}
              />
              <View className="flex-1">
                <Text className="text-zinc-900 font-black text-sm">Cor Primária</Text>
                <Text className="text-zinc-400 text-xs font-mono mt-0.5 uppercase">
                  {formData.primaryColor || "#7c3aed"}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Text className="text-zinc-400 text-xs font-semibold">Alterar</Text>
                <Ionicons name="chevron-forward" size={16} color="#d4d4d8" />
              </View>
            </Pressable>

            {/* Secondary color */}
            <Pressable
              onPress={() => setSecondaryPickerOpen(true)}
              className="flex-row items-center gap-4 px-4 py-4 active:bg-zinc-50"
            >
              <View
                className="h-12 w-12 rounded-2xl border border-black/10 shrink-0"
                style={{ backgroundColor: formData.secondaryColor || "#a855f7" }}
              />
              <View className="flex-1">
                <Text className="text-zinc-900 font-black text-sm">Cor de Destaque</Text>
                <Text className="text-zinc-400 text-xs font-mono mt-0.5 uppercase">
                  {formData.secondaryColor || "#a855f7"}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Text className="text-zinc-400 text-xs font-semibold">Alterar</Text>
                <Ionicons name="chevron-forward" size={16} color="#d4d4d8" />
              </View>
            </Pressable>

            {/* Theme preview bar */}
            <View className="mx-4 mb-4 mt-1 rounded-2xl overflow-hidden h-3 flex-row">
              <View className="flex-1" style={{ backgroundColor: formData.primaryColor || "#7c3aed" }} />
              <View className="flex-1" style={{ backgroundColor: formData.secondaryColor || "#a855f7" }} />
            </View>
          </View>

          {/* Save Button */}
          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            className="h-14 rounded-3xl items-center justify-center flex-row gap-2"
            style={{ backgroundColor: isSaving ? primaryColor + "60" : primaryColor }}
          >
            {isSaving ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="white" />
                <Text className="text-white font-black text-base">Salvar Configurações</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Primary Color Picker */}
      <ColorPickerModal
        visible={primaryPickerOpen}
        value={formData.primaryColor || "#7c3aed"}
        title="Cor Primária"
        onSelect={(hex) => {
          setForm((p) => (p ? { ...p, primaryColor: hex } : null))
          setPrimaryPickerOpen(false)
        }}
        onClose={() => setPrimaryPickerOpen(false)}
      />

      {/* Secondary Color Picker */}
      <ColorPickerModal
        visible={secondaryPickerOpen}
        value={formData.secondaryColor || "#a855f7"}
        title="Cor de Destaque"
        onSelect={(hex) => {
          setForm((p) => (p ? { ...p, secondaryColor: hex } : null))
          setSecondaryPickerOpen(false)
        }}
        onClose={() => setSecondaryPickerOpen(false)}
      />
    </SafeAreaView>
  )
}

import React, { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Modal,
} from "react-native"
import { useRouter } from "expo-router"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { ScreenHeader } from "components/ScreenHeader"
import { Ionicons } from "@expo/vector-icons"
import useSWR from "swr"
import { API_CONFIG } from "lib/api"
import { fetcher } from "lib/fetcher"
import { secureApiCall } from "lib/api"
import { useAuth } from "contexts/auth.context"

// ─── Data model ──────────────────────────────────────────────────────────────

interface TimeRange {
  openTime: string
  closeTime: string
}

interface BusinessHoursViewModel {
  dayOfWeek: number
  isOpen: boolean
  ranges: TimeRange[]
}

// Shape returned by the API
interface ApiTimeRange {
  openTime: string
  closeTime: string
}

interface ApiBusinessHours {
  dayOfWeek: number
  isOpen: boolean
  ranges: ApiTimeRange[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = [
  { day: 0, label: "Domingo" },
  { day: 1, label: "Segunda-feira" },
  { day: 2, label: "Terça-feira" },
  { day: 3, label: "Quarta-feira" },
  { day: 4, label: "Quinta-feira" },
  { day: 5, label: "Sexta-feira" },
  { day: 6, label: "Sábado" },
]

// 15-minute increments from 00:00 to 23:45
const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4).toString().padStart(2, "0")
  const m = ((i % 4) * 15).toString().padStart(2, "0")
  return `${h}:${m}`
})

const DEFAULT_RANGES: TimeRange[] = [
  { openTime: "08:00", closeTime: "11:30" },
  { openTime: "13:30", closeTime: "18:30" },
]

const DEFAULT_SCHEDULE: BusinessHoursViewModel[] = DAYS_OF_WEEK.map((d) => ({
  dayOfWeek: d.day,
  isOpen: d.day >= 1 && d.day <= 6,
  ranges: DEFAULT_RANGES.map((r) => ({ ...r })),
}))

function isScheduleDefault(localHours: BusinessHoursViewModel[]): boolean {
  return DEFAULT_SCHEDULE.every((def) => {
    const local = localHours.find((l) => l.dayOfWeek === def.dayOfWeek)
    if (!local) return false
    if (local.isOpen !== def.isOpen) return false
    if (!local.isOpen) return true
    if (local.ranges.length !== def.ranges.length) return false
    return def.ranges.every(
      (r, i) =>
        local.ranges[i].openTime === r.openTime &&
        local.ranges[i].closeTime === r.closeTime
    )
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function apiToViewModel(apiHours: ApiBusinessHours[], days: typeof DAYS_OF_WEEK): BusinessHoursViewModel[] {
  return days.map((d) => {
    const setting = apiHours.find((bh) => bh.dayOfWeek === d.day)
    const defaultIsOpen = d.day >= 1 && d.day <= 6

    if (!setting) {
      return {
        dayOfWeek: d.day,
        isOpen: defaultIsOpen,
        ranges: DEFAULT_RANGES.map((r) => ({ ...r })),
      }
    }

    const ranges =
      setting.ranges && setting.ranges.length > 0
        ? setting.ranges.map((r) => ({
            openTime: r.openTime ? r.openTime.slice(0, 5) : DEFAULT_RANGES[0].openTime,
            closeTime: r.closeTime ? r.closeTime.slice(0, 5) : DEFAULT_RANGES[0].closeTime,
          }))
        : DEFAULT_RANGES.map((r) => ({ ...r }))

    return {
      dayOfWeek: d.day,
      isOpen: setting.isOpen,
      ranges,
    }
  })
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BusinessHoursScreen() {
  const { primaryColor } = useTenantTheme()
  const { user } = useAuth()
  const router = useRouter()

  const roleNames = user?.roles?.map((r: any) => r.name) ?? []
  const isSalonOwner = roleNames.includes("SalonOwner") || roleNames.includes("Owner")

  useEffect(() => {
    if (user && !isSalonOwner) {
      router.replace("/")
    }
  }, [user, isSalonOwner])

  const { data: businessHours, mutate, isLoading } = useSWR<ApiBusinessHours[]>(
    API_CONFIG.ENDPOINTS.BUSINESS_HOURS,
    fetcher
  )

  // Local state – initialized with defaults immediately so the form never blocks
  const [localHours, setLocalHours] = useState<BusinessHoursViewModel[]>(
    () => apiToViewModel([], DAYS_OF_WEEK)
  )
  const [isSaving, setIsSaving] = useState<number | null>(null)
  const [resetting, setResetting] = useState(false)

  // Sync local state when remote data arrives
  useEffect(() => {
    if (businessHours !== undefined) {
      const arr = Array.isArray(businessHours) ? businessHours : []
      setLocalHours(apiToViewModel(arr, DAYS_OF_WEEK))
    }
  }, [businessHours])

  // ─── Mutators ──────────────────────────────────────────────────────────────

  const toggleDay = useCallback((dayOfWeek: number, isOpen: boolean) => {
    setLocalHours((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, isOpen } : d))
    )
  }, [])

  const updateRange = useCallback(
    (dayOfWeek: number, rangeIndex: number, field: keyof TimeRange, value: string) => {
      setLocalHours((prev) =>
        prev.map((d) => {
          if (d.dayOfWeek !== dayOfWeek) return d
          const newRanges = d.ranges.map((r, i) =>
            i === rangeIndex ? { ...r, [field]: value } : r
          )
          return { ...d, ranges: newRanges }
        })
      )
    },
    []
  )

  const addRange = useCallback((dayOfWeek: number) => {
    setLocalHours((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d
        return { ...d, ranges: [...d.ranges, { openTime: "08:00", closeTime: "18:00" }] }
      })
    )
  }, [])

  const removeRange = useCallback((dayOfWeek: number, rangeIndex: number) => {
    setLocalHours((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d
        if (d.ranges.length <= 1) return d // keep at least 1
        return { ...d, ranges: d.ranges.filter((_, i) => i !== rangeIndex) }
      })
    )
  }, [])

  // ─── Save ──────────────────────────────────────────────────────────────────

  const saveDay = useCallback(
    async (dayOfWeek: number) => {
      const day = localHours.find((d) => d.dayOfWeek === dayOfWeek)
      if (!day) return

      setIsSaving(dayOfWeek)
      try {
        const payload = {
          days: [
            {
              dayOfWeek: day.dayOfWeek,
              isOpen: day.isOpen,
              ranges: day.ranges.map((r) => ({
                openTime: r.openTime,
                closeTime: r.closeTime,
              })),
            },
          ],
        }

        const result = await secureApiCall(API_CONFIG.ENDPOINTS.BUSINESS_HOURS, {
          method: "PUT",
          body: JSON.stringify(payload),
        })

        if (!result.hasError) {
          mutate()
        } else {
          Alert.alert("Erro", result.message || "Erro ao atualizar horário")
        }
      } catch {
        Alert.alert("Erro", "Erro ao conectar ao servidor")
      } finally {
        setIsSaving(null)
      }
    },
    [localHours, mutate]
  )

  // ─── Reset to default ──────────────────────────────────────────────────────

  const resetToDefault = useCallback(async () => {
    Alert.alert(
      "Restaurar horários padrão?",
      "Dom: Fechado\nSeg–Sáb: 08:00–11:30 e 13:30–18:30\n\nEssa ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Restaurar",
          style: "destructive",
          onPress: async () => {
            setResetting(true)
            setLocalHours(DEFAULT_SCHEDULE.map((d) => ({ ...d, ranges: d.ranges.map((r) => ({ ...r })) })))
            try {
              const payload = {
                days: DEFAULT_SCHEDULE.map((d) => ({
                  dayOfWeek: d.dayOfWeek,
                  isOpen: d.isOpen,
                  ranges: d.ranges.map((r) => ({ openTime: r.openTime, closeTime: r.closeTime })),
                })),
              }
              const result = await secureApiCall(API_CONFIG.ENDPOINTS.BUSINESS_HOURS, {
                method: "PUT",
                body: JSON.stringify(payload),
              })
              if (!result.hasError) {
                mutate()
              } else {
                Alert.alert("Erro", result.message || "Erro ao restaurar horários.")
              }
            } catch {
              Alert.alert("Erro", "Erro ao conectar ao servidor.")
            } finally {
              setResetting(false)
            }
          },
        },
      ]
    )
  }, [mutate])

  // ─── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={appStyles.centered}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    )
  }

  return (
    <View style={appStyles.container}>
      <ScreenHeader
        title="Horários de Funcionamento"
        showBack
        onBack={() => router.back()}
        right={
          localHours.length > 0 && !isScheduleDefault(localHours) ? (
            <TouchableOpacity
              onPress={resetToDefault}
              disabled={resetting || isSaving !== null}
              style={[
                appStyles.resetButton,
                (resetting || isSaving !== null) && appStyles.opacityDisabled,
              ]}
              activeOpacity={0.7}
            >
              {resetting ? (
                <ActivityIndicator size="small" color="#64748b" />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={14} color="#64748b" />
                  <Text style={appStyles.resetButtonText}>Restaurar</Text>
                </>
              )}
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView contentContainerStyle={appStyles.scrollContent}>
        <View style={appStyles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#64748b" />
          <Text style={appStyles.infoText}>
            Defina os horários em que seu estabelecimento está aberto para receber agendamentos.
            Você pode adicionar múltiplos intervalos por dia.
          </Text>
        </View>

        {localHours.map((day) => {
          const dayMeta = DAYS_OF_WEEK.find((d) => d.day === day.dayOfWeek)!
          const saving = isSaving === day.dayOfWeek

          return (
            <View key={day.dayOfWeek} style={appStyles.dayCard}>
              {/* Day header row */}
              <View style={appStyles.dayHeader}>
                <View>
                  <Text style={appStyles.dayLabel}>{dayMeta.label}</Text>
                  <Text style={[appStyles.statusLabel, { color: day.isOpen ? "#10b981" : "#ef4444" }]}>
                    {day.isOpen ? "Aberto" : "Fechado"}
                  </Text>
                </View>
                <Switch
                  value={day.isOpen}
                  onValueChange={(val) => toggleDay(day.dayOfWeek, val)}
                  trackColor={{ false: "#e2e8f0", true: primaryColor + "80" }}
                  thumbColor={day.isOpen ? primaryColor : "#f8fafc"}
                  disabled={saving}
                />
              </View>

              {/* Time ranges */}
              {day.isOpen && (
                <View style={appStyles.rangesContainer}>
                  {day.ranges.map((range, rangeIndex) => (
                    <View key={rangeIndex} style={appStyles.rangeRow}>
                      {/* Open time */}
                      <View style={appStyles.timeInputGroup}>
                        <Text style={appStyles.timeLabel}>Início</Text>
                        <TimeSelector
                          value={range.openTime}
                          onSelect={(time) => updateRange(day.dayOfWeek, rangeIndex, "openTime", time)}
                          primaryColor={primaryColor}
                          disabled={saving}
                        />
                      </View>

                      <View style={appStyles.timeSeparator}>
                        <Text style={appStyles.timeSeparatorText}>até</Text>
                      </View>

                      {/* Close time */}
                      <View style={appStyles.timeInputGroup}>
                        <Text style={appStyles.timeLabel}>Fim</Text>
                        <TimeSelector
                          value={range.closeTime}
                          onSelect={(time) => updateRange(day.dayOfWeek, rangeIndex, "closeTime", time)}
                          primaryColor={primaryColor}
                          disabled={saving}
                        />
                      </View>

                      {/* Delete range button — always rendered for layout, invisible when only 1 range */}
                      <TouchableOpacity
                        style={[
                          appStyles.deleteRangeButton,
                          day.ranges.length <= 1 && appStyles.deleteRangeButtonHidden,
                        ]}
                        onPress={() => removeRange(day.dayOfWeek, rangeIndex)}
                        disabled={day.ranges.length <= 1 || saving}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {/* Add range + Save row */}
                  <View style={appStyles.actionsRow}>
                    <TouchableOpacity
                      style={appStyles.addRangeButton}
                      onPress={() => addRange(day.dayOfWeek)}
                      disabled={saving}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add-circle-outline" size={16} color={primaryColor} />
                      <Text style={[appStyles.addRangeText, { color: primaryColor }]}>
                        Adicionar horário
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[appStyles.saveButton, { backgroundColor: primaryColor }, saving && appStyles.saveButtonDisabled]}
                      onPress={() => saveDay(day.dayOfWeek)}
                      disabled={saving}
                      activeOpacity={0.8}
                    >
                      {saving ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={appStyles.saveButtonText}>Salvar</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* When day is closed, show Save button to persist the toggle */}
              {!day.isOpen && (
                <View style={appStyles.closedSaveRow}>
                  <TouchableOpacity
                    style={[appStyles.saveButton, { backgroundColor: primaryColor }, saving && appStyles.saveButtonDisabled]}
                    onPress={() => saveDay(day.dayOfWeek)}
                    disabled={saving}
                    activeOpacity={0.8}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={appStyles.saveButtonText}>Salvar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {saving && (
                <View style={appStyles.savingOverlay}>
                  <ActivityIndicator size="small" color={primaryColor} />
                </View>
              )}
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

// ─── TimeSelector ─────────────────────────────────────────────────────────────

function TimeSelector({
  value,
  onSelect,
  primaryColor,
  disabled,
}: {
  value: string
  onSelect: (val: string) => void
  primaryColor: string
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <TouchableOpacity
        style={[appStyles.timePickerTrigger, disabled && appStyles.opacityDisabled]}
        onPress={() => !disabled && setIsOpen(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="time-outline" size={16} color="#64748b" style={{ marginRight: 6 }} />
        <Text style={appStyles.timePickerText}>{value}</Text>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={appStyles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={appStyles.timeModal}>
            <View style={appStyles.modalHeader}>
              <Text style={appStyles.modalTitle}>Selecionar Horário</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={appStyles.timeList}>
              {TIME_OPTIONS.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    appStyles.timeOption,
                    value === time && { backgroundColor: primaryColor + "15" },
                  ]}
                  onPress={() => {
                    onSelect(time)
                    setIsOpen(false)
                  }}
                >
                  <Text
                    style={[
                      appStyles.timeOptionText,
                      value === time && { color: primaryColor, fontWeight: "bold" },
                    ]}
                  >
                    {time}
                  </Text>
                  {value === time && (
                    <Ionicons name="checkmark" size={18} color={primaryColor} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const appStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    color: "#64748b",
    fontSize: 13,
    marginLeft: 8,
    lineHeight: 18,
  },
  // ── Day card ──────────────────────────────────────────────────────────────
  dayCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    position: "relative",
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  statusLabel: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500",
  },
  // ── Ranges ────────────────────────────────────────────────────────────────
  rangesContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    gap: 10,
  },
  rangeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  timeInputGroup: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 11,
    color: "#94a3b8",
    textTransform: "uppercase",
    fontWeight: "bold",
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  timeSeparator: {
    paddingBottom: 12,
  },
  timeSeparatorText: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "500",
  },
  deleteRangeButton: {
    paddingBottom: 10,
    paddingLeft: 4,
  },
  deleteRangeButtonHidden: {
    opacity: 0,
  },
  // ── Actions row ───────────────────────────────────────────────────────────
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  addRangeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
  },
  addRangeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 80,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  closedSaveRow: {
    marginTop: 12,
    alignItems: "flex-end",
  },
  // ── Misc ─────────────────────────────────────────────────────────────────
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.65)",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  opacityDisabled: {
    opacity: 0.5,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  // ── Time picker trigger ───────────────────────────────────────────────────
  timePickerTrigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  timePickerText: {
    fontSize: 14,
    color: "#1e293b",
    fontWeight: "500",
  },
  // ── Time picker modal ─────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  timeModal: {
    width: "85%",
    height: "60%",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingTop: 20,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#1e293b",
  },
  timeList: {
    flex: 1,
  },
  timeOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  timeOptionText: {
    fontSize: 16,
    color: "#475569",
  },
})

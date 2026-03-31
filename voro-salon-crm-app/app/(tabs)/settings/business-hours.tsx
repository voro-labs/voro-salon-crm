import React, { useState, useMemo, useEffect } from "react"
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

interface BusinessHoursViewModel {
  dayOfWeek: number
  isOpen: boolean
  openTime: string
  closeTime: string
}

const DAYS_OF_WEEK = [
  { day: 0, label: "Domingo" },
  { day: 1, label: "Segunda-feira" },
  { day: 2, label: "Terça-feira" },
  { day: 3, label: "Quarta-feira" },
  { day: 4, label: "Quinta-feira" },
  { day: 5, label: "Sexta-feira" },
  { day: 6, label: "Sábado" },
]

// Gera horários de 15 em 15 min
const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4).toString().padStart(2, "0")
  const m = ((i % 4) * 15).toString().padStart(2, "0")
  return `${h}:${m}`
})

export default function BusinessHoursScreen() {
  const { primaryColor } = useTenantTheme()
  const { user } = useAuth()
  const router = useRouter()
  const [isSaving, setIsSaving] = useState<number | null>(null)

  const roleNames = user?.roles?.map((r: any) => r.name) ?? []
  const isSalonOwner = roleNames.includes("SalonOwner") || roleNames.includes("Owner")

  useEffect(() => {
    if (user && !isSalonOwner) {
      router.replace("/")
    }
  }, [user, isSalonOwner])
  
  const { data: businessHours, mutate, isLoading } = useSWR<BusinessHoursViewModel[]>(
    API_CONFIG.ENDPOINTS.BUSINESS_HOURS,
    fetcher
  )

  const sortedHours = useMemo(() => {
    return DAYS_OF_WEEK.map((d) => {
      const setting = (businessHours || []).find((bh) => bh.dayOfWeek === d.day)
      
      // Se não houver configuração, usa o padrão: 08-18 e aberto se seg-sab (1-6)
      const defaultIsOpen = d.day >= 1 && d.day <= 6
      const defaultOpen = "08:00"
      const defaultClose = "18:00"

      return {
        ...d,
        isOpen: setting?.isOpen ?? defaultIsOpen,
        openTime: setting?.openTime ? setting.openTime.slice(0, 5) : defaultOpen,
        closeTime: setting?.closeTime ? setting.closeTime.slice(0, 5) : defaultClose,
      }
    })
  }, [businessHours])

  const handleUpdate = async (day: number, updates: Partial<BusinessHoursViewModel>) => {
    setIsSaving(day)
    try {
      const current = sortedHours.find(h => h.day === day)
      const payload = {
        dayOfWeek: day,
        isOpen: updates.isOpen !== undefined ? updates.isOpen : current?.isOpen,
        openTime: updates.openTime || current?.openTime || "09:00",
        closeTime: updates.closeTime || current?.closeTime || "18:00",
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
    } catch (err) {
      Alert.alert("Erro", "Erro ao conectar ao servidor")
    } finally {
      setIsSaving(null)
    }
  }

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
      />
      
      <ScrollView contentContainerStyle={appStyles.scrollContent}>
        <View style={appStyles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#64748b" />
          <Text style={appStyles.infoText}>
            Defina os horários em que seu estabelecimento está aberto para receber agendamentos.
          </Text>
        </View>

        {sortedHours.map((day) => (
          <View key={day.day} style={appStyles.dayCard}>
            <View style={appStyles.dayHeader}>
              <View>
                <Text style={appStyles.dayLabel}>{day.label}</Text>
                <Text style={[appStyles.statusLabel, { color: day.isOpen ? "#10b981" : "#ef4444" }]}>
                  {day.isOpen ? "Aberto" : "Fechado"}
                </Text>
              </View>
              <Switch
                value={day.isOpen}
                onValueChange={(val) => handleUpdate(day.day, { isOpen: val })}
                trackColor={{ false: "#e2e8f0", true: primaryColor + "80" }}
                thumbColor={day.isOpen ? primaryColor : "#f8fafc"}
                disabled={isSaving === day.day}
              />
            </View>

            {day.isOpen && (
              <View style={appStyles.timeContainer}>
                <View style={appStyles.timeInputGroup}>
                  <Text style={appStyles.timeLabel}>Início</Text>
                  <TimeSelector
                    value={day.openTime}
                    onSelect={(time) => handleUpdate(day.day, { openTime: time })}
                    primaryColor={primaryColor}
                    disabled={isSaving === day.day}
                  />
                </View>

                <View style={appStyles.timeSeparator}>
                  <Ionicons name="arrow-forward-outline" size={16} color="#94a3b8" />
                </View>

                <View style={appStyles.timeInputGroup}>
                  <Text style={appStyles.timeLabel}>Fim</Text>
                  <TimeSelector
                    value={day.closeTime}
                    onSelect={(time) => handleUpdate(day.day, { closeTime: time })}
                    primaryColor={primaryColor}
                    disabled={isSaving === day.day}
                  />
                </View>
              </View>
            )}

            {isSaving === day.day && (
              <View style={appStyles.savingOverlay}>
                <ActivityIndicator size="small" color={primaryColor} />
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

function TimeSelector({ 
  value, 
  onSelect, 
  primaryColor,
  disabled 
}: { 
  value: string, 
  onSelect: (val: string) => void,
  primaryColor: string,
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <TouchableOpacity 
        style={[appStyles.timePickerTrigger, disabled && appStyles.disabled]} 
        onPress={() => !disabled && setIsOpen(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="time-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
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
                    value === time && { backgroundColor: primaryColor + "15" }
                  ]}
                  onPress={() => {
                    onSelect(time)
                    setIsOpen(false)
                  }}
                >
                  <Text style={[
                    appStyles.timeOptionText,
                    value === time && { color: primaryColor, fontWeight: "bold" }
                  ]}>
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
    alignItems: "center",
  },
  infoText: {
    flex: 1,
    color: "#64748b",
    fontSize: 13,
    marginLeft: 8,
    lineHeight: 18,
  },
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
  timeContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
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
  },
  timeSeparator: {
    paddingHorizontal: 12,
    paddingBottom: 14,
  },
  timePickerTrigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  timePickerText: {
    fontSize: 15,
    color: "#1e293b",
    fontWeight: "500",
  },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
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
  disabled: {
    opacity: 0.5,
  }
})

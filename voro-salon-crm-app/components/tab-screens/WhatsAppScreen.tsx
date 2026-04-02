import React, { useState } from "react"
import {
  View, Text, ScrollView, ActivityIndicator, Pressable, RefreshControl,
  TextInput, Dimensions
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import useSWR from "swr"
import { API_CONFIG } from "lib/api"
import { fetcher } from "lib/fetcher"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { ScreenHeader } from "components/ScreenHeader"
import { SendTemplateModal } from "./whatsapp/SendTemplateModal"
import { useModuleGuard } from "hooks/use-module-guard.hook"
import { usePlanLimits } from "hooks/use-plan-limits.hook"

// ─── Types ───────────────────────────────────────────────────────────────────
interface WhatsAppConversation {
  id: string
  phoneNumber: string
  contactName: string
  state: string
  lastMessageBody: string
  lastMessageAt: string
  appointmentId: string | null
  clientId: string | null
}

const KANBAN_COLUMNS = [
  { state: "START",                  label: "Novo Contato",            borderColor: "border-slate-300",  bgColor: "bg-slate-100",    textColor: "text-slate-700" },
  { state: "AWAITING_TENANT",        label: "Escolhendo Unidade",      borderColor: "border-zinc-300",   bgColor: "bg-zinc-100",     textColor: "text-zinc-700" },
  { state: "AWAITING_SERVICE",       label: "Escolhendo Serviço",      borderColor: "border-cyan-300",   bgColor: "bg-cyan-100",     textColor: "text-cyan-700" },
  { state: "AWAITING_EMPLOYEE",      label: "Escolhendo Profissional", borderColor: "border-violet-300", bgColor: "bg-violet-100",   textColor: "text-violet-700" },
  { state: "AWAITING_DATE",          label: "Escolhendo Data",         borderColor: "border-amber-300",  bgColor: "bg-amber-100",    textColor: "text-amber-700" },
  { state: "AWAITING_TIME",          label: "Escolhendo Horário",      borderColor: "border-orange-300", bgColor: "bg-orange-100",   textColor: "text-orange-700" },
  { state: "AWAITING_DESCRIPTION",   label: "Aguardando Descrição",    borderColor: "border-purple-300", bgColor: "bg-purple-100",   textColor: "text-purple-700" },
  { state: "AWAITING_CONFIRMATION",  label: "Aguardando Cont.",        borderColor: "border-rose-300",   bgColor: "bg-rose-100",     textColor: "text-rose-700" },
  { state: "AWAITING_REMINDER_TIME", label: "Definindo Lembrete",    borderColor: "border-indigo-300", bgColor: "bg-indigo-100",   textColor: "text-indigo-700" },
  { state: "COMPLETED",              label: "Agendado",                borderColor: "border-emerald-300",bgColor: "bg-emerald-100",  textColor: "text-emerald-700" },
  { state: "CANCELLED",              label: "Cancelado",               borderColor: "border-gray-300",   bgColor: "bg-gray-100",     textColor: "text-gray-700" },  
]

const { width: SCREEN_WIDTH } = Dimensions.get("window")
const COLUMN_WIDTH = Math.min(SCREEN_WIDTH * 0.85, 300)

// ─── Utilities ───────────────────────────────────────────────────────────────
function timeAgo(dateString: string) {
  if (!dateString) return ""
  const date = new Date(dateString)
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000)
  
  if (diffInMinutes < 1) return "Agora"
  if (diffInMinutes < 60) return `${diffInMinutes}m`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h`
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d`
  
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

interface WhatsAppScreenProps {
  rootPath?: string
}

export function WhatsAppScreen({ rootPath = "/(tabs)" }: WhatsAppScreenProps) {
  useModuleGuard("whatsapp")
  const { hasWhatsAppBot, isLoaded } = usePlanLimits()
  const router = useRouter()
  const { primaryColor } = useTenantTheme()
  const [search, setSearch] = useState("")
  const [showSendModal, setShowSendModal] = useState(false)

  if (isLoaded && !hasWhatsAppBot) return null

  const { data: tenant } = useSWR<any>(API_CONFIG.ENDPOINTS.TENANT_ME, fetcher)
  const { data: conversations, isLoading, mutate } = useSWR<WhatsAppConversation[]>(
    API_CONFIG.ENDPOINTS.WHATSAPP_CONVERSATIONS,
    fetcher,
    { refreshInterval: 30000 }
  )

  const isConfigured = tenant?.whatsappPhoneNumberId && tenant?.whatsappBusinessAccountId

  const filtered = (conversations ?? []).filter((c) => {
    const q = search.toLowerCase()
    return c.contactName.toLowerCase().includes(q) || c.phoneNumber.includes(q)
  })

  function getColumnConversations(state: string) {
    return filtered.filter((c) => c.state === state)
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={[]}>
      <ScreenHeader title="WhatsApp" />

      {!tenant?.useWhatsappBooking && tenant !== undefined ? (
        <View className="flex-1 items-center justify-center px-8 bg-white">
          <View className="h-24 w-24 rounded-full bg-emerald-50 items-center justify-center mb-6">
            <Ionicons name="logo-whatsapp" size={48} color="#10b981" />
          </View>
          <Text className="text-2xl font-black text-zinc-900 text-center mb-2">WhatsApp Desativado</Text>
          <Text className="text-zinc-500 text-center text-base mb-8 leading-relaxed">
            O assistente do WhatsApp não está ativo para este estabelecimento. Ative-o nas configurações para gerenciar suas conversas.
          </Text>
          <Pressable
            onPress={() => router.push(`${rootPath}/settings/whatsapp` as any)}
            className="w-full h-14 rounded-2xl items-center justify-center flex-row gap-2"
            style={{ backgroundColor: primaryColor }}
          >
            <Ionicons name="settings-outline" size={20} color="white" />
            <Text className="text-white font-black text-base">Ir para Configurações</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {!isConfigured && tenant !== undefined && (
            <View className="mx-4 mt-2 mb-2 p-3 bg-amber-50 border border-amber-300 rounded-2xl flex-row items-center gap-3">
              <Ionicons name="warning-outline" size={24} color="#b45309" />
              <View className="flex-1">
                <Text className="text-amber-900 font-bold text-sm">Integração Pendente</Text>
                <Text className="text-amber-800 text-xs mt-0.5">O WhatsApp Bot não está configurado para este estabelecimento.</Text>
              </View>
            </View>
          )}

          {/* Toolbar */}
          <View className="px-4 py-3 flex-row items-center gap-2">
            <View className="flex-1 flex-row items-center bg-white border border-zinc-200 rounded-xl px-3 h-10">
              <Ionicons name="search" size={16} color="#a1a1aa" />
              <TextInput
                placeholder="Buscar contato..."
                placeholderTextColor="#a1a1aa"
                className="flex-1 px-2 text-zinc-900 font-medium text-sm h-full"
                value={search}
                onChangeText={setSearch}
              />
              {search ? (
                <Pressable onPress={() => setSearch("")} className="p-1">
                  <Ionicons name="close-circle" size={16} color="#d4d4d8" />
                </Pressable>
              ) : null}
            </View>

            <Pressable
              className="h-10 px-3 flex-row items-center justify-center gap-1.5 rounded-xl border"
              style={{ borderColor: primaryColor + "40", backgroundColor: primaryColor + "10" }}
              onPress={() => setShowSendModal(true)}
            >
              <Ionicons name="paper-plane" size={16} color={primaryColor} />
              <Text className="font-bold text-sm" style={{ color: primaryColor }}>Template</Text>
            </Pressable>
          </View>

          {/* Kanban Board */}
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color={primaryColor} />
            </View>
          ) : conversations?.length === 0 ? (
            <View className="flex-1 items-center justify-center px-12 pb-20">
              <View className="h-24 w-24 rounded-full bg-zinc-100 items-center justify-center mb-6">
                <Ionicons name="chatbubbles-outline" size={48} color="#a1a1aa" />
              </View>
              <Text className="text-xl font-black text-zinc-900 text-center mb-2">Nenhuma conversa ainda</Text>
              <Text className="text-zinc-500 text-center text-base leading-relaxed">
                As conversas via WhatsApp aparecerão aqui conforme os clientes interagirem.
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-1"
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
              snapToInterval={COLUMN_WIDTH + 12}
              decelerationRate="fast"
            >
              {KANBAN_COLUMNS.map((col, index) => {
                const items = getColumnConversations(col.state)
                return (
                  <View
                    key={col.state}
                    style={{ width: COLUMN_WIDTH, marginRight: index === KANBAN_COLUMNS.length - 1 ? 0 : 12 }}
                    className={`bg-white rounded-3xl border-2 ${col.borderColor} p-3`}
                  >
                    <View className={`flex-row items-center justify-between rounded-xl px-3 py-2 ${col.bgColor} mb-3`}>
                      <Text className={`text-xs font-black uppercase tracking-wider ${col.textColor}`}>
                        {col.label}
                      </Text>
                      <View className="bg-white/50 px-2 py-0.5 rounded-full">
                        <Text className={`font-black text-xs ${col.textColor}`}>{items.length}</Text>
                      </View>
                    </View>

                    <ScrollView 
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={{ gap: 10, paddingBottom: 16 }}
                      refreshControl={
                        <RefreshControl refreshing={false} onRefresh={() => mutate()} tintColor={primaryColor} />
                      }
                    >
                      {items.length === 0 ? (
                        <View className="py-8 items-center justify-center">
                          <Ionicons name="chatbubbles-outline" size={32} color="#e4e4e7" />
                          <Text className="text-zinc-400 text-xs font-semibold mt-2">Ninguém nesta etapa</Text>
                        </View>
                      ) : (
                        items.map(conv => {
                          const isScheduled = conv.state === "COMPLETED" && conv.appointmentId
                          const displayName = conv.contactName !== "Cliente" ? conv.contactName : conv.phoneNumber
                          
                          return (
                            <Pressable
                              key={conv.id}
                              className={`flex-col gap-2 p-3 rounded-2xl border ${isScheduled ? "border-emerald-200 bg-emerald-50/40" : "border-zinc-100 bg-white shadow-sm"}`}
                              onPress={() => {
                                router.push({
                                  pathname: `${rootPath}/whatsapp/[phone]`,
                                  params: { 
                                    phone: conv.phoneNumber, 
                                    contactName: conv.contactName,
                                    clientId: conv.clientId || undefined
                                  }
                                } as any);
                              }}
                            >
                              <View className="flex-row justify-between items-start gap-2">
                                <View className="flex-row items-center gap-2 flex-1 min-w-0">
                                  <View className={`h-8 w-8 rounded-full items-center justify-center ${isScheduled ? "bg-emerald-100" : "bg-zinc-100"}`}>
                                    <Ionicons name={isScheduled ? "calendar" : "person"} size={14} color={isScheduled ? "#059669" : "#71717a"} />
                                  </View>
                                  <View className="flex-1 min-w-0">
                                    <Text className="text-sm font-black text-zinc-900" numberOfLines={1}>{displayName}</Text>
                                    {conv.contactName !== "Cliente" && (
                                      <Text className="text-[10px] text-zinc-400 font-mono tracking-tight">{conv.phoneNumber}</Text>
                                    )}
                                  </View>
                                </View>
                                <Text className="text-[10px] text-zinc-400 shrink-0 font-medium">
                                  {timeAgo(conv.lastMessageAt)}
                                </Text>
                              </View>
                              
                              <Text className="text-xs text-zinc-500 line-clamp-2 mt-1 leading-relaxed">
                                {conv.lastMessageBody || "Sem mensagens"}
                              </Text>

                              {conv.clientId && (
                                <Pressable 
                                  onPress={() => router.push(`${rootPath}/clients/${conv.clientId}` as any)}
                                  className="mt-1 flex-row items-center gap-1 self-start rounded bg-zinc-100 px-2 py-1"
                                >
                                  <Ionicons name="link" size={10} color="#71717a" />
                                  <Text className="text-[10px] font-bold text-zinc-600">Ver Ficha</Text>
                                </Pressable>
                              )}
                            </Pressable>
                          )
                        })
                      )}
                    </ScrollView>
                  </View>
                )
              })}
            </ScrollView>
          )}
        </>
      )}

      {showSendModal && (
        <SendTemplateModal
          visible={showSendModal}
          onClose={() => setShowSendModal(false)}
        />
      )}

    </SafeAreaView>
  )
}

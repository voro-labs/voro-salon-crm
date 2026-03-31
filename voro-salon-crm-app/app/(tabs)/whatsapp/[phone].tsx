import React, { useRef, useEffect } from "react"
import {
  View, Text, ScrollView, ActivityIndicator, Pressable, KeyboardAvoidingView,
  Platform, TextInput
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import useSWR from "swr"
import { API_CONFIG, secureApiCall } from "lib/api"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { ScreenHeader } from "components/ScreenHeader"

// ─── Types ───────────────────────────────────────────────────────────────────
interface WhatsAppMessage {
  id: string
  tenantId: string
  direction: "inbound" | "outbound"
  from: string
  to: string
  body: string
  whatsAppMessageId: string | null
  status: string
  timestamp: string
}

export default function WhatsAppChatScreen() {
  const router = useRouter()
  const { phone, contactName, clientId } = useLocalSearchParams<{
    phone: string
    contactName: string
    clientId?: string
  }>()
  const { primaryColor } = useTenantTheme()
  const scrollRef = useRef<ScrollView>(null)
  const [message, setMessage] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)

  const { data: messages, isLoading } = useSWR<WhatsAppMessage[]>(
    phone ? `${API_CONFIG.ENDPOINTS.WHATSAPP_MESSAGES}?phone=${encodeURIComponent(phone)}` : null,
    async (url) => {
      const res = await secureApiCall<WhatsAppMessage[]>(url, { method: "GET" })
      return res.hasError ? [] : (res.data ?? [])
    },
    { refreshInterval: 5000 }
  )

  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true })
      }, 100)
    }
  }, [messages])

  const displayName = contactName !== "Cliente" && contactName ? contactName : phone

  // ─── Group by Date ───────────────────────────────────────────────────────────
  const groupMessagesByDate = (msgs: WhatsAppMessage[]) => {
    const groups: { date: string; msgs: WhatsAppMessage[] }[] = []
    for (const msg of msgs) {
      const dateKey = new Date(msg.timestamp).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
      const last = groups[groups.length - 1]
      if (last && last.date === dateKey) {
        last.msgs.push(msg)
      } else {
        groups.push({ date: dateKey, msgs: [msg] })
      }
    }
    return groups
  }

  const groups = messages ? groupMessagesByDate(messages) : []

  const handleSendMessage = async () => {
    if (!message.trim() || !phone || isSending) return

    setIsSending(true)
    try {
      const res = await secureApiCall(API_CONFIG.ENDPOINTS.WHATSAPP_MESSAGES, {
        method: "POST",
        body: JSON.stringify({
          to: phone,
          body: message.trim()
        })
      })

      if (res.hasError) {
        alert(res.message || "Erro ao enviar mensagem")
      } else {
        setMessage("")
        // Forçar atualização do SWR para mostrar a mensagem enviada
        messages?.push({
          id: Math.random().toString(),
          tenantId: "",
          direction: "outbound",
          from: "",
          to: phone,
          body: message.trim(),
          whatsAppMessageId: null,
          status: "sent",
          timestamp: new Date().toISOString()
        })
      }
    } catch (err) {
      alert("Erro de conexão ao enviar mensagem")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#efe7de]" edges={["bottom"]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : undefined} 
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        className="flex-1"
      >
        {/* Header */}
        <ScreenHeader
          title={displayName}
          showBack
          onBack={() => router.back()}
          right={
            <View className="flex-row items-center gap-3">
              {clientId && (
                <Pressable
                  onPress={() => router.push(`/(tabs)/clients/${clientId}` as any)}
                  className="h-9 w-9 rounded-full bg-white/80 items-center justify-center shadow-sm"
                >
                  <Ionicons name="person" size={18} color="#52525b" />
                </Pressable>
              )}
            </View>
          }
        />

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 16, gap: 8 }}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View className="flex-1 items-center justify-center py-20">
              <ActivityIndicator size="small" color={primaryColor} />
            </View>
          ) : !messages || messages.length === 0 ? (
            <View className="bg-white/60 mx-10 p-4 rounded-2xl items-center gap-2">
              <Ionicons name="lock-closed" size={14} color="#a1a1aa" />
              <Text className="text-zinc-500 text-[11px] text-center leading-relaxed">
                As mensagens são protegidas pela Meta.{"\n"}Inicie uma conversa enviando um template.
              </Text>
            </View>
          ) : (
            groups.map((group) => (
              <View key={group.date} className="gap-2">
                {/* Date Header */}
                <View className="items-center my-3">
                  <View className="bg-[#d1eaef] px-3 py-1 rounded-lg">
                    <Text className="text-[10px] text-[#5c7278] font-bold uppercase tracking-wider">{group.date}</Text>
                  </View>
                </View>

                {/* Msg Bubbles */}
                {group.msgs.map((msg) => {
                  const isOutbound = msg.direction === "outbound"
                  return (
                    <View
                      key={msg.id}
                      className={`flex-row mb-1 ${isOutbound ? "justify-end" : "justify-start"}`}
                    >
                      <View
                        className={`max-w-[85%] rounded-xl px-3 py-1.5 shadow-sm ${isOutbound
                          ? "bg-[#dcf8c6] rounded-tr-none"
                          : "bg-white rounded-tl-none"
                          }`}
                      >
                        <Text
                          className="text-[15px] leading-snug text-zinc-800"
                        >
                          {msg.body}
                        </Text>
                        <View className="flex-row items-center justify-end gap-1 mt-1">
                          <Text className="text-[10px] text-zinc-400">
                            {new Date(msg.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </Text>
                          {isOutbound && (
                            <Ionicons 
                              name={msg.status === "read" ? "checkmark-done" : msg.status === "delivered" ? "checkmark-done" : "checkmark"} 
                              size={15} 
                              color={msg.status === "read" ? "#34b7f1" : "#919191"} 
                            />
                          )}
                        </View>
                      </View>
                    </View>
                  )
                })}
              </View>
            ))
          )}
        </ScrollView>

        {/* Input Area */}
        <View className="bg-white px-3 py-3 border-t border-zinc-200 flex-row items-center gap-2">
          <View className="flex-1 bg-zinc-50 border border-zinc-200 rounded-[24px] px-4 py-2 min-h-[44px] flex-row items-center gap-2">
            <TextInput
              className="flex-1 text-zinc-900 text-base py-1"
              placeholder="Mensagem"
              placeholderTextColor="#a1a1aa"
              value={message}
              onChangeText={setMessage}
              multiline
              style={{ maxHeight: 100 }}
            />
          </View>
          <Pressable
            onPress={handleSendMessage}
            disabled={!message.trim() || isSending}
            className={`h-11 w-11 rounded-full items-center justify-center ${message.trim() ? "" : "opacity-50"}`}
            style={{ backgroundColor: primaryColor }}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="send" size={20} color="white" style={{ marginLeft: 3 }} />
            )}
          </Pressable>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

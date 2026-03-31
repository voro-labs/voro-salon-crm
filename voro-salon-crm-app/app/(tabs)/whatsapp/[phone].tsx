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
    <SafeAreaView className="flex-1 bg-zinc-50" edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-zinc-100 flex-none gap-3">
          <Pressable onPress={() => router.back()} className="h-10 w-10 bg-zinc-50 rounded-xl items-center justify-center border border-zinc-100">
            <Ionicons name="chevron-back" size={20} color="#18181b" />
          </Pressable>
          <View className="flex-1 flex-row items-center gap-3 min-w-0">
            <View className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
              <Text className="text-sm font-bold text-zinc-500">
                {displayName ? displayName.charAt(0).toUpperCase() : "?"}
              </Text>
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-base font-black text-zinc-900 truncate" numberOfLines={1}>{displayName}</Text>
              <Text className="text-[11px] text-zinc-500 font-mono tracking-tight">{phone}</Text>
            </View>
          </View>
          {clientId && (
            <Pressable
              onPress={() => router.push(`/(tabs)/clients/${clientId}` as any)}
              className="px-3 h-9 rounded-xl border border-zinc-200 bg-white flex-row items-center justify-center gap-1.5 shrink-0 shadow-sm"
            >
              <Ionicons name="person" size={12} color="#52525b" />
              <Text className="text-xs font-bold text-zinc-700">Ficha</Text>
            </Pressable>
          )}
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          style={{ backgroundColor: "#f4f4f5" }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20, gap: 16 }}
        >
          {isLoading ? (
            <View className="flex-1 items-center justify-center py-20">
              <ActivityIndicator size="large" color={primaryColor} />
            </View>
          ) : !messages || messages.length === 0 ? (
            <View className="flex-1 items-center justify-center py-20 gap-3">
              <Ionicons name="chatbubbles-outline" size={48} color="#d4d4d8" />
              <Text className="text-zinc-500 font-medium">Nenhuma mensagem salva.</Text>
            </View>
          ) : (
            groups.map((group) => (
              <View key={group.date} className="gap-3">
                {/* Date Header */}
                <View className="flex-row items-center justify-center gap-3 my-2">
                  <View className="flex-1 h-[1px] bg-zinc-200" />
                  <Text className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{group.date}</Text>
                  <View className="flex-1 h-[1px] bg-zinc-200" />
                </View>

                {/* Msg Bubbles */}
                {group.msgs.map((msg) => {
                  const isOutbound = msg.direction === "outbound"
                  return (
                    <View
                      key={msg.id}
                      className={`flex-row ${isOutbound ? "justify-end" : "justify-start"}`}
                    >
                      <View
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                          isOutbound
                            ? "rounded-br-sm"
                            : "bg-white border border-zinc-100 rounded-bl-sm"
                        }`}
                        style={isOutbound ? { backgroundColor: primaryColor } : {}}
                      >
                        <Text
                          className={`text-[15px] leading-relaxed ${isOutbound ? "text-white" : "text-zinc-800"}`}
                        >
                          {msg.body}
                        </Text>
                        <View className="flex-row items-center justify-end gap-1 mt-1">
                          <Text
                            className={`text-[10px] ${isOutbound ? "text-white/70" : "text-zinc-400"}`}
                          >
                            {new Date(msg.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </Text>
                          {isOutbound && msg.status === "read" && (
                            <Ionicons name="checkmark-done" size={14} color="#60a5fa" />
                          )}
                          {isOutbound && msg.status === "delivered" && (
                            <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.7)" />
                          )}
                          {isOutbound && msg.status === "sent" && (
                            <Ionicons name="checkmark" size={14} color="rgba(255,255,255,0.7)" />
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
        <View className="bg-white border-t border-zinc-200 px-4 py-3 pb-8">
          <View className="flex-row items-end gap-2 bg-zinc-50 border border-zinc-200 rounded-3xl p-2 pl-4">
            <TextInput
              className="flex-1 min-h-[40px] max-h-[120px] text-zinc-900 text-[15px] py-2"
              placeholder="Digite sua mensagem..."
              placeholderTextColor="#a1a1aa"
              multiline
              value={message}
              onChangeText={setMessage}
              editable={!isSending}
            />
            <Pressable
              onPress={handleSendMessage}
              disabled={!message.trim() || isSending}
              className={`h-10 w-10 rounded-full items-center justify-center ${
                !message.trim() || isSending ? "bg-zinc-200" : ""
              }`}
              style={message.trim() && !isSending ? { backgroundColor: primaryColor } : {}}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="send" size={18} color="white" />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

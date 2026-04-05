import React, { useState, useEffect } from "react"
import {
  View, Text, TextInput, Pressable, ScrollView, Modal, ActivityIndicator,
  Alert
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import useSWR from "swr"
import { API_CONFIG, secureApiCall } from "lib/api"
import { fetcher } from "lib/fetcher"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"

interface SendTemplateModalProps {
  visible: boolean
  onClose: () => void
}

interface Template {
  name: string
  label: string
  paramsCount: number
  paramLabels?: string[]
}

interface SendResult {
  clientId: string
  clientName: string
  phone: string
  success: boolean
  error: string | null
}

export function SendTemplateModal({ visible, onClose }: SendTemplateModalProps) {
  const { data: templates } = useSWR<Template[]>(visible ? API_CONFIG.ENDPOINTS.WHATSAPP_TEMPLATES : null, fetcher)
  const { data: _clientsRaw } = useSWR<any>(visible ? API_CONFIG.ENDPOINTS.CLIENTS + "?pageSize=500" : null, fetcher)
  const clients: any[] | undefined = _clientsRaw?.items ?? (Array.isArray(_clientsRaw) ? _clientsRaw : undefined)
  const { data: tenant } = useSWR<any>(visible ? API_CONFIG.ENDPOINTS.TENANT_ME : null, fetcher)
  const { primaryColor } = useTenantTheme()

  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
  const [bodyParams, setBodyParams] = useState<string[]>([])
  const [isSending, setIsSending] = useState(false)
  const [results, setResults] = useState<SendResult[] | null>(null)

  const currentTemplate = templates?.find((t) => t.name === selectedTemplate)

  const isAutoParam = (label: string) => {
    const l = label.toLowerCase()
    return l.includes("estabelecimento") || l.includes("cliente")
  }

  const handleTemplateChange = (name: string) => {
    const tpl = templates?.find((t) => t.name === name)
    setSelectedTemplate(name)
    const labels = tpl?.paramLabels ?? []
    setBodyParams(Array(tpl?.paramsCount ?? 0).fill("").map((_, i) => {
      const label = labels[i] ?? ""
      if (label.toLowerCase().includes("estabelecimento")) return tenant?.name ?? ""
      return ""
    }))
  }

  useEffect(() => {
    if (!currentTemplate) return
    setBodyParams((prev) =>
      prev.map((val, i) => {
        const label = (currentTemplate.paramLabels?.[i] ?? "").toLowerCase()
        if (label.includes("estabelecimento")) return tenant?.name ?? val
        if (label.includes("cliente")) {
          if (selectedClientIds.length === 1) {
            return clients?.find((c: any) => c.id === selectedClientIds[0])?.name ?? val
          }
          return ""
        }
        return val
      })
    )
  }, [selectedClientIds, tenant])

  const toggleClient = (id: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSend = async () => {
    if (!selectedTemplate) { Alert.alert("Atenção", "Selecione um template."); return }
    if (selectedClientIds.length === 0) { Alert.alert("Atenção", "Selecione pelo menos um cliente."); return }

    setIsSending(true)
    try {
      const finalParams = bodyParams.map((val, i) => {
        const label = (currentTemplate?.paramLabels?.[i] ?? "").toLowerCase()
        if (label.includes("cliente") && selectedClientIds.length > 1) return "__CLIENT_NAME__"
        return val
      })

      const res = await secureApiCall<SendResult[]>(API_CONFIG.ENDPOINTS.WHATSAPP_SEND_TEMPLATE, {
        method: "POST",
        body: JSON.stringify({
          clientIds: selectedClientIds,
          templateName: selectedTemplate,
          language: "pt_BR",
          bodyParams: finalParams,
        }),
      })
      if (res.hasError) { Alert.alert("Erro", res.message || "Erro ao enviar."); return }
      setResults(res.data ?? [])
    } catch {
      Alert.alert("Erro", "Erro de conexão.")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-white">
        <View className="flex-row items-center justify-between px-5 p-4 pt-6 pb-4 border-b border-zinc-100">
          <View className="flex-row items-center gap-2">
            <Ionicons name="paper-plane" size={20} color={primaryColor} />
            <Text className="text-lg font-black text-zinc-900">Enviar Template</Text>
          </View>
          <Pressable onPress={onClose} className="h-9 w-9 bg-zinc-100 rounded-xl items-center justify-center">
            <Ionicons name="close" size={20} color="#71717a" />
          </Pressable>
        </View>

        <KeyboardAwareScrollView className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          {results ? (
            <View className="gap-2">
              <Text className="font-bold text-zinc-700 mb-2">Resultados do Envio</Text>
              {results.map((r) => (
                <View key={r.clientId} className={`flex-row items-center justify-between p-3 rounded-xl border ${r.success ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
                  <View className="flex-row items-center gap-3 flex-1">
                    <Ionicons name={r.success ? "checkmark-circle" : "alert-circle"} size={20} color={r.success ? "#059669" : "#e11d48"} />
                    <View className="flex-1">
                      <Text className="font-bold text-sm text-zinc-900" numberOfLines={1}>{r.clientName}</Text>
                      {!r.success && r.error && <Text className="text-[10px] text-rose-600 font-medium mt-0.5">{r.error}</Text>}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <>
              {/* Seleção de Template */}
              <View className="mb-4">
                <Text className="text-zinc-700 font-bold text-sm mb-1.5">Template *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
                  <View className="flex-row gap-2 px-1">
                    {(templates ?? []).map((t) => (
                      <Pressable
                        key={t.name}
                        onPress={() => handleTemplateChange(t.name)}
                        className="px-3 py-2 rounded-xl border"
                        style={selectedTemplate === t.name
                          ? { backgroundColor: primaryColor, borderColor: primaryColor }
                          : { backgroundColor: "#fafafa", borderColor: "#e4e4e7" }}
                      >
                        <Text className={`text-sm font-bold ${selectedTemplate === t.name ? "text-white" : "text-zinc-700"}`}>
                          {t.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Parametros */}
              {(currentTemplate?.paramsCount ?? 0) > 0 && (
                <View className="mb-5 p-4 rounded-2xl border border-zinc-200 bg-zinc-50 gap-3">
                  <Text className="font-bold text-zinc-800 mb-1">Parâmetros do template</Text>
                  
                  {bodyParams.map((val, i) => {
                    const label = currentTemplate?.paramLabels?.[i] ?? `Parâmetro {{${i + 1}}}`
                    const auto = isAutoParam(label)
                    const isClientParam = label.toLowerCase().includes("cliente")
                    const multiClient = isClientParam && selectedClientIds.length > 1
                    
                    return (
                      <View key={i} className="mb-2">
                        <View className="flex-row items-center gap-2 mb-1.5">
                          <Text className="text-xs font-semibold text-zinc-600">
                            <Text className="font-mono text-zinc-400">{"{{" + (i + 1) + "}}"}</Text> — {label}
                          </Text>
                          {auto && !multiClient && (
                            <View className="bg-emerald-100 px-1.5 py-0.5 rounded">
                              <Text className="text-[10px] font-bold text-emerald-700">AUTO</Text>
                            </View>
                          )}
                        </View>
                        
                        {multiClient ? (
                          <View className="bg-zinc-100 border border-zinc-200 px-3 py-2.5 rounded-xl">
                            <Text className="text-xs text-zinc-500 font-medium text-center">Será substituído pelo nome de cada destinatário</Text>
                          </View>
                        ) : (
                          <TextInput
                            placeholder={label}
                            value={val}
                            editable={!(auto && !!val)}
                            className="bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-900 font-medium text-sm"
                            style={auto && val ? { backgroundColor: "#f4f4f5", color: "#a1a1aa" } : undefined}
                            onChangeText={(text) => {
                              if (auto && val) return
                              setBodyParams((p) => p.map((v, j) => j === i ? text : v))
                            }}
                          />
                        )}
                      </View>
                    )
                  })}
                </View>
              )}

              {/* Seleção de Clientes */}
              <View className="mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-zinc-700 font-bold text-sm">Clientes *</Text>
                  <Text className="text-xs text-zinc-500 font-medium">{selectedClientIds.length} selecionados</Text>
                </View>
                
                <View className="border border-zinc-200 rounded-2xl max-h-56 overflow-hidden">
                  <ScrollView nestedScrollEnabled className="flex-grow-0">
                    {(clients ?? []).filter((c: any) => c.phone).map((c: any) => (
                      <Pressable
                        key={c.id}
                        onPress={() => toggleClient(c.id)}
                        className={`flex-row items-center gap-3 px-4 py-3 border-b border-zinc-100 ${selectedClientIds.includes(c.id) ? "bg-primary/5" : "bg-white"}`}
                      >
                        <View className={`h-5 w-5 rounded items-center justify-center border ${selectedClientIds.includes(c.id) ? "border-transparent" : "border-zinc-300"}`} style={selectedClientIds.includes(c.id) ? { backgroundColor: primaryColor } : undefined}>
                          {selectedClientIds.includes(c.id) && <Ionicons name="checkmark" size={14} color="white" />}
                        </View>
                        <View className="flex-1">
                          <Text className="font-semibold text-sm text-zinc-900">{c.name}</Text>
                          <Text className="text-xs text-zinc-500">{c.phone}</Text>
                        </View>
                      </Pressable>
                    ))}
                    {(clients ?? []).filter((c: any) => c.phone).length === 0 && (
                      <Text className="text-center py-6 text-zinc-400 font-medium text-sm">Nenhum cliente com telefone.</Text>
                    )}
                  </ScrollView>
                </View>
              </View>
            </>
          )}

        </KeyboardAwareScrollView>

        <View className="px-5 pb-8 pt-3 border-t border-zinc-100">
          <Pressable
            onPress={results ? onClose : handleSend}
            disabled={isSending}
            className="h-14 rounded-2xl items-center justify-center flex-row gap-2"
            style={{ backgroundColor: isSending ? primaryColor + "99" : primaryColor }}
          >
            {isSending ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name={results ? "checkmark" : "send"} size={18} color="white" />
                <Text className="text-white font-black text-base">{results ? "Concluir" : "Disparar Mensagens"}</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

export default function _RouteStub() { return null }

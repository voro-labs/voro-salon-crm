import React, { useState, useRef } from "react"
import { View, Text, ScrollView, ActivityIndicator, Pressable, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import * as DocumentPicker from "expo-document-picker"
import * as FileSystem from "expo-file-system"
import { WebView } from "react-native-webview"
import { ScreenHeader } from "components/ScreenHeader"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { Toast } from "toastify-react-native"
import { TransactionType, PaymentMethod, BatchImportTransactionItemDto } from "types/DTOs/financial.interface"
import { useTransactionCategories } from "hooks/use-transaction-categories.hook"
import { API_CONFIG, secureApiCall } from "lib/api"
import { mutate } from "swr"

// ---------------------------------------------------------------------------
// RegEx Rules from Web App (Ported)
// ---------------------------------------------------------------------------
const CATEGORY_RULES = [
  { keywords: /ifood|uber\s*eats|rappi|delivery|restaurante|lanche|padaria|alimenta/i, type: TransactionType.Expense, label: "Alimentação" },
  { keywords: /uber|99|taxi|transfer|combustív|gasolina|etanol|posto|pedágio/i, type: TransactionType.Expense, label: "Transporte" },
  { keywords: /netflix|spotify|amazon|apple|youtube|disney|prime|assinatura/i, type: TransactionType.Expense, label: "Assinaturas" },
  { keywords: /farmácia|droga|consultório|médico|dentist|hospital|plano\s*saúde/i, type: TransactionType.Expense, label: "Saúde" },
  { keywords: /salário|pix\s*receb|transferência\s*rec|folha/i, type: TransactionType.Income, label: "Receita" },
  { keywords: /aluguel|condomínio|iptu|luz|água|energia|internet|claro|vivo|tim/i, type: TransactionType.Expense, label: "Moradia" },
  { keywords: /mercado|supermercado|hortifruti|carrefour|extra|pão de açúcar/i, type: TransactionType.Expense, label: "Supermercado" },
  { keywords: /salon|salão|beleza|estética|manicure|cabeleire/i, type: TransactionType.Income, label: "Faturamento Salão" },
]

function suggestCategory(description: string, categories: any[]): { categoryId?: string; type: TransactionType } {
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.test(description)) {
      const match = categories.find((c) => c.name.toLowerCase().includes(rule.label.toLowerCase()) && c.type === rule.type)
      return { categoryId: match?.id, type: rule.type }
    }
  }
  return { type: TransactionType.Expense }
}

const DATE_RE = /(\d{2}[\/\-]\d{2}[\/\-]\d{4})/
function parseStatementText(text: string, categories: any[]) {
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean)
  const results: any[] = []

  for (const line of lines) {
    const dateMatch = line.match(DATE_RE)
    if (!dateMatch) continue

    const amountMatches = [...line.matchAll(/[-−]?\s*(?:R\$)?\s*([\d.,]+(?:[.,]\d{2}))/g)]
    if (amountMatches.length === 0) continue

    const rawAmount = amountMatches[amountMatches.length - 1][1]
    const normalised = rawAmount.replace(/\./g, "").replace(",", ".")
    const amount = Math.abs(parseFloat(normalised))
    if (isNaN(amount) || amount <= 0) continue

    let desc = line
      .replace(DATE_RE, "")
      .replace(/[-−]?\s*(?:R\$)?\s*[\d.,]+(?:[.,]\d{2})/g, "")
      .replace(/\s{2,}/g, " ")
      .trim()

    if (!desc || desc.length < 3) continue

    const isCredit = /crédito|credit|receb|pix\s*receb|ted\s*receb|pagto\s*receb/i.test(line)
    const [d, m, y] = dateMatch[1].split(/[\/\-]/)
    const isoDate = `${y}-${m}-${d}`

    const { categoryId, type } = suggestCategory(desc, categories)

    results.push({
      id: Math.random().toString(36).substring(7),
      description: desc.slice(0, 120),
      amount,
      type: isCredit ? TransactionType.Income : type,
      date: isoDate,
      categoryId,
      edited: false
    })
  }

  return results
}

// ---------------------------------------------------------------------------
// HTML structure to inject into Headless WebView for parsing PDF
// ---------------------------------------------------------------------------
const HEADLESS_WEBVIEW_HTML = `
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
</head>
<body>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

    async function parsePdfBase64(base64) {
      try {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const loadingTask = pdfjsLib.getDocument({ data: bytes });
        const pdf = await loadingTask.promise;
        
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map(item => item.str).join(" ") + "\\n";
        }
        
        window.ReactNativeWebView.postMessage(JSON.stringify({ success: true, text: fullText }));
      } catch (err) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ success: false, error: err.toString() }));
      }
    }
  </script>
</body>
</html>
`

export default function ImportPdfScreen() {
  const router = useRouter()
  const { primaryColor } = useTenantTheme()
  const webviewRef = useRef<WebView>(null)
  
  const { categories } = useTransactionCategories()
  
  const [step, setStep] = useState<"upload" | "review" | "done">("upload")
  const [fileName, setFileName] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rows, setRows] = useState<any[]>([])
  const [summary, setSummary] = useState<{ imported: number, skipped: number } | null>(null)

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true
      })

      if (result.canceled) return
      
      const file = result.assets[0]
      if (!file.uri) return

      setFileName(file.name)
      setIsProcessing(true)

      const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: "base64" as any })
      
      // Inject base64 string into webview environment for parsing
      webviewRef.current?.injectJavaScript(`
        parsePdfBase64("${base64}");
        true;
      `)
    } catch (err) {
      setIsProcessing(false)
      Toast.error("Falha ao selecionar arquivo")
    }
  }

  const handleWebViewMessage = (event: any) => {
    setIsProcessing(false)
    const data = JSON.parse(event.nativeEvent.data)
    
    if (!data.success) {
      Toast.error("Erro ao ler PDF do banco")
      return
    }

    const { text } = data
    const parsed = parseStatementText(text, categories || [])
    
    if (parsed.length === 0) {
      Toast.info("Nenhuma transação financeira detectada no PDF.")
      return
    }

    setRows(parsed)
    setStep("review")
  }

  const removeRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id))
  }

  const toggleType = (id: string, current: TransactionType) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, type: current === TransactionType.Income ? TransactionType.Expense : TransactionType.Income, edited: true } : r))
  }

  const submitBatch = async () => {
    if (rows.length === 0) return
    setIsSubmitting(true)

    const items: BatchImportTransactionItemDto[] = rows.map(r => ({
      description: r.description,
      amount: r.amount,
      type: r.type,
      dueDate: r.date + "T12:00:00.000Z",
      categoryId: r.categoryId,
      paymentMethod: PaymentMethod.Other,
      notes: "Importado via extrato PDF",
      dedupKey: `${r.date}|${r.description.toLowerCase().trim()}|${r.amount.toFixed(2)}`
    }))

    try {
      const res = await secureApiCall(API_CONFIG.ENDPOINTS.TRANSACTIONS + "/batch", {
        method: "POST",
        body: JSON.stringify({ items }),
      })

      if (res.hasError) {
        Toast.error(res.message || "Erro na importação.")
        return
      }

      setSummary((res.data as any) ?? { imported: items.length, skipped: 0 })
      setStep("done")
      mutate(API_CONFIG.ENDPOINTS.TRANSACTIONS)
      mutate(API_CONFIG.ENDPOINTS.DASHBOARD)
    } catch {
      Toast.error("Falha ao se comunicar com servidor.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function formatCurrency(val: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val)
  }

  const totalIncome = rows.filter(r => r.type === TransactionType.Income).reduce((acc, r) => acc + r.amount, 0)
  const totalExpense = rows.filter(r => r.type === TransactionType.Expense).reduce((acc, r) => acc + r.amount, 0)

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={["bottom"]}>
      <ScreenHeader title={step === "upload" ? "Importar PDF" : step === "review" ? "Revisão de Extrato" : "Concluído"} showBack onBack={() => {
        if (step !== "upload") {
           Alert.alert("Cancelar importação?", "Os arquivos processados serão descartados.", [
             { text: "Continuar na Tela", style: "cancel" },
             { text: "Sair", style: "destructive", onPress: () => router.back() }
           ])
        } else {
          router.back()
        }
      }} />

      {/* HEADLESS WEBVIEW FOR PDF.JS */}
      <View style={{ height: 0, width: 0, opacity: 0 }}>
        <WebView
          ref={webviewRef}
          source={{ html: HEADLESS_WEBVIEW_HTML }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled
          originWhitelist={["*"]}
        />
      </View>

      {/* STEP 1: UPLOAD */}
      {step === "upload" && (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text className="text-zinc-600 mb-6 text-sm">
            O Voro Salon processa extratos bancários gerados pelos principais bancos Brasileiros. Tudo acontece de forma segura e local.
          </Text>

          <Pressable
            onPress={isProcessing ? undefined : pickDocument}
            className={`flex-col items-center justify-center p-12 border-2 border-dashed rounded-3xl bg-white ${isProcessing ? "border-zinc-300" : "border-zinc-300 active:border-zinc-400"}`}
          >
            {isProcessing ? (
              <>
                <ActivityIndicator color={primaryColor} size="large" />
                <Text className="text-zinc-500 font-bold mt-4">Lendo extrato bancário...</Text>
              </>
            ) : (
              <>
                <View className="h-16 w-16 bg-zinc-100 rounded-full items-center justify-center mb-4">
                  <Ionicons name="document-text-outline" size={32} color="#71717a" />
                </View>
                <Text className="font-bold text-base text-zinc-900 mb-1">Escolher Extrato PDF</Text>
                <Text className="text-zinc-400 text-xs text-center">Bancos Suportados: Itaú, Bradesco, NuBank, Inter, C6, Sicredi etc.</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      )}

      {/* STEP 2: REVIEW */}
      {step === "review" && (
        <View className="flex-1">
          <View className="flex-row items-center justify-between p-4 bg-white border-b border-zinc-100">
            <View className="flex-1 bg-green-50 rounded-lg p-2 mr-2">
              <Text className="text-green-600 text-xs font-bold text-center">Receitas</Text>
              <Text className="text-green-700 text-sm font-black text-center">{formatCurrency(totalIncome)}</Text>
            </View>
            <View className="flex-1 bg-red-50 rounded-lg p-2">
              <Text className="text-red-600 text-xs font-bold text-center">Despesas</Text>
              <Text className="text-red-700 text-sm font-black text-center">{formatCurrency(totalExpense)}</Text>
            </View>
          </View>
          
          <ScrollView className="flex-1 px-4 py-2" showsVerticalScrollIndicator={false}>
            {rows.map((r, i) => (
              <View key={r.id} className="bg-white rounded-xl mb-3 p-4 border border-zinc-100 shadow-sm">
                <View className="flex-row items-center justify-between mb-2 gap-2">
                  <Text className="text-xs font-mono text-zinc-500">{r.date.split("-").reverse().join("/")}</Text>
                  
                  <View className="flex-row items-center gap-2">
                    <Pressable
                      onPress={() => toggleType(r.id, r.type)}
                      className={`px-2 py-1 rounded-md ${r.type === TransactionType.Income ? "bg-green-100" : "bg-red-100"}`}
                    >
                      <Text className={`text-[10px] uppercase font-black ${r.type === TransactionType.Income ? "text-green-700" : "text-red-700"}`}>
                        {r.type === TransactionType.Income ? "ENTRADA" : "SAÍDA"}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => removeRow(r.id)}>
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </Pressable>
                  </View>
                </View>
                
                <Text className="text-sm font-black text-zinc-900 mb-1" numberOfLines={2}>
                  {r.description}
                </Text>
                
                <View className="flex-row items-center justify-between mt-2">
                  <Text className="text-zinc-600 text-[10px] uppercase font-bold bg-zinc-100 px-2 py-1 rounded">
                    {(categories || []).find((c: any) => c.id === r.categoryId)?.name || "SEM CATEGORIA"}
                  </Text>
                  <Text className="text-base font-black text-zinc-900">{formatCurrency(r.amount)}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View className="p-4 bg-white border-t border-zinc-100">
            <Pressable
              onPress={submitBatch}
              disabled={isSubmitting || rows.length === 0}
              className="h-14 rounded-2xl items-center justify-center flex-row gap-2"
              style={{ backgroundColor: (isSubmitting || rows.length === 0) ? primaryColor + "99" : primaryColor }}
            >
              {isSubmitting ? (
                 <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={20} color="white" />
                  <Text className="text-white font-black text-base">Importar {rows.length} Transações</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* STEP 3: DONE */}
      {step === "done" && summary && (
        <View className="flex-1 items-center justify-center px-6">
          <View className="h-24 w-24 rounded-full bg-green-100 items-center justify-center mb-6">
            <Ionicons name="checkmark-circle" size={48} color="#16a34a" />
          </View>
          <Text className="text-2xl font-black text-zinc-900 text-center mb-2">
            Importação Concluída!
          </Text>
          <Text className="text-zinc-600 text-center font-medium">
            {summary.imported} registro(s) adicionados ao caixa.
          </Text>
          {summary.skipped > 0 && (
            <Text className="text-amber-600 text-center font-bold text-xs mt-2 bg-amber-50 px-3 py-1 rounded-full">
              {summary.skipped} registro(s) ignorados (já existiam).
            </Text>
          )}

          <Pressable
            onPress={() => router.replace("/(tabs)/finance" as any)}
            className="h-14 mt-10 rounded-2xl items-center justify-center flex-row w-full max-w-sm border border-zinc-200 bg-white"
          >
            <Text className="text-zinc-900 font-bold">Voltar ao Financeiro</Text>
          </Pressable>
        </View>
      )}

    </SafeAreaView>
  )
}

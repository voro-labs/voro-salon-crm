import React, { useState } from "react"
import { View, Text, FlatList, Pressable, ActivityIndicator, TextInput, Modal, TouchableOpacity, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useAuth } from "contexts/auth.context"
import { useTransactions } from "../../hooks/use-transactions.hook"
import { useServiceRecords, ServiceRecordDto } from "../../hooks/use-service-records.hook"
import { ScreenHeader } from "components/ScreenHeader"
import { TransactionType } from "types/DTOs/financial.interface"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { useModuleGuard } from "hooks/use-module-guard.hook"
import { usePlanLimits } from "hooks/use-plan-limits.hook"

type FilterType = "all" | "income" | "expense"

const STATUS_CONFIG: Record<number | string, { label: string; bg: string; text: string; border: string }> = {
  1: { label: "Pendente", bg: "#fef9c3", text: "#854d0e", border: "#fef08a" },
  Pending: { label: "Pendente", bg: "#fef9c3", text: "#854d0e", border: "#fef08a" },
  2: { label: "Parcial", bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  3: { label: "Pago", bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" },
  Paid: { label: "Pago", bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" },
  4: { label: "Vencido", bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
  Overdue: { label: "Vencido", bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
  5: { label: "Cancelado", bg: "#f4f4f5", text: "#52525b", border: "#e4e4e7" },
  Cancelled: { label: "Cancelado", bg: "#f4f4f5", text: "#52525b", border: "#e4e4e7" },
}

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

function fmtCurrency(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface FinanceScreenProps {
  rootPath?: string // e.g. "/(tabs)" or "/(premium-tabs)"
}

export function FinanceScreen({ rootPath = "/(tabs)" }: FinanceScreenProps) {
  useModuleGuard("finance")
  const { hasFinancial, isLoaded } = usePlanLimits()
  const router = useRouter()
  const { primaryColor } = useTenantTheme()
  const { user } = useAuth()

  const roleNames = user?.roles?.map((r: any) => r.name) ?? []
  const isSalonOwner = roleNames.includes("SalonOwner") || roleNames.includes("Owner")

  // Fetch ALL transactions (no date filter) — same as web
  const { transactions, isLoading, batchImport } = useTransactions()
  const { serviceRecords } = useServiceRecords()

  const [filter, setFilter] = useState<FilterType>("all")
  const [search, setSearch] = useState("")

  // Auto Revenue Modal state
  const [showActionMenu, setShowActionMenu] = useState(false)
  const [showAutoRevenue, setShowAutoRevenue] = useState(false)
  const now0 = new Date()
  const [arStartDate, setArStartDate] = useState(
    `${now0.getFullYear()}-${String(now0.getMonth() + 1).padStart(2, "0")}-01`
  )
  const [arEndDate, setArEndDate] = useState(
    new Date(now0.getFullYear(), now0.getMonth() + 1, 0).toISOString().split("T")[0]
  )
  const [isGenerating, setIsGenerating] = useState(false)

  if (isLoaded && !hasFinancial) return null

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-50">
        <ActivityIndicator color={primaryColor} />
      </View>
    )
  }

  const isIncome = (t: any) => t.type === TransactionType.Income || t.type === 1
  const isExpense = (t: any) => t.type === TransactionType.Expense || t.type === 2

  const filtered = (transactions ?? []).filter((t: any) => {
    const matchFilter = filter === "all" || (filter === "income" && isIncome(t)) || (filter === "expense" && isExpense(t))
    const matchSearch = search
      ? `${t.description ?? ""} ${t.category?.name ?? ""}`.toLowerCase().includes(search.toLowerCase())
      : true
    return matchFilter && matchSearch
  })

  const totalIncome = (transactions ?? []).filter(isIncome).reduce((s: number, t: any) => s + Math.abs(t.amount ?? 0), 0)
  const totalExpense = (transactions ?? []).filter(isExpense).reduce((s: number, t: any) => s + Math.abs(t.amount ?? 0), 0)
  const balance = totalIncome - totalExpense

  const now = new Date()
  const monthlyRevenue = (transactions ?? []).filter((t: any) => {
    if (!isIncome(t) || !t.dueDate) return false
    const d = new Date(t.dueDate)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).reduce((s: number, t: any) => s + Math.abs(t.amount ?? 0), 0)

  // Auto revenue: filter service records by selected period
  const arFiltered = (serviceRecords ?? []).filter((r: ServiceRecordDto) => {
    const d = new Date(r.serviceDate)
    const start = new Date(arStartDate + "T00:00:00")
    const end = new Date(arEndDate + "T23:59:59")
    return d >= start && d <= end
  })
  const arTotal = arFiltered.reduce((s: number, r: ServiceRecordDto) => s + r.amount, 0)

  const handleSetFullMonth = () => {
    const n = new Date()
    setArStartDate(`${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-01`)
    setArEndDate(new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().split("T")[0])
  }

  const handleGenerateRevenue = async () => {
    if (arFiltered.length === 0) return
    setIsGenerating(true)
    try {
      const items = arFiltered.map((r: ServiceRecordDto) => ({
        description: r.description || r.serviceName || "Serviço concluído",
        amount: r.amount,
        type: 1 as const,
        dueDate: r.serviceDate.includes("T") ? r.serviceDate : r.serviceDate + "T12:00:00.000Z",
        paymentMethod: 99 as const,
        notes: r.appointmentId ? `Agendamento #${r.appointmentId.slice(0, 8)}` : undefined,
        dedupKey: r.id,
      }))
      const res = await batchImport!(items)
      if (res.hasError) throw new Error(res.message || "Erro")
      setShowAutoRevenue(false)
      setShowActionMenu(false)
    } catch (_) {
      // silently fail on mobile
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={[]}>
      <ScreenHeader
        title="Finanças"
        right={
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => setShowActionMenu(true)}
              className="h-9 px-3 bg-zinc-100 rounded-xl items-center justify-center flex-row gap-1.5 border border-zinc-200"
            >
              <Ionicons name="flash-outline" size={15} color="#ca8a04" />
              <Text className="text-zinc-700 font-bold text-xs">Receita Auto</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push(`${rootPath}/finance/import-pdf` as any)}
              className="h-9 w-9 bg-zinc-100 rounded-xl items-center justify-center border border-zinc-200"
            >
              <Ionicons name="document-text-outline" size={16} color="#52525b" />
            </Pressable>
            <Pressable
              onPress={() => router.push(`${rootPath}/finance/categories` as any)}
              className="h-9 px-3 bg-zinc-100 rounded-xl items-center justify-center flex-row gap-2 border border-zinc-200"
            >
              <Ionicons name="pricetags-outline" size={15} color="#52525b" />
              <Text className="text-zinc-700 font-bold text-xs">Categorias</Text>
            </Pressable>
          </View>
        }
      />

      {/* Action Menu Modal */}
      <Modal transparent animationType="fade" visible={showActionMenu} onRequestClose={() => setShowActionMenu(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
          activeOpacity={1}
          onPress={() => setShowActionMenu(false)}
        >
          <TouchableOpacity activeOpacity={1}>
            <View className="bg-white rounded-t-3xl p-6 gap-3">
              <Text className="text-zinc-900 font-black text-lg mb-1">Adicionar Receita</Text>
              <Pressable
                onPress={() => { setShowActionMenu(false); router.push(`${rootPath}/finance/new` as any) }}
                className="flex-row items-center gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-100"
              >
                <View className="h-10 w-10 rounded-xl bg-zinc-200 items-center justify-center">
                  <Ionicons name="add" size={22} color="#52525b" />
                </View>
                <View>
                  <Text className="text-zinc-900 font-bold text-sm">Lançamento manual</Text>
                  <Text className="text-zinc-400 text-xs mt-0.5">Adicionar receita ou despesa manualmente</Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => { setShowAutoRevenue(true) }}
                className="flex-row items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100"
              >
                <View className="h-10 w-10 rounded-xl bg-amber-100 items-center justify-center">
                  <Ionicons name="flash" size={22} color="#d97706" />
                </View>
                <View>
                  <Text className="text-zinc-900 font-bold text-sm">Gerar receita automática</Text>
                  <Text className="text-zinc-400 text-xs mt-0.5">Importar serviços concluídos de um período</Text>
                </View>
              </Pressable>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Auto Revenue Modal */}
      <Modal transparent animationType="slide" visible={showAutoRevenue} onRequestClose={() => setShowAutoRevenue(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
          activeOpacity={1}
          onPress={() => setShowAutoRevenue(false)}
        >
          <TouchableOpacity activeOpacity={1}>
            <View className="bg-white rounded-t-3xl p-6">
              <View className="flex-row items-center gap-2 mb-1">
                <Ionicons name="flash" size={20} color="#d97706" />
                <Text className="text-zinc-900 font-black text-lg">Gerar Receita Automática</Text>
              </View>
              <Text className="text-zinc-400 text-xs mb-5">Importa agendamentos concluídos. Registros já existentes são ignorados.</Text>

              {/* Atalho Mês inteiro */}
              <Pressable
                onPress={handleSetFullMonth}
                className="flex-row items-center justify-center gap-2 py-2.5 mb-4 bg-zinc-50 rounded-2xl border border-zinc-200"
              >
                <Ionicons name="calendar-outline" size={15} color="#52525b" />
                <Text className="text-zinc-700 font-bold text-sm">Mês inteiro</Text>
              </Pressable>

              {/* Datas */}
              <View className="flex-row gap-3 mb-4">
                <View className="flex-1">
                  <Text className="text-zinc-500 text-xs font-bold mb-1 uppercase">De</Text>
                  <TextInput
                    className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-900 font-medium text-sm"
                    value={arStartDate}
                    onChangeText={setArStartDate}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor="#a1a1aa"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-zinc-500 text-xs font-bold mb-1 uppercase">Até</Text>
                  <TextInput
                    className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-900 font-medium text-sm"
                    value={arEndDate}
                    onChangeText={setArEndDate}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor="#a1a1aa"
                  />
                </View>
              </View>

              {/* Preview */}
              <View className="bg-zinc-50 rounded-2xl border border-zinc-100 mb-5 overflow-hidden">
                <View className="flex-row items-center justify-between px-4 py-3 border-b border-zinc-100">
                  <Text className="text-zinc-700 font-bold text-sm">{arFiltered.length} registro(s)</Text>
                  <Text className="text-green-600 font-black text-sm">R$ {fmtCurrency(arTotal)}</Text>
                </View>
                {arFiltered.length === 0 ? (
                  <View className="items-center py-6">
                    <Ionicons name="calendar-outline" size={32} color="#d4d4d8" />
                    <Text className="text-zinc-400 text-xs mt-2">Nenhum serviço neste período</Text>
                  </View>
                ) : (
                  <ScrollView style={{ maxHeight: 160 }}>
                    {arFiltered.slice(0, 15).map((r: ServiceRecordDto) => (
                      <View key={r.id} className="flex-row items-center justify-between px-4 py-2.5 border-b border-zinc-50">
                        <View className="flex-1 min-w-0">
                          <Text className="text-zinc-800 font-semibold text-xs" numberOfLines={1}>
                            {r.description || r.serviceName || "Serviço"}
                          </Text>
                          <Text className="text-zinc-400 text-[10px]">{formatDate(r.serviceDate)}</Text>
                        </View>
                        <Text className="text-green-600 font-bold text-xs ml-2">R$ {fmtCurrency(r.amount)}</Text>
                      </View>
                    ))}
                    {arFiltered.length > 15 && (
                      <View className="py-2 items-center">
                        <Text className="text-zinc-400 text-xs">+ {arFiltered.length - 15} mais...</Text>
                      </View>
                    )}
                  </ScrollView>
                )}
              </View>

              <Pressable
                onPress={handleGenerateRevenue}
                disabled={isGenerating || arFiltered.length === 0}
                className="py-3.5 rounded-2xl items-center justify-center flex-row gap-2"
                style={{ backgroundColor: arFiltered.length === 0 ? "#d4d4d8" : "#d97706" }}
              >
                {isGenerating
                  ? <ActivityIndicator color="white" size="small" />
                  : <Ionicons name="flash" size={18} color="white" />}
                <Text className="text-white font-black text-sm">
                  {isGenerating ? "Gerando..." : `Gerar ${arFiltered.length} Receita(s)`}
                </Text>
              </Pressable>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Summary Section */}
      <View className="bg-white px-4 pt-4 pb-2 border-b border-zinc-100">
        {/* Main Revenue Card */}
        <View className="bg-zinc-900 rounded-[32px] p-5 mb-4 shadow-lg overflow-hidden">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Faturamento mensal</Text>
            <View className="h-8 w-8 rounded-full bg-white/10 items-center justify-center">
              <Ionicons name="trending-up" size={16} color="white" />
            </View>
          </View>
          <Text className="text-white text-3xl font-black mb-1">
            R$ {fmtCurrency(monthlyRevenue)}
          </Text>
          <Text className="text-zinc-500 text-[10px] font-medium">
             Período: 01 a {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} de {new Date().getFullYear()}
          </Text>
        </View>

        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-green-50 rounded-2xl p-3.5 border border-green-100">
            <Text className="text-[10px] text-green-600 font-bold uppercase tracking-wider mb-0.5">Entradas</Text>
            <Text className="text-base font-black text-green-700" numberOfLines={1}>R$ {fmtCurrency(totalIncome)}</Text>
          </View>
          <View className="flex-1 bg-red-50 rounded-2xl p-3.5 border border-red-100">
            <Text className="text-[10px] text-red-600 font-bold uppercase tracking-wider mb-0.5">Saídas</Text>
            <Text className="text-base font-black text-red-700" numberOfLines={1}>R$ {fmtCurrency(totalExpense)}</Text>
          </View>
        </View>

        <View className="flex-row gap-3 mb-4">
          <View
            className="flex-1 rounded-2xl p-3.5 border"
            style={balance >= 0
              ? { backgroundColor: primaryColor + "10", borderColor: primaryColor + "20" }
              : { backgroundColor: "#fff7ed", borderColor: "#fed7aa" }}
          >
            <Text className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={balance >= 0 ? { color: primaryColor } : { color: "#ea580c" }}>Saldo Geral</Text>
            <Text className="text-base font-black" style={balance >= 0 ? { color: primaryColor } : { color: "#c2410c" }} numberOfLines={1}>R$ {fmtCurrency(balance)}</Text>
          </View>
        </View>

        <View className="flex-row items-center gap-3 mb-3">
          <View className="flex-1 bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-2 flex-row items-center gap-2">
            <Ionicons name="search" size={16} color="#a1a1aa" />
            <TextInput
              className="flex-1 text-zinc-900 font-medium text-sm py-1"
              placeholder="Buscar transação..."
              placeholderTextColor="#a1a1aa"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={16} color="#a1a1aa" />
              </Pressable>
            )}
          </View>
          <Pressable
            onPress={() => setShowActionMenu(true)}
            className="h-11 w-11 rounded-2xl items-center justify-center"
            style={{ backgroundColor: primaryColor }}
          >
            <Ionicons name="add" size={24} color="white" />
          </Pressable>
        </View>

        <View className="flex-row gap-2">
          {(["all", "income", "expense"] as FilterType[]).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              className="px-4 py-2 mb-2 rounded-xl"
              style={{ backgroundColor: filter === f ? primaryColor : "#f4f4f5" }}
            >
              <Text className={`text-xs font-bold ${filter === f ? "text-white" : "text-zinc-600"}`}>
                {f === "all" ? "Todos" : f === "income" ? "Receitas" : "Despesas"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: any, i) => item.id ?? String(i)}
        renderItem={({ item }: { item: any }) => {
          const income = isIncome(item)
          const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG[1]
          return (
            <Pressable
              onPress={() => router.push(`${rootPath}/finance/${item.id}` as any)}
              className="bg-white rounded-2xl p-4 mb-2 border border-zinc-100 flex-row items-center gap-3 active:bg-zinc-50"
            >
              <View className={`h-10 w-10 rounded-xl items-center justify-center shrink-0 ${income ? "bg-green-50" : "bg-red-50"}`}>
                <Ionicons name={income ? "arrow-up" : "arrow-down"} size={18} color={income ? "#10b981" : "#ef4444"} />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-zinc-900 font-bold text-sm" numberOfLines={1}>{item.description ?? "Transação"}</Text>
                <View className="flex-row items-center gap-2 mt-0.5">
                  {item.category?.name ? (
                    <Text className="text-zinc-400 text-xs" numberOfLines={1}>{item.category.name}</Text>
                  ) : null}
                  <Text className="text-zinc-300 text-xs">{formatDate(item.dueDate)}</Text>
                </View>
              </View>
              <View className="items-end gap-1 shrink-0">
                <Text className={`font-black text-sm ${income ? "text-green-600" : "text-red-600"}`}>
                  {income ? "+" : "-"}R$ {fmtCurrency(Math.abs(item.amount ?? 0))}
                </Text>
                <View className="rounded-2xl px-2 py-0.5 border" style={{ backgroundColor: status.bg, borderColor: status.border }}>
                  <Text className="text-xs font-bold" style={{ color: status.text }}>{status.label}</Text>
                </View>
              </View>
            </Pressable>
          )
        }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Ionicons name="wallet-outline" size={48} color="#d4d4d8" />
            <Text className="text-zinc-400 font-semibold mt-3 text-base">
              {search ? "Nenhum resultado encontrado" : "Nenhuma transação"}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

import React, { useState } from "react"
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, Modal } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter, useLocalSearchParams } from "expo-router"
import useSWR from "swr"
import { API_CONFIG, secureApiCall } from "lib/api"
import { TransactionType, TransactionStatus, PaymentMethod } from "types/DTOs/financial.interface"
import type { TransactionDto, PayTransactionDto } from "types/DTOs/financial.interface"
import { CurrencyInput } from "components/CurrencyInput"
import { DatePickerInput } from "components/DatePickerInput"
import { SelectPickerInput } from "components/SelectPickerInput"

const STATUS_CONFIG: Record<number, { label: string; bg: string; text: string; border: string }> = {
  1: { label: "Pendente",  bg: "#fef9c3", text: "#854d0e", border: "#fef08a" },
  2: { label: "Parcial",   bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  3: { label: "Pago",      bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" },
  4: { label: "Vencido",   bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
  5: { label: "Cancelado", bg: "#f4f4f5", text: "#52525b", border: "#e4e4e7" },
}

const PAYMENT_LABELS: Record<number, string> = {
  1: "Dinheiro", 2: "Cartão de Crédito", 3: "Cartão de Débito", 4: "Pix", 5: "Boleto", 99: "Outro",
}

const PAYMENT_OPTIONS = [
  { id: "1", label: "Dinheiro" },
  { id: "2", label: "Cartão de Crédito" },
  { id: "3", label: "Cartão de Débito" },
  { id: "4", label: "Pix" },
  { id: "5", label: "Boleto" },
  { id: "99", label: "Outro" },
]

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

function fmtCurrency(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function InfoRow({
  icon, label, value, color = "#7c3aed",
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"]
  label: string
  value: string
  color?: string
}) {
  return (
    <View className="flex-row items-center gap-3 py-3 border-b border-zinc-50">
      <View className="h-9 w-9 rounded-xl items-center justify-center shrink-0" style={{ backgroundColor: color + "15" }}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View className="flex-1">
        <Text className="text-zinc-400 text-xs font-semibold mb-0.5">{label}</Text>
        <Text className="text-zinc-900 font-bold text-sm">{value}</Text>
      </View>
    </View>
  )
}

export default function TransactionDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const { data: transaction, isLoading, mutate } = useSWR<TransactionDto>(
    id ? `${API_CONFIG.ENDPOINTS.TRANSACTIONS}/${id}` : null,
    async (url: string) => {
      const res = await secureApiCall<TransactionDto>(url, { method: "GET" })
      if (res.hasError) throw new Error(res.message || "Erro")
      return res.data!
    }
  )

  const [payModal, setPayModal] = useState(false)
  const [payForm, setPayForm] = useState<{ amount: number; date: string; method: string; notes: string }>({
    amount: 0,
    date: new Date().toISOString().split("T")[0],
    method: "4",
    notes: "",
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-50 items-center justify-center">
        <ActivityIndicator color="#7c3aed" size="large" />
      </SafeAreaView>
    )
  }

  if (!transaction) return null

  const income  = transaction.type === TransactionType.Income || (transaction.type as any) === 1
  const status  = STATUS_CONFIG[transaction.status] ?? STATUS_CONFIG[1]
  const canPay  = [TransactionStatus.Pending, TransactionStatus.Partial, TransactionStatus.Overdue].includes(transaction.status as TransactionStatus) ||
                  [1, 2, 4].includes(transaction.status as number)

  async function handlePay() {
    setIsSaving(true)
    try {
      const dto: PayTransactionDto = {
        id: id!,
        paidAmount: payForm.amount,
        paymentDate: payForm.date,
        paymentMethod: parseInt(payForm.method) as PaymentMethod,
        notes: payForm.notes || undefined,
      }
      const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.TRANSACTIONS}/${id}/pay`, {
        method: "POST",
        body: JSON.stringify(dto),
      })
      if (!res.hasError) { mutate(); setPayModal(false) }
    } finally {
      setIsSaving(false)
    }
  }

  async function handleCancel() {
    Alert.alert("Cancelar transação?", "Essa ação não pode ser desfeita.", [
      { text: "Voltar", style: "cancel" },
      {
        text: "Cancelar transação", style: "destructive", onPress: async () => {
          await secureApiCall(`${API_CONFIG.ENDPOINTS.TRANSACTIONS}/${id}/cancel`, { method: "POST" })
          mutate()
        },
      },
    ])
  }

  async function handleDelete() {
    Alert.alert("Excluir transação?", "Essa ação não pode ser desfeita.", [
      { text: "Voltar", style: "cancel" },
      {
        text: "Excluir", style: "destructive", onPress: async () => {
          setIsDeleting(true)
          await secureApiCall(`${API_CONFIG.ENDPOINTS.TRANSACTIONS}/${id}`, { method: "DELETE" })
          setIsDeleting(false)
          router.back()
        },
      },
    ])
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      {/* Header */}
      <View className="bg-white px-5 pt-4 pb-4 border-b border-zinc-100 flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} className="h-9 w-9 bg-zinc-50 rounded-xl items-center justify-center border border-zinc-100">
          <Ionicons name="chevron-back" size={20} color="#18181b" />
        </Pressable>
        <Text className="flex-1 text-xl font-black text-zinc-900">Transação</Text>
        <Pressable
          onPress={() => router.push(`/(tabs)/finance/edit?id=${id}` as any)}
          className="h-9 w-9 bg-purple-50 rounded-xl items-center justify-center border border-purple-100"
        >
          <Ionicons name="create-outline" size={18} color="#7c3aed" />
        </Pressable>
        <Pressable
          onPress={handleDelete}
          disabled={isDeleting}
          className="h-9 w-9 bg-red-50 rounded-xl items-center justify-center border border-red-100"
        >
          {isDeleting
            ? <ActivityIndicator size="small" color="#dc2626" />
            : <Ionicons name="trash-outline" size={18} color="#dc2626" />}
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View
          className="rounded-3xl p-5"
          style={{ backgroundColor: income ? "#f0fdf4" : "#fef2f2", borderWidth: 1, borderColor: income ? "#bbf7d0" : "#fecaca" }}
        >
          <View className="flex-row items-center gap-3 mb-3">
            <View className="h-12 w-12 rounded-2xl items-center justify-center" style={{ backgroundColor: income ? "#dcfce7" : "#fee2e2" }}>
              <Ionicons name={income ? "arrow-up" : "arrow-down"} size={24} color={income ? "#16a34a" : "#dc2626"} />
            </View>
            <View className="flex-1">
              <Text className="text-zinc-500 text-xs font-semibold">{income ? "Receita" : "Despesa"}</Text>
              <Text className="text-zinc-900 font-black text-base" numberOfLines={2}>{transaction.description}</Text>
            </View>
          </View>
          <Text className="text-3xl font-black" style={{ color: income ? "#16a34a" : "#dc2626" }}>
            {income ? "+" : "-"}{fmtCurrency(Math.abs(transaction.amount))}
          </Text>
          {transaction.paidAmount > 0 && transaction.paidAmount !== transaction.amount && (
            <Text className="text-zinc-500 text-sm mt-1">Pago: {fmtCurrency(transaction.paidAmount)}</Text>
          )}
        </View>

        {/* Status */}
        <View className="bg-white rounded-2xl px-4 border border-zinc-100">
          <View className="flex-row items-center gap-3 py-3">
            <View className="h-9 w-9 rounded-xl items-center justify-center shrink-0" style={{ backgroundColor: status.bg, borderWidth: 1, borderColor: status.border }}>
              <Ionicons name="flag-outline" size={16} color={status.text} />
            </View>
            <View className="flex-1">
              <Text className="text-zinc-400 text-xs font-semibold">Status</Text>
              <Text className="font-black text-sm" style={{ color: status.text }}>{status.label}</Text>
            </View>
          </View>
        </View>

        {/* Details */}
        <View className="bg-white rounded-2xl px-4 border border-zinc-100">
          {transaction.category?.name && (
            <InfoRow icon="pricetag-outline" label="Categoria" value={transaction.category.name} color="#7c3aed" />
          )}
          <InfoRow icon="calendar-outline"  label="Vencimento"         value={formatDate(transaction.dueDate)} color="#d97706" />
          {transaction.paymentDate && (
            <InfoRow icon="checkmark-circle-outline" label="Data de pagamento" value={formatDate(transaction.paymentDate)} color="#059669" />
          )}
          <InfoRow icon="card-outline" label="Forma de pagamento" value={PAYMENT_LABELS[transaction.paymentMethod as number] ?? "—"} color="#2563eb" />
        </View>

        {/* Notes */}
        {transaction.notes ? (
          <View className="bg-white rounded-2xl px-4 py-4 border border-zinc-100">
            <Text className="text-zinc-400 text-xs font-semibold mb-2">Observações</Text>
            <Text className="text-zinc-700 text-sm leading-relaxed">{transaction.notes}</Text>
          </View>
        ) : null}

        {/* Actions */}
        <View className="gap-3 mt-2">
          {canPay && (
            <Pressable
              onPress={() => { setPayForm(p => ({ ...p, amount: transaction.amount - transaction.paidAmount })); setPayModal(true) }}
              className="h-14 bg-green-600 rounded-2xl items-center justify-center flex-row gap-2"
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="white" />
              <Text className="text-white font-black text-base">Registrar Pagamento</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => router.push(`/(tabs)/finance/edit?id=${id}` as any)}
            className="h-14 bg-purple-600 rounded-2xl items-center justify-center flex-row gap-2"
          >
            <Ionicons name="create-outline" size={20} color="white" />
            <Text className="text-white font-black text-base">Editar Transação</Text>
          </Pressable>
          {canPay && (
            <Pressable onPress={handleCancel} className="h-12 bg-zinc-100 rounded-2xl items-center justify-center">
              <Text className="text-zinc-600 font-bold">Cancelar Transação</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* Pay Modal */}
      <Modal visible={payModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPayModal(false)}>
        <View className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-5 pt-6 pb-4 border-b border-zinc-100">
            <Text className="text-lg font-black text-zinc-900">Registrar Pagamento</Text>
            <Pressable onPress={() => setPayModal(false)} className="h-9 w-9 bg-zinc-100 rounded-xl items-center justify-center">
              <Ionicons name="close" size={20} color="#71717a" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            <View>
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Valor pago</Text>
              <CurrencyInput value={payForm.amount} onChange={(v) => setPayForm(p => ({ ...p, amount: v }))} />
            </View>
            <View>
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Data de pagamento</Text>
              <DatePickerInput value={payForm.date} onChange={(v) => setPayForm(p => ({ ...p, date: v }))} />
            </View>
            <View>
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Forma de pagamento</Text>
              <SelectPickerInput
                value={payForm.method}
                onChange={(v) => setPayForm(p => ({ ...p, method: v }))}
                options={PAYMENT_OPTIONS}
                placeholder="Selecionar"
              />
            </View>
            <Pressable
              onPress={handlePay}
              disabled={isSaving}
              className={`h-14 rounded-2xl items-center justify-center mt-2 ${isSaving ? "bg-green-400" : "bg-green-600"}`}
            >
              {isSaving ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-base">Confirmar</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

import React, { useState, useEffect } from "react"
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter, useLocalSearchParams } from "expo-router"
import useSWR from "swr"
import { useTransactions } from "hooks/use-transactions.hook"
import { useTransactionCategories } from "hooks/use-transaction-categories.hook"
import { API_CONFIG, secureApiCall } from "lib/api"
import { TransactionType, PaymentMethod } from "types/DTOs/financial.interface"
import type { TransactionDto, UpdateTransactionDto } from "types/DTOs/financial.interface"
import { CurrencyInput } from "components/CurrencyInput"
import { DatePickerInput } from "components/DatePickerInput"
import { SelectPickerInput } from "components/SelectPickerInput"

const PAYMENT_OPTIONS = [
  { id: "1", label: "Dinheiro" },
  { id: "2", label: "Cartão de Crédito" },
  { id: "3", label: "Cartão de Débito" },
  { id: "4", label: "Pix" },
  { id: "5", label: "Boleto" },
  { id: "99", label: "Outro" },
]

export default function EditTransactionScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { updateTransaction } = useTransactions()
  const { categories } = useTransactionCategories()

  const { data: transaction, isLoading } = useSWR<TransactionDto>(
    id ? `${API_CONFIG.ENDPOINTS.TRANSACTIONS}/${id}` : null,
    async (url: string) => {
      const res = await secureApiCall<TransactionDto>(url, { method: "GET" })
      if (res.hasError) throw new Error(res.message || "Erro")
      return res.data!
    }
  )

  const [form, setForm] = useState<UpdateTransactionDto>({
    id: id ?? "",
    description: "",
    amount: 0,
    dueDate: "",
    type: TransactionType.Income,
    paymentMethod: PaymentMethod.Pix,
    categoryId: undefined,
    notes: "",
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (transaction) {
      const d = new Date(transaction.dueDate)
      const dueDate = isNaN(d.getTime())
        ? transaction.dueDate
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      setForm({
        id: transaction.id,
        description: transaction.description,
        amount: transaction.amount,
        dueDate,
        type: transaction.type,
        paymentMethod: transaction.paymentMethod,
        categoryId: transaction.categoryId,
        notes: transaction.notes ?? "",
      })
    }
  }, [transaction])

  const isIncome = form.type === TransactionType.Income || (form.type as any) === 1

  const categoryOptions = (categories ?? [])
    .filter((c: any) => (c.type === form.type || c.type === (form.type as any)) && c.isActive !== false)
    .map((c: any) => ({ id: c.id, label: c.name }))

  async function handleSave() {
    if (!form.description.trim()) { setError("Descrição é obrigatória."); return }
    if (form.amount <= 0) { setError("Informe um valor maior que zero."); return }
    setError(null)
    setIsSaving(true)
    try {
      const res = await updateTransaction(id!, form)
      if (res.hasError) { setError(res.message || "Erro ao atualizar transação."); return }
      router.back()
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-50 items-center justify-center">
        <ActivityIndicator color="#7c3aed" size="large" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <View className="bg-white px-5 pt-4 pb-4 border-b border-zinc-100 flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="h-9 w-9 bg-zinc-50 rounded-xl items-center justify-center border border-zinc-100">
            <Ionicons name="chevron-back" size={20} color="#18181b" />
          </Pressable>
          <Text className="flex-1 text-xl font-black text-zinc-900">Editar Transação</Text>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Type toggle */}
          <View className="mb-4">
            <Text className="text-zinc-700 font-bold text-sm mb-1.5">Tipo *</Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setForm(p => ({ ...p, type: TransactionType.Income, categoryId: undefined }))}
                className={`flex-1 h-12 rounded-2xl items-center justify-center flex-row gap-2 border ${isIncome ? "bg-green-500 border-green-400" : "bg-zinc-50 border-zinc-200"}`}
              >
                <Ionicons name="arrow-up" size={16} color={isIncome ? "white" : "#71717a"} />
                <Text className={`font-bold text-sm ${isIncome ? "text-white" : "text-zinc-600"}`}>Receita</Text>
              </Pressable>
              <Pressable
                onPress={() => setForm(p => ({ ...p, type: TransactionType.Expense, categoryId: undefined }))}
                className={`flex-1 h-12 rounded-2xl items-center justify-center flex-row gap-2 border ${!isIncome ? "bg-red-500 border-red-400" : "bg-zinc-50 border-zinc-200"}`}
              >
                <Ionicons name="arrow-down" size={16} color={!isIncome ? "white" : "#71717a"} />
                <Text className={`font-bold text-sm ${!isIncome ? "text-white" : "text-zinc-600"}`}>Despesa</Text>
              </Pressable>
            </View>
          </View>

          {/* Description */}
          <View className="mb-4">
            <Text className="text-zinc-700 font-bold text-sm mb-1.5">Descrição *</Text>
            <TextInput
              className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base"
              placeholder="Descrição da transação"
              placeholderTextColor="#a1a1aa"
              value={form.description}
              onChangeText={(v) => setForm(p => ({ ...p, description: v }))}
            />
          </View>

          {/* Amount */}
          <View className="mb-4">
            <Text className="text-zinc-700 font-bold text-sm mb-1.5">Valor *</Text>
            <CurrencyInput value={form.amount} onChange={(v) => setForm(p => ({ ...p, amount: v }))} />
          </View>

          {/* Due date */}
          <View className="mb-4">
            <Text className="text-zinc-700 font-bold text-sm mb-1.5">Vencimento</Text>
            <DatePickerInput value={form.dueDate} onChange={(v) => setForm(p => ({ ...p, dueDate: v }))} />
          </View>

          {/* Category */}
          <View className="mb-4">
            <Text className="text-zinc-700 font-bold text-sm mb-1.5">Categoria</Text>
            <SelectPickerInput
              value={form.categoryId ?? ""}
              onChange={(v) => setForm(p => ({ ...p, categoryId: v || undefined }))}
              options={[{ id: "", label: "Sem categoria" }, ...categoryOptions]}
              placeholder="Selecionar categoria"
              searchPlaceholder="Buscar categoria..."
            />
          </View>

          {/* Payment method */}
          <View className="mb-4">
            <Text className="text-zinc-700 font-bold text-sm mb-1.5">Forma de pagamento</Text>
            <SelectPickerInput
              value={String(form.paymentMethod)}
              onChange={(v) => setForm(p => ({ ...p, paymentMethod: parseInt(v) as PaymentMethod }))}
              options={PAYMENT_OPTIONS}
              placeholder="Selecionar"
            />
          </View>

          {/* Notes */}
          <View className="mb-6">
            <Text className="text-zinc-700 font-bold text-sm mb-1.5">Observações</Text>
            <TextInput
              className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base h-20"
              placeholder="Observações opcionais..."
              placeholderTextColor="#a1a1aa"
              value={form.notes}
              onChangeText={(v) => setForm(p => ({ ...p, notes: v }))}
              multiline
              textAlignVertical="top"
            />
          </View>

          {error && (
            <View className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-4">
              <Text className="text-red-600 font-bold text-sm">{error}</Text>
            </View>
          )}

          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            className={`h-14 rounded-2xl items-center justify-center ${isSaving ? "bg-purple-400" : "bg-purple-600"}`}
          >
            {isSaving ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-base">Salvar Alterações</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

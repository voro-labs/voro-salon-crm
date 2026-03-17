import React, { useState } from "react"
import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useTransactions } from "hooks/use-transactions.hook"
import { useTransactionCategories } from "hooks/use-transaction-categories.hook"

type FilterType = "all" | "income" | "expense"

export default function FinanceScreen() {
  const [filter, setFilter] = useState<FilterType>("all")
  const { transactions, isLoading: loading } = useTransactions()
  const { categories } = useTransactionCategories()

  const filtered = (transactions ?? []).filter((t: any) => {
    if (filter === "all") return true
    if (filter === "income") return t.type === "Income" || t.amount > 0
    return t.type === "Expense" || t.amount < 0
  })

  const totalIncome = (transactions ?? []).filter((t: any) => t.type === "Income" || t.amount > 0).reduce((sum: number, t: any) => sum + Math.abs(t.amount ?? 0), 0)
  const totalExpense = (transactions ?? []).filter((t: any) => t.type === "Expense" || t.amount < 0).reduce((sum: number, t: any) => sum + Math.abs(t.amount ?? 0), 0)

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <View className="bg-white px-5 pt-4 pb-4 border-b border-zinc-100">
        <Text className="text-2xl font-black text-zinc-900 mb-4">Finanças</Text>
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-green-50 rounded-2xl p-3 border border-green-100">
            <Text className="text-xs text-green-600 font-semibold">Receitas</Text>
            <Text className="text-lg font-black text-green-700">R$ {totalIncome.toFixed(2)}</Text>
          </View>
          <View className="flex-1 bg-red-50 rounded-2xl p-3 border border-red-100">
            <Text className="text-xs text-red-600 font-semibold">Despesas</Text>
            <Text className="text-lg font-black text-red-700">R$ {totalExpense.toFixed(2)}</Text>
          </View>
        </View>
        <View className="flex-row gap-2">
          {(["all", "income", "expense"] as FilterType[]).map((f) => (
            <Pressable key={f} onPress={() => setFilter(f)} className={`px-4 py-2 rounded-xl ${filter === f ? "bg-purple-600" : "bg-zinc-100"}`}>
              <Text className={`text-xs font-bold ${filter === f ? "text-white" : "text-zinc-600"}`}>
                {f === "all" ? "Todos" : f === "income" ? "Receitas" : "Despesas"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#7c3aed" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any, i) => item.id ?? String(i)}
          renderItem={({ item }: { item: any }) => {
            const isIncome = item.type === "Income" || item.amount > 0
            return (
              <View className="bg-white rounded-2xl p-4 mb-2 border border-zinc-100 flex-row items-center gap-3">
                <View className={`h-10 w-10 rounded-xl items-center justify-center ${isIncome ? "bg-green-50" : "bg-red-50"}`}>
                  <Ionicons name={isIncome ? "arrow-up" : "arrow-down"} size={18} color={isIncome ? "#10b981" : "#ef4444"} />
                </View>
                <View className="flex-1">
                  <Text className="text-zinc-900 font-bold">{item.description ?? item.categoryName ?? "Transação"}</Text>
                  <Text className="text-zinc-500 text-xs">{item.date ?? item.createdAt ?? ""}</Text>
                </View>
                <Text className={`font-black text-base ${isIncome ? "text-green-600" : "text-red-600"}`}>
                  {isIncome ? "+" : "-"}R$ {Math.abs(item.amount ?? 0).toFixed(2)}
                </Text>
              </View>
            )
          }}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Ionicons name="wallet-outline" size={48} color="#d4d4d8" />
              <Text className="text-zinc-400 font-semibold mt-3">Nenhuma transação</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

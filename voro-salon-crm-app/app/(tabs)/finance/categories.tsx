import React, { useState } from "react"
import { View, Text, FlatList, Pressable, TextInput, ActivityIndicator, Alert, Modal } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useTransactionCategories } from "hooks/use-transaction-categories.hook"
import { TransactionType } from "types/DTOs/financial.interface"
import type { TransactionCategoryDto } from "types/DTOs/financial.interface"

type TabType = "all" | "income" | "expense"

export default function CategoriesScreen() {
  const router = useRouter()
  const { categories, isLoading, createCategory, updateCategory, deleteCategory } = useTransactionCategories()

  const [tab, setTab] = useState<TabType>("all")

  // Create form
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newType, setNewType] = useState<TransactionType>(TransactionType.Income)
  const [isSaving, setIsSaving] = useState(false)

  // Edit modal
  const [editTarget, setEditTarget] = useState<TransactionCategoryDto | null>(null)
  const [editName, setEditName] = useState("")
  const [editType, setEditType] = useState<TransactionType>(TransactionType.Income)
  const [isUpdating, setIsUpdating] = useState(false)

  const filtered = (categories ?? []).filter((c: any) => {
    if (tab === "income")  return c.type === TransactionType.Income  || c.type === 1
    if (tab === "expense") return c.type === TransactionType.Expense || c.type === 2
    return true
  })

  async function handleCreate() {
    if (!newName.trim()) return
    setIsSaving(true)
    try {
      await createCategory({ name: newName.trim(), type: newType })
      setNewName("")
      setCreateOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  function openEdit(cat: TransactionCategoryDto) {
    setEditTarget(cat)
    setEditName(cat.name)
    setEditType(cat.type)
  }

  async function handleUpdate() {
    if (!editTarget || !editName.trim()) return
    setIsUpdating(true)
    try {
      await updateCategory(editTarget.id, {
        id: editTarget.id,
        name: editName.trim(),
        type: editType,
        isActive: editTarget.isActive,
      })
      setEditTarget(null)
    } finally {
      setIsUpdating(false)
    }
  }

  function confirmDelete(cat: TransactionCategoryDto) {
    Alert.alert(
      "Excluir categoria?",
      `"${cat.name}" será removida permanentemente.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: () => deleteCategory(cat.id) },
      ]
    )
  }

  const incomeCount  = (categories ?? []).filter((c: any) => c.type === TransactionType.Income  || c.type === 1).length
  const expenseCount = (categories ?? []).filter((c: any) => c.type === TransactionType.Expense || c.type === 2).length

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      {/* Header */}
      <View className="bg-white px-5 pt-4 pb-4 border-b border-zinc-100 flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} className="h-9 w-9 bg-zinc-50 rounded-xl items-center justify-center border border-zinc-100">
          <Ionicons name="chevron-back" size={20} color="#18181b" />
        </Pressable>
        <Text className="flex-1 text-xl font-black text-zinc-900">Categorias</Text>
        <Pressable
          onPress={() => { setNewName(""); setNewType(TransactionType.Income); setCreateOpen(true) }}
          className="h-9 w-9 bg-purple-600 rounded-xl items-center justify-center"
        >
          <Ionicons name="add" size={22} color="white" />
        </Pressable>
      </View>

      {/* Summary */}
      <View className="bg-white px-5 pt-3 pb-4 border-b border-zinc-100">
        <View className="flex-row gap-3 mb-3">
          <View className="flex-1 bg-green-50 rounded-2xl p-3 border border-green-100 items-center">
            <Text className="text-2xl font-black text-green-700">{incomeCount}</Text>
            <Text className="text-xs text-green-600 font-semibold">Receitas</Text>
          </View>
          <View className="flex-1 bg-red-50 rounded-2xl p-3 border border-red-100 items-center">
            <Text className="text-2xl font-black text-red-700">{expenseCount}</Text>
            <Text className="text-xs text-red-600 font-semibold">Despesas</Text>
          </View>
        </View>
        <View className="flex-row gap-2">
          {(["all", "income", "expense"] as TabType[]).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} className={`px-4 py-2 rounded-xl ${tab === t ? "bg-purple-600" : "bg-zinc-100"}`}>
              <Text className={`text-xs font-bold ${tab === t ? "text-white" : "text-zinc-600"}`}>
                {t === "all" ? "Todas" : t === "income" ? "Receitas" : "Despesas"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#7c3aed" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }: { item: TransactionCategoryDto }) => {
            const isInc = item.type === TransactionType.Income || (item.type as any) === 1
            return (
              <View className="bg-white rounded-2xl px-4 py-3 mb-2 border border-zinc-100 flex-row items-center gap-3">
                <View className={`h-9 w-9 rounded-xl items-center justify-center shrink-0 ${isInc ? "bg-green-50" : "bg-red-50"}`}>
                  <Ionicons name={isInc ? "arrow-up" : "arrow-down"} size={16} color={isInc ? "#10b981" : "#ef4444"} />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-zinc-900 font-bold text-sm" numberOfLines={1}>{item.name}</Text>
                  <Text className={`text-xs font-semibold ${isInc ? "text-green-600" : "text-red-600"}`}>
                    {isInc ? "Receita" : "Despesa"}
                  </Text>
                </View>
                {!item.isActive && (
                  <View className="bg-zinc-100 rounded-full px-2 py-0.5">
                    <Text className="text-zinc-400 text-xs font-semibold">Inativa</Text>
                  </View>
                )}
                <Pressable onPress={() => openEdit(item)} className="h-8 w-8 bg-zinc-50 rounded-xl items-center justify-center border border-zinc-100">
                  <Ionicons name="create-outline" size={15} color="#71717a" />
                </Pressable>
                <Pressable onPress={() => confirmDelete(item)} className="h-8 w-8 bg-red-50 rounded-xl items-center justify-center border border-red-100">
                  <Ionicons name="trash-outline" size={15} color="#dc2626" />
                </Pressable>
              </View>
            )
          }}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Ionicons name="pricetags-outline" size={48} color="#d4d4d8" />
              <Text className="text-zinc-400 font-semibold mt-3 text-base">Nenhuma categoria</Text>
              <Pressable
                onPress={() => { setNewName(""); setNewType(TransactionType.Income); setCreateOpen(true) }}
                className="mt-4 h-11 px-5 bg-purple-600 rounded-2xl items-center justify-center"
              >
                <Text className="text-white font-bold">Criar primeira categoria</Text>
              </Pressable>
            </View>
          }
        />
      )}

      {/* Create Modal */}
      <Modal visible={createOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCreateOpen(false)}>
        <View className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-5 pt-6 pb-4 border-b border-zinc-100">
            <Text className="text-lg font-black text-zinc-900">Nova Categoria</Text>
            <Pressable onPress={() => setCreateOpen(false)} className="h-9 w-9 bg-zinc-100 rounded-xl items-center justify-center">
              <Ionicons name="close" size={20} color="#71717a" />
            </Pressable>
          </View>

          <View className="p-5 gap-4">
            {/* Type */}
            <View>
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Tipo *</Text>
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => setNewType(TransactionType.Income)}
                  className={`flex-1 h-12 rounded-2xl items-center justify-center flex-row gap-2 border ${newType === TransactionType.Income ? "bg-green-500 border-green-400" : "bg-zinc-50 border-zinc-200"}`}
                >
                  <Ionicons name="arrow-up" size={16} color={newType === TransactionType.Income ? "white" : "#71717a"} />
                  <Text className={`font-bold text-sm ${newType === TransactionType.Income ? "text-white" : "text-zinc-600"}`}>Receita</Text>
                </Pressable>
                <Pressable
                  onPress={() => setNewType(TransactionType.Expense)}
                  className={`flex-1 h-12 rounded-2xl items-center justify-center flex-row gap-2 border ${newType === TransactionType.Expense ? "bg-red-500 border-red-400" : "bg-zinc-50 border-zinc-200"}`}
                >
                  <Ionicons name="arrow-down" size={16} color={newType === TransactionType.Expense ? "white" : "#71717a"} />
                  <Text className={`font-bold text-sm ${newType === TransactionType.Expense ? "text-white" : "text-zinc-600"}`}>Despesa</Text>
                </Pressable>
              </View>
            </View>

            {/* Name */}
            <View>
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Nome *</Text>
              <TextInput
                className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base"
                placeholder="Ex: Alimentação, Serviços..."
                placeholderTextColor="#a1a1aa"
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />
            </View>

            <Pressable
              onPress={handleCreate}
              disabled={isSaving || !newName.trim()}
              className={`h-14 rounded-2xl items-center justify-center mt-2 ${isSaving || !newName.trim() ? "bg-purple-300" : "bg-purple-600"}`}
            >
              {isSaving ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-base">Criar Categoria</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={!!editTarget} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditTarget(null)}>
        <View className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-5 pt-6 pb-4 border-b border-zinc-100">
            <Text className="text-lg font-black text-zinc-900">Editar Categoria</Text>
            <Pressable onPress={() => setEditTarget(null)} className="h-9 w-9 bg-zinc-100 rounded-xl items-center justify-center">
              <Ionicons name="close" size={20} color="#71717a" />
            </Pressable>
          </View>

          <View className="p-5 gap-4">
            {/* Type */}
            <View>
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Tipo *</Text>
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => setEditType(TransactionType.Income)}
                  className={`flex-1 h-12 rounded-2xl items-center justify-center flex-row gap-2 border ${editType === TransactionType.Income ? "bg-green-500 border-green-400" : "bg-zinc-50 border-zinc-200"}`}
                >
                  <Ionicons name="arrow-up" size={16} color={editType === TransactionType.Income ? "white" : "#71717a"} />
                  <Text className={`font-bold text-sm ${editType === TransactionType.Income ? "text-white" : "text-zinc-600"}`}>Receita</Text>
                </Pressable>
                <Pressable
                  onPress={() => setEditType(TransactionType.Expense)}
                  className={`flex-1 h-12 rounded-2xl items-center justify-center flex-row gap-2 border ${editType === TransactionType.Expense ? "bg-red-500 border-red-400" : "bg-zinc-50 border-zinc-200"}`}
                >
                  <Ionicons name="arrow-down" size={16} color={editType === TransactionType.Expense ? "white" : "#71717a"} />
                  <Text className={`font-bold text-sm ${editType === TransactionType.Expense ? "text-white" : "text-zinc-600"}`}>Despesa</Text>
                </Pressable>
              </View>
            </View>

            {/* Name */}
            <View>
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">Nome *</Text>
              <TextInput
                className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base"
                placeholder="Nome da categoria"
                placeholderTextColor="#a1a1aa"
                value={editName}
                onChangeText={setEditName}
                autoFocus
              />
            </View>

            <Pressable
              onPress={handleUpdate}
              disabled={isUpdating || !editName.trim()}
              className={`h-14 rounded-2xl items-center justify-center mt-2 ${isUpdating || !editName.trim() ? "bg-purple-300" : "bg-purple-600"}`}
            >
              {isUpdating ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-base">Salvar Alterações</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

import React from "react"
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import useSWR from "swr"
import { useDataList } from "hooks/use-data-list.hook"
import { API_CONFIG } from "lib/api"
import { ScreenHeader } from "components/ScreenHeader"
import { useTenantTheme } from "contexts/tenant-theme.context"
import { useModuleGuard } from "hooks/use-module-guard.hook"
import { fetcher } from "lib/fetcher"

interface Employee {
  id: string
  name: string
  hireDate?: string
  isActive: boolean
  specialtyIds?: string[]
  photoUrl?: string
}

function formatHireDate(dateStr?: string) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
}

function EmployeeCard({ employee, services, onPress, primaryColor }: {
  employee: Employee
  services: any[]
  onPress: () => void
  primaryColor: string
}) {
  const initials = employee.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const specialtyNames = (employee.specialtyIds ?? [])
    .map((sid) => services.find((s) => s.id === sid)?.name)
    .filter(Boolean) as string[]

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl p-4 mb-2 border border-zinc-100 flex-row items-center gap-3 active:bg-zinc-50"
    >
      <View
        className="w-14 h-14 items-center justify-center rounded-2xl shrink-0"
        style={{ backgroundColor: primaryColor + "15" }}
      >
        <Text className="font-black text-base" style={{ color: primaryColor }}>{initials}</Text>
      </View>

      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-2">
          <Text className="text-zinc-900 font-bold text-base flex-1" numberOfLines={1}>{employee.name}</Text>
          {!employee.isActive && (
            <View className="bg-zinc-100 rounded-lg px-2 py-0.5">
              <Text className="text-zinc-400 text-[10px] font-bold uppercase tracking-wide">Inativo</Text>
            </View>
          )}
        </View>

        {employee.hireDate && (
          <View className="flex-row items-center gap-1 mt-0.5">
            <Ionicons name="calendar-outline" size={12} color="#a1a1aa" />
            <Text className="text-zinc-400 text-xs">Desde {formatHireDate(employee.hireDate)}</Text>
          </View>
        )}

        {specialtyNames.length > 0 && (
          <View className="flex-row flex-wrap gap-1 mt-1.5">
            {specialtyNames.slice(0, 3).map((name, i) => (
              <View
                key={i}
                className="rounded-lg px-2 py-0.5"
                style={{ backgroundColor: primaryColor + "12", borderWidth: 1, borderColor: primaryColor + "20" }}
              >
                <Text className="text-[10px] font-bold" style={{ color: primaryColor }}>{name}</Text>
              </View>
            ))}
            {specialtyNames.length > 3 && (
              <Text className="text-zinc-400 text-[10px] font-semibold self-center">+{specialtyNames.length - 3}</Text>
            )}
          </View>
        )}
      </View>

      <Ionicons name="chevron-forward" size={16} color="#d4d4d8" />
    </Pressable>
  )
}

export default function EmployeesScreen() {
  useModuleGuard("employees")
  const router = useRouter()
  const { primaryColor } = useTenantTheme()
  const { data: services = [] } = useSWR(API_CONFIG.ENDPOINTS.SERVICES, fetcher)
  const { filteredData, isLoading, search, setSearch } = useDataList<Employee>(
    API_CONFIG.ENDPOINTS.EMPLOYEES,
    (e, q) => e.name.toLowerCase().includes(q)
  )

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={[]}>
      <ScreenHeader title="Funcionários" />

      <View className="bg-white px-5 pt-3 pb-4 border-b border-zinc-100 flex-row items-center gap-3">
        <View className="flex-1 bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-2 flex-row items-center gap-2">
          <Ionicons name="search" size={18} color="#a1a1aa" />
          <TextInput
            className="flex-1 text-zinc-900 font-medium text-sm py-1"
            placeholder="Buscar por nome..."
            placeholderTextColor="#a1a1aa"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color="#a1a1aa" />
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => router.push("/(tabs)/employees/new" as any)}
          className="h-11 w-11 rounded-2xl items-center justify-center"
          style={{ backgroundColor: primaryColor }}
        >
          <Ionicons name="add" size={24} color="white" />
        </Pressable>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={primaryColor} />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EmployeeCard
              employee={item}
              services={services as any[]}
              primaryColor={primaryColor}
              onPress={() => router.push(`/(tabs)/employees/${item.id}` as any)}
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Ionicons name="people-outline" size={48} color="#d4d4d8" />
              <Text className="text-zinc-400 font-semibold mt-3 text-base">
                {search ? "Nenhum resultado encontrado" : "Nenhum funcionário cadastrado"}
              </Text>
              {!search && (
                <Text className="text-zinc-300 text-sm mt-1">Comece adicionando seu primeiro funcionário</Text>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

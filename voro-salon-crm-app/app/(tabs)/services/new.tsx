import React from "react"
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useForm, Controller } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { secureApiCall, API_CONFIG } from "lib/api"

const schema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  description: z.string().optional(),
  duration: z.string().optional(),
  price: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function NewServiceScreen() {
  const router = useRouter()
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    const res = await secureApiCall(API_CONFIG.ENDPOINTS.SERVICES, {
      method: "POST",
      body: JSON.stringify({
        ...data,
        duration: data.duration ? parseInt(data.duration) : undefined,
        price: data.price ? parseFloat(data.price.replace(",", ".")) : undefined,
      }),
    })
    if (!res.hasError) router.back()
  }

  const inputClass = "bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 font-semibold text-base"

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <View className="bg-white px-5 pt-4 pb-4 border-b border-zinc-100 flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="h-9 w-9 bg-zinc-50 rounded-xl items-center justify-center border border-zinc-100">
            <Ionicons name="chevron-back" size={20} color="#18181b" />
          </Pressable>
          <Text className="text-xl font-black text-zinc-900">Novo Serviço</Text>
        </View>
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          {[
            { name: "name" as const, label: "Nome *", placeholder: "Nome do serviço" },
            { name: "description" as const, label: "Descrição", placeholder: "Descrição" },
            { name: "duration" as const, label: "Duração (min)", placeholder: "Ex: 60", keyboardType: "numeric" as const },
            { name: "price" as const, label: "Preço (R$)", placeholder: "Ex: 50,00", keyboardType: "decimal-pad" as const },
          ].map((field) => (
            <View key={field.name} className="mb-4">
              <Text className="text-zinc-700 font-bold text-sm mb-1.5">{field.label}</Text>
              <Controller control={control} name={field.name} render={({ field: { onChange, value } }) => (
                <TextInput className={inputClass} placeholder={field.placeholder} placeholderTextColor="#a1a1aa" value={value} onChangeText={onChange} keyboardType={field.keyboardType} />
              )} />
              {errors[field.name] && <Text className="text-red-500 text-xs mt-1">{errors[field.name]?.message}</Text>}
            </View>
          ))}
          <Pressable onPress={handleSubmit(onSubmit)} disabled={isSubmitting} className={`h-14 rounded-2xl items-center justify-center mt-4 ${isSubmitting ? "bg-purple-400" : "bg-purple-600"}`}>
            {isSubmitting ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-base">Salvar Serviço</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

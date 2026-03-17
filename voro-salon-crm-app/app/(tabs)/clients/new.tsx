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
  firstName: z.string().min(1, "Nome obrigatório"),
  lastName: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
})
type FormData = z.infer<typeof schema>

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="text-zinc-700 font-bold text-sm mb-1.5">{label}</Text>
      {children}
      {error && <Text className="text-red-500 text-xs mt-1">{error}</Text>}
    </View>
  )
}

export default function NewClientScreen() {
  const router = useRouter()
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    const res = await secureApiCall(API_CONFIG.ENDPOINTS.CLIENTS, {
      method: "POST",
      body: JSON.stringify(data),
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
          <Text className="text-xl font-black text-zinc-900">Novo Cliente</Text>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          <FormField label="Nome *" error={errors.firstName?.message}>
            <Controller control={control} name="firstName" render={({ field: { onChange, value } }) => (
              <TextInput className={inputClass} placeholder="Nome" placeholderTextColor="#a1a1aa" value={value} onChangeText={onChange} />
            )} />
          </FormField>

          <FormField label="Sobrenome" error={errors.lastName?.message}>
            <Controller control={control} name="lastName" render={({ field: { onChange, value } }) => (
              <TextInput className={inputClass} placeholder="Sobrenome" placeholderTextColor="#a1a1aa" value={value} onChangeText={onChange} />
            )} />
          </FormField>

          <FormField label="E-mail" error={errors.email?.message}>
            <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
              <TextInput className={inputClass} placeholder="E-mail" placeholderTextColor="#a1a1aa" value={value} onChangeText={onChange} keyboardType="email-address" autoCapitalize="none" />
            )} />
          </FormField>

          <FormField label="Telefone" error={errors.phone?.message}>
            <Controller control={control} name="phone" render={({ field: { onChange, value } }) => (
              <TextInput className={inputClass} placeholder="(00) 00000-0000" placeholderTextColor="#a1a1aa" value={value} onChangeText={onChange} keyboardType="phone-pad" />
            )} />
          </FormField>

          <Pressable onPress={handleSubmit(onSubmit)} disabled={isSubmitting} className={`h-14 rounded-2xl items-center justify-center mt-4 ${isSubmitting ? "bg-purple-400" : "bg-purple-600"}`}>
            {isSubmitting ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-base">Salvar Cliente</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

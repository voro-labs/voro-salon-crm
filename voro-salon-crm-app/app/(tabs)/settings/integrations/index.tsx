import React, { useState } from "react"
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { ScreenHeader } from "components/ScreenHeader"
import { useTenantTheme } from "contexts/tenant-theme.context"

export default function IntegrationsScreen() {
  const router = useRouter()
  const { primaryColor } = useTenantTheme()
  
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const handleGoogleConnect = () => {
    setIsGoogleLoading(true)
    setTimeout(() => {
      setIsGoogleLoading(false)
      Alert.alert(
        "Recurso em desenvolvimento",
        "A integração com o Google Calendar passará por auditoria em breve pela plataforma web."
      )
    }, 1200)
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={["bottom"]}>
      <ScreenHeader
        title="Integrações"
        showBack
        onBack={() => router.back()}
      />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        <Text className="text-zinc-500 text-sm mb-6">
          Conecte sua conta do Voro Salon com aplicativos externos para automatizar sua rotina e não perder nenhum compromisso.
        </Text>

        <View className="bg-white rounded-3xl p-5 border border-zinc-100 mb-4 shadow-sm">
          <View className="flex-row items-center gap-4 mb-4">
            <View className="h-12 w-12 rounded-2xl items-center justify-center bg-blue-50 border border-blue-100">
              <Ionicons name="logo-google" size={24} color="#2563eb" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-black text-zinc-900 mb-0.5">Google Calendar</Text>
              <Text className="text-xs text-zinc-500 font-medium tracking-tight">Em breve pela Web</Text>
            </View>
          </View>
          
          <Text className="text-sm text-zinc-600 mb-5 leading-relaxed">
            Mantenha sua agenda do salão sincronizada automaticamente com sua conta pessoal ou profissional do Google. Os agendamentos criados pelos clientes cairão direto no calendário.
          </Text>

          <Pressable
            onPress={handleGoogleConnect}
            disabled={isGoogleLoading}
            className="h-12 rounded-xl items-center justify-center border border-zinc-200 bg-zinc-50 flex-row gap-2 active:bg-zinc-100"
          >
            {isGoogleLoading ? (
               <ActivityIndicator color="#52525b" />
            ) : (
              <>
                <Text className="font-bold text-zinc-700">Conectar com Google</Text>
                <Ionicons name="link-outline" size={16} color="#52525b" />
              </>
            )}
          </Pressable>
        </View>

        <View className="bg-white rounded-3xl p-5 border border-zinc-100 shadow-sm opacity-70">
          <View className="flex-row items-center gap-4 mb-4">
            <View className="h-12 w-12 rounded-2xl items-center justify-center bg-zinc-100 border border-zinc-200">
              <Ionicons name="logo-apple" size={24} color="#18181b" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-black text-zinc-900 mb-0.5">Apple Calendar</Text>
              <Text className="text-xs text-zinc-500 font-medium tracking-tight">Exportação Manual (.ics)</Text>
            </View>
          </View>
          
          <Text className="text-sm text-zinc-600 mb-5 leading-relaxed">
            Ao criar um agendamento novo no app, você verá a opção na tela de conclusão para abrir diretamente o aplicativo de agenda nativo do iPhone.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

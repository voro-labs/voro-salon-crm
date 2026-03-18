import React from "react"
import { View, Text, Pressable, StatusBar } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"

const PRIMARY = "#8B4513"

export default function WelcomeScreen() {
  const router = useRouter()

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      {/* Logo area */}
      <View className="flex-1 items-center justify-center px-8">
        <View
          className="h-24 w-24 rounded-3xl items-center justify-center shadow-lg mb-6"
          style={{ backgroundColor: PRIMARY }}
        >
          <Ionicons name="cut" size={48} color="white" />
        </View>
        <Text className="text-4xl font-black text-zinc-900 tracking-tighter">
          Voro <Text style={{ color: PRIMARY }}>Salon</Text>
        </Text>
        <Text className="text-zinc-500 font-medium mt-3 text-base text-center">
          Gestão e agendamento para salões de beleza
        </Text>
      </View>

      {/* Options */}
      <View className="px-6 pb-10 gap-4">
        <Text className="text-center text-zinc-400 font-semibold text-sm mb-1 uppercase tracking-wider">
          Como deseja continuar?
        </Text>

        {/* Owner option */}
        <Pressable
          onPress={() => router.push("/(auth)/sign-in")}
          className="bg-zinc-900 rounded-3xl p-5 flex-row items-center gap-4 active:opacity-80"
        >
          <View className="h-12 w-12 bg-white/10 rounded-2xl items-center justify-center">
            <Ionicons name="storefront-outline" size={24} color="white" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-black text-base">Sou dono do salão</Text>
            <Text className="text-white/60 font-medium text-sm mt-0.5">
              Gerenciar agendamentos e clientes
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
        </Pressable>

        {/* Client/booking option */}
        <Pressable
          onPress={() => router.push("/booking")}
          className="rounded-3xl p-5 flex-row items-center gap-4 border-2 active:opacity-80"
          style={{ borderColor: PRIMARY }}
        >
          <View
            className="h-12 w-12 rounded-2xl items-center justify-center"
            style={{ backgroundColor: PRIMARY + "18" }}
          >
            <Ionicons name="calendar-outline" size={24} color={PRIMARY} />
          </View>
          <View className="flex-1">
            <Text className="text-zinc-900 font-black text-base">Quero agendar</Text>
            <Text className="text-zinc-500 font-medium text-sm mt-0.5">
              Agendar um serviço sem fazer login
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#d4d4d8" />
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

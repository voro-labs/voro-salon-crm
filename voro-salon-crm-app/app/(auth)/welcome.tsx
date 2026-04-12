import React, { useEffect, useRef, useState } from "react"
import { View, Text, Pressable, StatusBar, Animated } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useTenantTheme } from "contexts/tenant-theme.context"

const ESTABLISHMENTS = [
  {
    word: "Salon",
    icon: "cut" as const,
    sub: "Gestão e agendamento para salões de beleza",
  },
  {
    word: "Barbearia",
    icon: "cut" as const,
    sub: "Gestão e agendamento para barbearias",
  },
  {
    word: "Unhas & Cílios",
    icon: "color-palette-outline" as const,
    sub: "Gestão e agendamento para estúdios de unhas",
  },
  {
    word: "Estética",
    icon: "flower-outline" as const,
    sub: "Gestão e agendamento para clínicas estéticas",
  },
  {
    word: "Spa",
    icon: "leaf-outline" as const,
    sub: "Gestão e agendamento para spas e massagens",
  },
]

export default function WelcomeScreen() {
  const router = useRouter()
  const { primaryColor: PRIMARY } = useTenantTheme()

  const [index, setIndex] = useState(0)
  const fadeAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        setIndex((prev) => (prev + 1) % ESTABLISHMENTS.length)
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }).start()
      })
    }, 2500)

    return () => clearInterval(interval)
  }, [fadeAnim])

  const current = ESTABLISHMENTS[index]

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      {/* Logo area */}
      <View className="flex-1 items-center justify-center px-8">
        <Animated.View
          className="h-24 w-24 rounded-3xl items-center justify-center shadow-lg mb-6"
          style={{ backgroundColor: PRIMARY, opacity: fadeAnim }}
        >
          <Ionicons name={current.icon} size={48} color="white" />
        </Animated.View>

        <Text className="text-4xl font-black text-zinc-900 tracking-tighter">
          Voro{" "}
          <Animated.Text style={{ color: PRIMARY, opacity: fadeAnim }}>
            {current.word}
          </Animated.Text>
        </Text>

        <Animated.Text
          className="text-zinc-500 font-medium mt-3 text-base text-center"
          style={{ opacity: fadeAnim }}
        >
          {current.sub}
        </Animated.Text>
      </View>

      {/* Options */}
      <View className="px-6 pb-10 gap-4">
        <Text className="text-center text-zinc-400 font-semibold text-sm mb-1 uppercase tracking-wider">
          Como deseja continuar?
        </Text>

        {/* Owner option */}
        <Pressable
          onPress={() => router.push(`/(auth)/sign-in?estIndex=${index}` as any)}
          className="bg-zinc-900 rounded-3xl p-5 flex-row items-center gap-4 active:opacity-80"
        >
          <View className="h-12 w-12 bg-white/10 rounded-2xl items-center justify-center">
            <Ionicons name="storefront-outline" size={24} color="white" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-black text-base">Sou da equipe</Text>
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

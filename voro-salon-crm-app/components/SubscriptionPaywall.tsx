import { View, Text, TouchableOpacity, Linking, ActivityIndicator } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useAuth } from "contexts/auth.context"
import { useSubscription } from "hooks/use-subscription.hook"
import { useTenantTheme } from "contexts/tenant-theme.context"

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? ""

export function SubscriptionPaywall() {
  const { logout } = useAuth()
  const { mutate, isLoading, trialEndsAt, isInactive } = useSubscription()
  const { primaryColor } = useTenantTheme()

  const formattedDate = trialEndsAt
    ? trialEndsAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : null

  const handleOpenWeb = () => {
    Linking.openURL(`${WEB_URL}/subscription`)
  }

  const handleRefresh = () => {
    mutate()
  }

  return (
    <View className="flex-1 bg-white items-center justify-center px-8">
      <View className="w-20 h-20 rounded-3xl bg-red-50 items-center justify-center mb-6">
        <Ionicons name="lock-closed" size={40} color="#ef4444" />
      </View>

      <Text className="text-3xl font-black text-center text-gray-900 mb-3">
        {isInactive ? "Assinatura inativa" : "Trial encerrado"}
      </Text>

      {!isInactive && formattedDate && (
        <Text className="text-sm text-gray-500 text-center mb-2">
          Seu período gratuito encerrou em{" "}
          <Text className="font-semibold text-gray-800">{formattedDate}</Text>.
        </Text>
      )}

      <Text className="text-sm text-gray-500 text-center mb-8">
        {isInactive
          ? "Sua assinatura está inativa. Acesse o painel web para reativar e continuar usando o Voro Salon CRM."
          : "Assine um plano para continuar usando o Voro Salon CRM e manter acesso a todos os seus dados."}
      </Text>

      <View className="w-full gap-3">
        <TouchableOpacity
          onPress={handleOpenWeb}
          className="w-full rounded-xl py-4 items-center"
          style={{ backgroundColor: primaryColor }}
        >
          <View className="flex-row items-center gap-2">
            <Ionicons name="globe-outline" size={18} color="#fff" />
            <Text className="text-white font-bold text-base">Ver planos e assinar</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleRefresh}
          disabled={isLoading}
          className="w-full rounded-xl border border-gray-200 py-4 items-center"
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={primaryColor} />
          ) : (
            <View className="flex-row items-center gap-2">
              <Ionicons name="refresh-outline" size={18} color="#6b7280" />
              <Text className="text-gray-600 font-semibold text-base">Já assinei — atualizar</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={logout} className="w-full py-3 items-center">
          <View className="flex-row items-center gap-2">
            <Ionicons name="log-out-outline" size={16} color="#9ca3af" />
            <Text className="text-gray-400 text-sm">Sair da conta</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  )
}

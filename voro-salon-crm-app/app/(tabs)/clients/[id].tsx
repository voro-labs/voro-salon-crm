import { useLocalSearchParams } from "expo-router"
import { ClientDetailScreen } from "components/tab-screens/clients/ClientDetailScreen"

export default function ClientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <ClientDetailScreen id={id!} rootPath="/(tabs)" />
}

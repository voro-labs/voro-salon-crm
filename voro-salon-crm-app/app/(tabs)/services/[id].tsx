import { useLocalSearchParams } from "expo-router"
import { ServiceDetailScreen } from "components/tab-screens/services/ServiceDetailScreen"

export default function ServiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <ServiceDetailScreen id={id!} rootPath="/(tabs)" />
}

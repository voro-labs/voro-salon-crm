import { useLocalSearchParams } from "expo-router"
import { ServiceFormScreen } from "components/tab-screens/services/ServiceFormScreen"

export default function EditService() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <ServiceFormScreen id={id} />
}

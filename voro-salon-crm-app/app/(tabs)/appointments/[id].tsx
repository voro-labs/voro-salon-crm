import { useLocalSearchParams } from "expo-router"
import { AppointmentDetailScreen } from "components/tab-screens/appointments/AppointmentDetailScreen"

export default function AppointmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <AppointmentDetailScreen id={id!} rootPath="/(tabs)" />
}

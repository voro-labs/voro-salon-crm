import { useLocalSearchParams } from "expo-router"
import { AppointmentFormScreen } from "components/tab-screens/appointments/AppointmentFormScreen"

export default function EditAppointment() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <AppointmentFormScreen id={id} rootPath="/(employee-tabs)" />
}

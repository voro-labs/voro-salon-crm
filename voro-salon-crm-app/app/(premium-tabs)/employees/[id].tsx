import { useLocalSearchParams } from "expo-router"
import { EmployeeDetailScreen } from "components/tab-screens/employees/EmployeeDetailScreen"

export default function EmployeeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <EmployeeDetailScreen id={id!} rootPath="/(premium-tabs)" />
}

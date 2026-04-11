import { ModuleGuard } from "@/components/auth/module-guard"
import { AuthGuard } from "@/components/auth/auth.guard"

export default function FinancesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard requiredRoles={["Owner", "SalonOwner"]}>
      <ModuleGuard moduleId={[5]}>{children}</ModuleGuard>
    </AuthGuard>
  )
}

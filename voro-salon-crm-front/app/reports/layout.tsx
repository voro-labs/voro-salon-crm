import { AuthGuard } from "@/components/auth/auth.guard"

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRoles={["SalonOwner", "Owner"]}>
      {children}
    </AuthGuard>
  )
}

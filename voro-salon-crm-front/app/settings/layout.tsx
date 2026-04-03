import { AuthGuard } from "@/components/auth/auth.guard"

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard requiredRoles={["Owner", "SalonOwner", "SalonEmployee"]}>
      {children}
    </AuthGuard>
  )
}

"use client"

import { AuthGuard } from "@/components/auth/auth.guard"
import { useAuth } from "@/contexts/auth.context"
import { SupportInbox } from "@/components/features/support/support-inbox"
import { SupportAdminInbox } from "@/components/features/support/support-admin-inbox"

function SupportView() {
  const { user } = useAuth()
  const isOwner = user?.roles?.some((r) => r.name === "Owner") ?? false
  return isOwner ? <SupportAdminInbox /> : <SupportInbox />
}

export default function SupportPage() {
  return (
    <AuthGuard requiredRoles={["SalonOwner", "SalonEmployee", "Owner"]}>
      <div className="h-[calc(100dvh-4rem)] lg:h-dvh">
        <SupportView />
      </div>
    </AuthGuard>
  )
}

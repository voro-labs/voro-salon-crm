"use client"

import { AuthGuard } from "@/components/auth/auth.guard"
import { SupportInbox } from "@/components/features/support/support-inbox"

export default function SupportPage() {
  return (
    <AuthGuard requiredRoles={["SalonOwner", "SalonEmployee", "Owner"]}>
      <div className="h-[calc(100vh-4rem)]">
        <SupportInbox />
      </div>
    </AuthGuard>
  )
}

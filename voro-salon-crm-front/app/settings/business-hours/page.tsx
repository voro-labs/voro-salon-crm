"use client"

import { AuthGuard } from "@/components/auth/auth.guard"
import { BusinessHoursContent } from "@/components/features/settings/business-hours-content"

export default function BusinessHoursPage() {
  return (
    <AuthGuard requiredRoles={["SalonOwner", "Owner"]}>
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <BusinessHoursContent />
      </div>
    </AuthGuard>
  )
}

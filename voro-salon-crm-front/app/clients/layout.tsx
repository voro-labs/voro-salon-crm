import { ModuleGuard } from "@/components/auth/module-guard"
import { AuthGuard } from "@/components/auth/auth.guard"

export default function ClientsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AuthGuard requiredRoles={["Owner", "SalonOwner"]}>
            <ModuleGuard moduleId={1}>{children}</ModuleGuard>
        </AuthGuard>
    )
}

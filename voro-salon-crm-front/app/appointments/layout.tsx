import { ModuleGuard } from "@/components/auth/module-guard"

export default function AppointmentsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <ModuleGuard moduleId={2}>{children}</ModuleGuard>
}

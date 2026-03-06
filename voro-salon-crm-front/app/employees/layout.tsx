import { ModuleGuard } from "@/components/auth/module-guard"

export default function EmployeesLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <ModuleGuard moduleId={4}>{children}</ModuleGuard>
}

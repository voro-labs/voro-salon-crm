import { ModuleGuard } from "@/components/auth/module-guard"

export default function ClientsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <ModuleGuard moduleId={1}>{children}</ModuleGuard>
}

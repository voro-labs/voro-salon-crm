import { ModuleGuard } from "@/components/auth/module-guard"

export default function ServicesLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <ModuleGuard moduleId={3}>{children}</ModuleGuard>
}

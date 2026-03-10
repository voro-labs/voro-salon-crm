import { ModuleGuard } from "@/components/auth/module-guard"

export default function FinancesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ModuleGuard moduleId={5}>{children}</ModuleGuard>
}

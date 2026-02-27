import { TenantProvider } from "@/components/tenant-provider"
import { SidebarNav } from "@/components/sidebar-nav"
import { MobileNav } from "@/components/mobile-nav"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TenantProvider>
      <div className="flex min-h-screen bg-background">
        <SidebarNav />
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 px-4 py-6 md:px-8 md:py-8 pb-24 md:pb-8">
            {children}
          </div>
        </main>
        <MobileNav />
      </div>
    </TenantProvider>
  )
}

"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useTenant } from "@/components/tenant-provider"
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Scissors,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

const navItems = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/dashboard/clientes", label: "Clientes", icon: Users },
  { href: "/dashboard/configuracoes", label: "Configuracoes", icon: Settings },
]

export function SidebarNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { tenant, user } = useTenant()

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
  }

  return (
    <aside className="hidden md:flex flex-col w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen sticky top-0">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Scissors className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-tight text-sidebar-foreground">
            {tenant?.name || "Salon CRM"}
          </span>
          <span className="text-xs text-sidebar-foreground/60 leading-tight">
            Gerenciamento
          </span>
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-4">
        <Separator className="bg-sidebar-border mb-4" />
        <div className="flex items-center gap-3 px-3 mb-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-sidebar-accent text-sidebar-accent-foreground text-xs font-semibold">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium truncate text-sidebar-foreground">
              {user?.name || "Usuario"}
            </span>
            <span className="text-xs text-sidebar-foreground/50 truncate">
              {user?.email || ""}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </aside>
  )
}

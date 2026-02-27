"use client"

import { useAuth } from "@/contexts/auth.context"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Users,
  ClipboardList,
  Apple,
  Dumbbell,
  LayoutDashboard,
  MessageSquare,
  LogOut,
  Smartphone,
} from "lucide-react"
import { toTitleCase } from "@/lib/utils"

const navItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["Admin", "Trainer", "Student"] },
  { title: "Alunos", href: "/students", icon: Users, roles: ["Admin", "Trainer"] },
  { title: "Exercícios", href: "/exercises", icon: Dumbbell, roles: ["Admin", "Trainer"] },
  { title: "Treinos", href: "/workouts", icon: ClipboardList, roles: ["Admin", "Trainer", "Student"] },
  { title: "Nutrição", href: "/nutrition", icon: Apple, roles: ["Admin"] },
  { title: "Instâncias", href: "/instances", icon: Smartphone, roles: ["Admin", "Trainer"] }
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  if (!user) return null

  const getRoleBadge = (roles: string[]) => {
    switch (roles[0]) {
      case "Admin":
        return { text: "Admin", class: "bg-blue-100 text-blue-800" }
      case "Trainer":
        return { text: "Trainer", class: "bg-purple-100 text-purple-800" }
      case "Student":
        return { text: "Student", class: "bg-green-100 text-green-800" }
      default:
        return { text: "User", class: "bg-green-100 text-green-800" }
    }
  }

  const badge = getRoleBadge(user?.roles?.map((r) => r.name) ?? [])

  const isActive = (href: string) => pathname === href

  return (
    <>
      {/* Overlay (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 min-h-screen
          bg-card/80 backdrop-blur-lg border-r border-border shadow-lg
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:relative lg:z-auto
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="p-6 border-b border-border text-center">
          <h1 className="text-xl font-bold">VoroLabs</h1>
          <p className="text-sm mt-2">
            Olá, {toTitleCase(`${user.firstName} ${user.lastName}`)}
          </p>

          <div className="flex justify-center mt-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.class}`}
            >
              {badge.text}
            </span>
          </div>
        </div>

        {/* Menu */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon

            if (!item.roles.includes((user?.roles?.map((r) => r.name) ?? [])[0]))
              return null;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${
                    isActive(item.href)
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                {item.title}
              </Link>
            )
          })}

          <div className="border-t border-border my-4" />

          {/* Logout */}
          <button
            onClick={logout}
            className="
              flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
              text-muted-foreground hover:bg-accent hover:text-accent-foreground
              transition-colors w-full text-left
            "
          >
            <LogOut size={20} />
            Sair
          </button>
        </nav>
      </aside>
    </>
  )
}

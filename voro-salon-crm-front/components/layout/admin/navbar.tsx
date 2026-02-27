"use client"

import { useIsMobile } from "@/hooks/use-mobile.hook"
import { Menu } from "lucide-react"
import { useEffect, useState } from "react"

interface NavbarProps {
  isOpen: boolean
  onMenuClick: () => void
}

export function Navbar({ isOpen, onMenuClick }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!isMobile) return
    
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [])

  return (
    <>
      <nav
        className={`${
          isScrolled
            ? "fixed top-0 left-0 right-0"
            : "relative"
        } transition-all duration-300 lg:hidden 
        ${isScrolled || isMobileMenuOpen ? "bg-background/80 backdrop-blur-lg border-b border-border" : "bg-transparent"} 
        ${isOpen ? "z-0" : "z-50"}`}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onMenuClick}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <Menu size={20} />
            </button>
            <span className="text-xl font-bold text-gray-600">VoroLabs</span>
          </div>
        </div>
      </nav>

      {/* Spacer para evitar "conteúdo saltando" */}
      {isScrolled && <div className="h-14" />}
    </>
  )
}

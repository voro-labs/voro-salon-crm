import Link from "next/link"

export function LegalFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          &copy; 2025 VoroLabs. Todos os direitos reservados.
        </p>

        <nav className="flex items-center gap-1 flex-wrap justify-center">
          {[
            { label: "Privacidade", href: "/privacy" },
            { label: "Cookies", href: "/cookies" },
            { label: "Termos", href: "/terms" },
            { label: "Reembolso", href: "/refund" },
          ].map((link, index, arr) => (
            <span key={link.href} className="flex items-center gap-1">
              <Link
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
              {index < arr.length - 1 && (
                <span className="text-muted-foreground/40 select-none">|</span>
              )}
            </span>
          ))}
        </nav>
      </div>
    </footer>
  )
}

import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.css"
import { AuthProvider } from "@/contexts/auth.context"
import { Main } from "@/components/layout/admin/main"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "FitCoach Pro - Gestão para Personal Trainers",
  description: "Sistema completo de gestão para personal trainers: alunos, treinos, nutrição e mensagens",
  keywords: ["desenvolvimento de sistemas", "criação de páginas", "automações comerciais", "conexão com clientes", "soluções digitais", "presença online", "engajamento de clientes", "tecnologia para negócios"],
  generator: "vorolabs.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.png",
        type: "image/png",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark scroll-smooth">
      <body className={`${inter.className} font-sans antialiased`}>
        <AuthProvider>
          <Main>
            {children}
          </Main>
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}

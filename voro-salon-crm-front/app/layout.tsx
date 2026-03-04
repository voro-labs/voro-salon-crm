import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { AuthProvider } from '@/contexts/auth.context'
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Main } from "@/components/layout/admin/main"

const _geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Salon CRM - Gerenciamento de Clientes',
  description: 'Sistema de gerenciamento de clientes e servicos para saloes de beleza',
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
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="dark scroll-smooth">
      <body className={`${_geist.className} font-sans antialiased`}>
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

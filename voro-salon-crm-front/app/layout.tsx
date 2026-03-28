import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { AuthProvider } from '@/contexts/auth.context'
import { ThemeProvider } from '@/components/theme-provider'
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Main } from "@/components/layout/admin/main"
import { TenantThemeProvider } from "@/contexts/tenant-theme.context"
import { BrowserNotificationsProvider } from "@/contexts/browser-notifications.context"
import { WebPushManager } from "@/components/web-push-manager"
import { Toaster } from "sonner"

const _geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Voro Salon CRM - Gerenciamento de Clientes',
  description: 'Sistema de gerenciamento de clientes e servicos para saloes de beleza',
  keywords: [
    "sistema para salão de beleza",
    "CRM para salão de beleza",
    "software para salão de beleza",
    "gestão de clientes para salão",
    "sistema de agendamento online para salão",
    "controle de clientes salão",
    "gerenciamento de serviços de beleza",
    "automação para salão de beleza",
    "sistema para cabeleireiro",
    "sistema para barbearia",
    "sistema para clínica estética",
    "controle financeiro para salão",
    "fidelização de clientes para salão",
    "marketing para salão de beleza",
    "aplicativo para salão de beleza"
  ],
  generator: "vorolabs.app",
  icons: {
    icon: [
      {
        url: "/icon-light.ico",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark.ico",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.ico"
      },
    ],
    apple: "/apple-icon.png"
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className=" scroll-smooth" suppressHydrationWarning>
      <body className={`${_geist.className} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TenantThemeProvider>
            <AuthProvider>
              <BrowserNotificationsProvider>
                <WebPushManager />
                <Main>
                  {children}
                </Main>
              </BrowserNotificationsProvider>
            </AuthProvider>
          </TenantThemeProvider>
        </ThemeProvider>
        <Toaster richColors position="top-right" />
        {process.env.NODE_ENV === 'production' && (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        )}
      </body>
    </html>
  )
}

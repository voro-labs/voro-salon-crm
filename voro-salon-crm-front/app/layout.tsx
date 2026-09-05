import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { AuthProvider } from '@/contexts/auth.context'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Main } from "@/components/layout/admin/main"
import { TenantThemeProvider } from "@/contexts/tenant-theme.context"
import { BrowserNotificationsProvider } from "@/contexts/browser-notifications.context"
import { WebPushManager } from "@/components/providers/web-push-manager"
import { SwrProvider } from "@/components/providers/swr-provider"
import { Toaster } from "sonner"

const _geist = Geist({ subsets: ["latin"] });

// O SEO por hostname vive em app/(landing)/layout.tsx, que é onde os crawlers leem.
// Aqui ficam só os metadados que não dependem do host: ler headers() no layout raiz
// tirava as 47 rotas da geração estática para beneficiar cinco páginas de marketing
// (issue #123, item 1).
export const metadata: Metadata = {
  title: "Voro Salon",
  description: "Sistema de gestão para salão de beleza, barbearia, studio de unhas, estética, SPA e pet shop.",
  authors: [{ name: "VoroLabs", url: "https://vorolabs.app" }],
  creator: "VoroLabs",
  publisher: "VoroLabs",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
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
        <SwrProvider>
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
        </SwrProvider>
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

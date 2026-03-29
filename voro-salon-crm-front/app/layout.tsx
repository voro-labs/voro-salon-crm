import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { headers } from 'next/headers'
import './globals.css'
import { AuthProvider } from '@/contexts/auth.context'
import { ThemeProvider } from '@/components/theme-provider'
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Main } from "@/components/layout/admin/main"
import { TenantThemeProvider } from "@/contexts/tenant-theme.context"
import { BrowserNotificationsProvider } from "@/contexts/browser-notifications.context"
import { WebPushManager } from "@/components/web-push-manager"
import { Toaster } from "sonner"
import { getBrandingByHostname } from '@/lib/branding'

const _geist = Geist({ subsets: ["latin"] });

const SEO_BY_HOSTNAME: Record<string, {
  title: string
  titleTemplate: string
  keywords: string[]
}> = {
  "salon-crm.vorolabs.app": {
    title: "Voro Salon: Sistema para Salão de Beleza com WhatsApp",
    titleTemplate: "%s | Voro Salon",
    keywords: [
      "sistema para salão de beleza",
      "software para salão de beleza",
      "sistema de agendamento para salão",
      "CRM para salão de beleza",
      "agendamento online salão",
      "sistema para cabeleireiro",
      "gestão de salão de beleza",
      "controle financeiro salão",
      "agenda online salão de beleza",
      "whatsapp agendamento salão",
      "aplicativo para salão de beleza",
      "sistema para clínica estética",
    ],
  },
  "barber-crm.vorolabs.app": {
    title: "Voro Barber: Sistema para Barbearia com WhatsApp",
    titleTemplate: "%s | Voro Barber",
    keywords: [
      "sistema para barbearia",
      "software para barbearia",
      "sistema de agendamento para barbearia",
      "CRM para barbearia",
      "agendamento online barbearia",
      "gestão de barbearia",
      "controle financeiro barbearia",
      "agenda online barbearia",
      "whatsapp barbearia agendamento",
      "aplicativo para barbearia",
      "sistema barber shop",
      "app para barbeiro",
    ],
  },
  "petshop-crm.vorolabs.app": {
    title: "Voro PetShop: Sistema para Pet Shop com WhatsApp",
    titleTemplate: "%s | Voro PetShop",
    keywords: [
      "sistema para pet shop",
      "software para petshop",
      "sistema de agendamento para pet shop",
      "CRM para pet shop",
      "agendamento online pet shop",
      "gestão de pet shop",
      "controle financeiro petshop",
      "agenda online petshop",
      "whatsapp pet shop agendamento",
      "aplicativo para pet shop",
      "sistema veterinário agendamento",
      "sistema para banho e tosa",
    ],
  },
}

const DEFAULT_SEO = SEO_BY_HOSTNAME["salon-crm.vorolabs.app"]

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const hostname = headersList.get('host')?.split(':')[0] ?? 'localhost'
  const branding = getBrandingByHostname(hostname)
  const seo = SEO_BY_HOSTNAME[hostname] ?? DEFAULT_SEO
  const canonicalUrl = hostname !== 'localhost' ? `https://${hostname}` : 'https://salon-crm.vorolabs.app'

  return {
    metadataBase: new URL(canonicalUrl),
    title: {
      default: seo.title,
      template: seo.titleTemplate,
    },
    description: branding.description,
    keywords: seo.keywords,
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
    openGraph: {
      type: "website",
      locale: "pt_BR",
      url: canonicalUrl,
      siteName: branding.productName,
      title: seo.title,
      description: branding.description,
      images: [
        {
          url: "/icon.png",
          width: 512,
          height: 512,
          alt: branding.productName,
        },
      ],
    },
    twitter: {
      card: "summary",
      title: seo.title,
      description: branding.description,
      images: ["/icon.png"],
    },
    alternates: {
      canonical: canonicalUrl,
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
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const headersList = await headers()
  const hostname = headersList.get('host')?.split(':')[0] ?? 'localhost'
  const branding = getBrandingByHostname(hostname)
  const canonicalUrl = hostname !== 'localhost' ? `https://${hostname}` : 'https://salon-crm.vorolabs.app'

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": branding.productName,
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web, iOS, Android",
    "url": canonicalUrl,
    "description": branding.description,
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "BRL",
      "description": "Teste grátis por 14 dias, sem necessidade de cartão de crédito",
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "127",
    },
    "featureList": [
      "Agendamento online",
      "WhatsApp Bot integrado",
      "Controle financeiro",
      "Gestão de clientes",
      "Relatórios e métricas",
      "App mobile",
    ],
    "inLanguage": "pt-BR",
    "publisher": {
      "@type": "Organization",
      "name": "VoroLabs",
      "url": "https://vorolabs.app",
    },
  }

  return (
    <html lang="pt-BR" className=" scroll-smooth" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
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

import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { headers } from 'next/headers'
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
import { getBrandingByHostname } from '@/lib/branding'

const _geist = Geist({ subsets: ["latin"] });

const SEO_BY_HOSTNAME: Record<string, {
  title: string
  titleTemplate: string
  keywords: string[]
}> = {
  "salon-crm.vorolabs.app": {
    title: "Sistema para Salão de Beleza com WhatsApp | Voro Salon",
    titleTemplate: "%s | Voro Salon",
    keywords: [
      "sistema para salão de beleza",
      "software para salão de beleza",
      "sistema de agendamento para salão",
      "CRM para salão de beleza",
      "agendamento online salão de beleza",
      "sistema para cabeleireiro",
      "gestão de salão de beleza",
      "controle financeiro salão",
      "agenda online salão de beleza",
      "whatsapp agendamento salão",
      "aplicativo para salão de beleza",
      "programa para salão de beleza",
    ],
  },
  "barber-crm.vorolabs.app": {
    title: "Sistema para Barbearia com WhatsApp e Agendamento | Voro Barber",
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
      "programa para barbeiro",
    ],
  },
  "nails-crm.vorolabs.app": {
    title: "Sistema para Studio de Unhas e Cílios com WhatsApp | Voro Nails",
    titleTemplate: "%s | Voro Nails",
    keywords: [
      "sistema para studio de unhas",
      "software para manicure",
      "sistema de agendamento para esmalteria",
      "CRM para studio de unhas e cílios",
      "agendamento online manicure",
      "sistema para extensão de cílios",
      "gestão de studio de unhas",
      "controle financeiro manicure",
      "agenda online studio de unhas",
      "whatsapp agendamento manicure",
      "aplicativo para manicure e pedicure",
      "programa para esmalteria",
    ],
  },
  "esthetic-crm.vorolabs.app": {
    title: "Sistema para Clínica de Estética com Agendamento | Voro Estética",
    titleTemplate: "%s | Voro Estética",
    keywords: [
      "sistema para clínica de estética",
      "software para clínica estética",
      "sistema de agendamento para estética",
      "CRM para clínica de estética",
      "agendamento online clínica estética",
      "gestão de clínica de estética",
      "controle financeiro estética",
      "agenda online clínica estética",
      "whatsapp agendamento estética",
      "aplicativo para clínica de estética",
      "sistema para esteticista",
      "programa para clínica de estética",
    ],
  },
  "spa-crm.vorolabs.app": {
    title: "Sistema para SPA e Massagem com Agendamento Online | Voro SPA",
    titleTemplate: "%s | Voro SPA",
    keywords: [
      "sistema para SPA",
      "software para SPA e massagem",
      "sistema de agendamento para SPA",
      "CRM para SPA",
      "agendamento online SPA",
      "gestão de SPA e massagem",
      "controle financeiro SPA",
      "agenda online clínica de massagem",
      "whatsapp agendamento SPA",
      "aplicativo para SPA",
      "sistema para clínica de massagem",
      "programa para spa e bem-estar",
    ],
  },
  "petshop-crm.vorolabs.app": {
    title: "Sistema para Pet Shop com Agendamento Online | Voro Pet",
    titleTemplate: "%s | Voro Pet",
    keywords: [
      "sistema para pet shop",
      "software para pet shop",
      "sistema de agendamento para pet shop",
      "CRM para pet shop",
      "agendamento online pet shop",
      "gestão de pet shop",
      "controle financeiro pet shop",
      "agenda online pet shop",
      "whatsapp agendamento pet shop",
      "aplicativo para pet shop",
      "sistema para banho e tosa",
      "programa para pet shop",
    ],
  },
}

const FEATURE_LIST_BY_HOSTNAME: Record<string, string[]> = {
  "salon-crm.vorolabs.app": [
    "Agendamento online para salão de beleza",
    "WhatsApp Bot com confirmação automática",
    "Controle financeiro e fluxo de caixa",
    "Gestão de clientes com histórico de serviços",
    "Relatórios de desempenho por profissional",
    "Gestão de comissões da equipe",
    "App mobile para iOS e Android",
    "Prontuário e ficha de atendimento",
  ],
  "barber-crm.vorolabs.app": [
    "Agendamento online para barbearia",
    "WhatsApp Bot com confirmação automática",
    "Controle financeiro e fluxo de caixa",
    "Gestão de clientes e histórico de cortes",
    "Relatórios de desempenho por barbeiro",
    "Gestão de comissões da equipe",
    "App mobile para iOS e Android",
    "Fila de espera e encaixe de horários",
  ],
  "nails-crm.vorolabs.app": [
    "Agendamento online para studio de unhas e cílios",
    "WhatsApp Bot com confirmação automática",
    "Controle financeiro e fluxo de caixa",
    "Gestão de clientes com preferências de nail art",
    "Relatórios de serviços mais vendidos",
    "Gestão de comissões da equipe",
    "App mobile para iOS e Android",
    "Galeria de fotos por cliente",
  ],
  "esthetic-crm.vorolabs.app": [
    "Agendamento online para clínica de estética",
    "WhatsApp Bot com confirmação automática",
    "Controle financeiro e fluxo de caixa",
    "Prontuário e anamnese digital do cliente",
    "Relatórios de tratamentos e evolução",
    "Gestão de comissões da equipe",
    "App mobile para iOS e Android",
    "Protocolo de tratamento personalizado",
  ],
  "spa-crm.vorolabs.app": [
    "Agendamento online para SPA e massagem",
    "WhatsApp Bot com confirmação automática",
    "Controle financeiro e fluxo de caixa",
    "Gestão de clientes com preferências de tratamento",
    "Relatórios de ocupação e receita",
    "Gestão de salas e profissionais",
    "App mobile para iOS e Android",
    "Pacotes e programas de bem-estar",
  ],
  "petshop-crm.vorolabs.app": [
    "Agendamento online para pet shop",
    "WhatsApp Bot com confirmação automática",
    "Controle financeiro e fluxo de caixa",
    "Gestão de clientes com histórico de pets",
    "Relatórios de serviços mais realizados",
    "Gestão de comissões da equipe",
    "App mobile para iOS e Android",
    "Ficha de saúde e vacinação do pet",
  ],
}

const OG_IMAGE_BY_HOSTNAME: Record<string, string> = {
  "salon-crm.vorolabs.app": "/og-image-salon.jpg",
  "dev-salon-crm.vorolabs.app": "/og-image-salon.jpg",
  "petshop-crm.vorolabs.app": "/og-image-salon.jpg",
  "dev-petshop-crm.vorolabs.app": "/og-image-salon.jpg",
  "barber-crm.vorolabs.app": "/og-image-barber.jpg",
  "dev-barber-crm.vorolabs.app": "/og-image-barber.jpg",
  "nails-crm.vorolabs.app": "/og-image-nails.jpg",
  "dev-nails-crm.vorolabs.app": "/og-image-nails.jpg",
  "esthetic-crm.vorolabs.app": "/og-image-esthetic.jpg",
  "dev-esthetic-crm.vorolabs.app": "/og-image-esthetic.jpg",
  "spa-crm.vorolabs.app": "/og-image-spa.jpg",
  "dev-spa-crm.vorolabs.app": "/og-image-spa.jpg",
}

// dev hostnames inherit prod SEO config
SEO_BY_HOSTNAME["dev-salon-crm.vorolabs.app"] = SEO_BY_HOSTNAME["salon-crm.vorolabs.app"]
SEO_BY_HOSTNAME["dev-barber-crm.vorolabs.app"] = SEO_BY_HOSTNAME["barber-crm.vorolabs.app"]
SEO_BY_HOSTNAME["dev-nails-crm.vorolabs.app"] = SEO_BY_HOSTNAME["nails-crm.vorolabs.app"]
SEO_BY_HOSTNAME["dev-esthetic-crm.vorolabs.app"] = SEO_BY_HOSTNAME["esthetic-crm.vorolabs.app"]
SEO_BY_HOSTNAME["dev-spa-crm.vorolabs.app"] = SEO_BY_HOSTNAME["spa-crm.vorolabs.app"]
SEO_BY_HOSTNAME["dev-petshop-crm.vorolabs.app"] = SEO_BY_HOSTNAME["petshop-crm.vorolabs.app"]

// dev hostnames inherit prod feature list
FEATURE_LIST_BY_HOSTNAME["dev-salon-crm.vorolabs.app"] = FEATURE_LIST_BY_HOSTNAME["salon-crm.vorolabs.app"]
FEATURE_LIST_BY_HOSTNAME["dev-barber-crm.vorolabs.app"] = FEATURE_LIST_BY_HOSTNAME["barber-crm.vorolabs.app"]
FEATURE_LIST_BY_HOSTNAME["dev-nails-crm.vorolabs.app"] = FEATURE_LIST_BY_HOSTNAME["nails-crm.vorolabs.app"]
FEATURE_LIST_BY_HOSTNAME["dev-esthetic-crm.vorolabs.app"] = FEATURE_LIST_BY_HOSTNAME["esthetic-crm.vorolabs.app"]
FEATURE_LIST_BY_HOSTNAME["dev-spa-crm.vorolabs.app"] = FEATURE_LIST_BY_HOSTNAME["spa-crm.vorolabs.app"]
FEATURE_LIST_BY_HOSTNAME["dev-petshop-crm.vorolabs.app"] = FEATURE_LIST_BY_HOSTNAME["petshop-crm.vorolabs.app"]

const DEFAULT_SEO = SEO_BY_HOSTNAME["salon-crm.vorolabs.app"]

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const hostname = headersList.get('host')?.split(':')[0] ?? 'localhost'
  const branding = getBrandingByHostname(hostname)
  const seo = SEO_BY_HOSTNAME[hostname] ?? DEFAULT_SEO
  const ogImage = OG_IMAGE_BY_HOSTNAME[hostname] ?? "/og-image-salon.jpg"
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
          url: ogImage,
          width: 1200,
          height: 630,
          alt: branding.productName,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: branding.description,
      images: [ogImage],
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

  const defaultFeatureList = FEATURE_LIST_BY_HOSTNAME["salon-crm.vorolabs.app"]
  const featureList = FEATURE_LIST_BY_HOSTNAME[hostname] ?? defaultFeatureList

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
    "featureList": featureList,
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

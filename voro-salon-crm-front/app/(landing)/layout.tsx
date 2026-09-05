import type { ReactNode } from "react"
import { headers } from "next/headers"
import { CookieBanner } from "@/components/legal/cookie-banner"
import { getBrandingByHostname } from "@/lib/branding"
import {
  FEATURE_LIST_BY_HOSTNAME,
  DEFAULT_HOSTNAME,
  hostnameMetadata,
} from "@/lib/seo"

// Estas são as páginas públicas que os crawlers leem, e as únicas que precisam variar
// por hostname. O headers() ficava no layout raiz, tirando o app inteiro da geração
// estática; aqui o custo fica onde está o benefício (issue #123, item 1).
async function resolveHostname() {
  const headersList = await headers()
  return headersList.get('host')?.split(':')[0] ?? 'localhost'
}

export const generateMetadata = hostnameMetadata

export default async function LandingLayout({ children }: { children: ReactNode }) {
  const hostname = await resolveHostname()
  const branding = getBrandingByHostname(hostname)
  const canonicalUrl = hostname !== 'localhost' ? `https://${hostname}` : `https://${DEFAULT_HOSTNAME}`
  const featureList = FEATURE_LIST_BY_HOSTNAME[hostname] ?? FEATURE_LIST_BY_HOSTNAME[DEFAULT_HOSTNAME]

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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
      <CookieBanner />
    </>
  )
}

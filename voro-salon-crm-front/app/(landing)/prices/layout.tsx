import type { Metadata } from "next"
import type { ReactNode } from "react"
import { headers } from "next/headers"
import { getBrandingByHostname } from "@/lib/branding"

const PRICES_SEO: Record<string, { title: string; description: string }> = {
  "salon-crm.vorolabs.app": {
    title: "Planos e Preços | Sistema para Salão de Beleza",
    description:
      "Planos acessíveis para salões de beleza. Comece grátis por 14 dias. Agendamento online, WhatsApp Bot e controle financeiro. Sem fidelidade.",
  },
  "barber-crm.vorolabs.app": {
    title: "Planos e Preços | Sistema para Barbearia",
    description:
      "Planos acessíveis para barbearias. Comece grátis por 14 dias. Agendamento online, WhatsApp Bot e controle financeiro. Sem fidelidade.",
  },
  "petshop-crm.vorolabs.app": {
    title: "Planos e Preços | Sistema para Pet Shop",
    description:
      "Planos acessíveis para pet shops. Comece grátis por 14 dias. Agendamento online, WhatsApp Bot e controle financeiro. Sem fidelidade.",
  },
}

const DEFAULT_PRICES_SEO = PRICES_SEO["salon-crm.vorolabs.app"]

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const hostname = headersList.get("host")?.split(":")[0] ?? "localhost"
  const seo = PRICES_SEO[hostname] ?? DEFAULT_PRICES_SEO
  const canonicalUrl = hostname !== "localhost" ? `https://${hostname}` : "https://salon-crm.vorolabs.app"

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: `${canonicalUrl}/prices`,
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `${canonicalUrl}/prices`,
    },
  }
}

export default async function PricesLayout({ children }: { children: ReactNode }) {
  const headersList = await headers()
  const hostname = headersList.get("host")?.split(":")[0] ?? "localhost"
  const branding = getBrandingByHostname(hostname)
  const canonicalUrl = hostname !== "localhost" ? `https://${hostname}` : "https://salon-crm.vorolabs.app"

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `O ${branding.productName} tem período de teste gratuito?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Sim! Você pode testar o ${branding.productName} gratuitamente por 14 dias, sem necessidade de cartão de crédito.`,
        },
      },
      {
        "@type": "Question",
        "name": "Preciso instalar algum software?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Não. O sistema é 100% online (web) e também está disponível como aplicativo no celular. Basta criar sua conta e começar a usar.",
        },
      },
      {
        "@type": "Question",
        "name": "Posso cancelar a qualquer momento?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Sim. Não há fidelidade. Você pode cancelar sua assinatura a qualquer momento, sem multas.",
        },
      },
      {
        "@type": "Question",
        "name": "O agendamento pelo WhatsApp está incluído em todos os planos?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "O agendamento automático pelo WhatsApp está disponível nos planos Pro e Premium.",
        },
      },
      {
        "@type": "Question",
        "name": `O ${branding.productName} tem aplicativo para celular?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Sim! O ${branding.productName} tem aplicativo disponível para iOS e Android, além da versão web.`,
        },
      },
    ],
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Início",
        "item": canonicalUrl,
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Planos",
        "item": `${canonicalUrl}/prices`,
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {children}
    </>
  )
}

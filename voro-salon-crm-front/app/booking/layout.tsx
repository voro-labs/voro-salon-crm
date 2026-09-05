import type { ReactNode } from "react"

import { hostnameMetadata } from "@/lib/seo"

// A página de agendamento é pública e circula por link (WhatsApp, bio, QR code), então
// precisa dos metadados da marca do domínio. Ela ganhava isso do layout raiz, que lia
// headers() e por causa disso tirava o app inteiro da geração estática (issue #123).
export const generateMetadata = hostnameMetadata

export default function BookingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}

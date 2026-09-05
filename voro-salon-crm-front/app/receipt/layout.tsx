import type { ReactNode } from "react"

import { hostnameMetadata } from "@/lib/seo"

// Mesmo caso do /booking: o comprovante é compartilhado por link e precisa manter a
// marca do domínio no preview, que antes vinha do layout raiz (issue #123).
export const generateMetadata = hostnameMetadata

export default function ReceiptLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}

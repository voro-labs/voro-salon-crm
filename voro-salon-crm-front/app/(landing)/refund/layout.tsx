import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Política de Reembolso | VoroLabs",
  description:
    "Conheça a política de reembolso e cancelamento da VoroLabs para assinaturas da plataforma Voro Salon.",
}

export default function RefundLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}

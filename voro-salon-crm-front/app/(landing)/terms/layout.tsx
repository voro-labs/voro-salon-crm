import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Termos de Serviço | VoroLabs",
  description:
    "Leia os Termos de Serviço da VoroLabs para entender as condições de uso da plataforma Voro Salon.",
}

export default function TermsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}

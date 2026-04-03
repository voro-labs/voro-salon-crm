import type { Metadata, ReactNode } from "next"

export const metadata: Metadata = {
  title: "Política de Privacidade | VoroLabs",
  description:
    "Saiba como a VoroLabs coleta, utiliza e protege seus dados pessoais na plataforma Voro Salon, em conformidade com a LGPD.",
}

export default function PrivacyLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}

import type { Metadata, ReactNode } from "next"

export const metadata: Metadata = {
  title: "Política de Cookies | VoroLabs",
  description:
    "Entenda como a VoroLabs utiliza cookies e tecnologias similares na plataforma Voro Salon e como você pode gerenciá-los.",
}

export default function CookiesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}

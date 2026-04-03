import type { ReactNode } from "react"
import { CookieBanner } from "@/components/legal/cookie-banner"

export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <CookieBanner />
    </>
  )
}

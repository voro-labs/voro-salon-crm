export interface BusinessHourRange {
  openTime: string
  closeTime: string
}

export interface BusinessHour {
  dayOfWeek: number // 0 = Sunday … 6 = Saturday
  isOpen: boolean
  ranges: BusinessHourRange[]
}

export interface PublicTenant {
  id: string
  name: string
  slug: string
  logoUrl?: string | null
  coverImageUrl?: string | null
  primaryColor?: string | null
  secondaryColor?: string | null
  contactPhone?: string | null
  contactEmail?: string | null
  isBookingEnabled?: boolean
  establishmentType?: number
  businessHours?: BusinessHour[]
  street?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
  address?: string | null
}

export const DAY_NAMES_PT: Record<number, string> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
}

export function buildGoogleMapsUrl(tenant: PublicTenant): string | null {
  const parts: string[] = []

  if (tenant.address) {
    parts.push(tenant.address)
  } else {
    if (tenant.street) parts.push(tenant.street)
    if (tenant.neighborhood) parts.push(tenant.neighborhood)
  }

  if (tenant.city) parts.push(tenant.city)
  if (tenant.state) parts.push(tenant.state)
  if (tenant.zipCode) parts.push(tenant.zipCode)

  if (parts.length === 0) return null

  const query = encodeURIComponent(`${tenant.name} ${parts.join(", ")}`)
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}

/** Formats "HH:mm:ss" or "HH:mm" to "HH:mm". */
export function formatTime(t: string): string {
  return t ? t.slice(0, 5) : ""
}

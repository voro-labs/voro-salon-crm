"use client"

import { Clock, MapPin } from "lucide-react"
import { buildGoogleMapsUrl, formatTime, DAY_NAMES_PT } from "./booking-utils"
import type { PublicTenant } from "./booking-utils"

interface WelcomeCardProps {
  tenant: PublicTenant
}

export function WelcomeCard({ tenant }: WelcomeCardProps) {
  const mapsUrl = buildGoogleMapsUrl(tenant)

  const sortedHours = tenant.businessHours
    ? [...tenant.businessHours].sort((a, b) => {
        // Monday (1) first, Sunday (0) last
        const order = [1, 2, 3, 4, 5, 6, 0]
        return order.indexOf(a.dayOfWeek) - order.indexOf(b.dayOfWeek)
      })
    : []

  const hasBusinessHours = sortedHours.length > 0

  return (
    <div className="rounded-2xl rounded-tl-none border bg-background shadow-sm overflow-hidden w-full">
      <div className="p-4 flex flex-col gap-4">
        {hasBusinessHours && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <Clock className="h-3 w-3" />
              Horários
            </div>
            <div className="grid grid-cols-1 gap-0.5">
              {sortedHours.map((bh) => (
                <div key={bh.dayOfWeek} className="flex items-start justify-between text-xs gap-2">
                  <span className="text-muted-foreground w-16 shrink-0">
                    {DAY_NAMES_PT[bh.dayOfWeek] ?? `Dia ${bh.dayOfWeek}`}
                  </span>
                  {!bh.isOpen || !bh.ranges || bh.ranges.length === 0 ? (
                    <span className="text-destructive/70 font-medium">Fechado</span>
                  ) : (
                    <span className="text-foreground font-medium text-right">
                      {[...bh.ranges]
                        .sort((a, b) => a.openTime.localeCompare(b.openTime))
                        .map((r) => `${formatTime(r.openTime)} – ${formatTime(r.closeTime)}`)
                        .join(" | ")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
            Ver no Google Maps
          </a>
        )}
      </div>
    </div>
  )
}

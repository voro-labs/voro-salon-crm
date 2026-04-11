"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import useSWR from "swr"
import { ArrowLeft, Plus, X, Clock, Info, Loader2, Save, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { fetcher } from "@/lib/fetcher"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { AuthGuard } from "@/components/auth/auth.guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// ─── Data model ──────────────────────────────────────────────────────────────

interface TimeRange {
  openTime: string
  closeTime: string
}

interface BusinessHoursViewModel {
  dayOfWeek: number
  isOpen: boolean
  ranges: TimeRange[]
}

interface ApiTimeRange {
  openTime: string
  closeTime: string
}

interface ApiBusinessHours {
  dayOfWeek: number
  isOpen: boolean
  ranges: ApiTimeRange[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = [
  { day: 0, label: "Domingo", short: "Dom" },
  { day: 1, label: "Segunda-feira", short: "Seg" },
  { day: 2, label: "Terça-feira", short: "Ter" },
  { day: 3, label: "Quarta-feira", short: "Qua" },
  { day: 4, label: "Quinta-feira", short: "Qui" },
  { day: 5, label: "Sexta-feira", short: "Sex" },
  { day: 6, label: "Sábado", short: "Sáb" },
]

// 15-minute increments from 00:00 to 23:45 → 96 options
const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4).toString().padStart(2, "0")
  const m = ((i % 4) * 15).toString().padStart(2, "0")
  return `${h}:${m}`
})

const DEFAULT_RANGES: TimeRange[] = [
  { openTime: "08:00", closeTime: "11:30" },
  { openTime: "13:30", closeTime: "18:30" },
]

// Configuração padrão: Dom fechado, Seg–Sáb aberto com DEFAULT_RANGES
const DEFAULT_SCHEDULE: BusinessHoursViewModel[] = DAYS_OF_WEEK.map((d) => ({
  dayOfWeek: d.day,
  isOpen: d.day >= 1 && d.day <= 6,
  ranges: DEFAULT_RANGES.map((r) => ({ ...r })),
}))

function isScheduleDefault(localHours: BusinessHoursViewModel[]): boolean {
  return DEFAULT_SCHEDULE.every((def) => {
    const local = localHours.find((l) => l.dayOfWeek === def.dayOfWeek)
    if (!local) return false
    if (local.isOpen !== def.isOpen) return false
    if (!local.isOpen) return true // fechado == fechado, ranges irrelevantes
    if (local.ranges.length !== def.ranges.length) return false
    return def.ranges.every(
      (r, i) =>
        local.ranges[i].openTime === r.openTime &&
        local.ranges[i].closeTime === r.closeTime
    )
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function apiToViewModel(
  apiHours: ApiBusinessHours[],
  days: typeof DAYS_OF_WEEK
): BusinessHoursViewModel[] {
  return days.map((d) => {
    const setting = apiHours.find((bh) => bh.dayOfWeek === d.day)
    const defaultIsOpen = d.day >= 1 && d.day <= 6

    if (!setting) {
      return {
        dayOfWeek: d.day,
        isOpen: defaultIsOpen,
        ranges: DEFAULT_RANGES.map((r) => ({ ...r })),
      }
    }

    const ranges =
      setting.ranges && setting.ranges.length > 0
        ? setting.ranges.map((r) => ({
            openTime: r.openTime ? r.openTime.slice(0, 5) : DEFAULT_RANGES[0].openTime,
            closeTime: r.closeTime ? r.closeTime.slice(0, 5) : DEFAULT_RANGES[0].closeTime,
          }))
        : DEFAULT_RANGES.map((r) => ({ ...r }))

    return {
      dayOfWeek: d.day,
      isOpen: setting.isOpen,
      ranges,
    }
  })
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function DayCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-6 w-11 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Page (inner, wrapped by AuthGuard) ───────────────────────────────────────

function BusinessHoursContent() {
  const { data: apiHours, mutate, isLoading } = useSWR<ApiBusinessHours[]>(
    API_CONFIG.ENDPOINTS.BUSINESS_HOURS,
    fetcher
  )

  const [localHours, setLocalHours] = useState<BusinessHoursViewModel[]>([])
  const [savingDay, setSavingDay] = useState<number | null>(null)
  const [resetting, setResetting] = useState(false)

  // Initialise local state from SWR data (first load only)
  useEffect(() => {
    if (apiHours) {
      setLocalHours(apiToViewModel(apiHours, DAYS_OF_WEEK))
    }
  }, [apiHours])

  // ─── Mutators ──────────────────────────────────────────────────────────────

  const toggleDay = useCallback((dayOfWeek: number, isOpen: boolean) => {
    setLocalHours((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, isOpen } : d))
    )
  }, [])

  const updateRange = useCallback(
    (dayOfWeek: number, rangeIndex: number, field: keyof TimeRange, value: string) => {
      setLocalHours((prev) =>
        prev.map((d) => {
          if (d.dayOfWeek !== dayOfWeek) return d
          const newRanges = d.ranges.map((r, i) =>
            i === rangeIndex ? { ...r, [field]: value } : r
          )
          return { ...d, ranges: newRanges }
        })
      )
    },
    []
  )

  const addRange = useCallback((dayOfWeek: number) => {
    setLocalHours((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d
        return { ...d, ranges: [...d.ranges, { openTime: "08:00", closeTime: "18:00" }] }
      })
    )
  }, [])

  const removeRange = useCallback((dayOfWeek: number, rangeIndex: number) => {
    setLocalHours((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d
        if (d.ranges.length <= 1) return d
        return { ...d, ranges: d.ranges.filter((_, i) => i !== rangeIndex) }
      })
    )
  }, [])

  // ─── Save ──────────────────────────────────────────────────────────────────

  const saveDay = useCallback(
    async (dayOfWeek: number) => {
      const day = localHours.find((d) => d.dayOfWeek === dayOfWeek)
      if (!day) return

      // Validate: each open range must have closeTime > openTime
      if (day.isOpen) {
        for (let i = 0; i < day.ranges.length; i++) {
          const r = day.ranges[i]
          if (r.closeTime <= r.openTime) {
            const dayMeta = DAYS_OF_WEEK.find((d) => d.day === dayOfWeek)!
            toast.error(
              `${dayMeta.label}: o horário de fechamento deve ser após o de abertura (intervalo ${i + 1}).`
            )
            return
          }
        }
      }

      setSavingDay(dayOfWeek)
      try {
        const payload = {
          days: [
            {
              dayOfWeek: day.dayOfWeek,
              isOpen: day.isOpen,
              ranges: day.ranges.map((r) => ({
                openTime: r.openTime,
                closeTime: r.closeTime,
              })),
            },
          ],
        }

        const result = await secureApiCall(API_CONFIG.ENDPOINTS.BUSINESS_HOURS, {
          method: "PUT",
          body: JSON.stringify(payload),
        })

        if (!result.hasError) {
          toast.success("Horário salvo com sucesso!")
          mutate()
        } else {
          toast.error(result.message || "Erro ao salvar horário.")
        }
      } catch {
        toast.error("Erro ao conectar ao servidor.")
      } finally {
        setSavingDay(null)
      }
    },
    [localHours, mutate]
  )

  // ─── Reset to default ──────────────────────────────────────────────────────

  const resetToDefault = useCallback(async () => {
    setResetting(true)
    setLocalHours(DEFAULT_SCHEDULE.map((d) => ({ ...d, ranges: d.ranges.map((r) => ({ ...r })) })))
    try {
      const payload = {
        days: DEFAULT_SCHEDULE.map((d) => ({
          dayOfWeek: d.dayOfWeek,
          isOpen: d.isOpen,
          ranges: d.ranges.map((r) => ({ openTime: r.openTime, closeTime: r.closeTime })),
        })),
      }
      const result = await secureApiCall(API_CONFIG.ENDPOINTS.BUSINESS_HOURS, {
        method: "PUT",
        body: JSON.stringify(payload),
      })
      if (!result.hasError) {
        toast.success("Horários restaurados para o padrão!")
        mutate()
      } else {
        toast.error(result.message || "Erro ao restaurar horários.")
      }
    } catch {
      toast.error("Erro ao conectar ao servidor.")
    } finally {
      setResetting(false)
    }
  }, [mutate])

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/settings">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Horários de Funcionamento
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configure os dias e horários em que seu estabelecimento está aberto.
            </p>
          </div>
        </div>

        {localHours.length > 0 && !isScheduleDefault(localHours) && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 mt-1 gap-1.5 text-muted-foreground hover:text-foreground"
                disabled={resetting || savingDay !== null}
              >
                {resetting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                Restaurar padrão
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-muted-foreground" />
                  Restaurar horários padrão?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Isso vai sobrescrever todos os horários com a configuração padrão:
                  <br /><br />
                  <span className="font-medium text-foreground">Dom:</span> Fechado<br />
                  <span className="font-medium text-foreground">Seg–Sáb:</span> 08:00–11:30 e 13:30–18:30
                  <br /><br />
                  Essa ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={resetToDefault}>
                  Restaurar padrão
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">
          Defina os horários em que seu estabelecimento está aberto. Você pode adicionar
          múltiplos intervalos por dia.
        </p>
      </div>

      {/* Day cards */}
      {isLoading || localHours.length === 0 ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <DayCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {localHours.map((day) => {
            const dayMeta = DAYS_OF_WEEK.find((d) => d.day === day.dayOfWeek)!
            const isSaving = savingDay === day.dayOfWeek

            return (
              <Card key={day.dayOfWeek} className="relative overflow-hidden">
                {/* Saving overlay */}
                {isSaving && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-background/70 backdrop-blur-[1px]">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}

                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base font-semibold">
                        {dayMeta.label}
                      </CardTitle>
                      <Badge
                        variant={day.isOpen ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {day.isOpen ? "Aberto" : "Fechado"}
                      </Badge>
                    </div>
                    <Switch
                      checked={day.isOpen}
                      onCheckedChange={(val) => toggleDay(day.dayOfWeek, val)}
                      disabled={isSaving}
                      aria-label={`Alternar ${dayMeta.label}`}
                    />
                  </div>
                </CardHeader>

                {day.isOpen && (
                  <>
                    <Separator />
                    <CardContent className="pt-4 flex flex-col gap-3">
                      {/* Range rows */}
                      {day.ranges.map((range, rangeIndex) => (
                        <div
                          key={rangeIndex}
                          className="flex flex-wrap items-end gap-3"
                        >
                          {/* Open time */}
                          <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Início
                            </span>
                            <Select
                              value={range.openTime}
                              onValueChange={(val) =>
                                updateRange(day.dayOfWeek, rangeIndex, "openTime", val)
                              }
                              disabled={isSaving}
                            >
                              <SelectTrigger className="w-28 h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                {TIME_OPTIONS.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <span className="pb-2 text-sm text-muted-foreground">até</span>

                          {/* Close time */}
                          <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Fim
                            </span>
                            <Select
                              value={range.closeTime}
                              onValueChange={(val) =>
                                updateRange(day.dayOfWeek, rangeIndex, "closeTime", val)
                              }
                              disabled={isSaving}
                            >
                              <SelectTrigger
                                className={`w-28 h-9 ${
                                  range.closeTime <= range.openTime
                                    ? "border-destructive focus:ring-destructive"
                                    : ""
                                }`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                {TIME_OPTIONS.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Validation hint */}
                          {range.closeTime <= range.openTime && (
                            <span className="pb-2 text-xs text-destructive">
                              Fechamento deve ser após abertura
                            </span>
                          )}

                          {/* Delete range button — invisible when only 1 range to preserve layout */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={`h-9 w-9 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 ${
                              day.ranges.length <= 1 ? "invisible" : ""
                            }`}
                            onClick={() => removeRange(day.dayOfWeek, rangeIndex)}
                            disabled={day.ranges.length <= 1 || isSaving}
                            aria-label="Remover intervalo"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}

                      {/* Add range + Save */}
                      <div className="flex items-center justify-between pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-primary hover:bg-primary/10 h-8 px-2 gap-1.5"
                          onClick={() => addRange(day.dayOfWeek)}
                          disabled={isSaving}
                        >
                          <Plus className="h-4 w-4" />
                          Adicionar horário
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          className="h-8 min-w-20"
                          onClick={() => saveDay(day.dayOfWeek)}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <Save className="h-3.5 w-3.5 mr-1.5" />
                              Salvar
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </>
                )}

                {/* When closed: show save button to persist the toggle */}
                {!day.isOpen && (
                  <CardContent className="pt-0 pb-4">
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 min-w-20"
                        onClick={() => saveDay(day.dayOfWeek)}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Save className="h-3.5 w-3.5 mr-1.5" />
                            Salvar
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function BusinessHoursPage() {
  return (
    <AuthGuard requiredRoles={["SalonOwner", "Owner"]}>
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <BusinessHoursContent />
      </div>
    </AuthGuard>
  )
}

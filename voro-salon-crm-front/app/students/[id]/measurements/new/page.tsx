"use client"

import type React from "react"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Loader2, Save, Ruler, Activity, Calendar } from "lucide-react"
import Link from "next/link"
import { useMeasurements } from "@/hooks/use-measurements.hook"
import { AuthGuard } from "@/components/auth/auth.guard"
import type { MeasurementDto } from "@/types/DTOs/measurement.interface"
import { DatePicker } from "@/components/ui/custom/date-picker"

export default function NewMeasurementPage() {
  const params = useParams()
  const router = useRouter()
  const studentId = params.id as string
  const { createMeasurement, loading, error } = useMeasurements()

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    weight: "",
    bodyFat: "",
    muscleMass: "",
    waist: "",
    chest: "",
    arm: "",
    thigh: "",
    notes: "",
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const measurementData: MeasurementDto = {
      studentId,
      date: new Date(formData.date),
      weight: formData.weight ? Number(formData.weight) : undefined,
      bodyFat: formData.bodyFat ? Number(formData.bodyFat) : undefined,
      muscleMass: formData.muscleMass ? Number(formData.muscleMass) : undefined,
      waist: formData.waist ? Number(formData.waist) : undefined,
      chest: formData.chest ? Number(formData.chest) : undefined,
      arm: formData.arm ? Number(formData.arm) : undefined,
      thigh: formData.thigh ? Number(formData.thigh) : undefined,
      notes: formData.notes || undefined,
      createdAt: new Date(),
    }

    const result = await createMeasurement(studentId, measurementData)
    if (result) {
      router.push(`/students/${studentId}?tab=measurements`)
    }
  }

  return (
    <AuthGuard requiredRoles={["Trainer"]}>
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
          <div className="space-y-4">
            <Button variant="ghost" size="sm" asChild className="group">
              <Link href={`/students/${studentId}`}>
                <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                Voltar para aluno
              </Link>
            </Button>

            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <Activity className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-balance">Nova Medição</h1>
                <p className="text-muted-foreground">Registre as medidas corporais do aluno</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-destructive animate-in fade-in">
              <p className="font-medium">{error}</p>
            </div>
          )}

          <Card className="border-border/50 shadow-lg">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl">Dados da Medição</CardTitle>
              <CardDescription>Preencha as medidas corporais do aluno</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Date Section */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Data da Medição *
                    </Label>
                    <DatePicker
                      id="date"
                      value={formData.date}
                      onChange={(value) => setFormData({ ...formData, date: value })}
                      placeholder="dd/mm/aaaa"
                      className="h-12"
                    />
                  </div>
                </div>

                {/* Body Composition Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Activity className="h-4 w-4" />
                    <span>Composição Corporal</span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="weight" className="text-base">
                        Peso (kg)
                      </Label>
                      <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        placeholder="82.5"
                        className="h-12 text-base"
                        value={formData.weight}
                        onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bodyFat" className="text-base">
                        Gordura Corporal (%)
                      </Label>
                      <Input
                        id="bodyFat"
                        type="number"
                        step="0.1"
                        placeholder="15.5"
                        className="h-12 text-base"
                        value={formData.bodyFat}
                        onChange={(e) => setFormData({ ...formData, bodyFat: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="muscleMass" className="text-base">
                        Massa Muscular (kg)
                      </Label>
                      <Input
                        id="muscleMass"
                        type="number"
                        step="0.1"
                        placeholder="45.2"
                        className="h-12 text-base"
                        value={formData.muscleMass}
                        onChange={(e) => setFormData({ ...formData, muscleMass: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Circumference Measurements Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Ruler className="h-4 w-4" />
                    <span>Medidas de Circunferência (cm)</span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor="waist" className="text-base">
                        Cintura
                      </Label>
                      <Input
                        id="waist"
                        type="number"
                        step="0.1"
                        placeholder="82"
                        className="h-12 text-base"
                        value={formData.waist}
                        onChange={(e) => setFormData({ ...formData, waist: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="chest" className="text-base">
                        Peitoral
                      </Label>
                      <Input
                        id="chest"
                        type="number"
                        step="0.1"
                        placeholder="95"
                        className="h-12 text-base"
                        value={formData.chest}
                        onChange={(e) => setFormData({ ...formData, chest: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="arm" className="text-base">
                        Braço
                      </Label>
                      <Input
                        id="arm"
                        type="number"
                        step="0.1"
                        placeholder="35"
                        className="h-12 text-base"
                        value={formData.arm}
                        onChange={(e) => setFormData({ ...formData, arm: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="thigh" className="text-base">
                        Coxa
                      </Label>
                      <Input
                        id="thigh"
                        type="number"
                        step="0.1"
                        placeholder="58"
                        className="h-12 text-base"
                        value={formData.thigh}
                        onChange={(e) => setFormData({ ...formData, thigh: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-base">
                      Observações
                    </Label>
                    <Textarea
                      id="notes"
                      placeholder="Observações sobre a medição, condições físicas do aluno no dia..."
                      rows={4}
                      className="resize-none text-base"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-6 border-t">
                  <Button type="button" variant="outline" size="lg" asChild>
                    <Link href={`/students/${studentId}`}>Cancelar</Link>
                  </Button>
                  <Button type="submit" size="lg" disabled={loading} className="min-w-[180px]">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-5 w-5" />
                        Salvar Medição
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  )
}

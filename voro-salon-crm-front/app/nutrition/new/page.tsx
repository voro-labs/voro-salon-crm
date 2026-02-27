"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Loader2, UtensilsCrossed, User, FileText } from "lucide-react"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useStudents } from "@/hooks/use-students.hook"
import { useMealPlans } from "@/hooks/use-meal-plans.hook"
import { MealPlanStatusEnum } from "@/types/Enums/mealPlanStatusEnum.enum"
import { MealPeriodEnum } from "@/types/Enums/mealPeriodEnum.enum"
import { AuthGuard } from "@/components/auth/auth.guard"
import { NutritionWeekBlock } from "@/components/nutrition-week-block"
import type { MealPlanDayDto } from "@/types/DTOs/meal-plan-day.interface"
import { MealPlanDto } from "@/types/DTOs/meal-plan.interface"
import { MealPlanMealDto } from "@/types/DTOs/meal-plan-meal.interface"

const periodToEnum: Record<string, MealPeriodEnum> = {
  Desconhecido: MealPeriodEnum.Unspecified,
  "Café da Manhã": MealPeriodEnum.Breakfast,
  "Lanche da Manhã": MealPeriodEnum.MorningSnack,
  Almoço: MealPeriodEnum.Lunch,
  "Lanche da Tarde": MealPeriodEnum.AfternoonSnack,
  Jantar: MealPeriodEnum.Dinner,
  Ceia: MealPeriodEnum.Supper,
}

export default function NewMealPlanPage() {
  const router = useRouter()
  const { students } = useStudents()
  const { createMealPlan, loading, error } = useMealPlans()
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [days, setDays] = useState<MealPlanDayDto[]>([])

  const tempMeal: MealPlanDto = {
    id: null,
    studentId: selectedStudentId || "",
    status: MealPlanStatusEnum.Active,
    days: days,
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedStudentId) return

    const daysWithEnums = days.map((day) => ({
      ...day,
      meals: day.meals?.map((meal: MealPlanMealDto, index) => ({
        id: meal.id,
        mealPlanDayId: meal.mealPlanDayId,
        period: periodToEnum[meal.period] || MealPeriodEnum.Breakfast,
        time: meal.time,
        description: meal.description,
        quantity: meal.quantity,
        notes: meal.notes,
        order: index,
      })),
    }))

    const result = await createMealPlan({
      studentId: selectedStudentId,
      status: MealPlanStatusEnum.Active,
      days: daysWithEnums,
    })

    if (result) {
      router.push("/nutrition")
    }
  }

  return (
    <AuthGuard requiredRoles={["Trainer"]}>
      <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
        <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
          <div className="space-y-4">
            <Button variant="ghost" size="sm" asChild className="group">
              <Link href="/nutrition">
                <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                Voltar para planos
              </Link>
            </Button>

            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <UtensilsCrossed className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-balance">Novo Plano Alimentar</h1>
                <p className="text-muted-foreground">Crie um plano alimentar com dias da semana personalizados</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-destructive animate-in fade-in slide-in-from-top-2">
              <p className="font-medium">{error}</p>
            </div>
          )}

          <Card className="border-border/50 shadow-lg">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl">Informações do Plano</CardTitle>
              <CardDescription>Selecione o aluno e monte o plano alimentar</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <FileText className="h-4 w-4" />
                    <span>Informações Básicas</span>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="student" className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Selecionar Aluno *
                    </Label>
                    <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder="Escolha um aluno" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((student) => (
                          <SelectItem key={student.userExtensionId} value={student.userExtensionId!}>
                            {student.userExtension?.user?.firstName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Days Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <UtensilsCrossed className="h-4 w-4" />
                    <span>Plano Alimentar Semanal</span>
                  </div>

                  <NutritionWeekBlock meal={tempMeal} days={days} onChange={setDays} />
                </div>

                <div className="flex flex-col-reverse gap-3 pt-6 border-t sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" size="lg" asChild className="w-full sm:w-auto bg-transparent">
                    <Link href="/nutrition">Cancelar</Link>
                  </Button>
                  <Button type="submit" size="lg" disabled={loading || !selectedStudentId} className="w-full sm:w-auto sm:min-w-[180px]">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <UtensilsCrossed className="mr-2 h-5 w-5" />
                        Salvar Plano
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

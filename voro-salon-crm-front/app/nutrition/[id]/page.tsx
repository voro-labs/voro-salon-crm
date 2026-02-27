"use client"

import { useEffect, useState } from "react"
import { redirect, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Clock, Edit, User, Loader2, Calendar } from "lucide-react"
import Link from "next/link"
import { useMealPlans } from "@/hooks/use-meal-plans.hook"
import { DayOfWeekEnum } from "@/types/Enums/dayOfWeekEnum.enum"
import { MealPlanStatusEnum } from "@/types/Enums/mealPlanStatusEnum.enum"
import { MealPeriodEnum } from "@/types/Enums/mealPeriodEnum.enum"
import { AuthGuard } from "@/components/auth/auth.guard"
import { MealPlanDto } from "@/types/DTOs/meal-plan.interface"
import { Loading } from "@/components/ui/custom/loading/loading"

const daysOfWeek = [
  { key: DayOfWeekEnum.Monday, label: "Segunda" },
  { key: DayOfWeekEnum.Tuesday, label: "Terça" },
  { key: DayOfWeekEnum.Wednesday, label: "Quarta" },
  { key: DayOfWeekEnum.Thursday, label: "Quinta" },
  { key: DayOfWeekEnum.Friday, label: "Sexta" },
  { key: DayOfWeekEnum.Saturday, label: "Sábado" },
  { key: DayOfWeekEnum.Sunday, label: "Domingo" },
]

const periodLabels: Record<MealPeriodEnum, string> = {
  [MealPeriodEnum.Unspecified]: "Desconhecido",
  [MealPeriodEnum.Breakfast]: "Café da Manhã",
  [MealPeriodEnum.MorningSnack]: "Lanche da Manhã",
  [MealPeriodEnum.Lunch]: "Almoço",
  [MealPeriodEnum.AfternoonSnack]: "Lanche da Tarde",
  [MealPeriodEnum.Dinner]: "Jantar",
  [MealPeriodEnum.Supper]: "Ceia",
}

export default function MealPlanDetailPage() {
  const params = useParams()
  const { fetchMealPlanById, loading, error } = useMealPlans()
  const [mealPlan, setMealPlan] = useState<MealPlanDto | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchMealPlanById(params.id as string).then((data) => {
        if (data) setMealPlan(data)
      })
    }
  }, [params.id, fetchMealPlanById])

  const getMealsForDay = (dayOfWeek: DayOfWeekEnum) => {
    if (!mealPlan?.days) return []
    const day = mealPlan.days.find((d) => d.dayOfWeek === dayOfWeek)
    return day?.meals?.sort((a, b) => a.order - b.order) || []
  }

  const formatDate = (date?: Date) => {
    if (!date) return "-"
    return new Date(date).toLocaleDateString("pt-BR")
  }

  if (error) {
    return (
      <div className="flex h-screen">
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 p-6">
            <Button variant="ghost" asChild className="mb-4">
              <Link href="/nutrition">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para planos
              </Link>
            </Button>
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
              {error || "Plano alimentar não encontrado"}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AuthGuard requiredRoles={["Trainer"]}>
      <Loading isLoading={loading}></Loading>
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="mb-6">
            <Button variant="ghost" asChild className="mb-4">
              <Link href="/nutrition">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para planos
              </Link>
            </Button>
          </div>

          {/* Header */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold">Plano Alimentar</h1>
                    <Badge
                      className={
                        mealPlan?.status === MealPlanStatusEnum.Active
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {mealPlan?.status === MealPlanStatusEnum.Active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>

                  {mealPlan?.student && (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={mealPlan?.student.userExtension?.user?.avatarUrl || "/placeholder.svg"}
                          alt={`${mealPlan?.student.userExtension?.user?.firstName}`}
                        />
                        <AvatarFallback>
                          {`${mealPlan?.student.userExtension?.user?.firstName}`
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{`${mealPlan?.student.userExtension?.user?.firstName}`}</p>
                        <p className="text-sm text-muted-foreground">
                          {mealPlan?.days?.length || 0} {mealPlan?.days?.length === 1 ? "dia" : "dias"} de
                          alimentação
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Criado em {formatDate(mealPlan?.createdAt)}
                    </div>
                    {mealPlan?.updatedAt && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Atualizado {formatDate(mealPlan?.updatedAt)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {mealPlan?.student && (
                    <Button asChild variant="outline">
                      <Link href={`/students/${mealPlan?.studentId}`}>
                        <User className="mr-2 h-4 w-4" />
                        Ver Aluno
                      </Link>
                    </Button>
                  )}
                  <Button asChild>
                    <Link href={`/nutrition/${mealPlan?.id}/edit`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Days Tabs */}
          <Tabs defaultValue={String(DayOfWeekEnum.Monday)} className="space-y-6">
            <TabsList className="flex-wrap h-auto">
              {daysOfWeek.map((day) => (
                <TabsTrigger key={day.key} value={String(day.key)}>
                  {day.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {daysOfWeek.map((day) => {
              const meals = getMealsForDay(day.key)
              return (
                <TabsContent key={day.key} value={String(day.key)} className="space-y-4">
                  {meals.length > 0 ? (
                    meals.map((meal) => (
                      <Card key={meal.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="space-y-1">
                              <CardTitle className="text-base flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                {periodLabels[meal.period]} {meal.time && `- ${meal.time}`}
                              </CardTitle>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="rounded-lg border p-3">
                            <p className="text-sm font-medium text-muted-foreground mb-2">Alimentos</p>
                            <p className="leading-relaxed">{meal.description}</p>
                          </div>

                          {meal.quantity && (
                            <div className="rounded-lg bg-muted/50 p-3">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Quantidade</p>
                              <p className="text-sm">{meal.quantity}</p>
                            </div>
                          )}

                          {meal.notes && (
                            <div className="rounded-lg bg-muted/50 p-3">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Observações</p>
                              <p className="text-sm">{meal.notes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <p className="text-muted-foreground">Nenhum plano alimentar para {day.label.toLowerCase()}</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              )
            })}
          </Tabs>
        </div>
      </div>
    </AuthGuard>
  )
}

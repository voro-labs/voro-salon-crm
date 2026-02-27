"use client"

import { useEffect, useState } from "react"
import { redirect, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ArrowLeft, Edit, User, Dumbbell, Calendar } from "lucide-react"
import Link from "next/link"
import { useWorkoutPlans } from "@/hooks/use-workout-plans.hook"
import { AuthGuard } from "@/components/auth/auth.guard"
import type { WorkoutPlanDto } from "@/types/DTOs/workout-plan.interface"
import { WorkoutStatusEnum } from "@/types/Enums/workoutStatusEnum.enum"
import { DayOfWeekEnum } from "@/types/Enums/dayOfWeekEnum.enum"
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

export default function WorkoutDetailPage() {
  const params = useParams()
  const { fetchWorkoutPlanById, loading, error } = useWorkoutPlans()
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlanDto | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchWorkoutPlanById(params.id as string).then((data) => {
        if (data) setWorkoutPlan(data)
      })
    }
  }, [params.id, fetchWorkoutPlanById])

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
              <Link href="/workouts">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para treinos
              </Link>
            </Button>
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
              {error || "Plano de treino não encontrado"}
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
              <Link href="/workouts">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para treinos
              </Link>
            </Button>
          </div>

          {/* Header */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold text-balance">Plano de Treino</h1>
                    <Badge
                      className={
                        workoutPlan?.status === WorkoutStatusEnum.Active
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {workoutPlan?.status === WorkoutStatusEnum.Active
                        ? "Ativo"
                        : workoutPlan?.status === WorkoutStatusEnum.Finished
                          ? "Concluído"
                          : "Inativo"}
                    </Badge>
                  </div>

                  {workoutPlan?.student && workoutPlan?.student.userExtension?.user && (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={workoutPlan?.student.userExtension?.user?.avatarUrl || "/placeholder.svg"}
                          alt={`${workoutPlan?.student.userExtension?.user?.firstName}`}
                        />
                        <AvatarFallback>
                          {`${workoutPlan?.student.userExtension?.user?.firstName}`
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{`${workoutPlan?.student.userExtension?.user?.firstName}`}</p>
                        <p className="text-sm text-muted-foreground">
                          {workoutPlan?.weeks?.length || 0} {workoutPlan?.weeks?.length === 1 ? "semana" : "semanas"} de
                          treino
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Criado em {formatDate(workoutPlan?.createdAt)}
                    </div>
                    {workoutPlan?.updatedAt && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Atualizado {formatDate(workoutPlan?.updatedAt)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {workoutPlan?.student && (
                    <Button asChild variant="outline">
                      <Link href={`/students/${workoutPlan?.studentId}`}>
                        <User className="mr-2 h-4 w-4" />
                        Ver Aluno
                      </Link>
                    </Button>
                  )}
                  <Button asChild>
                    <Link href={`/workouts/${workoutPlan?.id}/edit`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {workoutPlan?.weeks && workoutPlan.weeks.length > 0 ? (
            <Accordion type="single" collapsible defaultValue="week-0" className="space-y-4">
              {workoutPlan.weeks
                .sort((a, b) => (a.weekNumber ?? 0) - (b.weekNumber ?? 0))
                .map((week, weekIndex) => (
                  <AccordionItem key={week.id} value={`week-${weekIndex}`} className="border rounded-lg bg-card">
                    <AccordionTrigger className="px-6 hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-bold">
                          {week.weekNumber}
                        </div>
                        <div className="text-left">
                          <p className="font-semibold">Semana {week.weekNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {week.days?.length || 0} {week.days?.length === 1 ? "dia" : "dias"} de treino
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                      {week.days && week.days.length > 0 ? (
                        <Tabs defaultValue={String(week.days[0].dayOfWeek)} className="space-y-4">
                          <TabsList className="flex flex-wrap h-auto gap-1 w-full justify-start">
                            {week.days
                              .sort((a, b) => (a.dayOfWeek ?? 0) - (b.dayOfWeek ?? 0))
                              .map((day) => {
                                const dayLabel = daysOfWeek.find((d) => d.key === day.dayOfWeek)?.label || "Dia"
                                return (
                                  <TabsTrigger key={day.id} value={String(day.dayOfWeek)} className="text-xs sm:text-sm px-2 sm:px-3">
                                    {dayLabel}
                                  </TabsTrigger>
                                )
                              })}
                          </TabsList>

                          {week.days.map((day) => {
                            const dayLabel = daysOfWeek.find((d) => d.key === day.dayOfWeek)?.label || "Dia"
                            return (
                              <TabsContent key={day.id} value={String(day.dayOfWeek)} className="space-y-4">
                                {day.exercises && day.exercises.length > 0 ? (
                                  day.exercises
                                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                                    .map((exercise, index) => (
                                      <Card key={exercise.id}>
                                        <CardHeader className="pb-3">
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="space-y-1">
                                              <CardTitle className="text-base flex items-center gap-2">
                                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-bold">
                                                  {index + 1}
                                                </span>
                                                {exercise.exercise?.name || "Exercício"}
                                              </CardTitle>
                                              {exercise.exercise?.muscleGroup && (
                                                <Badge variant="secondary">{exercise.exercise.muscleGroup}</Badge>
                                              )}
                                            </div>
                                          </div>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                                            <div className="rounded-lg border p-2 sm:p-3">
                                              <p className="text-xs text-muted-foreground mb-0.5 sm:mb-1">Séries</p>
                                              <p className="text-base sm:text-lg font-bold">{exercise.sets}</p>
                                            </div>
                                            <div className="rounded-lg border p-2 sm:p-3">
                                              <p className="text-xs text-muted-foreground mb-0.5 sm:mb-1">Reps</p>
                                              <p className="text-base sm:text-lg font-bold">{exercise.reps}</p>
                                            </div>
                                            <div className="rounded-lg border p-2 sm:p-3">
                                              <p className="text-xs text-muted-foreground mb-0.5 sm:mb-1">Peso</p>
                                              <p className="text-base sm:text-lg font-bold">
                                                {exercise.weight ? `${exercise.weight}kg` : "-"}
                                              </p>
                                            </div>
                                            <div className="rounded-lg border p-2 sm:p-3">
                                              <p className="text-xs text-muted-foreground mb-0.5 sm:mb-1">Descanso</p>
                                              <p className="text-base sm:text-lg font-bold">
                                                {exercise.restInSeconds ? `${exercise.restInSeconds}s` : "-"}
                                              </p>
                                            </div>
                                          </div>

                                          {exercise.notes && (
                                            <div className="rounded-lg bg-muted/50 p-3">
                                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                                Observações
                                              </p>
                                              <p className="text-sm leading-relaxed">{exercise.notes}</p>
                                            </div>
                                          )}

                                          {exercise.alternative && (
                                            <div className="rounded-lg bg-muted/50 p-3">
                                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                                Alternativa
                                              </p>
                                              <p className="text-sm">{exercise.alternative}</p>
                                            </div>
                                          )}
                                        </CardContent>
                                      </Card>
                                    ))
                                ) : (
                                  <Card className="border-dashed">
                                    <CardContent className="flex flex-col items-center justify-center py-12">
                                      <p className="text-muted-foreground">
                                        Nenhum exercício para {dayLabel.toLowerCase()}
                                      </p>
                                    </CardContent>
                                  </Card>
                                )}
                              </TabsContent>
                            )
                          })}
                        </Tabs>
                      ) : (
                        <Card className="border-dashed">
                          <CardContent className="flex flex-col items-center justify-center py-12">
                            <p className="text-muted-foreground">Nenhum dia configurado para esta semana</p>
                          </CardContent>
                        </Card>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
            </Accordion>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Dumbbell className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma semana adicionada a este plano</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}

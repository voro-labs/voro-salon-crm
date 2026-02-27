"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Dumbbell, Plus, Eye, Loader2 } from "lucide-react"
import Link from "next/link"
import { useWorkoutPlans } from "@/hooks/use-workout-plans.hook"
import { AuthGuard } from "@/components/auth/auth.guard"
import { WorkoutStatusEnum } from "@/types/Enums/workoutStatusEnum.enum"
import { WorkoutPlanWeekDto } from "@/types/DTOs/workout-plan-week.interface"

export default function WorkoutsPage() {
  const { workoutPlans, loading, error } = useWorkoutPlans()

  const getWeeksCount = (weeks?: WorkoutPlanWeekDto[]) => {
    return weeks?.length ?? 0
  }

  const getDaysCount = (weeks?: { days?: unknown[] }[]) => {
    if (!weeks || weeks.length === 0) return 0
    const firstWeek = weeks[0]
    return firstWeek.days?.length || 0
  }

  const formatDate = (date?: Date) => {
    if (!date) return "-"
    const now = new Date()
    const d = new Date(date)
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Hoje"
    if (diffDays === 1) return "Ontem"
    if (diffDays < 7) return `${diffDays} dias atrás`
    return d.toLocaleDateString("pt-BR")
  }

  return (
    <AuthGuard requiredRoles={["Trainer"]}>
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-balance">Planos de Treino</h1>
              <p className="text-muted-foreground">Gerencie os treinos dos seus alunos</p>
            </div>
            <Button asChild>
              <Link href="/workouts/new">
                <Plus className="mr-2 h-4 w-4" />
                Novo Plano
              </Link>
            </Button>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : workoutPlans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">Nenhum plano de treino cadastrado</p>
              <Button asChild>
                <Link href="/workouts/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Criar primeiro plano
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {workoutPlans.map((plan) => (
                <Card key={plan.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Dumbbell className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">Plano de Treino</CardTitle>
                        <Badge
                          className={
                            plan.status === WorkoutStatusEnum.Active
                              ? "bg-accent text-accent-foreground mt-1"
                              : "bg-muted text-muted-foreground mt-1"
                          }
                        >
                          {plan.status === WorkoutStatusEnum.Active
                            ? "Ativo"
                            : plan.status === WorkoutStatusEnum.Finished
                              ? "Concluído"
                              : "Inativo"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {plan.student && (
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={plan.student.userExtension?.user?.avatarUrl || "/placeholder.svg"}
                            alt={`${plan.student.userExtension?.user?.firstName}`}
                          />
                          <AvatarFallback>
                            {`${plan.student.userExtension?.user?.firstName}`
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{`${plan.student.userExtension?.user?.firstName}`}</p>
                          <p className="text-xs text-muted-foreground">
                            {getWeeksCount(plan.weeks)} {getWeeksCount(plan.weeks) === 1 ? "semana" : "semanas"} •{" "}
                            {getDaysCount(plan.weeks)} dias
                          </p>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Atualizado {formatDate(plan.updatedAt || plan.createdAt)}
                    </p>

                    <Button asChild variant="outline" size="sm" className="w-full bg-transparent">
                      <Link href={`/workouts/${plan.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Plano
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}

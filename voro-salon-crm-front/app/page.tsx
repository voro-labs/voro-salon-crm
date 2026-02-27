"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Users, Dumbbell, TrendingUp, Calendar, AlertCircle, ArrowRight } from "lucide-react"
import { AuthGuard } from "@/components/auth/auth.guard"
import { useDashboard } from "@/hooks/use-dashboard.hook"
import { Loader2 } from "lucide-react"
import { AlertTypeEnum } from "@/types/Enums/alertTypeEnum.enum"

export default function DashboardPage() {
  const { dashboardData, loading, error } = useDashboard()

  const formatDate = (date?: Date) => {
    if (!date) return "-"
    return new Date(date).toLocaleDateString("pt-BR")
  }

  if (loading && !dashboardData) {
    return (
      <AuthGuard requiredRoles={["Trainer"]}>
        <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando dashboard...</p>
          </div>
        </div>
      </AuthGuard>
    )
  }

  if (error) {
    return (
      <AuthGuard requiredRoles={["Trainer"]}>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-balance">Dashboard</h1>
            <p className="text-destructive mt-2">{error}</p>
          </div>
        </div>
      </AuthGuard>
    )
  }

  if (!dashboardData) {
    return (
      <AuthGuard requiredRoles={["Trainer"]}>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-balance">Dashboard</h1>
            <p className="text-muted-foreground">Nenhum dado disponível</p>
          </div>
        </div>
      </AuthGuard>
    )
  }

  const stats = [
    {
      title: "Total de Alunos",
      value: dashboardData.stats.totalStudents.toString(),
      change: `${dashboardData.stats.studentsChangeThisMonth > 0 ? "+" : ""}${dashboardData.stats.studentsChangeThisMonth} este mês`,
      icon: Users,
      color: "text-primary",
    },
    {
      title: "Treinos Ativos",
      value: dashboardData.stats.activeWorkouts.toString(),
      change: `${dashboardData.stats.pendingWorkouts} pendentes`,
      icon: Dumbbell,
      color: "text-accent",
    },
    {
      title: "Taxa de Adesão",
      value: `${dashboardData.stats.adherenceRate}%`,
      change: `${dashboardData.stats.adherenceChange > 0 ? "+" : ""}${dashboardData.stats.adherenceChange}% vs. mês anterior`,
      icon: TrendingUp,
      color: "text-chart-2",
    },
  ]

  return (
    <AuthGuard requiredRoles={["Trainer"]}>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-balance">Dashboard</h1>
          <p className="text-muted-foreground">Bem-vindo de volta! Aqui está um resumo da sua semana.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-3 mb-6">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming Workouts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Próximos Treinos
              </CardTitle>
              <Button variant="ghost" size="sm">
                Ver todos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.upcomingWorkouts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum treino agendado</p>
                ) : (
                  dashboardData.upcomingWorkouts.map((workout) => (
                    <div key={workout.id} className="flex items-center gap-4 rounded-lg border p-4">
                      <Avatar>
                        <AvatarImage src={workout.studentAvatar || "/placeholder.svg"} alt={workout.studentName} />
                        <AvatarFallback>
                          {workout.studentName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{workout.studentName}</p>
                        <p className="text-sm text-muted-foreground">{workout.workoutType}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{workout.time}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(workout.date)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Alerts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Alertas Recentes
              </CardTitle>
              <Button variant="ghost" size="sm">
                Ver todos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.recentAlerts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum alerta recente</p>
                ) : (
                  dashboardData.recentAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-start gap-3 rounded-lg border p-4">
                      <div
                        className={`mt-0.5 h-2 w-2 rounded-full ${
                          alert.type === AlertTypeEnum.Warning
                            ? "bg-destructive"
                            : alert.type === AlertTypeEnum.Success
                              ? "bg-accent"
                              : "bg-primary"
                        }`}
                      />
                      <div className="flex-1">
                        <p className="text-sm">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Student Progress */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Progresso dos Alunos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {dashboardData.studentProgress.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum progresso registrado</p>
                ) : (
                  dashboardData.studentProgress.map((student) => (
                    <div key={student.studentId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={student.studentAvatar || "/placeholder.svg"} alt={student.studentName} />
                            <AvatarFallback>
                              {student.studentName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{student.studentName}</p>
                            <p className="text-xs text-muted-foreground">{student.goal}</p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold">{student.progress}%</span>
                      </div>
                      <Progress value={student.progress} />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  )
}

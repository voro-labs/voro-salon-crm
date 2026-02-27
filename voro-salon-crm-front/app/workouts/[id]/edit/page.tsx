"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Loader2, Dumbbell, User, FileText, Save, Plus } from "lucide-react"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useStudents } from "@/hooks/use-students.hook"
import { useWorkoutPlans } from "@/hooks/use-workout-plans.hook"
import { AuthGuard } from "@/components/auth/auth.guard"
import { WorkoutStatusEnum } from "@/types/Enums/workoutStatusEnum.enum"
import { Loading } from "@/components/ui/custom/loading/loading"
import { WorkoutWeekBlock } from "@/components/workout-week-block"
import type { WorkoutPlanWeekDto } from "@/types/DTOs/workout-plan-week.interface"

export default function EditWorkoutPage() {
  const params = useParams()
  const router = useRouter()
  const { students } = useStudents()
  const { fetchWorkoutPlanById, updateWorkoutPlan, loading, error } = useWorkoutPlans()
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [weeks, setWeeks] = useState<WorkoutPlanWeekDto[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (params.id) {
      fetchWorkoutPlanById(params.id as string).then((data) => {
        if (data) {
          setSelectedStudentId(data.studentId || "")
          setWeeks(data.weeks || [])
        }
        setLoadingData(false)
      })
    }
  }, [params.id, fetchWorkoutPlanById])

  const addWeek = () => {
    const newWeek: WorkoutPlanWeekDto = {
      id: null,
      weekNumber: weeks.length + 1,
      days: [],
    }
    setWeeks([...weeks, newWeek])
  }

  const removeWeek = (weekIndex: number) => {
    setWeeks(weeks.filter((_, i) => i !== weekIndex).map((w, i) => ({ ...w, weekNumber: i + 1 })))
  }

  const updateWeek = (weekIndex: number, updatedWeek: WorkoutPlanWeekDto) => {
    const updated = [...weeks]
    updated[weekIndex] = updatedWeek
    setWeeks(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedStudentId) return

    const result = await updateWorkoutPlan(params.id as string, {
      studentId: selectedStudentId,
      status: WorkoutStatusEnum.Active,
      weeks: weeks,
    })

    if (result) {
      router.push(`/workouts/${params.id}`)
    }
  }

  if (loadingData) {
    return <Loading isLoading={true} />
  }

  return (
    <AuthGuard requiredRoles={["Trainer"]}>
      <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 overflow-x-hidden">
        <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6 w-full">
          <div className="space-y-4">
            <Button variant="ghost" size="sm" asChild className="group">
              <Link href={`/workouts/${params.id}`}>
                <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                Voltar para detalhes
              </Link>
            </Button>

            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <Dumbbell className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-balance">Editar Plano de Treino</h1>
                <p className="text-sm sm:text-base text-muted-foreground">Atualize o plano de treino do aluno</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-destructive animate-in fade-in slide-in-from-top-2">
              <p className="font-medium">{error}</p>
            </div>
          )}

          <Card className="border-border/50 shadow-lg">
            <CardHeader className="space-y-1 pb-4 sm:pb-6 p-4 sm:p-6">
              <CardTitle className="text-xl sm:text-2xl">Informações do Plano</CardTitle>
              <CardDescription className="text-sm">Edite o aluno e as semanas do plano de treino</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
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

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <Dumbbell className="h-4 w-4" />
                      <span>Semanas de Treino</span>
                    </div>
                    <Button type="button" size="sm" onClick={addWeek} variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Semana
                    </Button>
                  </div>

                  {weeks.length === 0 ? (
                    <Card className="border-2 border-dashed border-border/50 bg-muted/20">
                      <CardContent className="flex flex-col items-center justify-center py-16">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                          <Dumbbell className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-base font-medium mb-1">Nenhuma semana adicionada ainda</p>
                        <p className="text-sm text-muted-foreground mb-4">Clique em "Adicionar Semana" para começar</p>
                        <Button type="button" size="sm" onClick={addWeek} variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Primeira Semana
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-6">
                      {weeks.map((week, weekIndex) => (
                        <WorkoutWeekBlock
                          key={week.id || weekIndex}
                          week={week}
                          weekIndex={weekIndex}
                          onRemove={() => removeWeek(weekIndex)}
                          onChange={(days) => updateWeek(weekIndex, { ...week, days })}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 justify-end pt-6 border-t">
                  <Button type="button" variant="outline" size="lg" asChild>
                    <Link href={`/workouts/${params.id}`}>Cancelar</Link>
                  </Button>
                  <Button type="submit" size="lg" disabled={loading || !selectedStudentId} className="min-w-[180px]">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-5 w-5" />
                        Salvar Alterações
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

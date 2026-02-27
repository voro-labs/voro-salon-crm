"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ExerciseCard } from "@/components/exercise-card"
import { Plus, Search, Loader2 } from "lucide-react"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useExercises } from "@/hooks/use-exercises.hook"
import { AuthGuard } from "@/components/auth/auth.guard"
import { ExerciseTypeEnum } from "@/types/Enums/exerciseTypeEnum.enum"

export default function ExercisesPage() {
  const { exercises, loading, error } = useExercises()
  const [search, setSearch] = useState("")
  const [muscleGroupFilter, setMuscleGroupFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  const muscleGroups = useMemo(() => {
    const groups = new Set(exercises.map((e) => e.muscleGroup))
    return Array.from(groups).sort()
  }, [exercises])

  const filteredExercises = useMemo(() => {
    return exercises.filter((exercise) => {
      const matchesSearch = !search.trim() || exercise.name?.toLowerCase().includes(search.toLowerCase())
      const matchesMuscleGroup =
        muscleGroupFilter === "all" || exercise.muscleGroup?.toLowerCase() === muscleGroupFilter.toLowerCase()
      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "public" && exercise.type === ExerciseTypeEnum.Public) ||
        (typeFilter === "custom" && exercise.type === ExerciseTypeEnum.Custom)
      return matchesSearch && matchesMuscleGroup && matchesType
    })
  }, [exercises, search, muscleGroupFilter, typeFilter])

  return (
    <AuthGuard requiredRoles={["Trainer"]}>
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-balance">Biblioteca de Exercícios</h1>
              <p className="text-muted-foreground">Gerencie exercícios públicos e personalizados</p>
            </div>
            <Button asChild>
              <Link href="/exercises/new">
                <Plus className="mr-2 h-4 w-4" />
                Novo Exercício
              </Link>
            </Button>
          </div>

          <div className="mb-6 flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar exercícios..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={muscleGroupFilter} onValueChange={setMuscleGroupFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Grupo muscular" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os grupos</SelectItem>
                {muscleGroups.map((group) => (
                  <SelectItem key={group} value={`${group}`.toLowerCase()}>
                    {group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="public">Públicos</SelectItem>
                <SelectItem value="custom">Personalizados</SelectItem>
              </SelectContent>
            </Select>
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
          ) : filteredExercises.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">
                {search || muscleGroupFilter !== "all" || typeFilter !== "all"
                  ? "Nenhum exercício encontrado para estes filtros"
                  : "Nenhum exercício cadastrado"}
              </p>
              {!search && muscleGroupFilter === "all" && typeFilter === "all" && (
                <Button asChild>
                  <Link href="/exercises/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Cadastrar primeiro exercício
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredExercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  id={`${exercise.id}`}
                  name={`${exercise.name}`}
                  muscleGroup={`${exercise.muscleGroup}`}
                  type={exercise.type === ExerciseTypeEnum.Public ? "public" : "custom"}
                  thumbnail={exercise.thumbnail}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}

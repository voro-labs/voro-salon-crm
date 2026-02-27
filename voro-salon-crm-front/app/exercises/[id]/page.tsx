"use client"

import { useEffect, useState } from "react"
import { redirect, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, Globe, User, ImageIcon, Video } from "lucide-react"
import Link from "next/link"
import { useExercises } from "@/hooks/use-exercises.hook"
import { AuthGuard } from "@/components/auth/auth.guard"
import type { ExerciseDto } from "@/types/DTOs/exercise.interface"
import { ExerciseTypeEnum } from "@/types/Enums/exerciseTypeEnum.enum"
import { Loading } from "@/components/ui/custom/loading/loading"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FadeImage } from "@/components/fade-image"

export default function ExerciseDetailPage() {
  const params = useParams()
  const { fetchExerciseById, loading, error } = useExercises()
  const [exercise, setExercise] = useState<ExerciseDto | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchExerciseById(params.id as string).then((data) => {
        if (data) setExercise(data)
      })
    }
  }, [params.id, fetchExerciseById])

  const getMediaType = (url?: string, base64?: string): "video" | "image" | null => {
    const source = url || base64
    if (!source) return null

    if (source.includes(".mp4") || source.includes("video") || source.startsWith("data:video")) {
      return "video"
    }
    return "image"
  }

  const hasThumbnail = exercise?.thumbnail
  const hasMedia = exercise?.mediaUrl || exercise?.media
  const mediaType = getMediaType(exercise?.mediaUrl, exercise?.media)

  if (error) {
    return (
      <div className="flex h-screen">
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 p-6">
            <Button variant="ghost" asChild className="mb-4">
              <Link href="/exercises">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para biblioteca
              </Link>
            </Button>
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
              {error || "Exercício não encontrado"}
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
              <Link href="/exercises">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para biblioteca
              </Link>
            </Button>
          </div>

          <div className="max-w-4xl space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl font-bold text-balance">{exercise?.name}</h1>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {exercise?.type === ExerciseTypeEnum.Public ? (
                      <>
                        <Globe className="h-3 w-3" />
                        Exercício Público
                      </>
                    ) : (
                      <>
                        <User className="h-3 w-3" />
                        Exercício Personalizado
                      </>
                    )}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  Grupo muscular: <span className="font-medium text-foreground">{exercise?.muscleGroup}</span>
                </p>
              </div>

              {exercise?.type === ExerciseTypeEnum.Custom && (
                <Button asChild>
                  <Link href={`/exercises/${exercise?.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Link>
                </Button>
              )}
            </div>

            {(hasThumbnail || hasMedia) && (
              <Card className="overflow-hidden">
                {hasThumbnail && hasMedia ? (
                  // Both thumbnail and media available - show tabs
                  <Tabs defaultValue="media" className="w-full">
                    <CardHeader className="pb-3">
                      <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="media" className="flex items-center gap-2">
                          {mediaType === "video" ? (
                            <>
                              <Video className="h-4 w-4" />
                              Demonstração
                            </>
                          ) : (
                            <>
                              <ImageIcon className="h-4 w-4" />
                              Demonstração
                            </>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="thumbnail" className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          Thumbnail
                        </TabsTrigger>
                      </TabsList>
                    </CardHeader>
                    <TabsContent value="media" className="mt-0">
                      <div className="aspect-video bg-muted">
                        {mediaType === "video" ? (
                          <video
                            src={exercise?.mediaUrl || exercise?.media}
                            controls

                          />
                        ) : (
                          <FadeImage
                            src={exercise?.mediaUrl || exercise?.media || "/placeholder.svg"}
                            alt={`${exercise?.name} - Demonstração`}

                          />
                        )}
                      </div>
                    </TabsContent>
                    <TabsContent value="thumbnail" className="mt-0">
                      <div className="aspect-video bg-muted">
                        <FadeImage
                          src={exercise?.thumbnail || exercise?.thumbnail || "/placeholder.svg"}
                          alt={`${exercise?.name} - Thumbnail`}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                ) : hasMedia ? (
                  // Only media available
                  <div className="aspect-video bg-muted">
                    {mediaType === "video" ? (
                      <video
                        src={exercise?.mediaUrl || exercise?.media}
                        controls
                      />
                    ) : (
                      <FadeImage
                        src={exercise?.mediaUrl || exercise?.media || "/placeholder.svg"}
                        alt={exercise?.name}
                      />
                    )}
                  </div>
                ) : (
                  // Only thumbnail available
                  <div className="aspect-video bg-muted">
                    <FadeImage
                      src={exercise?.thumbnail || exercise?.thumbnail || "/placeholder.svg"}
                      alt={exercise?.name}
                    />
                  </div>
                )}
              </Card>
            )}

            {/* Description */}
            {exercise?.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Descrição</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed">{exercise?.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Technical Notes */}
            {exercise?.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Observações Técnicas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed">{exercise?.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Alternatives */}
            {exercise?.alternatives && (
              <Card>
                <CardHeader>
                  <CardTitle>Alternativas de Execução</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {exercise?.alternatives.split("\n").map((alt, i) => (
                      <p key={i} className="leading-relaxed">
                        {alt}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}

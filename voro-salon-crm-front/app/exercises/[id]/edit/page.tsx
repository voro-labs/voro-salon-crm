"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Video, Loader2, Dumbbell, FileText, Lightbulb, Save, ImageIcon, Link2 } from "lucide-react"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useExercises } from "@/hooks/use-exercises.hook"
import { AuthGuard } from "@/components/auth/auth.guard"
import { Loading } from "@/components/ui/custom/loading/loading"
import { ExerciseTypeEnum } from "@/types/Enums/exerciseTypeEnum.enum"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ExerciseDto } from "@/types/DTOs/exercise.interface"
import { useAuth } from "@/contexts/auth.context"

export default function EditExercisePage() {
  const params = useParams()
  const router = useRouter()
  const { user: trainer } = useAuth()
  const { fetchExerciseById, updateExercise, loading, error } = useExercises()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [notes, setNotes] = useState("")
  const [alternatives, setAlternatives] = useState("")
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("")
  const [thumbnailBase64, setThumbnailBase64] = useState<string>("")
  const [mediaUrl, setMediaUrl] = useState<string>("")
  const [mediaPreview, setMediaPreview] = useState<string>("")
  const [mediaBase64, setMediaBase64] = useState<string>("")
  const [activeMediaTab, setActiveMediaTab] = useState<string>("url")

  const [muscleGroup, setMuscleGroup] = useState("")
  const [exerciseType, setExerciseType] = useState<string>(ExerciseTypeEnum.Custom.toString())
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (params.id) {
      fetchExerciseById(params.id as string).then((data) => {
        if (data) {
          setName(data.name || "")
          setDescription(data.description || "")
          setNotes(data.notes || "")
          setAlternatives(data.alternatives || "")
          setMuscleGroup(data.muscleGroup || "")
          setExerciseType(data.type?.toString() || ExerciseTypeEnum.Custom.toString())

          if (data.thumbnail) {
            setThumbnailPreview(data.thumbnail)
            setThumbnailBase64(data.thumbnail)
          }

          if (data.mediaUrl) {
            setMediaUrl(data.mediaUrl)
            setMediaPreview(data.mediaUrl)
            setActiveMediaTab("url")
          } else if (data.media) {
            setMediaBase64(data.media)
            setMediaPreview(data.media)
            setActiveMediaTab("upload")
          }
        }
        setLoadingData(false)
      })
    }
  }, [params.id, fetchExerciseById])

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.match(/image\/(jpg|jpeg|png)/)) {
        alert("Por favor, selecione apenas imagens JPG ou PNG para thumbnail")
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setThumbnailBase64(base64String)
        setThumbnailPreview(base64String)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleMediaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = ["image/gif", "image/jpeg", "image/jpg", "image/png", "video/mp4"]
      if (!validTypes.includes(file.type)) {
        alert("Por favor, selecione apenas GIF, JPG, PNG ou MP4")
        return
      }

      setMediaUrl("")
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setMediaBase64(base64String)
        setMediaPreview(base64String)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleMediaUrlChange = (url: string) => {
    setMediaBase64("")
    setMediaUrl(url)
    // Basic URL validation and preview
    if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
      setMediaPreview(url)
    } else {
      setMediaPreview("")
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const exerciseData: ExerciseDto = {
      name,
      description,
      muscleGroup,
      type: Number.parseInt(exerciseType) as ExerciseTypeEnum,
      notes,
      alternatives,
      thumbnail: thumbnailBase64 || undefined,
      mediaUrl: mediaUrl || undefined,
      media: mediaBase64 || undefined,
      trainerId: `${trainer?.userId}`
    }

    const result = await updateExercise(params.id as string, exerciseData)
    if (result) {
      router.push(`/exercises/${params.id}`)
    }
  }

  if (loadingData) {
    return <Loading isLoading={true} />
  }

  return (
    <AuthGuard requiredRoles={["Trainer"]}>
      <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
          <div className="space-y-4">
            <Button variant="ghost" size="sm" asChild className="group">
              <Link href={`/exercises/${params.id}`}>
                <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                Voltar para detalhes
              </Link>
            </Button>

            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <Dumbbell className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-balance">Editar Exercício</h1>
                <p className="text-muted-foreground">Atualize as informações do exercício</p>
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
              <CardTitle className="text-2xl">Informações do Exercício</CardTitle>
              <CardDescription>Edite os detalhes do exercício</CardDescription>
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
                    <Label htmlFor="name" className="text-base">
                      Nome do Exercício *
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Ex: Supino Inclinado com Halteres"
                      required
                      className="h-12 text-base"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-base">
                      Tipo do Exercício *
                    </Label>
                    <Select value={exerciseType} onValueChange={setExerciseType} required>
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder="Selecione o tipo do exercício" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ExerciseTypeEnum.Public.toString()}>Público</SelectItem>
                        <SelectItem value={ExerciseTypeEnum.Custom.toString()}>Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Exercícios públicos são visíveis para todos os treinadores, enquanto personalizados são privados
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="muscle" className="text-base">
                      Grupo Muscular *
                    </Label>
                    <Select value={muscleGroup} onValueChange={setMuscleGroup} required>
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder="Selecione o grupo muscular" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Peito">Peito</SelectItem>
                        <SelectItem value="Costas">Costas</SelectItem>
                        <SelectItem value="Pernas">Pernas</SelectItem>
                        <SelectItem value="Ombros">Ombros</SelectItem>
                        <SelectItem value="Bíceps">Bíceps</SelectItem>
                        <SelectItem value="Tríceps">Tríceps</SelectItem>
                        <SelectItem value="Abdômen">Abdômen</SelectItem>
                        <SelectItem value="Glúteos">Glúteos</SelectItem>
                        <SelectItem value="Panturrilha">Panturrilha</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-base">
                      Descrição *
                    </Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Descreva como executar o exercício..."
                      rows={4}
                      required
                      className="resize-none text-base"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <ImageIcon className="h-4 w-4" />
                    <span>Thumbnail (Imagem de Capa)</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Imagem de capa do exercício (JPG ou PNG) - máximo 1 arquivo
                  </div>

                  {thumbnailPreview && (
                    <div className="rounded-xl border-2 border-border overflow-hidden shadow-md animate-in fade-in zoom-in-95">
                      <img
                        src={thumbnailPreview || "/placeholder.svg"}
                        alt="Thumbnail Preview"
                        className="w-full aspect-video object-cover"
                      />
                    </div>
                  )}

                  <Label htmlFor="thumbnail" className="cursor-pointer block">
                    <div className="flex items-center gap-4 rounded-xl border-2 border-dashed border-border p-6 hover:border-primary hover:bg-primary/5 transition-all duration-200">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                        <ImageIcon className="h-7 w-7 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Clique para alterar thumbnail</p>
                        <p className="text-sm text-muted-foreground mt-0.5">JPG ou PNG até 10MB</p>
                      </div>
                    </div>
                  </Label>
                  <Input
                    id="thumbnail"
                    type="file"
                    accept="image/jpg,image/jpeg,image/png"
                    className="hidden"
                    onChange={handleThumbnailChange}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Video className="h-4 w-4" />
                    <span>Mídia de Demonstração</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Escolha entre link externo ou upload de arquivo - máximo 1 mídia por exercício
                  </div>

                  <Tabs value={activeMediaTab} onValueChange={setActiveMediaTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="url" className="gap-2">
                        <Link2 className="h-4 w-4" />
                        Link
                      </TabsTrigger>
                      <TabsTrigger value="upload" className="gap-2">
                        <Video className="h-4 w-4" />
                        Upload
                      </TabsTrigger>
                    </TabsList>

                    {/* Media URL Tab */}
                    <TabsContent value="url" className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        Adicione um link para um arquivo de mídia (GIF, JPG, PNG ou MP4)
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="mediaUrl" className="text-base">
                          URL da Mídia
                        </Label>
                        <Input
                          id="mediaUrl"
                          type="url"
                          placeholder="https://exemplo.com/video.mp4"
                          className="h-12 text-base"
                          value={mediaUrl}
                          onChange={(e) => handleMediaUrlChange(e.target.value)}
                        />
                      </div>

                      {mediaPreview && mediaUrl && (
                        <div className="rounded-xl border-2 border-border overflow-hidden shadow-md animate-in fade-in zoom-in-95">
                          {mediaUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                            <img
                              src={mediaPreview || "/placeholder.svg"}
                              alt="Media Preview"
                              className="w-full aspect-video object-cover"
                            />
                          ) : mediaUrl.match(/\.(mp4|mov)$/i) ? (
                            <video src={mediaPreview} controls className="w-full aspect-video bg-muted" />
                          ) : (
                            <div className="w-full aspect-video bg-muted flex items-center justify-center">
                              <p className="text-muted-foreground">Preview não disponível</p>
                            </div>
                          )}
                        </div>
                      )}
                    </TabsContent>

                    {/* Media Upload Tab */}
                    <TabsContent value="upload" className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        Faça upload de um arquivo de mídia (GIF, JPG, PNG ou MP4) que será convertido para base64
                      </div>

                      {mediaPreview && mediaBase64 && (
                        <div className="rounded-xl border-2 border-border overflow-hidden shadow-md animate-in fade-in zoom-in-95">
                          {mediaBase64.startsWith("data:image") ? (
                            <img
                              src={mediaPreview || "/placeholder.svg"}
                              alt="Media Preview"
                              className="w-full aspect-video object-cover"
                            />
                          ) : (
                            <video src={mediaPreview} controls className="w-full aspect-video bg-muted" />
                          )}
                        </div>
                      )}

                      <Label htmlFor="media" className="cursor-pointer block">
                        <div className="flex items-center gap-4 rounded-xl border-2 border-dashed border-border p-6 hover:border-primary hover:bg-primary/5 transition-all duration-200">
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                            <Video className="h-7 w-7 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">Clique para alterar mídia</p>
                            <p className="text-sm text-muted-foreground mt-0.5">GIF, JPG, PNG ou MP4 até 50MB</p>
                          </div>
                        </div>
                      </Label>
                      <Input
                        id="media"
                        type="file"
                        accept="image/gif,image/jpg,image/jpeg,image/png,video/mp4"
                        className="hidden"
                        onChange={handleMediaFileChange}
                      />
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Additional Information Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Lightbulb className="h-4 w-4" />
                    <span>Informações Adicionais</span>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-base">
                      Observações Técnicas
                    </Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      placeholder="Dicas de execução, cuidados, postura..."
                      rows={3}
                      className="resize-none text-base"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="alternatives" className="text-base">
                      Alternativas de Execução
                    </Label>
                    <Textarea
                      id="alternatives"
                      name="alternatives"
                      placeholder="Variações do exercício, alternativas com outros equipamentos..."
                      rows={3}
                      className="resize-none text-base"
                      value={alternatives}
                      onChange={(e) => setAlternatives(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-6 border-t">
                  <Button type="button" variant="outline" size="lg" asChild>
                    <Link href={`/exercises/${params.id}`}>Cancelar</Link>
                  </Button>
                  <Button type="submit" size="lg" disabled={loading || !muscleGroup} className="min-w-[180px]">
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

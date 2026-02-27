"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
  Upload,
  User,
  Loader2,
  UserPlus,
  Phone,
  Mail,
  Calendar,
  Ruler,
  Weight,
  Target,
  FileText,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useStudents } from "@/hooks/use-students.hook"
import { useInstances } from "@/hooks/use-instance.hook"
import { AuthGuard } from "@/components/auth/auth.guard"
import { DatePicker } from "@/components/ui/custom/date-picker"
import { PhoneInput } from "@/components/ui/custom/phone-input"
import { StudentStatusEnum } from "@/types/Enums/studentStatusEnum.enum"
import { useAuth } from "@/contexts/auth.context"
import type { StudentDto } from "@/types/DTOs/student.interface"
import { Alert, AlertDescription } from "@/components/ui/alert"

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}

export default function NewStudentPage() {
  const router = useRouter()
  const { user: Trainer } = useAuth()
  const { createStudent, loading, error } = useStudents()
  const { instances } = useInstances()
  const [avatarPreview, setAvatarPreview] = useState<string>("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    countryCode: "+55",
    birthDate: "",
    height: "",
    weight: "",
    goal: "",
    notes: "",
  })

  const hasInstances = instances.length > 0

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    let avatarBase64: string | undefined
    if (avatarFile) {
      avatarBase64 = await fileToBase64(avatarFile)
    }

    const studentData: StudentDto = {
      userExtension: {
        user: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          countryCode: formData.countryCode,
          birthDate: formData.birthDate ? new Date(formData.birthDate) : undefined,
          avatarUrl: avatarBase64,
        },
      },
      trainerId: `${Trainer?.userId}`,
      height: formData.height ? Number(formData.height) : undefined,
      weight: formData.weight ? Number(formData.weight) : undefined,
      goal: formData.goal || undefined,
      notes: formData.notes || undefined,
      status: StudentStatusEnum.Active,
    }

    const result = await createStudent(studentData)
    if (result) {
      router.push("/students")
    }
  }

  return (
    <AuthGuard requiredRoles={["Trainer"]}>
      <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 overflow-x-hidden">
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 w-full">
          <div className="space-y-4">
            <Button variant="ghost" size="sm" asChild className="group">
              <Link href="/students">
                <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                Voltar para alunos
              </Link>
            </Button>

            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <UserPlus className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-balance">Novo Aluno</h1>
                <p className="text-sm sm:text-base text-muted-foreground">Preencha as informações do novo aluno</p>
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
              <CardTitle className="text-2xl">Informações Pessoais</CardTitle>
              <CardDescription>Cadastre os dados básicos do aluno</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Avatar Section */}
                <div className="flex flex-col items-center gap-4 p-4 sm:p-6 rounded-xl bg-muted/50 border border-border/50 sm:flex-row sm:gap-6">
                  <Avatar className="h-20 w-20 sm:h-28 sm:w-28 ring-4 ring-background shadow-lg shrink-0">
                    <AvatarImage src={avatarPreview || "/placeholder.svg"} alt="Avatar" />
                    <AvatarFallback className="bg-primary/10">
                      <User className="h-10 w-10 sm:h-14 sm:w-14 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 w-full min-w-0">
                    <Label htmlFor="avatar" className="cursor-pointer block">
                      <div className="flex items-center gap-3 rounded-xl border-2 border-dashed border-border p-4 sm:p-5 hover:border-primary hover:bg-primary/5 transition-all duration-200">
                        <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                          <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm sm:text-base">Clique para fazer upload da foto</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">PNG, JPG até 5MB</p>
                        </div>
                      </div>
                    </Label>
                    <Input id="avatar" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </div>
                </div>

                {/* Basic Information Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <User className="h-4 w-4" />
                    <span>Dados Pessoais</span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-base flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Nome *
                      </Label>
                      <Input
                        id="firstName"
                        placeholder="Ex: Carlos"
                        required
                        className="h-12 text-base"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-base flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Sobrenome *
                      </Label>
                      <Input
                        id="lastName"
                        placeholder="Ex: Silva"
                        required
                        className="h-12 text-base"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-base flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@exemplo.com"
                        className="h-12 text-base"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-base flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Telefone
                        {!hasInstances && (
                          <span className="text-xs text-muted-foreground font-normal">(requer instância)</span>
                        )}
                      </Label>
                      {hasInstances ? (
                        <PhoneInput
                          id="phone"
                          value={formData.phoneNumber}
                          autoComplete="tel"
                          onChange={(value) => setFormData({ ...formData, phoneNumber: value })}
                          countryCode="BR"
                          placeholder="(11) 9999-9999"
                          className="h-12"
                        />
                      ) : (
                        <div className="relative">
                          <Input id="phone" placeholder="(11) 9999-9999" className="h-12 text-base" disabled />
                          <Alert className="mt-2 border-amber-500/50 bg-amber-500/10">
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                            <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
                              Para cadastrar telefone, é necessário ter uma{" "}
                              <Link href="/instances" className="font-medium underline underline-offset-2">
                                instância cadastrada
                              </Link>
                              .
                            </AlertDescription>
                          </Alert>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Physical Data Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Ruler className="h-4 w-4" />
                    <span>Dados Físicos</span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="birthDate" className="text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Data de Nascimento
                      </Label>
                      <DatePicker
                        id="birthDate"
                        value={formData.birthDate}
                        onChange={(value) => setFormData({ ...formData, birthDate: value })}
                        placeholder="dd/mm/aaaa"
                        className="h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="height" className="text-base flex items-center gap-2">
                        <Ruler className="h-4 w-4" />
                        Altura (cm)
                      </Label>
                      <Input
                        id="height"
                        type="number"
                        placeholder="178"
                        className="h-12 text-base"
                        value={formData.height}
                        onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="weight" className="text-base flex items-center gap-2">
                        <Weight className="h-4 w-4" />
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
                  </div>
                </div>

                {/* Goals and Notes Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Target className="h-4 w-4" />
                    <span>Objetivos e Observações</span>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="goal" className="text-base flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Objetivo
                    </Label>
                    <Input
                      id="goal"
                      placeholder="Ex: Hipertrofia, Emagrecimento, Força"
                      className="h-12 text-base"
                      value={formData.goal}
                      onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Observações
                    </Label>
                    <Textarea
                      id="notes"
                      placeholder="Informações adicionais sobre o aluno, histórico médico, restrições..."
                      rows={4}
                      className="resize-none text-base"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 pt-6 border-t sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" size="lg" asChild className="w-full sm:w-auto bg-transparent">
                    <Link href="/students">Cancelar</Link>
                  </Button>
                  <Button type="submit" size="lg" disabled={loading} className="w-full sm:w-auto sm:min-w-[180px]">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Cadastrando...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-5 w-5" />
                        Cadastrar Aluno
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

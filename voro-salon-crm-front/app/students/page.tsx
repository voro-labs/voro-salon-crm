"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StudentCard } from "@/components/student-card"
import { Plus, Search, Loader2 } from "lucide-react"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useStudents } from "@/hooks/use-students.hook"
import { AuthGuard } from "@/components/auth/auth.guard"
import { StudentStatusEnum } from "@/types/Enums/studentStatusEnum.enum"
import { useSearchParams } from "next/navigation"

export default function StudentsPage() {
  const { students, loading, error } = useStudents()
  const [search, setSearch] = useState("")
  const searchParams = useSearchParams()

  const statusConfig = {
    [StudentStatusEnum.Unspecified]: { label: "Não definido", color: "bg-muted text-muted-foreground", },
    [StudentStatusEnum.Active]: { label: "Ativo", color: "bg-accent text-accent-foreground" },
    [StudentStatusEnum.Inactive]: { label: "Inativo", color: "bg-muted text-muted-foreground" },
    [StudentStatusEnum.Pending]: { label: "Pendente", color: "bg-destructive/10 text-destructive" },
  }

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students
    const searchLower = search.toLowerCase()
    return students.filter(
      (student) =>
        student.userExtension?.user?.firstName?.toLowerCase().includes(searchLower) ||
        student.goal?.toLowerCase().includes(searchLower) ||
        student.userExtension?.user?.email?.toLowerCase().includes(searchLower),
    )
  }, [students, search])

  const calculateAge = (birthDate?: Date) => {
    if (!birthDate) return null
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  return (
    <AuthGuard requiredRoles={["Trainer"]}>
      <div className="min-h-screen bg-background p-4 md:p-8 overflow-x-hidden">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="mb-6 flex flex-col gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-balance">Alunos</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Gerencie todos os seus alunos em um só lugar</p>
            </div>
            <Button asChild className="w-full sm:w-auto sm:self-end">
              <Link href="/students/new">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Aluno
              </Link>
            </Button>
          </div>

          <div className="mb-6">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por nome, email, objetivo..."
                className="pl-10 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
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
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">
                {search ? "Nenhum aluno encontrado para esta busca" : "Você ainda não tem alunos cadastrados"}
              </p>
              {!search && (
                <Button asChild>
                  <Link href="/students/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Cadastrar primeiro aluno
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Card View - Mobile */}
              <div className="space-y-3 lg:hidden mb-6">
                {filteredStudents.map((student) => (
                  <StudentCard
                    key={`${student.userExtensionId}`}
                    id={`${student.userExtensionId}`}
                    name={student.userExtension?.user?.firstName || ""}
                    age={calculateAge(student.userExtension?.user?.birthDate)}
                    height={student.height}
                    weight={student.weight}
                    status={
                      student.status === StudentStatusEnum.Active
                        ? "active"
                        : student.status === StudentStatusEnum.Inactive
                          ? "inactive"
                          : "pending"
                    }
                    avatar={student.userExtension?.user?.avatarUrl}
                    goal={student.goal}
                  />
                ))}
              </div>

              {/* Table View - Desktop */}
              <div className="hidden lg:block border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Idade</TableHead>
                      <TableHead>Altura</TableHead>
                      <TableHead>Peso</TableHead>
                      <TableHead>Objetivo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.userExtensionId}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={student.userExtension?.user?.avatarUrl || "/placeholder.svg"} alt={`${student.userExtension?.user?.firstName}`} />
                              <AvatarFallback>
                                {`${student.userExtension?.user?.firstName}`
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{`${student.userExtension?.user?.firstName}`}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {calculateAge(student.userExtension?.user?.birthDate) ? `${calculateAge(student.userExtension?.user?.birthDate)} anos` : "-"}
                        </TableCell>
                        <TableCell>{student.height ? `${student.height} cm` : "-"}</TableCell>
                        <TableCell>{student.weight ? `${student.weight} kg` : "-"}</TableCell>
                        <TableCell>{student.goal || "-"}</TableCell>
                        <TableCell>
                          <Badge className={statusConfig[student.status ?? StudentStatusEnum.Pending].color}>
                            {statusConfig[student.status ?? StudentStatusEnum.Pending].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/students/${student.userExtensionId}`}>Ver detalhes</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}

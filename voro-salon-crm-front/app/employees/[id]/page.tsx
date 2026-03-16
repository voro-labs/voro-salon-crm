"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Save, Trash2, Camera, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { AuthGuard } from "@/components/auth/auth.guard"
import { useEmployeeDetail } from "@/hooks/use-employee-detail.hook"

// Inline helper to show employee photos proxied through blob proxy
function AuthenticatedImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  if (!src) {
    return <div className={`${className} flex items-center justify-center bg-muted/30`} />
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} />
}

export default function EmployeeDetailPage() {
  const params = useParams()
  const id = params.id as string

  const {
    services,
    form,
    setForm,
    isLoading,
    isSaving,
    isDeleting,
    isUploadingPhoto,
    isNew,
    toggleSpecialty,
    handlePhotoUpload,
    saveEmployee,
    deleteEmployee,
  } = useEmployeeDetail(id)

  if (!isNew && isLoading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin" /></div>
  }

  return (
    <AuthGuard requiredRoles={["User"]}>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/employees">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {isNew ? "Novo Funcionário" : "Editar Funcionário"}
            </h1>
          </div>
          {!isNew && (
            <Button variant="destructive" size="sm" onClick={deleteEmployee} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">Excluir</span>
            </Button>
          )}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); saveEmployee(form) }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Dados Principais</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    placeholder="Nome do funcionário"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="hireDate">Data de Contratação</Label>
                    <Input
                      id="hireDate"
                      type="date"
                      value={form.hireDate}
                      onChange={(e) => setForm((p) => ({ ...p, hireDate: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-8">
                    <Checkbox
                      id="isActive"
                      checked={form.isActive}
                      onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: !!v }))}
                    />
                    <Label htmlFor="isActive" className="cursor-pointer">Funcionário Ativo</Label>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Foto do Funcionário</Label>
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-primary/20 bg-muted">
                      <AuthenticatedImage src={form.photoUrl} alt="Foto" className="h-full w-full object-cover" />
                      {isUploadingPhoto && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <Loader2 className="h-5 w-5 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1 h-9"
                          onClick={() => document.getElementById("photo-upload")?.click()}
                          disabled={isUploadingPhoto}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {form.photoUrl ? "Alterar Foto" : "Enviar Foto"}
                        </Button>
                        {form.photoUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 px-0 text-destructive border-destructive/20 hover:bg-destructive/5"
                            onClick={() => setForm((p) => ({ ...p, photoUrl: "" }))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">JPG, PNG ou GIF. Máximo de 5MB.</p>
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Especialidades</CardTitle>
                <p className="text-sm text-muted-foreground">Selecione quais serviços este funcionário realiza</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {services?.map((service: any) => (
                    <div key={service.id} className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted/30 transition-colors">
                      <Checkbox
                        id={`svc-${service.id}`}
                        checked={form.specialtyIds.includes(service.id)}
                        onCheckedChange={() => toggleSpecialty(service.id)}
                      />
                      <Label htmlFor={`svc-${service.id}`} className="flex-1 cursor-pointer text-sm truncate">
                        {service.name}
                      </Label>
                    </div>
                  ))}
                  {services?.length === 0 && <p className="text-sm text-muted-foreground italic">Nenhum serviço cadastrado.</p>}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar Funcionário
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/employees">Cancelar</Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 py-8">
                <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-primary/20">
                  {form.photoUrl ? (
                    <AuthenticatedImage src={form.photoUrl} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-12 w-12 text-muted-foreground/30" />
                  )}
                </div>
                <div className="text-center">
                  <h4 className="font-bold text-lg">{form.name || "Nome do Funcionário"}</h4>
                  <p className="text-xs text-muted-foreground">{form.isActive ? "Ativo" : "Inativo"}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-1 mt-2">
                  {form.specialtyIds.slice(0, 5).map((sid: string) => (
                    <Badge key={sid} variant="secondary" className="text-[10px]">
                      {services?.find((s: any) => s.id === sid)?.name}
                    </Badge>
                  ))}
                  {form.specialtyIds.length > 5 && (
                    <Badge variant="secondary" className="text-[10px]">+{form.specialtyIds.length - 5}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </AuthGuard>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { CurrencyInput } from "@/components/currency-input"
import { toast } from "sonner"
import useSWR, { mutate } from "swr"

import { API_CONFIG, secureApiCall } from "@/lib/api"
import { AuthGuard } from "@/components/auth/auth.guard"

const fetcher = async (url: string) => {
    const result = await secureApiCall<any>(url, { method: "GET" })
    if (result.hasError) throw new Error(result.message || "Error")
    return result.data
}

export default function EditarServicoPage() {
    const params = useParams()
    const router = useRouter()
    const serviceId = params.id as string

    const { data: service, isLoading } = useSWR(
        serviceId ? `${API_CONFIG.ENDPOINTS.SERVICES}/${serviceId}` : null,
        fetcher
    )

    const [loading, setLoading] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [form, setForm] = useState({
        name: "",
        description: "",
        price: 0,
    })

    useEffect(() => {
        if (service) {
            setForm({
                name: service.name,
                description: service.description || "",
                price: service.price || 0,
            })
        }
    }, [service])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!form.name.trim()) {
            toast.error("O nome do serviço é obrigatório.")
            return
        }
        setLoading(true)
        try {
            const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.SERVICES}/${serviceId}`, {
                method: "PUT",
                body: JSON.stringify(form),
            })
            if (res.hasError) {
                toast.error(res.message || "Erro ao atualizar serviço.")
                return
            }
            toast.success("Serviço atualizado com sucesso!")
            mutate(`${API_CONFIG.ENDPOINTS.SERVICES}/${serviceId}`)
            router.push("/services")
        } catch {
            toast.error("Erro de conexão. Tente novamente.")
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete() {
        setDeleting(true)
        try {
            const res = await secureApiCall(`${API_CONFIG.ENDPOINTS.SERVICES}/${serviceId}`, {
                method: "DELETE",
            })
            if (res.hasError) {
                toast.error(res.message || "Erro ao excluir serviço.")
                return
            }
            toast.success("Serviço excluído com sucesso!")
            router.push("/services")
        } catch {
            toast.error("Erro de conexão.")
        } finally {
            setDeleting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6 p-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/services">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="h-8 w-40 animate-pulse rounded bg-muted" />
                </div>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex flex-col gap-4">
                            <div className="h-4 w-full animate-pulse rounded bg-muted" />
                            <div className="h-4 w-full animate-pulse rounded bg-muted" />
                            <div className="h-20 w-full animate-pulse rounded bg-muted" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <AuthGuard requiredRoles={["User"]}>
            <div className="flex flex-col gap-6 p-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/services">
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground truncate max-w-[200px] sm:max-w-md">
                            Editar: {service?.name}
                        </h1>
                    </div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="border-destructive/40 text-destructive hover:bg-destructive hover:text-white">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">Excluir</span>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Excluir serviço do catálogo?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Isso não afetará os registros de serviços já realizados para os clientes, mas
                                    o serviço não estará mais disponível para novas seleções.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="bg-red-600 text-white hover:bg-red-700"
                                >
                                    {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Excluir
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-foreground">Dados do Serviço</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="name">Nome *</Label>
                                <Input
                                    id="name"
                                    placeholder="Nome do serviço"
                                    value={form.name}
                                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label htmlFor="price">Preço Padrão (R$)</Label>
                                <CurrencyInput
                                    id="price"
                                    value={form.price}
                                    onChange={(v) => setForm((p) => ({ ...p, price: v }))}
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label htmlFor="description">Descrição</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Descrição opcional..."
                                    rows={3}
                                    value={form.description}
                                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button type="submit" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Salvar Alterações
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <Link href="/services">Cancelar</Link>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AuthGuard>
    )
}

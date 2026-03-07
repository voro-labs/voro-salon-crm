"use client"

import { useState } from "react"
import { Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { CurrencyInput } from "@/components/currency-input"
import { toast } from "sonner"
import { API_CONFIG, secureApiCall } from "@/lib/api"

interface QuickCreateServiceProps {
    onSuccess: (serviceId: string) => void
}

export function QuickCreateService({ onSuccess }: QuickCreateServiceProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        name: "",
        description: "",
        price: 0,
    })

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!form.name.trim()) {
            toast.error("O nome do serviço é obrigatório.")
            return
        }
        setLoading(true)
        try {
            const res = await secureApiCall<any>(API_CONFIG.ENDPOINTS.SERVICES, {
                method: "POST",
                body: JSON.stringify(form),
            })

            if (res.hasError) {
                toast.error(res.message || "Erro ao cadastrar serviço.")
                return
            }

            toast.success("Serviço cadastrado com sucesso!")
            onSuccess(res.data.id)
            setOpen(false)
            // Clear form
            setForm({ name: "", description: "", price: 0 })
        } catch {
            toast.error("Erro de conexão. Tente novamente.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-primary/10 hover:text-primary">
                    <Plus className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Novo Serviço</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="quick-service-name">Nome *</Label>
                        <Input
                            id="quick-service-name"
                            placeholder="Nome do serviço"
                            value={form.name}
                            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="quick-service-price">Preço Padrão (R$)</Label>
                        <CurrencyInput
                            id="quick-service-price"
                            value={form.price}
                            onChange={(v) => setForm((p) => ({ ...p, price: v }))}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="quick-service-description">Descrição</Label>
                        <Textarea
                            id="quick-service-description"
                            placeholder="Descrição opcional..."
                            rows={2}
                            value={form.description}
                            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Cadastrar
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

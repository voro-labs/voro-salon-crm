"use client"

import { useState } from "react"
import { Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { localDateString } from "@/lib/date-utils"
import useSWR from "swr"

interface QuickCreateEmployeeProps {
	onSuccess: (employeeId: string) => void
}

const fetcher = async (url: string) => {
	const result = await secureApiCall<any>(url, { method: "GET" })
	if (result.hasError) throw new Error(result.message || "Error")
	return result.data
}

export function QuickCreateEmployee({ onSuccess }: QuickCreateEmployeeProps) {
	const [open, setOpen] = useState(false)
	const [loading, setLoading] = useState(false)
	const [duplicateFound, setDuplicateFound] = useState<{ id: string; name: string } | null>(null)
	const { data: _svcRaw } = useSWR(API_CONFIG.ENDPOINTS.SERVICES + "?pageSize=500", fetcher)
	const services = _svcRaw?.items ?? (Array.isArray(_svcRaw) ? _svcRaw : undefined)

	const { data: _empRaw } = useSWR(API_CONFIG.ENDPOINTS.EMPLOYEES + "?pageSize=500", fetcher)
	const existingEmployees = _empRaw?.items ?? (Array.isArray(_empRaw) ? _empRaw : []) ?? []

	const [form, setForm] = useState({
		name: "",
		specialtyIds: [] as string[],
	})

	async function performCreate() {
		setLoading(true)
		try {
			const res = await secureApiCall<any>(API_CONFIG.ENDPOINTS.EMPLOYEES, {
				method: "POST",
				body: JSON.stringify({
					name: form.name,
					specialtyIds: form.specialtyIds,
					hireDate: localDateString()
				}),
			})

			if (res.hasError) {
				toast.error(res.message || "Erro ao cadastrar funcionário.")
				return
			}

			toast.success("Funcionário cadastrado com sucesso!")
			onSuccess(res.data.id)
			setOpen(false)
			setForm({ name: "", specialtyIds: [] })
		} catch {
			toast.error("Erro de conexão. Tente novamente.")
		} finally {
			setLoading(false)
		}
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		e.stopPropagation()
		if (!form.name.trim()) {
			toast.error("O nome do funcionário é obrigatório.")
			return
		}

		const nameLower = form.name.trim().toLowerCase()
		const match = existingEmployees.find((emp: any) => emp.name?.trim().toLowerCase() === nameLower)
		if (match) {
			setDuplicateFound({ id: match.id, name: match.name })
			return
		}

		await performCreate()
	}

	async function handleForceCreate() {
		setDuplicateFound(null)
		await performCreate()
	}

	const toggleSpecialty = (id: string) => {
		setForm(p => ({
			...p,
			specialtyIds: p.specialtyIds.includes(id)
				? p.specialtyIds.filter(sid => sid !== id)
				: [...p.specialtyIds, id]
		}))
	}

	return (
		<Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) setDuplicateFound(null) }}>
			<DialogTrigger asChild>
				<Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-primary/10 hover:text-primary">
					<Plus className="h-4 w-4" />
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-106.25">
				<DialogHeader>
					<DialogTitle>Novo Funcionário</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4 py-4">
					<div className="flex flex-col gap-2">
						<Label htmlFor="quick-employee-name">Nome *</Label>
						<Input
							id="quick-employee-name"
							placeholder="Nome do funcionário"
							value={form.name}
							onChange={(e) => {
								setForm((p) => ({ ...p, name: e.target.value }))
								setDuplicateFound(null)
							}}
							required
						/>
						{duplicateFound !== null && (
							<div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 flex flex-col gap-2">
								<p className="text-sm text-amber-800 dark:text-amber-200">
									Já existe um funcionário com nome similar: <strong>{duplicateFound.name}</strong>
								</p>
								<div className="flex gap-2">
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="border-amber-400 text-amber-800 hover:bg-amber-100"
										onClick={() => {
											onSuccess(duplicateFound.id)
											setOpen(false)
											setDuplicateFound(null)
											setForm({ name: "", specialtyIds: [] })
										}}
									>
										Usar {duplicateFound.name}
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="text-muted-foreground"
										onClick={handleForceCreate}
									>
										Criar mesmo assim
									</Button>
								</div>
							</div>
						)}
					</div>

					<div className="flex flex-col gap-2">
						<Label>Especialidades (Opcional)</Label>
						<div className="flex flex-wrap gap-2 max-h-50 overflow-y-auto p-1 border rounded-md">
							{services?.map((s: any) => (
								<Button
									key={s.id}
									type="button"
									variant={form.specialtyIds.includes(s.id) ? "default" : "outline"}
									size="sm"
									className="text-xs h-7"
									onClick={() => toggleSpecialty(s.id)}
								>
									{s.name}
								</Button>
							))}
							{(!services || services.length === 0) && (
								<span className="text-xs text-muted-foreground p-2">Nenhum serviço cadastrado.</span>
							)}
						</div>
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

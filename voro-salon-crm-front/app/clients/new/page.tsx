"use client"

import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { PhoneInput } from "@/components/ui/custom/phone-input"
import { CountrySelector } from "@/components/ui/custom/country-selector"
import { AnamnesisForm } from "@/components/anamnesis/anamnesis-form"
import { AuthGuard } from "@/components/auth/auth.guard"
import { useClientForm } from "@/hooks/use-client-form.hook"

export default function NovoClientePage() {
  const {
    form,
    setForm,
    countryCode,
    setCountryCode,
    showAnamnesis,
    setShowAnamnesis,
    setAnamnesisResponses,
    isCreating,
    createClient,
  } = useClientForm()

  return (
    <AuthGuard requiredRoles={["SalonOwner", "SalonEmployee", "Owner"]}>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/clients">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">Novo Cliente</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Dados do Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); createClient() }} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Nome completo"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">Telefone *</Label>
                <div className="flex flex-row gap-2">
                  <div className="shrink-0">
                    <CountrySelector value={countryCode} onChange={setCountryCode} />
                  </div>
                  <div className="flex-1">
                    <PhoneInput
                      id="phone"
                      value={form.phone}
                      autoComplete="tel"
                      onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
                      countryCode={countryCode}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  placeholder="Anotações sobre o cliente..."
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <div className="flex items-center space-x-2 py-4 border-t mt-2">
                <Switch
                  id="show-anamnesis"
                  checked={showAnamnesis}
                  onCheckedChange={setShowAnamnesis}
                />
                <Label htmlFor="show-anamnesis" className="cursor-pointer font-semibold text-sm sm:text-base text-balance">
                  Iniciar Anamnese Capilar agora?
                </Label>
              </div>

              {showAnamnesis && (
                <div className="border rounded-xl p-6 bg-muted/30 mb-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    Ficha de Anamnese
                    <span className="text-xs font-normal text-muted-foreground bg-background px-2 py-1 rounded-full border">Opcional</span>
                  </h3>
                  <AnamnesisForm onChange={setAnamnesisResponses} />
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button type="submit" disabled={isCreating} size="lg" className="w-full sm:w-auto h-11 text-sm sm:text-base">
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {showAnamnesis ? "Cadastrar com Anamnese" : "Cadastrar Cliente"}
                </Button>
                <Button type="button" variant="outline" size="lg" asChild className="w-full sm:w-auto h-11 text-sm sm:text-base">
                  <Link href="/clients">Cancelar</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
}

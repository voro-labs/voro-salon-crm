import Link from "next/link"
import { CheckCircle2, Scissors } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PagarSucessoPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="h-20 w-20 rounded-3xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-black tracking-tight mb-3">Assinatura confirmada!</h1>
        <p className="text-muted-foreground text-base mb-2">
          Obrigado por assinar o <strong>Voro Salon CRM</strong>.
        </p>
        <p className="text-muted-foreground text-sm mb-8">
          Em breve você receberá um e-mail com as instruções de acesso. Nossa equipe ativará sua conta em até 24 horas úteis.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/admin/sign-in">Acessar minha conta</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/prices">Voltar aos planos</Link>
          </Button>
        </div>
        <div className="flex items-center justify-center gap-2 mt-10 text-xs text-muted-foreground">
          <div className="h-5 w-5 rounded bg-primary flex items-center justify-center">
            <Scissors className="h-3 w-3 text-primary-foreground" />
          </div>
          Voro Salon CRM © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}

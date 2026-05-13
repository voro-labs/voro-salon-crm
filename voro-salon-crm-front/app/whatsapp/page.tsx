"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import useSWR from "swr"
import { MessageCircle, RefreshCw, Send, AlertCircle, Settings2 } from "lucide-react"
import { API_CONFIG } from "@/lib/api"
import { fetcher } from "@/lib/fetcher"
import { AuthGuard } from "@/components/auth/auth.guard"
import { ModuleGuard } from "@/components/auth/module-guard"
import { PageHeader } from "@/components/ui/custom/page-header"
import { Button } from "@/components/ui/button"
import { ChatView } from "@/components/features/whatsapp/chat-view"
import { SendTemplateModal } from "@/components/features/whatsapp/send-template-modal"
import type { WhatsAppConversation } from "@/components/features/whatsapp/whatsapp.types"

export default function WhatsAppPage() {
  const [showSendModal, setShowSendModal] = useState(false)
  const { data: tenant } = useSWR<any>(API_CONFIG.ENDPOINTS.TENANT_ME, fetcher)
  const { data: evolutionInstances } = useSWR<{ id: string; status: 0 | 1 | 2 }[]>(
    API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES,
    fetcher
  )
  const evolutionConnected = (evolutionInstances ?? []).some((i) => i.status === 2)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [chatHeight, setChatHeight] = useState(0)

  // Calcula a altura disponível para o chat com base na posição real do container no DOM.
  // Depende de tenant e evolutionInstances pois o banner condicional altera o layout após o mount.
  useEffect(() => {
    const updateHeight = () => {
      if (chatContainerRef.current) {
        const top = chatContainerRef.current.getBoundingClientRect().top
        setChatHeight(window.innerHeight - top - 24)
      }
    }

    // Duplo RAF garante que o DOM terminou de fazer layout antes de medir
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(updateHeight)
    })
    window.addEventListener("resize", updateHeight)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener("resize", updateHeight)
    }
  }, [tenant, evolutionInstances])

  const { data: conversations, isLoading, mutate } = useSWR<WhatsAppConversation[]>(
    API_CONFIG.ENDPOINTS.WHATSAPP_CONVERSATIONS,
    fetcher,
    { refreshInterval: 30000 }
  )

  return (
    <AuthGuard requiredRoles={["SalonOwner", "Owner"]}>
      <ModuleGuard moduleId={[9]}>
        {tenant !== undefined && !tenant?.useWhatsappBooking ? (
          <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center gap-6">
            <div className="h-20 w-20 rounded-full bg-rose-100 flex items-center justify-center">
              <MessageCircle className="h-10 w-10 text-rose-600" />
            </div>
            <div className="flex flex-col gap-2 max-w-sm">
              <h1 className="text-2xl font-bold text-foreground">Funcionalidade Desativada</h1>
              <p className="text-muted-foreground">
                O Agendamento pelo WhatsApp está atualmente desativado para o seu estabelecimento.
                Para utilizar o Bot e acompanhar os atendimentos, você precisa ativar esta opção nas configurações.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button asChild>
                <Link href="/settings?tab=whatsapp">
                  <Settings2 className="mr-2 h-4 w-4" />
                  Ir para Configurações
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-4 sm:p-6">
            <PageHeader
              title="WhatsApp — Mensagens"
              description="Gerencie as conversas com seus clientes."
              action={
                <div className="flex items-center gap-2">
                  {!evolutionConnected && (
                    <Button variant="outline" size="sm" onClick={() => setShowSendModal(true)}>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar Template
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => mutate()}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Atualizar
                  </Button>
                </div>
              }
            />

            {/* Banner: configuração incompleta do WhatsApp */}
            {tenant !== undefined && evolutionInstances !== undefined && !evolutionConnected && (!tenant?.whatsappPhoneNumberId || !tenant?.whatsappBusinessAccountId) && (
              <div className="border border-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1 min-w-0">
                    <p className="font-bold text-sm text-amber-900 dark:text-amber-200">
                      Integração WhatsApp não configurada
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                      Os IDs do WhatsApp Business ainda não foram configurados para este estabelecimento. O bot não está ativo.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-400 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/30"
                    asChild
                  >
                    <a
                      href={`mailto:suporte@vorolabs.app?subject=Solicitar%20configuração%20WhatsApp&body=Olá%2C%20preciso%20configurar%20o%20WhatsApp%20Bot%20para%20o%20estabelecimento%3A%20${encodeURIComponent(tenant?.name ?? "")}%20(${encodeURIComponent(tenant?.id ?? "")})`}
                    >
                      Solicitar configuração
                    </a>
                  </Button>
                  <Button size="sm" variant="ghost" className="text-amber-700 dark:text-amber-300 text-xs" asChild>
                    <a href="/settings?tab=whatsapp">Configurar agora</a>
                  </Button>
                </div>
              </div>
            )}

            <div
              ref={chatContainerRef}
              className="overflow-hidden"
              style={chatHeight > 0 ? { height: chatHeight } : { height: "60vh" }}
            >
              <ChatView conversations={conversations ?? []} isLoading={isLoading} onRefresh={mutate} />
            </div>
          </div>
        )}

        {showSendModal && <SendTemplateModal onClose={() => setShowSendModal(false)} />}
      </ModuleGuard>
    </AuthGuard>
  )
}

"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import useSWR from "swr"
import {
  MessageCircle, RefreshCw, Loader2, User, Send, X,
  CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Settings2,
  MessageSquare, Trash2, WifiOff,
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { API_CONFIG, secureApiCall } from "@/lib/api"
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
  const { data: onboardingStatus, error: onboardingError } = useSWR<{ connected: boolean }>(
    API_CONFIG.ENDPOINTS.WHATSAPP_ONBOARDING_STATUS,
    fetcher
  )
  const evolutionConnected = (evolutionInstances ?? []).some((i) => i.status === 2)
  const metaConnected = onboardingStatus?.connected === true
  const hasActiveConnection = evolutionConnected || metaConnected
  const connectionChecked =
    tenant !== undefined &&
    evolutionInstances !== undefined &&
    (onboardingStatus !== undefined || onboardingError !== undefined)
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
  }, [tenant, evolutionInstances, onboardingStatus, onboardingError])

  const { data: conversations, isLoading, mutate } = useSWR<WhatsAppConversation[]>(
    API_CONFIG.ENDPOINTS.WHATSAPP_CONVERSATIONS,
    fetcher,
    { refreshInterval: 30000 }
  )

  return (
    <AuthGuard requiredRoles={["SalonOwner", "Owner"]}>
      <ModuleGuard moduleId={[9]}>
        {!connectionChecked ? (
          <div className="flex items-center justify-center min-h-[70vh]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !tenant?.useWhatsappBooking ? (
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
        ) : !hasActiveConnection ? (
          <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center gap-6">
            <div className="h-20 w-20 rounded-full bg-amber-100 flex items-center justify-center">
              <WifiOff className="h-10 w-10 text-amber-600" />
            </div>
            <div className="flex flex-col gap-2 max-w-sm">
              <h1 className="text-2xl font-bold text-foreground">WhatsApp não conectado</h1>
              <p className="text-muted-foreground">
                Nenhuma conexão ativa com WhatsApp. Conecte via Evolution Go ou API Oficial para usar esta funcionalidade.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button asChild>
                <Link href="/settings?tab=whatsapp">
                  <Settings2 className="mr-2 h-4 w-4" />
                  Configurar
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
                  {metaConnected && !evolutionConnected && (
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

            <div
              ref={chatContainerRef}
              className="overflow-hidden"
              style={chatHeight > 0 ? { height: chatHeight } : { height: "60vh" }}
            >
              <ChatView conversations={conversations ?? []} isLoading={isLoading} onRefresh={mutate} />
            </div>
          </div>
        )}

        {showSendModal && hasActiveConnection && <SendTemplateModal onClose={() => setShowSendModal(false)} />}
      </ModuleGuard>
    </AuthGuard>
  )
}

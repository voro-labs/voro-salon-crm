"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  QrCode,
  Smartphone,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  X,
  MessageSquare,
  RefreshCcw,
} from "lucide-react"
import { AuthGuard } from "@/components/auth/auth.guard"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import Image from "next/image"
import { useInstances } from "@/hooks/use-instance.hook"
import { InstanceStatusEnum } from "@/types/Enums/instanceStatusEnum.enum"
import { useRouter } from "next/navigation"
import { PhoneInput } from "@/components/ui/custom/phone-input"
import { applyMask, phoneMasks } from "@/lib/mask-utils"
import Link from "next/link"
import { Loading } from "@/components/ui/custom/loading/loading"

export default function InstancesPage() {
  const { instances, loading, error, loadInstances, createInstance, deleteInstance, getStatus, refreshQrCode } =
    useInstances()
  const router = useRouter()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null)
  const [newInstanceName, setNewInstanceName] = useState("")
  const [newInstancePhoneNumber, setNewInstancePhoneNumber] = useState("")
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const selectedInstance = instances.find((i) => i.id === selectedInstanceId) || null

  useEffect(() => {
    loadInstances()
  }, [])

  useEffect(() => {
    if (!qrDialogOpen || !selectedInstanceId) return

    const instance = instances.find((i) => i.id === selectedInstanceId)
    if (!instance) return

    if (!instance.instanceExtension?.base64) {
      refreshQrCode(`${instance.name}`)
    }

    getStatus(`${instance.name}`)

    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current)
    }

    statusIntervalRef.current = setInterval(() => {
      getStatus(`${instance.name}`).then((updatedInstance) => {
        if (updatedInstance?.instanceExtension?.status === InstanceStatusEnum.Connected) {
          setQrDialogOpen(false)
          if (statusIntervalRef.current) {
            clearInterval(statusIntervalRef.current)
            statusIntervalRef.current = null
          }
        }
      })
    }, 15000)

    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current)
        statusIntervalRef.current = null
      }
    }
  }, [qrDialogOpen, selectedInstanceId])

  useEffect(() => {
    if (selectedInstance?.instanceExtension?.status === InstanceStatusEnum.Connected && statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current)
      statusIntervalRef.current = null
    }
  }, [selectedInstance?.instanceExtension?.status])

  const getStatusBadge = (status: InstanceStatusEnum) => {
    switch (status) {
      case InstanceStatusEnum.Connected:
        return (
          <Badge className="bg-accent text-accent-foreground">
            <CheckCircle className="mr-1 h-3 w-3" />
            Conectado
          </Badge>
        )
      case InstanceStatusEnum.Connecting:
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            Conectando
          </Badge>
        )
      case InstanceStatusEnum.Disconnected:
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Desconectado
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            <X className="mr-1 h-3 w-3" />
            Desconhecido
          </Badge>
        )
    }
  }

  if (error) {
    return (
      <div className="flex h-screen">
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 p-6">
            <Button variant="ghost" asChild className="mb-4">
              <Link href="/instances">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Recarregar pagina
              </Link>
            </Button>
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
              {error || "Plano de treino não encontrado"}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AuthGuard requiredRoles={["Trainer"]}>
      <Loading isLoading={loading}></Loading>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-balance">Instâncias WhatsApp</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Gerencie suas conexões do WhatsApp para envio de mensagens</p>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={(open) => {
            setCreateDialogOpen(open);

            if (open) {
              setNewInstanceName("");
              setNewInstancePhoneNumber("");
            }
          }}>
            <DialogTrigger asChild>
              <Button disabled={instances.length > 0 || loading}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Instância
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Instância</DialogTitle>
                <DialogDescription>Digite um nome para identificar sua instância do WhatsApp</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Instância</Label>
                  <Input
                    id="name"
                    autoComplete="off"
                    placeholder="Ex: WhatsApp Principal"
                    value={newInstanceName}
                    onChange={(e) => setNewInstanceName(e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Número do WhatsApp</Label>
                  <PhoneInput
                    id="phone"
                    autoComplete="tel"
                    value={newInstancePhoneNumber}
                    onChange={(value) => setNewInstancePhoneNumber(value)}
                    countryCode="BR"
                    placeholder="(11) 9999-9999"
                    className="h-12"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    var instance = createInstance(newInstanceName, newInstancePhoneNumber)
                    if (instance !== null) setCreateDialogOpen(false)
                  }}
                  disabled={loading}
                >
                  {loading ? "Criando..." : "Criar Instância"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Instances Grid */}
        {loading && instances.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : instances.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Smartphone className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Nenhuma instância criada ainda</p>
              <Button onClick={() => {
                setCreateDialogOpen(true);

                if (true) {
                  setNewInstanceName("");
                  setNewInstancePhoneNumber("");
                }
              }} disabled={loading}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeira Instância
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {instances.map((instance) => (
              <Card key={instance.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{instance.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {applyMask(`${instance.instanceExtension?.phoneNumber}`, phoneMasks["BR"].mask) || "Número não encontrado"}
                      </CardDescription>
                    </div>
                    {getStatusBadge(instance.instanceExtension?.status || InstanceStatusEnum.Disconnected)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 p-4 sm:p-6">
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="break-all">
                      <span className="text-muted-foreground">Chave: </span>
                      <span className="text-xs">{instance.id}</span>
                    </div>
                    {instance.instanceExtension?.connectedAt && (
                      <div>
                        <span className="text-muted-foreground">Conectado em: </span>
                        <span className="text-xs">
                          {new Date(instance.instanceExtension?.connectedAt || "").toLocaleString("pt-BR")}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    {instance.instanceExtension?.status == InstanceStatusEnum.Connected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-transparent justify-center"
                        onClick={() => router.push(`/messages/${instance.id}`)}
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Ir para mensagens
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-transparent justify-center"
                        onClick={() => {
                          setSelectedInstanceId(`${instance.id}`)
                          setQrDialogOpen(true)
                        }}
                      >
                        <QrCode className="mr-2 h-4 w-4" />
                        Ver QR Code
                      </Button>
                    )}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="w-full sm:w-auto">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Instância</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir a instância "{instance.name}"? Esta ação não pode ser
                            desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteInstance(`${instance.name}`)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* QR Code Dialog */}
        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Conectar {selectedInstance?.name}</DialogTitle>
              <DialogDescription>Escaneie o QR Code com seu WhatsApp para conectar esta instância</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-4 py-4">
              {selectedInstance?.instanceExtension?.base64 ? (
                <>
                  <div className="relative w-64 h-64 bg-white p-4 rounded-lg">
                    <Image
                      src={selectedInstance.instanceExtension?.base64 || "/placeholder.svg"}
                      alt="QR Code"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">1. Abra o WhatsApp no seu telefone</p>
                    <p className="text-sm text-muted-foreground">
                      2. Toque em Menu ou Configurações e selecione Aparelhos conectados
                    </p>
                    <p className="text-sm text-muted-foreground">3. Toque em Conectar um aparelho</p>
                    <p className="text-sm text-muted-foreground">4. Aponte seu telefone para esta tela</p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">QR Code não disponível</p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => selectedInstance && refreshQrCode(`${selectedInstance.name}`)}
                disabled={loading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Atualizar QR Code
              </Button>
              <Button onClick={() => setQrDialogOpen(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  )
}

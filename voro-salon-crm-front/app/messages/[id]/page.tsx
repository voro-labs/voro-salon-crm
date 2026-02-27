"use client"

import { use } from "react"
import { useState } from "react"
import { AuthGuard } from "@/components/auth/auth.guard"
import { Loading } from "@/components/ui/custom/loading/loading"
import { ConversationList } from "@/components/layout/admin/messages/conversation-list"
import { ChatArea } from "@/components/layout/admin/messages/chat-area"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { MessageDto } from "@/types/DTOs/message.interface"
import { useEvolutionChat } from "@/hooks/use-evolution-chat.hook"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface MessagesPageProps {
  params: Promise<{ id: string }>
}

export default function MessagesPage({ params }: MessagesPageProps) {
  const { id: instanceId } = use(params)
  const router = useRouter()

  const {
    chats,
    messages,
    selectedChatId,
    setSelectedChatId,
    fetchMessages,
    sendMessage,
    sendAttachment,
    deleteMessage,
    forwardMessage,
    sendQuotedMessage,
    sendReactionMessage,
    saveChat,
    updateChat,
    loading,
    error,
    setError,
  } = useEvolutionChat(instanceId)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [messageToForward, setMessageToForward] = useState<MessageDto | null>(null)

  const selectedMessages = selectedChatId ? messages[selectedChatId] || [] : []

  return (
    <AuthGuard requiredRoles={["Trainer"]}>
      <div className="bg-background">
        <Loading isLoading={loading} />

        <div className="flex min-h-screen flex-col overflow-hidden">
          {/* Header - Only show on mobile when no chat is selected OR on desktop */}
          <div className={cn(
            "border-b border-border bg-card px-4 py-3 sm:px-6 sm:py-4",
            selectedChatId && "hidden lg:flex"
          )}>
            <div className="flex items-center gap-3 sm:gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push("/instances")} className="shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold truncate">Mensagens</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Instância: {instanceId}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Lista de conversas - Hidden on mobile when chat is selected */}
            <div className={cn(
              "w-full lg:w-80 shrink-0",
              selectedChatId && "hidden lg:block"
            )}>
              <ConversationList
                chats={chats}
                selectedId={selectedChatId}
                onSelect={(id) => {
                  fetchMessages(id)
                  setSelectedChatId(id)
                }}
                onAddChat={(name, remoteJid) => {
                  saveChat(name, remoteJid)
                }}
              />
            </div>

            {/* Área do chat - Full width on mobile when selected, half width on desktop */}
            <div className={cn(
              "w-full lg:h-screen",
              !selectedChatId && "hidden lg:block"
            )}>
              <ChatArea
                chat={chats.find((c) => c.id === selectedChatId)}
                messages={selectedMessages}
                onSendMessage={(text: any, quotedMessage: any) => {
                  if (!selectedChatId) return

                  if (quotedMessage) {
                    sendQuotedMessage(selectedChatId, quotedMessage, text)
                    return
                  }

                  sendMessage(selectedChatId, text)
                }}
                onSendAttachment={(file: any) => {
                  if (!selectedChatId) return
                  sendAttachment(selectedChatId, file)
                }}
                onReact={(message: any, emoji: any) => {
                  if (!selectedChatId) return
                  sendReactionMessage(selectedChatId, message, emoji)
                }}
                onForward={(message: any) => {
                  setDialogOpen(true)
                  setMessageToForward(message)
                }}
                onDelete={(message: any) => {
                  if (!selectedChatId) return
                  deleteMessage(selectedChatId, message)
                }}
                onEditChat={(chatId: any, name: any, remoteJid: any, profilePicture: any) => {
                  updateChat(chatId, name, remoteJid, profilePicture)
                }}
                onBack={() => setSelectedChatId(null)}
              />
            </div>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Selecionar Chat</DialogTitle>
              <DialogDescription>Escolha o chat para encaminhar a mensagem.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex flex-col items-center gap-4">
                {chats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => {
                      if (!chat.id) return
                      forwardMessage(chat.id, messageToForward)
                      setMessageToForward(null)
                      setDialogOpen(false)
                    }}
                    className={cn(
                      "w-full p-4 flex items-start gap-3 hover:bg-muted/50 transition-colors border-b border-border rounded-lg",
                      selectedChatId === chat.id && "bg-muted",
                    )}
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={chat.contact?.profilePictureUrl || "/placeholder.svg"}
                          alt={chat.contact?.displayName || chat.remoteJid}
                        />
                        <AvatarFallback>{`${chat.contact?.displayName || chat.remoteJid}`.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-baseline justify-between mb-1">
                        <p className="font-medium truncate">{chat.contact?.displayName || chat.remoteJid}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  )
}

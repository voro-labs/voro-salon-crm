"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Search, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { type ChangeEvent, useEffect, useState } from "react"
import { PhoneInput } from "@/components/ui/custom/phone-input"
import type { ChatDto } from "@/types/DTOs/chat.interface"
import { flags } from "@/lib/flag-utils"

interface ConversationListProps {
  chats: ChatDto[]
  selectedId: string | null
  onAddChat: (chatName: string, phoneNumber: string) => void
  onSelect: (id: string) => void
}

export function ConversationList({ chats, selectedId, onAddChat, onSelect }: ConversationListProps) {
  const [filtered, setFiltered] = useState<ChatDto[]>([])
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [chatName, setChatName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [countryCode, setCountryCode] = useState("BR")

  useEffect(() => {
    if (!search) {
      setFiltered(chats)
    } else {
      const result = chats.filter((chat) =>
        (chat.contact?.displayName || chat.remoteJid || "").toLowerCase().includes(search.toLowerCase()),
      )
      setFiltered(result)
    }
  }, [chats, search])

  function inputChange(event: ChangeEvent<HTMLInputElement>): void {
    setSearch(event.currentTarget.value)
  }

  function handleAddChat() {
    onAddChat(chatName, `${flags[countryCode].dialCodeOnlyNumber}${phoneNumber}`)
    setChatName("")
    setPhoneNumber("")
    setOpen(false)
  }

  return (
    <div className="w-full lg:w-80 border-r border-border bg-card flex flex-col h-full">
      <div className="p-3 sm:p-4 border-b border-border shrink-0">
        <h1 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Mensagens</h1>
        <div className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." className="pl-8 sm:pl-9 text-sm" value={search} onChange={inputChange} />
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="default" className="shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Adicionar novo chat</DialogTitle>
                <DialogDescription>Preencha os dados do novo chat para iniciar uma conversa.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome do chat</Label>
                  <Input
                    id="name"
                    placeholder="Digite o nome..."
                    autoComplete="off"
                    value={chatName}
                    onChange={(e) => setChatName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Número de telefone</Label>
                  <PhoneInput
                    id="phone"
                    countryCode={countryCode}
                    autoComplete="off"
                    value={phoneNumber}
                    onChange={(value) => setPhoneNumber(value)}
                  ></PhoneInput>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddChat}>Adicionar chat</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onSelect(`${chat.id}`)}
            className={cn(
              "w-full p-3 sm:p-4 flex items-start gap-2 sm:gap-3 hover:bg-muted/50 active:bg-muted/70 transition-colors border-b border-border",
              selectedId === chat.id && "bg-muted",
            )}
          >
            <div className="relative shrink-0">
              <Avatar className="h-11 w-11 sm:h-12 sm:w-12">
                <AvatarImage
                  src={chat.contact?.profilePictureUrl || "/placeholder.svg"}
                  alt={chat.contact?.displayName || chat.remoteJid || "Chat"}
                />
                <AvatarFallback>{`${chat.contact?.displayName || chat.remoteJid || "?"}`.charAt(0)}</AvatarFallback>
              </Avatar>
            </div>

            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <p className="font-medium text-sm sm:text-base truncate">{chat.contact?.displayName || chat.remoteJid || "Desconhecido"}</p>
                <span className="text-xs text-muted-foreground shrink-0">
                  {/* Chat timestamp would go here if available */}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 truncate">
                  {/* Last message preview would go here if available */}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

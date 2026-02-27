"use client"

import { useState, useEffect, useCallback } from "react"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import type { ChatDto } from "@/types/DTOs/chat.interface"
import type { MessageDto } from "@/types/DTOs/message.interface"
import { MessageStatusEnum } from "@/types/Enums/messageStatusEnum.enum"

export function useEvolutionChat(instanceId: string) {
  const [chats, setChats] = useState<ChatDto[]>([])
  const [messages, setMessages] = useState<Record<string, MessageDto[]>>({})
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 🔹 Buscar chats
  const fetchChats = useCallback(async () => {
    if (!instanceId) return
    setError(null)

    try {
      const response = await secureApiCall<ChatDto[]>(`${API_CONFIG.ENDPOINTS.CHAT}/${instanceId}`, {
        method: "GET",
      })

      if (response.hasError) throw new Error(response.message ?? "Erro ao carregar chats")

      setChats(response.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    }
  }, [instanceId])

  // 🔹 Salvar chat
  const saveChat = useCallback(
    async (name: string, remoteJid: string) => {
      if (!name || !remoteJid || !instanceId) return
      setError(null)

      try {
        const body = { name: name, remoteJid: remoteJid, instanceId: instanceId }

        const response = await secureApiCall<ChatDto>(`${API_CONFIG.ENDPOINTS.CHAT}/${instanceId}/chats/save`, {
          method: "POST",
          body: JSON.stringify(body),
        })

        if (response.hasError) throw new Error(response.message ?? "Erro ao salvar chat")

        let newChat: ChatDto = {
          id: Date.now().toString(),
          contact: {
            displayName: name
          },
          remoteJid: remoteJid,
        }

        if (response.data) newChat = response.data

        setChats((prev) => [...prev, newChat])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido")
      }
    },
    [instanceId],
  )

  // 🔹 Atualizar chat
  const updateChat = useCallback(
    async (chatId: string, name: string, remoteJid: string, profilePicture: File | null) => {
      if (!name || !remoteJid || !instanceId) return
      setError(null)

      try {
        const form = new FormData()

        form.append("name", name)
        form.append("remoteJid", remoteJid)
        form.append("instanceId", instanceId)

        if (profilePicture) form.append("profilePicture", profilePicture)

        const response = await secureApiCall<ChatDto>(
          `${API_CONFIG.ENDPOINTS.CHAT}/${instanceId}/chats/${chatId}/update`,
          {
            method: "PUT",
            body: form,
          },
        )

        if (response.hasError) throw new Error(response.message ?? "Erro ao salvar chat")

        let newChat: ChatDto = {
          id: chatId,
          contact: {
            displayName: name
          },
          remoteJid: remoteJid,
        }

        if (response.data) newChat = response.data

        setChats((prev) => {
          const exists = prev.some((c) => c.id === newChat.id)
          if (exists) {
            return prev.map((c) => (c.id === newChat.id ? newChat : c))
          }
          return [...prev, newChat]
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido")
      }
    },
    [instanceId],
  )

  // 🔹 Buscar mensagens com um chat
  const fetchMessages = useCallback(
    async (chatId: string) => {
      if (!chatId || !instanceId) return
      setError(null)

      try {
        const response = await secureApiCall<MessageDto[]>(
          `${API_CONFIG.ENDPOINTS.CHAT}/${instanceId}/messages/${chatId}`,
          {
            method: "GET",
          },
        )

        if (response.hasError) throw new Error(response.message ?? "Erro ao carregar mensagens")

        setMessages((prev) => ({
          ...prev,
          [chatId]: response.data ?? [],
        }))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido")
      }
    },
    [instanceId],
  )

  // 🔹 Enviar mensagem
  const sendMessage = useCallback(
    async (chatId: string, text: string) => {
      if (!chatId || !text || !instanceId) return
      setError(null)

      try {
        const body = { text: text }

        const response = await secureApiCall<MessageDto>(
          `${API_CONFIG.ENDPOINTS.CHAT}/${instanceId}/messages/${chatId}/send`,
          {
            method: "POST",
            body: JSON.stringify(body),
          },
        )

        if (response.hasError) throw new Error(response.message ?? "Erro ao enviar mensagem")

        let newMessage: MessageDto = {
          id: Date.now().toString(),
          content: text,
          sentAt: new Date(),
          status: MessageStatusEnum.Created,
          isFromMe: true,
          chatId: chatId,
          messageReactions: [],
        }

        if (response.data) newMessage = response.data

        setMessages((prev) => ({
          ...prev,
          [chatId]: [...(prev[chatId] || []), newMessage],
        }))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido")
      }
    },
    [instanceId],
  )

  // 🔹 Enviar anexo
  const sendAttachment = useCallback(
    async (chatId: string, attachment: File) => {
      if (!chatId || !attachment || !instanceId) return
      setError(null)

      try {
        const form = new FormData()

        form.append("attachment", attachment)

        const response = await secureApiCall<MessageDto>(
          `${API_CONFIG.ENDPOINTS.CHAT}/${instanceId}/messages/${chatId}/send/attachment`,
          {
            method: "POST",
            body: form,
          },
        )

        if (response.hasError) throw new Error(response.message ?? "Erro ao enviar anexo")

        const url = URL.createObjectURL(attachment)

        let newMessage: MessageDto = {
          id: Date.now().toString(),
          content: "",
          base64: url,
          sentAt: new Date(),
          status: MessageStatusEnum.Created,
          isFromMe: true,
          chatId: chatId,
          messageReactions: [],
        }

        if (response.data) newMessage = response.data

        setMessages((prev) => ({
          ...prev,
          [chatId]: [...(prev[chatId] || []), newMessage],
        }))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido")
      }
    },
    [instanceId],
  )

  // 🔹 Deletar mensagem
  const deleteMessage = useCallback(
    async (chatId: string, message: MessageDto) => {
      if (!chatId || !message.id || !instanceId) return
      setError(null)

      try {
        const body = { id: message.id }

        const response = await secureApiCall<MessageDto>(
          `${API_CONFIG.ENDPOINTS.CHAT}/${instanceId}/messages/${chatId}/delete`,
          {
            method: "POST",
            body: JSON.stringify(body),
          },
        )

        if (response.hasError) throw new Error(response.message ?? "Erro ao deletar mensagem")

        setMessages((prev) => ({
          ...prev,
          [chatId]: [...(prev[chatId].filter((m) => m.id !== message.id) || [])],
        }))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido")
      }
    },
    [instanceId],
  )

  // 🔹 Encaminhar mensagem
  const forwardMessage = useCallback(
    async (chatId: string, message: MessageDto | null) => {
      if (!chatId || !message?.id || !instanceId) return
      setError(null)

      try {
        const body = { id: message.id }

        const response = await secureApiCall<MessageDto>(
          `${API_CONFIG.ENDPOINTS.CHAT}/${instanceId}/messages/${chatId}/forward`,
          {
            method: "POST",
            body: JSON.stringify(body),
          },
        )

        if (response.hasError) throw new Error(response.message ?? "Erro ao encaminhar mensagem")

        setMessages((prev) => ({
          ...prev,
          [chatId]: [...(prev[chatId] || [])],
        }))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido")
      }
    },
    [instanceId],
  )

  // 🔹 Enviar mensagem com citação
  const sendQuotedMessage = useCallback(
    async (chatId: string, message: MessageDto, text: string) => {
      if (!chatId || !message.id || !text || !instanceId) return
      setError(null)

      try {
        const body = { text, quoted: { key: { id: message.id } } }

        const response = await secureApiCall<MessageDto>(
          `${API_CONFIG.ENDPOINTS.CHAT}/${instanceId}/messages/${chatId}/send/quoted`,
          {
            method: "POST",
            body: JSON.stringify(body),
          },
        )

        if (response.hasError) throw new Error(response.message ?? "Erro ao enviar mensagem")

        let newMessage: MessageDto = {
          id: Date.now().toString(),
          content: text,
          sentAt: new Date(),
          status: MessageStatusEnum.Created,
          isFromMe: true,
          chatId: chatId,
          quotedMessage: message,
          quotedMessageId: message.id,
          messageReactions: [],
        }

        if (response.data) newMessage = response.data

        setMessages((prev) => ({
          ...prev,
          [chatId]: [...(prev[chatId] || []), newMessage],
        }))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido")
      }
    },
    [instanceId],
  )

  // 🔹 Enviar reação
  const sendReactionMessage = useCallback(
    async (chatId: string, message: MessageDto, reaction: string) => {
      if (!chatId || !message.id || !reaction || !instanceId) return
      setError(null)

      try {
        const body = { reaction: reaction, key: { id: message.id } }

        const response = await secureApiCall<MessageDto>(
          `${API_CONFIG.ENDPOINTS.CHAT}/${instanceId}/messages/${chatId}/send/reaction`,
          {
            method: "POST",
            body: JSON.stringify(body),
          },
        )

        if (response.hasError) throw new Error(response.message ?? "Erro ao enviar a reação da mensagem")

        setMessages((prev) => {
          const messages = prev[chatId] || []
          const updated = messages.map((m) => {
            if (m.id !== message.id) return m

            return {
              ...m,
              reactions: [
                ...(m.messageReactions || []),
                {
                  reaction: reaction,
                  fromMe: true,
                  createdAt: new Date(),
                },
              ],
            }
          })

          return {
            ...prev,
            [chatId]: updated,
          }
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido")
      }
    },
    [instanceId],
  )

  // 🔹 Atualizar mensagens periodicamente (simulação de webhook)
  useEffect(() => {
    if (!selectedChatId || !instanceId) return
    const interval = setInterval(() => {
      fetchMessages(selectedChatId)
      fetchChats()
    }, 5000)
    return () => clearInterval(interval)
  }, [selectedChatId, fetchMessages, fetchChats, instanceId])

  // 🔹 Buscar chats ao iniciar
  useEffect(() => {
    if (instanceId) {
      fetchChats()
    }
  }, [fetchChats, instanceId])

  return {
    chats,
    messages,
    selectedChatId,
    setSelectedChatId,
    fetchChats,
    saveChat,
    updateChat,
    fetchMessages,
    sendMessage,
    sendAttachment,
    deleteMessage,
    forwardMessage,
    sendQuotedMessage,
    sendReactionMessage,
    loading,
    error,
    setError,
    clearError: () => setError(null),
  }
}

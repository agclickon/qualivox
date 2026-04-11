"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Send, Search, Hash, Circle, Users, Smile } from "lucide-react"
import { useAuthStore } from "@/stores/auth-store"
import { useToast } from "@/hooks/use-toast"
import { getInitials } from "@/lib/utils"

interface ChatMsg {
  id: string
  senderId: string
  content: string
  channel: string
  createdAt: string
  sender: { id: string; name: string; avatarUrl: string | null }
}

interface ChannelDef {
  id: string
  name: string
  description: string
}

const CHANNELS: ChannelDef[] = [
  { id: "geral", name: "geral", description: "Canal para comunicação geral da equipe" },
  { id: "vendas", name: "vendas", description: "Discussões sobre oportunidades e estratégias de vendas" },
  { id: "suporte", name: "suporte", description: "Dúvidas técnicas e suporte aos clientes" },
]

export default function ChatPage() {
  const user = useAuthStore((state) => state.user)
  const { toast } = useToast()
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedChannel, setSelectedChannel] = useState<ChannelDef>(CHANNELS[0])
  const [newMessage, setNewMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchMessages = useCallback(async (channel: string) => {
    try {
      const res = await fetch(`/api/chat?channel=${channel}`)
      const data = await res.json()
      if (data.success) {
        setMessages(data.data.messages)
      }
    } catch (err) {
      console.error("Erro ao carregar mensagens:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    setIsLoading(true)
    fetchMessages(selectedChannel.id)
  }, [selectedChannel.id, fetchMessages])

  // Polling a cada 5s para mensagens novas
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMessages(selectedChannel.id)
    }, 5000)
    return () => clearInterval(interval)
  }, [selectedChannel.id, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return
    setIsSending(true)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage, channel: selectedChannel.id }),
      })
      const data = await res.json()
      if (data.success) {
        setMessages((prev) => [...prev, data.data])
        setNewMessage("")
      } else {
        toast({ variant: "destructive", title: "Erro ao enviar mensagem" })
      }
    } catch {
      toast({ variant: "destructive", title: "Erro ao enviar mensagem" })
    } finally {
      setIsSending(false)
    }
  }

  const formatTime = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
    if (diffDays === 0) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    if (diffDays === 1) return "Ontem"
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
  }

  const filtered = CHANNELS.filter((ch) =>
    !searchTerm || ch.name.includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-h3 font-bold" data-testid="heading-chat">Chat Interno</h1>
        <p className="text-muted-foreground">Comunique-se com sua equipe</p>
      </div>

      <Card className="flex overflow-hidden" style={{ height: "calc(100vh - 220px)" }}>
        {/* Sidebar - canais */}
        <div className="w-64 flex-shrink-0 border-r flex flex-col">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar canais..."
                className="pl-8 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="p-2">
            <p className="px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Canais</p>
          </div>
          <div className="flex-1 overflow-y-auto px-2">
            {filtered.map((ch) => (
              <div
                key={ch.id}
                className={`flex items-center gap-2 rounded-md px-2 py-2 cursor-pointer transition-colors mb-0.5 ${
                  selectedChannel.id === ch.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                }`}
                onClick={() => setSelectedChannel(ch)}
              >
                <Hash className="h-4 w-4 flex-shrink-0 opacity-60" />
                <span className="text-sm flex-1 truncate">{ch.name}</span>
              </div>
            ))}
          </div>
          <div className="border-t p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Circle className="h-2 w-2 fill-green-500 text-green-500" />
              <span>Online</span>
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <Hash className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-semibold text-sm">{selectedChannel.name}</p>
              <p className="text-xs text-muted-foreground">{selectedChannel.description}</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
                Nenhuma mensagem ainda. Comece a conversa!
              </div>
            ) : (
              messages.map((msg, i) => {
                const isMe = msg.senderId === user?.id
                const showAvatar = i === 0 || messages[i - 1].senderId !== msg.senderId
                return (
                  <div key={msg.id} className={`flex gap-3 ${showAvatar ? "mt-4" : "mt-1"}`}>
                    {showAvatar ? (
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${
                        isMe ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                      }`}>
                        {getInitials(msg.sender.name)}
                      </div>
                    ) : (
                      <div className="w-9 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      {showAvatar && (
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className={`text-sm font-semibold ${isMe ? "text-primary" : ""}`}>{msg.sender.name}</span>
                          <span className="text-[10px] text-muted-foreground">{formatTime(msg.createdAt)}</span>
                        </div>
                      )}
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-3 flex gap-2">
            <Button variant="ghost" size="icon" className="flex-shrink-0">
              <Smile className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Input
              placeholder={`Enviar mensagem em #${selectedChannel.name}...`}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={!newMessage.trim() || isSending}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

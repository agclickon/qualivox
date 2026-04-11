"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  MessageSquare,
  Send,
  Search,
  Phone,
  User,
  Loader2,
  Circle,
  RefreshCw,
  FileText,
  Plus,
  X,
  CheckCheck,
  Download,
  Music2,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { getInitials } from "@/lib/utils"
import { Label } from "@/components/ui/label"

type MessageDirection = "incoming" | "outgoing" | string
type MessageType = "text" | "image" | "video" | "audio" | "document" | "sticker" | string

interface Message {
  id: string
  direction: MessageDirection
  content: string
  createdAt: string
  isRead: boolean
  messageType?: MessageType
  mediaUrl?: string | null
  metadata?: Record<string, unknown> | null
}

interface Conversation {
  id: string
  whatsappChatId: string
  lastMessageAt: string
  unreadCount: number
  lead: {
    id: string
    name: string
    phone: string | null
    whatsappNumber: string | null
    companyName: string | null
    profilePicUrl?: string | null
  }
  messages: Message[]
}

interface Template {
  id: string
  name: string
  content: string
  variables: string
  category: string | null
}

const MEDIA_LABELS: Record<string, string> = {
  image: "📷 Foto",
  video: "🎬 Vídeo",
  audio: "🎧 Áudio",
  document: "📄 Documento",
  sticker: "🔖 Figurinha",
}

const getMediaUrl = (messageId: string, options?: { thumb?: boolean }) =>
  `/api/whatsapp/media/${messageId}${options?.thumb ? "?thumb=1" : ""}`

function parseMessageMetadata(value: unknown): Record<string, unknown> | null {
  if (!value) return null
  if (typeof value === "string") {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }
  if (typeof value === "object") {
    return value as Record<string, unknown>
  }
  return null
}

function normalizeMessage(raw: any): Message {
  return {
    id: raw.id,
    direction: raw.direction,
    content: raw.content || "",
    createdAt: raw.createdAt,
    isRead: Boolean(raw.isRead),
    messageType: raw.messageType || "text",
    mediaUrl: raw.mediaUrl ?? null,
    metadata: parseMessageMetadata(raw.metadata),
  }
}

function normalizeConversation(raw: any): Conversation {
  return {
    ...raw,
    messages: Array.isArray(raw.messages) ? raw.messages.map(normalizeMessage) : [],
  }
}

function getMessagePreview(message?: Message | null) {
  if (!message) return "Sem mensagens"
  const isAttachment = message.mediaUrl && message.messageType && message.messageType !== "text"
  if (isAttachment) {
    const label = MEDIA_LABELS[message.messageType!] || "📎 Anexo"
    return message.direction === "outgoing" ? `Você: ${label}` : label
  }
  return `${message.direction === "outgoing" ? "Você: " : ""}${message.content}`
}

function formatFileSize(bytes?: unknown): string | null {
  if (typeof bytes !== "number" || Number.isNaN(bytes) || bytes <= 0) return null
  const units = ["KB", "MB", "GB"]
  let size = bytes / 1024
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

function formatDuration(seconds?: unknown): string | null {
  if (typeof seconds !== "number" || Number.isNaN(seconds) || seconds <= 0) return null
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

function hasMediaPayload(msg: Message): boolean {
  return Boolean(msg.mediaUrl && msg.messageType && msg.messageType !== "text")
}

export default function WhatsAppPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [templates, setTemplates] = useState<Template[]>([])
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({})
  const [templatePreview, setTemplatePreview] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadConversations = async () => {
    try {
      const res = await fetch("/api/whatsapp/conversations")
      const data = await res.json()
      if (data.success) {
        const convs = data.data.conversations.map(normalizeConversation)
        setConversations(convs)
        // Atualizar a conversa selecionada se ela existir na nova lista
        if (selected) {
          const updatedSelected = convs.find((c: Conversation) => c.id === selected.id)
          if (updatedSelected) {
            setSelected(updatedSelected)
          }
        } else if (convs.length > 0) {
          setSelected(convs[0])
        }
      }
    } catch (err) {
      console.error("Erro ao carregar conversas:", err)
    }
  }

  const syncConversations = async () => {
    setIsSyncing(true)
    try {
      await loadConversations()
    } catch (err) {
      console.error("Erro ao sincronizar:", err)
    } finally {
      setIsSyncing(false)
    }
  }

  const [isSyncingPics, setIsSyncingPics] = useState(false)
  const syncProfilePics = async () => {
    setIsSyncingPics(true)
    try {
      await fetch("/api/whatsapp/debug", { method: "POST" })
      // Recarrega após 12s para dar tempo do sync completar
      setTimeout(() => loadConversations(), 12000)
    } catch (err) {
      console.error("Erro ao sincronizar fotos:", err)
    } finally {
      setTimeout(() => setIsSyncingPics(false), 12000)
    }
  }

  useEffect(() => {
    async function init() {
      // Ensure Baileys session is initialized before fetching conversations
      try {
        await fetch("/api/whatsapp/connect")
      } catch { /* ignore - connect handles its own errors */ }
      await loadConversations()
      setIsLoading(false)
    }
    init()
  }, [])

  const fetchTemplates = async () => {
    if (templates.length > 0 || templateLoading) return
    try {
      setTemplateLoading(true)
      const res = await fetch("/api/templates")
      const data = await res.json()
      if (data.success) {
        setTemplates(data.data.templates)
      }
    } catch (err) {
      console.error("Erro ao carregar templates:", err)
    } finally {
      setTemplateLoading(false)
    }
  }

  // Scroll automático quando mensagens mudam ou conversa é selecionada
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [selected?.messages?.length])

  // SSE para atualizações em tempo real (Baileys push) + fallback polling
  useEffect(() => {
    let eventSource: EventSource | null = null
    let pollInterval: NodeJS.Timeout | null = null
    let sseConnected = false

    const handleNewMessage = (msgData: any) => {
      const newMsg = normalizeMessage(msgData)

      // Atualizar a conversa com a nova mensagem
      setConversations((prev) => {
        // Verificar se a conversa existe
        const convExists = prev.some((conv) => conv.id === msgData.conversationId)
        
        if (!convExists) {
          // Nova conversa - recarregar lista completa
          loadConversations()
          return prev
        }

        const updated = prev.map((conv) => {
          if (conv.id === msgData.conversationId) {
            // Verificar se a mensagem já existe
            const exists = conv.messages.some((m) => m.id === newMsg.id)
            if (exists) return conv
            return {
              ...conv,
              messages: [...conv.messages, newMsg],
              lastMessageAt: newMsg.createdAt,
              unreadCount: msgData.direction === "incoming" ? conv.unreadCount + 1 : conv.unreadCount,
            }
          }
          return conv
        })
        // Reordenar por última mensagem
        return updated.sort((a, b) => 
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        )
      })

      // Atualizar conversa selecionada se for a mesma
      setSelected((prev) => {
        if (prev && prev.id === msgData.conversationId) {
          const exists = prev.messages.some((m) => m.id === newMsg.id)
          if (exists) return prev
          return {
            ...prev,
            messages: [...prev.messages, newMsg],
            lastMessageAt: newMsg.createdAt,
          }
        }
        return prev
      })
    }

    const handleStatusUpdate = (statusData: any) => {
      if (!statusData?.id) return
      const conversationId = statusData.conversationId as string | undefined

      setConversations((prev) =>
        prev.map((conv) => {
          if (conversationId && conv.id !== conversationId) return conv
          const updatedMessages = conv.messages.map((msg) =>
            msg.id === statusData.id ? { ...msg, isRead: Boolean(statusData.isRead) } : msg
          )
          return {
            ...conv,
            messages: updatedMessages,
          }
        })
      )

      setSelected((prev) => {
        if (!prev || (conversationId && prev.id !== conversationId)) return prev
        const updatedMessages = prev.messages.map((msg) =>
          msg.id === statusData.id ? { ...msg, isRead: Boolean(statusData.isRead) } : msg
        )
        return { ...prev, messages: updatedMessages }
      })
    }

    const setupSSE = () => {
      try {
        eventSource = new EventSource("/api/whatsapp/events")
        
        eventSource.onopen = () => {
          console.log("[SSE] Conectado")
          sseConnected = true
          // Parar polling se estava ativo
          if (pollInterval) {
            clearInterval(pollInterval)
            pollInterval = null
          }
        }
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === "new_messages" && data.messages) {
              // Atualização incremental para cada mensagem
              for (const msg of data.messages) {
                handleNewMessage(msg)
              }
            } else if (data.type === "new_message") {
              handleNewMessage(data)
            } else if (data.type === "message_status") {
              handleStatusUpdate(data)
            }
          } catch (e) {
            console.error("Erro ao processar SSE:", e)
          }
        }

        eventSource.onerror = () => {
          console.warn("[SSE] Desconectado, usando polling fallback")
          sseConnected = false
          eventSource?.close()
          eventSource = null
          startPolling()
        }
      } catch {
        startPolling()
      }
    }

    const startPolling = () => {
      if (pollInterval || sseConnected) return
      console.log("[Polling] Iniciando polling a cada 3s")
      pollInterval = setInterval(async () => {
        try {
          await loadConversations()
        } catch (err) {
          console.error("Erro no polling:", err)
        }
      }, 3000)
    }

    setupSSE()

    return () => {
      eventSource?.close()
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [])

  const [isSending, setIsSending] = useState(false)

  const getTemplatePlaceholders = (tpl?: Template | null) => {
    if (!tpl) return [] as string[]
    try {
      return JSON.parse(tpl.variables || "[]") as string[]
    } catch {
      return [] as string[]
    }
  }

  const updateTemplatePreview = (tpl: Template | null, vars: Record<string, string>) => {
    if (!tpl) {
      setTemplatePreview("")
      return
    }
    const placeholders = getTemplatePlaceholders(tpl)
    const preview = placeholders.reduce((text, key) => {
      const value = vars[key] || ""
      const pattern = new RegExp(`{{\\s*${key}\\s*}}`, "g")
      return text.replace(pattern, value)
    }, tpl.content)
    setTemplatePreview(preview)
    setNewMessage(preview)
  }

  const handleTemplateButton = () => {
    fetchTemplates()
    setIsTemplateModalOpen(true)
  }

  const handleTemplateSelect = (tpl: Template) => {
    setSelectedTemplate(tpl)
    const placeholders = getTemplatePlaceholders(tpl)
    const defaultVars = placeholders.reduce<Record<string, string>>((acc, key) => {
      acc[key] = templateVars[key] || ""
      return acc
    }, {})
    setTemplateVars(defaultVars)
    updateTemplatePreview(tpl, defaultVars)
  }

  const handleTemplateVarChange = (key: string, value: string) => {
    const updated = { ...templateVars, [key]: value }
    setTemplateVars(updated)
    updateTemplatePreview(selectedTemplate, updated)
  }

  const clearTemplate = () => {
    setSelectedTemplate(null)
    setTemplateVars({})
    setTemplatePreview("")
    setNewMessage("")
  }

  const handleSend = async () => {
    const text = newMessage.trim()
    if ((!text && !selectedTemplate) || !selected || isSending) return
    setNewMessage("")

    const msg: Message = {
      id: `temp-${Date.now()}`,
      direction: "outgoing",
      content: text,
      createdAt: new Date().toISOString(),
      isRead: false,
    }
    setSelected({ ...selected, messages: [...selected.messages, msg] })
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selected.id
          ? { ...c, messages: [...c.messages, msg], lastMessageAt: msg.createdAt }
          : c
      )
    )

    try {
      setIsSending(true)
      const payload: Record<string, unknown> = { leadId: selected.lead.id }
      if (selectedTemplate) {
        payload.templateId = selectedTemplate.id
        payload.variables = templateVars
      } else {
        payload.message = text
      }
      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (selectedTemplate) {
        clearTemplate()
      }
      if (!response.ok) {
        console.error("Erro ao enviar template", await response.text())
      }
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err)
    } finally {
      setIsSending(false)
    }
  }

  const handleSelectConversation = async (conv: Conversation) => {
    setSelected(conv)
    
    // Mark as read if there are unread messages
    if (conv.unreadCount > 0) {
      try {
        await fetch(`/api/whatsapp/conversations/${conv.id}/read`, { method: "POST" })
        // Update local state to clear unread count
        setConversations((prev) =>
          prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
        )
      } catch (err) {
        console.error("Erro ao marcar como lida:", err)
      }
    }
  }

  const filtered = conversations.filter((c) =>
    !searchTerm || c.lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.lead.phone?.includes(searchTerm)
  )

  const formatTime = (date: string) => {
    const d = new Date(date)
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div><Skeleton className="h-8 w-36 mb-2" /><Skeleton className="h-4 w-56" /></div>
        <Card className="flex overflow-hidden" style={{ height: "calc(100vh - 220px)" }}>
          <div className="w-80 flex-shrink-0 border-r flex flex-col">
            <div className="p-3 border-b"><Skeleton className="h-9 w-full" /></div>
            <div className="flex-1 space-y-0">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-3 border-b">
                  <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                  <div className="flex-1"><Skeleton className="h-4 w-28 mb-1" /><Skeleton className="h-3 w-40" /></div>
                  <Skeleton className="h-3 w-10" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center"><Skeleton className="h-16 w-16 rounded-full" /></div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-h3 font-bold" data-testid="heading-whatsapp">
            WhatsApp
          </h1>
          <p className="text-muted-foreground">Gerencie suas conversas do WhatsApp</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={syncConversations} disabled={isSyncing} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Atualizando..." : "Atualizar"}
          </Button>
          <Button onClick={syncProfilePics} disabled={isSyncingPics} variant="outline" size="sm" title="Buscar fotos de perfil dos contatos">
            <User className={`h-4 w-4 mr-1.5 ${isSyncingPics ? "animate-pulse" : ""}`} />
            {isSyncingPics ? "Buscando fotos..." : "Sync Fotos"}
          </Button>
          <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleTemplateButton}>
                <FileText className="h-4 w-4 mr-1.5" /> Templates
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Inserir template</DialogTitle>
                <DialogDescription>
                  Escolha um template pronto e personalize as variáveis antes de enviar.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {templateLoading && (
                  <p className="text-sm text-muted-foreground">Carregando templates...</p>
                )}
                {!templateLoading && templates.length === 0 && (
                  <div className="rounded border border-dashed p-4 text-sm text-muted-foreground">
                    Nenhum template cadastrado. Crie templates em Configurações &gt; Templates.
                  </div>
                )}
                {!templateLoading && templates.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Templates disponíveis</p>
                    <div className="space-y-2">
                      {templates.map((tpl) => (
                        <button
                          key={tpl.id}
                          type="button"
                          className={`w-full rounded-md border px-3 py-2 text-left transition hover:border-primary ${
                            selectedTemplate?.id === tpl.id ? "border-primary bg-primary/5" : "border-[var(--border)]"
                          }`}
                          onClick={() => handleTemplateSelect(tpl)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">{tpl.name}</span>
                            {tpl.category && (
                              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                {tpl.category}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{tpl.content}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {selectedTemplate && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Variáveis do template</p>
                    {getTemplatePlaceholders(selectedTemplate).length === 0 ? (
                      <p className="text-xs text-muted-foreground">Este template não possui variáveis dinâmicas.</p>
                    ) : (
                      <div className="space-y-2">
                        {getTemplatePlaceholders(selectedTemplate).map((key) => (
                          <div key={key} className="space-y-1">
                            <Label className="text-xs font-medium">{`{{${key}}}`}</Label>
                            <Input
                              value={templateVars[key] || ""}
                              onChange={(e) => handleTemplateVarChange(key, e.target.value)}
                              placeholder={`Valor para ${key}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    {templatePreview && (
                      <div className="rounded-md border border-[var(--border)] bg-muted/30 p-3 text-sm">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Prévia</p>
                        <p className="whitespace-pre-wrap text-sm">{templatePreview}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                {selectedTemplate && (
                  <Button variant="ghost" onClick={clearTemplate} className="text-destructive hover:text-destructive">
                    <X className="mr-1.5 h-4 w-4" /> Remover template
                  </Button>
                )}
                <Button onClick={() => setIsTemplateModalOpen(false)} disabled={!selectedTemplate}>
                  Aplicar template
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="flex overflow-hidden" style={{ height: "calc(100vh - 220px)" }}>
        {/* Lista de conversas */}
        <div className="w-80 flex-shrink-0 border-r flex flex-col">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conversas..."
                className="pl-8 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                Nenhuma conversa encontrada
              </div>
            ) : (
              filtered.map((conv) => (
                <div
                  key={conv.id}
                  className={`flex items-center gap-3 px-3 py-3 cursor-pointer border-b hover:bg-muted/50 transition-colors ${
                    selected?.id === conv.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                  }`}
                  onClick={() => handleSelectConversation(conv)}
                >
                  <div className="relative flex-shrink-0">
                    {conv.lead.profilePicUrl ? (
                      <img
                        src={conv.lead.profilePicUrl}
                        alt={conv.lead.name}
                        className="h-10 w-10 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.removeAttribute("style") }}
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white text-sm font-bold">
                        {getInitials(conv.lead.name)}
                      </div>
                    )}
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate ${conv.unreadCount > 0 ? "font-bold" : "font-medium"}`}>
                        {conv.lead.name}
                      </p>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {formatTime(conv.lastMessageAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.messages.length > 0
                        ? `${conv.messages[conv.messages.length - 1].direction === "outgoing" ? "Você: " : ""}${conv.messages[conv.messages.length - 1].content}`
                        : "Sem mensagens"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Área do chat */}
        {selected ? (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-3 border-b px-4 py-3 bg-card">
              {selected.lead.profilePicUrl ? (
                <img
                  src={selected.lead.profilePicUrl}
                  alt={selected.lead.name}
                  className="h-10 w-10 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.removeAttribute("style") }}
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white text-sm font-bold">
                  {getInitials(selected.lead.name)}
                </div>
              )}
              <div className="flex-1">
                <p className="font-semibold text-sm">{selected.lead.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                  {selected.lead.phone || selected.lead.whatsappNumber || "WhatsApp"}
                  {selected.lead.companyName && ` · ${selected.lead.companyName}`}
                </p>
              </div>
              <Button variant="ghost" size="icon">
                <Phone className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <User className="h-4 w-4" />
              </Button>
            </div>

            <div
              className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b141a] dark:bg-[#0b141a]"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
              }}
            >
              {selected.messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.direction === "outgoing" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[70%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                      msg.direction === "outgoing"
                        ? "bg-[#005c4b] text-white rounded-tr-none"
                        : "bg-[#202c33] text-white rounded-tl-none"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p
                      className={`text-[10px] mt-1 flex items-center gap-1 ${
                        msg.direction === "outgoing" ? "justify-end" : "justify-start"
                      } ${msg.direction === "outgoing" ? "text-gray-200" : "text-gray-400"}`}
                    >
                      {msg.direction === "outgoing" && (
                        <CheckCheck
                          className={`h-3 w-3 ${msg.isRead ? "text-sky-400" : "text-gray-400"}`}
                        />
                      )}
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t p-3 space-y-2 bg-card">
              {selectedTemplate && (
                <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
                  <div>
                    <p className="font-semibold text-foreground">Template aplicado: {selectedTemplate.name}</p>
                    <p className="text-muted-foreground text-[11px]">
                      Edite os valores e envie quando estiver pronto.
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearTemplate}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleTemplateButton}>
                  <Plus className="h-4 w-4 mr-1" /> Template
                </Button>
                <span className="text-xs text-muted-foreground">ou digite uma mensagem abaixo</span>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Digite uma mensagem..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={(selectedTemplate ? false : !newMessage.trim()) || isSending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="mx-auto mb-4 h-16 w-16 opacity-30" />
              <p className="text-lg font-medium">Selecione uma conversa</p>
              <p className="text-sm">Escolha uma conversa à esquerda para começar</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

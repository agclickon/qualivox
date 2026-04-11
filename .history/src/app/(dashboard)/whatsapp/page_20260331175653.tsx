"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useTheme } from "next-themes"
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
  Paperclip,
  Image,
  Video,
  Mic,
  Reply,
  Smile,
  Trash2,
  ChevronDown,
  Camera,
  FileAudio,
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

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"]

const getMediaUrl = (messageId: string, options?: { thumb?: boolean }) =>
  `/api/whatsapp/media/${messageId}${options?.thumb ? "?thumb=1" : ""}`

function parseMessageMetadata(value: unknown): Record<string, unknown> | null {
  if (!value) return null
  if (typeof value === "string") {
    try { return JSON.parse(value) } catch { return null }
  }
  if (typeof value === "object") return value as Record<string, unknown>
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
  return { ...raw, messages: Array.isArray(raw.messages) ? raw.messages.map(normalizeMessage) : [] }
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
  while (size >= 1024 && unitIndex < units.length - 1) { size /= 1024; unitIndex++ }
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

// ─── VoiceMessagePlayer ──────────────────────────────────────────────────────

type VoiceMessagePlayerProps = { src: string; mimeType?: string | null; duration?: number; direction: MessageDirection }

function VoiceMessagePlayer({ src, mimeType, duration, direction }: VoiceMessagePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(duration || 0)
  const [speed, setSpeed] = useState(1)

  const handleToggle = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) { audio.pause(); setIsPlaying(false); return }
    try { await audio.play(); setIsPlaying(true) } catch (err) { console.error("Erro ao reproduzir áudio:", err) }
  }, [isPlaying])

  const handleSpeedToggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1
    audio.playbackRate = next
    setSpeed(next)
  }, [speed])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const handleLoaded = () => { if (!Number.isNaN(audio.duration)) setTotalDuration(audio.duration) }
    const handleTime = () => setCurrentTime(audio.currentTime)
    const handleEnded = () => { setIsPlaying(false); setCurrentTime(0) }
    audio.addEventListener("loadedmetadata", handleLoaded)
    audio.addEventListener("timeupdate", handleTime)
    audio.addEventListener("ended", handleEnded)
    return () => {
      audio.removeEventListener("loadedmetadata", handleLoaded)
      audio.removeEventListener("timeupdate", handleTime)
      audio.removeEventListener("ended", handleEnded)
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause(); audio.currentTime = 0; setIsPlaying(false); setCurrentTime(0)
  }, [src])

  const formattedCurrent = formatDuration(currentTime) || "0:00"
  const formattedTotal = formatDuration(totalDuration) || (duration ? formatDuration(duration) : "0:00")
  const waveformHeights = [18, 12, 22, 10, 26, 16, 24, 8, 18, 20, 14, 22, 12, 25, 9, 21, 13, 24, 11, 19, 15, 23, 12, 18]
  const accentColor = direction === "outgoing" ? "#25d366" : "#d1d5db"
  const progress = totalDuration > 0 ? Math.min(currentTime / totalDuration, 1) : 0

  return (
    <div className="mb-2 rounded-xl bg-black/10 px-3 py-2 text-white">
      <div className="flex items-center gap-3">
        <button type="button" onClick={handleToggle}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur">
          {isPlaying ? (
            <span className="flex gap-[4px]">
              <span className="inline-block h-[14px] w-[3px] rounded-sm bg-white" />
              <span className="inline-block h-[14px] w-[3px] rounded-sm bg-white" />
            </span>
          ) : (
            <span className="ml-1 inline-block h-0 w-0 border-y-[7px] border-y-transparent border-l-[10px] border-l-white" />
          )}
        </button>
        <div className="flex-1">
          <div className="flex items-end gap-1">
            {waveformHeights.map((height, index) => {
              const barPosition = index / waveformHeights.length
              const isPlayed = progress >= barPosition
              return (
                <span key={`${height}-${index}`} className="inline-block w-[3px] rounded-full"
                  style={{ height: `${height}px`, backgroundColor: isPlayed ? accentColor : "rgba(255,255,255,0.4)", opacity: isPlayed ? 0.9 : 0.5 }} />
              )
            })}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-white/70">
            <span>{formattedCurrent}</span>
            <button type="button" onClick={handleSpeedToggle}
              className="rounded px-1 text-[10px] font-bold text-white/60 hover:text-white transition-colors border border-white/20 hover:border-white/40">
              {speed}x
            </button>
            <span>{formattedTotal}</span>
          </div>
        </div>
      </div>
      <audio ref={audioRef} src={src} preload="metadata">
        <source src={src} type={mimeType || "audio/ogg"} />
      </audio>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMetadataString(meta: Record<string, unknown> | null | undefined, key: string) {
  const value = meta?.[key]
  return typeof value === "string" ? value : undefined
}

function getMetadataNumber(meta: Record<string, unknown> | null | undefined, key: string) {
  const value = meta?.[key]
  return typeof value === "number" ? value : undefined
}

function renderMediaContent(msg: Message) {
  if (!hasMediaPayload(msg) || !msg.mediaUrl) return null
  const metadata = msg.metadata ?? null
  const fileName = getMetadataString(metadata, "fileName")
  const mimeType = getMetadataString(metadata, "mimeType")
  const thumbPath = getMetadataString(metadata, "thumbPath")
  const duration = getMetadataNumber(metadata, "seconds")
  const fileSize = getMetadataNumber(metadata, "fileSize")
  const formattedSize = formatFileSize(fileSize || undefined)
  const label = MEDIA_LABELS[msg.messageType || ""] || "📎 Anexo"

  const downloadButton = (
    <a href={getMediaUrl(msg.id)} download={fileName || undefined}
      className="inline-flex items-center gap-1 text-xs font-medium text-white/80 hover:text-white">
      <Download className="h-3 w-3" /> Baixar
    </a>
  )

  switch (msg.messageType) {
    case "image":
    case "sticker":
      return (
        <div className="mb-2 overflow-hidden rounded-lg bg-black/20">
          <img src={getMediaUrl(msg.id)} alt={fileName || label} className="max-h-72 w-full object-cover" />
        </div>
      )
    case "video":
      return (
        <div className="mb-2 overflow-hidden rounded-lg bg-black/20">
          <video controls preload="metadata" poster={thumbPath ? getMediaUrl(msg.id, { thumb: true }) : undefined} className="w-full max-h-80">
            <source src={getMediaUrl(msg.id)} type={mimeType || "video/mp4"} />
          </video>
        </div>
      )
    case "audio":
      return (
        <div className="mb-2 text-xs text-white/90 space-y-2">
          <VoiceMessagePlayer src={getMediaUrl(msg.id)} mimeType={mimeType} duration={duration} direction={msg.direction} />
          <div className="flex items-center justify-between text-[11px] text-white/70">
            <span>{fileName || "Mensagem de voz"}</span>
            {formattedSize && <span>{formattedSize}</span>}
          </div>
        </div>
      )
    case "document":
      return (
        <div className="mb-2 rounded-lg bg-black/20 p-3 text-sm text-white flex items-start gap-3">
          <FileText className="h-5 w-5 flex-shrink-0 text-white/80" />
          <div className="flex-1">
            <p className="font-semibold">{fileName || "Documento"}</p>
            <p className="text-xs text-white/60">{mimeType || "Arquivo"}{formattedSize ? ` · ${formattedSize}` : ""}</p>
            <div className="mt-2">{downloadButton}</div>
          </div>
        </div>
      )
    default:
      return (
        <div className="mb-2 rounded-lg bg-black/20 p-3 text-xs text-white/80 flex items-center justify-between">
          <span>{fileName || label}</span>
          {downloadButton}
        </div>
      )
  }
}

// ─── AttachmentMenu ───────────────────────────────────────────────────────────

type AttachMenuProps = {
  onFile: (file: File, type: string) => void
}

function AttachmentMenu({ onFile }: AttachMenuProps) {
  const [open, setOpen] = useState(false)
  const docRef = useRef<HTMLInputElement>(null)
  const mediaRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLInputElement>(null)

  const pick = (ref: React.RefObject<HTMLInputElement | null>) => {
    setOpen(false)
    ref.current?.click()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, forceType?: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    const type = forceType || (file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "document")
    onFile(file, type)
    e.target.value = ""
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
        <Paperclip className="h-5 w-5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-11 left-0 z-20 flex flex-row gap-2 rounded-2xl bg-card border border-border shadow-xl p-3">
            <AttachItem icon={<FileText className="h-4 w-4" />} label="Documento" color="bg-blue-500" onClick={() => pick(docRef)} />
            <AttachItem icon={<Image className="h-4 w-4" />} label="Fotos e vídeos" color="bg-purple-500" onClick={() => pick(mediaRef)} />
            <AttachItem icon={<FileAudio className="h-4 w-4" />} label="Áudio" color="bg-orange-500" onClick={() => pick(audioRef)} />
          </div>
        </>
      )}

      <input ref={docRef} type="file" className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
        onChange={(e) => handleChange(e, "document")} />
      <input ref={mediaRef} type="file" className="hidden"
        accept="image/*,video/*"
        onChange={(e) => handleChange(e)} />
      <input ref={audioRef} type="file" className="hidden"
        accept="audio/*"
        onChange={(e) => handleChange(e, "audio")} />
    </div>
  )
}

function AttachItem({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-xl px-3 py-2 text-xs hover:bg-muted transition-colors w-20">
      <span className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${color}`}>{icon}</span>
      <span className="text-center leading-tight">{label}</span>
    </button>
  )
}

// ─── VoiceRecorder ────────────────────────────────────────────────────────────

type VoiceRecorderProps = {
  onSend: (blob: Blob, mimeType: string) => void
  onCancel: () => void
}

function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const [elapsed, setElapsed] = useState(0)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    let stream: MediaStream | null = null
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const recorder = new MediaRecorder(stream)
        mediaRef.current = recorder
        chunksRef.current = []
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
        recorder.start(100)
        timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
      } catch (err) {
        console.error("Erro ao acessar microfone:", err)
        onCancel()
      }
    })()

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const handleSend = () => {
    const recorder = mediaRef.current
    if (!recorder) return
    recorder.onstop = () => {
      const mimeType = recorder.mimeType || "audio/webm"
      const blob = new Blob(chunksRef.current, { type: mimeType })
      onSend(blob, mimeType)
    }
    recorder.stop()
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const handleCancel = () => {
    const recorder = mediaRef.current
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null
      recorder.stop()
    }
    if (timerRef.current) clearInterval(timerRef.current)
    onCancel()
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`

  return (
    <div className="flex items-center gap-3 flex-1 bg-red-500/10 rounded-full px-4 py-1">
      <button type="button" onClick={handleCancel}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors">
        <Trash2 className="h-4 w-4 text-destructive" />
      </button>
      <span className="flex items-center gap-2 flex-1 text-sm text-red-500 font-medium">
        <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        Gravando {fmt(elapsed)}
      </span>
      <button type="button" onClick={handleSend}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 hover:bg-green-700 transition-colors shadow-md">
        <Send className="h-4 w-4 text-white" />
      </button>
    </div>
  )
}

// ─── ReactionPicker ───────────────────────────────────────────────────────────

function ReactionPicker({ onReact, onClose }: { onReact: (emoji: string) => void; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute -top-12 left-0 z-20 flex items-center gap-1 rounded-full bg-card border border-border shadow-xl px-2 py-1">
        {QUICK_REACTIONS.map((emoji) => (
          <button key={emoji} type="button" onClick={() => { onReact(emoji); onClose() }}
            className="text-xl hover:scale-125 transition-transform p-0.5">
            {emoji}
          </button>
        ))}
      </div>
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

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
  const [isSending, setIsSending] = useState(false)
  const [isSyncingPics, setIsSyncingPics] = useState(false)

  // Reply
  const [replyTo, setReplyTo] = useState<Message | null>(null)

  // Voice recording
  const [isRecording, setIsRecording] = useState(false)

  // Media upload
  const [uploadingMedia, setUploadingMedia] = useState(false)

  // Context menu / reactions
  const [menuMsg, setMenuMsg] = useState<Message | null>(null)
  const [reactingMsg, setReactingMsg] = useState<Message | null>(null)
  // msgId → list of emojis reacted
  const [reactions, setReactions] = useState<Record<string, string[]>>({})

  // Scroll-to-bottom
  const [showScrollDown, setShowScrollDown] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { resolvedTheme } = useTheme()
  const [themeReady, setThemeReady] = useState(false)

  useEffect(() => { setThemeReady(true) }, [])

  const chatBackgroundUrl = useMemo(() => {
    if (!themeReady) return null
    return resolvedTheme === "light"
      ? "/background/fundo-whatsapp-claro.webp"
      : "/background/fundo-whatsapp-escuro.webp"
  }, [resolvedTheme, themeReady])

  // ── Scroll detection ───────────────────────────────────────────────────────

  const handleMessagesScroll = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowScrollDown(distFromBottom > 120)
  }, [])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }, [])

  // ── Conversations ──────────────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/conversations")
      const data = await res.json()
      if (data.success) {
        const convs = data.data.conversations.map(normalizeConversation)
        setConversations(convs)
        setSelected((prev) => {
          if (!prev) return convs.length > 0 ? convs[0] : null
          return convs.find((c: Conversation) => c.id === prev.id) ?? prev
        })
      }
    } catch (err) {
      console.error("Erro ao carregar conversas:", err)
    }
  }, [])

  const syncConversations = async () => {
    setIsSyncing(true)
    try { await loadConversations() } catch (err) { console.error(err) } finally { setIsSyncing(false) }
  }

  const syncProfilePics = async () => {
    setIsSyncingPics(true)
    try {
      await fetch("/api/whatsapp/debug", { method: "POST" })
      setTimeout(() => loadConversations(), 12000)
    } catch (err) { console.error(err) }
    finally { setTimeout(() => setIsSyncingPics(false), 12000) }
  }

  useEffect(() => {
    async function init() {
      try { await fetch("/api/whatsapp/connect") } catch { /* ignore */ }
      await loadConversations()
      setIsLoading(false)
    }
    init()
  }, [loadConversations])

  // Auto-scroll when messages change
  useEffect(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distFromBottom < 200) scrollToBottom()
    else setShowScrollDown(true)
  }, [selected?.messages?.length, scrollToBottom])

  // ── Templates ──────────────────────────────────────────────────────────────

  const fetchTemplates = async () => {
    if (templates.length > 0 || templateLoading) return
    try {
      setTemplateLoading(true)
      const res = await fetch("/api/templates")
      const data = await res.json()
      if (data.success) setTemplates(data.data.templates)
    } catch (err) { console.error(err) } finally { setTemplateLoading(false) }
  }

  const getTemplatePlaceholders = (tpl?: Template | null) => {
    if (!tpl) return [] as string[]
    try { return JSON.parse(tpl.variables || "[]") as string[] } catch { return [] as string[] }
  }

  const updateTemplatePreview = (tpl: Template | null, vars: Record<string, string>) => {
    if (!tpl) { setTemplatePreview(""); return }
    const placeholders = getTemplatePlaceholders(tpl)
    const preview = placeholders.reduce((text, key) => {
      return text.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), vars[key] || "")
    }, tpl.content)
    setTemplatePreview(preview)
    setNewMessage(preview)
  }

  const handleTemplateSelect = (tpl: Template) => {
    setSelectedTemplate(tpl)
    const placeholders = getTemplatePlaceholders(tpl)
    const defaultVars = placeholders.reduce<Record<string, string>>((acc, key) => { acc[key] = templateVars[key] || ""; return acc }, {})
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

  // ── Send text ──────────────────────────────────────────────────────────────

  const handleSend = async () => {
    const text = newMessage.trim()
    if ((!text && !selectedTemplate) || !selected || isSending) return
    setNewMessage("")
    setReplyTo(null)

    const msg: Message = {
      id: `temp-${Date.now()}`,
      direction: "outgoing",
      content: text,
      createdAt: new Date().toISOString(),
      isRead: false,
      messageType: "text",
      mediaUrl: null,
      metadata: replyTo
        ? { quotedContent: replyTo.content || MEDIA_LABELS[replyTo.messageType || ""] || "Anexo" }
        : null,
    }
    setSelected((s) => s ? { ...s, messages: [...s.messages, msg] } : s)
    setConversations((prev) =>
      prev.map((c) => c.id === selected.id ? { ...c, messages: [...c.messages, msg], lastMessageAt: msg.createdAt } : c)
    )

    try {
      setIsSending(true)
      const payload: Record<string, unknown> = { leadId: selected.lead.id }
      if (selectedTemplate) { payload.templateId = selectedTemplate.id; payload.variables = templateVars }
      else { payload.message = text }
      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (selectedTemplate) clearTemplate()
      if (!response.ok) console.error("Erro ao enviar:", await response.text())
    } catch (err) { console.error(err) } finally { setIsSending(false) }
  }

  // ── Send media ─────────────────────────────────────────────────────────────

  const handleSendMedia = useCallback(async (file: File, mediaType: string) => {
    if (!selected) return
    setUploadingMedia(true)

    // Optimistic placeholder
    const tempId = `temp-media-${Date.now()}`
    const tempMsg: Message = {
      id: tempId,
      direction: "outgoing",
      content: file.name,
      createdAt: new Date().toISOString(),
      isRead: false,
      messageType: mediaType,
      mediaUrl: null,
      metadata: { fileName: file.name, fileSize: file.size, mimeType: file.type },
    }
    setSelected((s) => s ? { ...s, messages: [...s.messages, tempMsg] } : s)

    try {
      const form = new FormData()
      form.append("leadId", selected.lead.id)
      form.append("file", file)
      const response = await fetch("/api/whatsapp/send/media", { method: "POST", body: form })
      if (!response.ok) console.error("Erro ao enviar mídia:", await response.text())
      // Reload to get real message with mediaUrl
      setTimeout(() => loadConversations(), 1500)
    } catch (err) { console.error(err) } finally { setUploadingMedia(false) }
  }, [selected, loadConversations])

  // ── Send voice ─────────────────────────────────────────────────────────────

  const handleVoiceSend = useCallback(async (blob: Blob, mimeType: string) => {
    setIsRecording(false)
    if (!selected) return
    const ext = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "mp4" : "webm"
    const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeType })
    await handleSendMedia(file, "audio")
  }, [selected, handleSendMedia])

  // ── Delete message ─────────────────────────────────────────────────────────

  const handleDeleteMessage = useCallback((msg: Message) => {
    setMenuMsg(null)
    // Soft-delete locally (backend soft-delete would require a separate route)
    setSelected((s) => s ? { ...s, messages: s.messages.filter((m) => m.id !== msg.id) } : s)
    setConversations((prev) =>
      prev.map((c) => ({ ...c, messages: c.messages.filter((m) => m.id !== msg.id) }))
    )
  }, [])

  // ── Conversation selection ─────────────────────────────────────────────────

  const handleSelectConversation = async (conv: Conversation) => {
    setSelected(conv)
    setReplyTo(null)
    setMenuMsg(null)
    setReactingMsg(null)
    if (conv.unreadCount > 0) {
      try {
        await fetch(`/api/whatsapp/conversations/${conv.id}/read`, { method: "POST" })
        setConversations((prev) => prev.map((c) => c.id === conv.id ? { ...c, unreadCount: 0 } : c))
      } catch (err) { console.error(err) }
    }
  }

  // ── SSE + polling ──────────────────────────────────────────────────────────

  useEffect(() => {
    let eventSource: EventSource | null = null
    let pollInterval: NodeJS.Timeout | null = null
    let sseConnected = false

    const handleNewMessage = (msgData: any) => {
      const newMsg = normalizeMessage(msgData)
      setConversations((prev) => {
        if (!prev.some((conv) => conv.id === msgData.conversationId)) {
          loadConversations()
          return prev
        }
        const updated = prev.map((conv) => {
          if (conv.id !== msgData.conversationId) return conv
          if (conv.messages.some((m) => m.id === newMsg.id)) return conv
          return { ...conv, messages: [...conv.messages, newMsg], lastMessageAt: newMsg.createdAt, unreadCount: msgData.direction === "incoming" ? conv.unreadCount + 1 : conv.unreadCount }
        })
        return updated.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
      })
      setSelected((prev) => {
        if (!prev || prev.id !== msgData.conversationId) return prev
        if (prev.messages.some((m) => m.id === newMsg.id)) return prev
        return { ...prev, messages: [...prev.messages, newMsg], lastMessageAt: newMsg.createdAt }
      })
      if (newMsg.mediaUrl || (newMsg.messageType && newMsg.messageType !== "text")) void loadConversations()
    }

    const handleStatusUpdate = (statusData: any) => {
      if (!statusData?.id) return
      const updateMessages = (msgs: Message[]) => msgs.map((msg) => msg.id === statusData.id ? { ...msg, isRead: Boolean(statusData.isRead) } : msg)
      setConversations((prev) => prev.map((conv) => ({ ...conv, messages: updateMessages(conv.messages) })))
      setSelected((prev) => prev ? { ...prev, messages: updateMessages(prev.messages) } : prev)
    }

    const setupSSE = () => {
      try {
        eventSource = new EventSource("/api/whatsapp/events")
        eventSource.onopen = () => { sseConnected = true; if (pollInterval) { clearInterval(pollInterval); pollInterval = null } }
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === "new_messages" && data.messages) data.messages.forEach(handleNewMessage)
            else if (data.type === "new_message") handleNewMessage(data)
            else if (data.type === "message_status") handleStatusUpdate(data)
          } catch (e) { console.error("Erro SSE:", e) }
        }
        eventSource.onerror = () => { sseConnected = false; eventSource?.close(); eventSource = null; startPolling() }
      } catch { startPolling() }
    }

    const startPolling = () => {
      if (pollInterval || sseConnected) return
      pollInterval = setInterval(() => loadConversations().catch(console.error), 3000)
    }

    setupSSE()
    return () => { eventSource?.close(); if (pollInterval) clearInterval(pollInterval) }
  }, [loadConversations])

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    // Shift+Enter = new line (default textarea behavior, nothing to do)
  }

  const filtered = conversations.filter((c) =>
    !searchTerm || c.lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.lead.phone?.includes(searchTerm)
  )

  const formatTime = (date: string) => new Date(date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div><Skeleton className="h-8 w-36 mb-2" /><Skeleton className="h-4 w-56" /></div>
        <Card className="flex overflow-hidden" style={{ height: "calc(100vh - 244px)" }}>
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-h3 font-bold" data-testid="heading-whatsapp">WhatsApp</h1>
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
              <Button variant="outline" size="sm" onClick={() => { fetchTemplates(); setIsTemplateModalOpen(true) }}>
                <FileText className="h-4 w-4 mr-1.5" /> Templates
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Inserir template</DialogTitle>
                <DialogDescription>Escolha um template pronto e personalize as variáveis antes de enviar.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {templateLoading && <p className="text-sm text-muted-foreground">Carregando templates...</p>}
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
                        <button key={tpl.id} type="button"
                          className={`w-full rounded-md border px-3 py-2 text-left transition hover:border-primary ${selectedTemplate?.id === tpl.id ? "border-primary bg-primary/5" : "border-[var(--border)]"}`}
                          onClick={() => handleTemplateSelect(tpl)}>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">{tpl.name}</span>
                            {tpl.category && <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{tpl.category}</span>}
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
                            <Input value={templateVars[key] || ""} onChange={(e) => handleTemplateVarChange(key, e.target.value)} placeholder={`Valor para ${key}`} />
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
                <Button onClick={() => setIsTemplateModalOpen(false)} disabled={!selectedTemplate}>Aplicar template</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="flex overflow-hidden" style={{ height: "calc(100vh - 244px)" }}>

        {/* ── Conversation list ─────────────────────────────────────────────── */}
        <div className="w-80 flex-shrink-0 border-r flex flex-col">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar conversas..." className="pl-8 h-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">Nenhuma conversa encontrada</div>
            ) : (
              filtered.map((conv) => (
                <div key={conv.id}
                  className={`flex items-center gap-3 px-3 py-3 cursor-pointer border-b hover:bg-muted/50 transition-colors ${selected?.id === conv.id ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
                  onClick={() => handleSelectConversation(conv)}>
                  <div className="relative flex-shrink-0">
                    {conv.lead.profilePicUrl ? (
                      <img src={conv.lead.profilePicUrl} alt={conv.lead.name} className="h-10 w-10 rounded-full object-cover" referrerPolicy="no-referrer"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.removeAttribute("style") }} />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white text-sm font-bold">{getInitials(conv.lead.name)}</div>
                    )}
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white">{conv.unreadCount}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate ${conv.unreadCount > 0 ? "font-bold" : "font-medium"}`}>{conv.lead.name}</p>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">{formatTime(conv.lastMessageAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{getMessagePreview(conv.messages[conv.messages.length - 1])}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Chat area ────────────────────────────────────────────────────── */}
        {selected ? (
          <div className="flex-1 flex flex-col min-w-0">

            {/* Header */}
            <div className="flex items-center gap-3 border-b px-4 py-3 bg-card">
              {selected.lead.profilePicUrl ? (
                <img src={selected.lead.profilePicUrl} alt={selected.lead.name} className="h-10 w-10 rounded-full object-cover" referrerPolicy="no-referrer"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.removeAttribute("style") }} />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white text-sm font-bold">{getInitials(selected.lead.name)}</div>
              )}
              <div className="flex-1">
                <p className="font-semibold text-sm">{selected.lead.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                  {selected.lead.phone || selected.lead.whatsappNumber || "WhatsApp"}
                  {selected.lead.companyName && ` · ${selected.lead.companyName}`}
                </p>
              </div>
              <Button variant="ghost" size="icon"><Phone className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon"><User className="h-4 w-4" /></Button>
            </div>

            {/* Messages */}
            <div className="flex-1 relative overflow-hidden">
            <div ref={messagesContainerRef} onScroll={handleMessagesScroll}
              className="h-full overflow-y-auto px-4 pt-4 pb-4 flex flex-col gap-1"
              style={{
                backgroundColor: resolvedTheme === "light" ? "#f5f0e7" : "#0b141a",
                backgroundImage: chatBackgroundUrl
                  ? `url(${chatBackgroundUrl})`
                  : "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
                backgroundSize: "cover",
              }}>
              {/* Spacer: empurra mensagens para o fundo quando há poucas */}
              <div className="flex-1 min-h-[8px]" />

              {selected.messages.map((msg) => {
                const mediaBlock = renderMediaContent(msg)
                const showText = Boolean(msg.content && !(msg.mediaUrl && !msg.content))
                const isMenuOpen = menuMsg?.id === msg.id
                const isReacting = reactingMsg?.id === msg.id
                const isOut = msg.direction === "outgoing"

                return (
                  <div key={msg.id} className={`flex ${isOut ? "justify-end" : "justify-start"} group mb-1`}>
                    <div className="relative max-w-[70%]">
                      {/* Reaction toolbar on hover */}
                      <div className={`absolute ${isOut ? "right-full mr-1" : "left-full ml-1"} top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-card border border-border rounded-full px-1 py-0.5 shadow-md z-10`}>
                        {!isOut && (
                          <>
                            <button type="button" title="Responder" onClick={() => { setReplyTo(msg); setMenuMsg(null) }}
                              className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                              <Reply className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" title="Reagir" onClick={() => { setReactingMsg(isReacting ? null : msg); setMenuMsg(null) }}
                              className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                              <Smile className="h-3.5 w-3.5" />
                            </button>
                            {hasMediaPayload(msg) && (
                              <a href={getMediaUrl(msg.id)} download title="Baixar"
                                className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </>
                        )}
                        <button type="button" title="Apagar" onClick={() => handleDeleteMessage(msg)}
                          className="p-1 rounded-full hover:bg-muted transition-colors text-red-400 hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Reaction picker */}
                      {isReacting && (
                        <ReactionPicker
                          onReact={(emoji) => {
                            setReactions((prev) => {
                              const cur = prev[msg.id] ?? []
                              // toggle: remove se já existir, senão adiciona
                              const next = cur.includes(emoji)
                                ? cur.filter((e) => e !== emoji)
                                : [...cur, emoji]
                              return { ...prev, [msg.id]: next }
                            })
                          }}
                          onClose={() => setReactingMsg(null)}
                        />
                      )}

                      {/* Bubble */}
                      <div className={`rounded-lg px-3 py-2 text-sm shadow-sm ${
                        isOut ? "bg-[#005c4b] text-white rounded-tr-none" : "bg-[#202c33] text-white rounded-tl-none"
                      }`}>
                        {/* Reply context */}
                        {msg.metadata?.quotedContent != null && (
                          <div className="mb-2 rounded border-l-2 border-white/50 bg-white/10 px-2 py-1 text-xs text-white/70 line-clamp-2">
                            {`${msg.metadata.quotedContent}`}
                          </div>
                        )}

                        {mediaBlock}
                        {showText && (
                          <p className={`whitespace-pre-wrap break-words ${mediaBlock ? "mt-1" : ""}`}>{msg.content}</p>
                        )}
                        <p className={`text-[10px] mt-1 flex items-center gap-1 ${isOut ? "justify-end text-gray-200" : "justify-start text-gray-400"}`}>
                          {isOut && <CheckCheck className={`h-3 w-3 ${msg.isRead ? "text-sky-400" : "text-gray-400"}`} />}
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>

                      {/* Reações */}
                      {reactions[msg.id]?.length > 0 && (
                        <div className={`flex flex-wrap gap-0.5 mt-0.5 ${isOut ? "justify-end" : "justify-start"}`}>
                          {reactions[msg.id].map((emoji) => (
                            <span key={emoji}
                              className="text-base leading-none bg-card border border-border rounded-full px-1 py-0.5 cursor-pointer shadow-sm"
                              onClick={() => setReactions((prev) => ({ ...prev, [msg.id]: (prev[msg.id] ?? []).filter((e) => e !== emoji) }))}>
                              {emoji}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {uploadingMedia && (
                <div className="flex justify-end">
                  <div className="flex items-center gap-2 rounded-lg bg-[#005c4b] px-3 py-2 text-white text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" /> Enviando mídia...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Scroll-to-bottom button */}
            {showScrollDown && (
              <button type="button" onClick={() => scrollToBottom()}
                className="absolute bottom-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border shadow-lg hover:bg-muted transition-colors z-10">
                <ChevronDown className="h-5 w-5 text-foreground" />
              </button>
            )}
            </div>

            {/* Input area */}
            <div className="border-t p-3 space-y-2 bg-card">
              {/* Template indicator */}
              {selectedTemplate && (
                <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
                  <div>
                    <p className="font-semibold text-foreground">Template: {selectedTemplate.name}</p>
                    <p className="text-muted-foreground text-[11px]">Edite os valores e envie quando estiver pronto.</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearTemplate}><X className="h-3 w-3" /></Button>
                </div>
              )}

              {/* Reply indicator */}
              {replyTo && (
                <div className="flex items-center justify-between rounded-md border-l-2 border-green-500 bg-muted/50 px-3 py-2 text-xs">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-green-600 text-[11px] mb-0.5">Respondendo</p>
                    <p className="text-muted-foreground truncate">{replyTo.content || MEDIA_LABELS[replyTo.messageType || ""] || "Anexo"}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => setReplyTo(null)}><X className="h-3 w-3" /></Button>
                </div>
              )}

              {/* Message row */}
              {isRecording ? (
                <VoiceRecorder onSend={handleVoiceSend} onCancel={() => setIsRecording(false)} />
              ) : (
                <div className="flex items-end gap-2">
                  <AttachmentMenu onFile={handleSendMedia} />

                  <textarea
                    ref={textareaRef}
                    placeholder="Digite uma mensagem..."
                    value={newMessage}
                    rows={1}
                    onChange={(e) => {
                      setNewMessage(e.target.value)
                      // Auto-resize
                      e.target.style.height = "auto"
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
                    }}
                    onKeyDown={handleKeyDown}
                    className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 overflow-y-auto"
                    style={{ minHeight: "38px", maxHeight: "120px" }}
                  />

                  {newMessage.trim() || selectedTemplate ? (
                    <Button onClick={handleSend} disabled={isSending} className="h-9 w-9 p-0 rounded-full bg-green-600 hover:bg-green-700 flex-shrink-0">
                      {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  ) : (
                    <button type="button" onClick={() => setIsRecording(true)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-green-600 hover:bg-green-700 transition-colors flex-shrink-0 shadow">
                      <Mic className="h-4 w-4 text-white" />
                    </button>
                  )}
                </div>
              )}

              <p className="text-[10px] text-muted-foreground text-right pr-1">Enter envia · Shift+Enter nova linha</p>
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

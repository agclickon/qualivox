"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useTheme } from "next-themes"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
  ChevronLeft,
  ChevronRight,
  Inbox,
  Camera,
  FileAudio,
  Archive,
  Pin,
  PinOff,
  Star,
  Forward,
  Tag,
  MoreVertical,
  ArchiveRestore,
  Calendar,
  Clock4 as Clock,
  Sparkles,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Zap,
  Brain,
  ArrowRight,
  Edit3,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { getInitials } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { useAuthStore } from "@/stores/auth-store"
import { useToast } from "@/hooks/use-toast"

type MessageDirection = "incoming" | "outgoing" | string
type MessageType = "text" | "image" | "video" | "audio" | "document" | "sticker" | string

interface Message {
  id: string
  externalId?: string | null
  direction: MessageDirection
  content: string
  createdAt: string
  isRead: boolean
  messageType?: MessageType
  mediaUrl?: string | null
  metadata?: Record<string, unknown> | null
}

function buildCalendarGrid(month: Date) {
  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1)
  const startWeekDay = startOfMonth.getDay()
  const gridStart = new Date(startOfMonth)
  gridStart.setDate(startOfMonth.getDate() - startWeekDay)
  return Array.from({ length: 42 }, (_, idx) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + idx)
    return {
      date,
      iso: formatLocalDateISO(date),
      label: date.getDate(),
      isCurrentMonth: date.getMonth() === month.getMonth(),
    }
  })
}

function combineDateTime(dateStr?: string, timeStr?: string) {
  if (!dateStr) return null
  const base = parseLocalDate(dateStr)
  if (!base) return null
  if (!timeStr) return base
  const [hours, minutes] = timeStr.split(":").map((v) => Number(v))
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return base
  base.setHours(hours, minutes, 0, 0)
  return base
}

function parseTemplateVariables(value: unknown): Record<string, string> | null {
  if (!value) return null
  if (typeof value === "string") {
    try { return JSON.parse(value) } catch { return null }
  }
  if (typeof value === "object") return value as Record<string, string>
  return null
}

function normalizeTemplate(raw: any): Template {
  let variables = raw.variables ?? "[]"
  if (Array.isArray(variables)) {
    variables = JSON.stringify(variables)
  } else if (typeof variables !== "string") {
    variables = JSON.stringify([])
  }
  return {
    id: raw.id,
    name: raw.name,
    content: raw.content,
    variables,
    category: raw.category ?? null,
  }
}

function normalizeFollowUp(raw: any): FollowUpEntry {
  const templateVars = parseTemplateVariables(raw.templateVariables)
  return {
    id: raw.id,
    leadId: raw.leadId,
    conversationId: raw.conversationId,
    sendAt: raw.sendAt,
    message: raw.message,
    status: raw.status,
    templateId: raw.templateId ?? null,
    template: raw.template ?? null,
    templateVariables: templateVars,
    sentAt: raw.sentAt ?? null,
    lastError: raw.lastError ?? null,
  }
}

interface Conversation {
  id: string
  whatsappChatId: string
  lastMessageAt: string
  unreadCount: number
  isArchived?: boolean
  isPinned?: boolean
  labels?: string[]
  lead: {
    id: string
    name: string
    phone: string | null
    whatsappNumber: string | null
    companyName: string | null
    profilePicUrl?: string | null
    qualificationLevel?: string | null
    score?: number | null
  }
  messages: Message[]
}

interface CatalogTag {
  id: string
  name: string
  colorHex: string
  isActive: boolean
  _count?: { leadTags: number }
}

interface LeadTagInfo {
  id: string
  tagId: string
  source: string
  appliedAt: string
  tag: CatalogTag
}

interface FollowUpEntry {
  id: string
  leadId: string
  conversationId: string
  sendAt: string
  message: string
  status: "scheduled" | "sent" | "failed"
  templateId?: string | null
  template?: { id: string; name: string } | null
  templateVariables?: Record<string, string> | null
  sentAt?: string | null
  lastError?: string | null
}

interface FollowUpFormState {
  id: string | null
  sendDate: string
  sendTime: string
  message: string
  templateId: string | null
  templateName: string | null
  templateVariables: Record<string, string>
}

const statusLabels: Record<string, string> = {
  novo: "Novo",
  contatado: "Contatado",
  qualificado: "Qualificado",
  em_negociacao: "Em negociação",
  proposta_enviada: "Proposta enviada",
  fechado_ganho: "Fechado (ganho)",
  fechado_perdido: "Fechado (perdido)",
}

const sourceLabels: Record<string, string> = {
  whatsapp: "WhatsApp",
  website: "Website",
  indicacao: "Indicação",
  telefone: "Telefone",
  email: "E-mail",
  rede_social: "Rede social",
  evento: "Evento",
  outro: "Outro",
}

const qualificationLabels: Record<string, string> = {
  quente: "Quente",
  morno: "Morno",
  frio: "Frio",
  nao_qualificado: "Não qualificado",
}

const statusVisuals: Record<string, { bg: string; text: string }> = {
  novo: { bg: "bg-sky-500/20", text: "text-sky-300" },
  contatado: { bg: "bg-purple-500/20", text: "text-purple-300" },
  qualificado: { bg: "bg-emerald-500/20", text: "text-emerald-300" },
  em_negociacao: { bg: "bg-amber-500/20", text: "text-amber-300" },
  proposta_enviada: { bg: "bg-pink-500/20", text: "text-pink-300" },
  fechado_ganho: { bg: "bg-lime-500/20", text: "text-lime-300" },
  fechado_perdido: { bg: "bg-red-500/20", text: "text-red-300" },
}

interface LeadDetail {
  id: string
  name: string
  email: string | null
  phone: string | null
  whatsappNumber: string | null
  profilePicUrl: string | null
  status: string
  score: number
  qualificationLevel: string
  source: string
  companyName: string | null
  createdAt: string
  updatedAt: string
}

function buildCalendarGrid(month: Date) {
  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1)
  const startWeekDay = startOfMonth.getDay()
  const gridStart = new Date(startOfMonth)
  gridStart.setDate(startOfMonth.getDate() - startWeekDay)
  return Array.from({ length: 42 }, (_, idx) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + idx)
    return {
      date,
      iso: formatLocalDateISO(date),
      label: date.getDate(),
      isCurrentMonth: date.getMonth() === month.getMonth(),
    }
  })
}

function combineDateTime(dateStr?: string, timeStr?: string) {
  if (!dateStr) return null
  const base = parseLocalDate(dateStr)
  if (!base) return null
  if (!timeStr) return base
  const [hours, minutes] = timeStr.split(":").map((v) => Number(v))
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return base
  base.setHours(hours, minutes, 0, 0)
  return base
}

function parseTemplateVariables(value: unknown): Record<string, string> | null {
  if (!value) return null
  if (typeof value === "string") {
    try { return JSON.parse(value) } catch { return null }
  }
  if (typeof value === "object") return value as Record<string, string>
  return null
}

function normalizeTemplate(raw: any): Template {
  let variables = raw.variables ?? "[]"
  if (Array.isArray(variables)) {
    variables = JSON.stringify(variables)
  } else if (typeof variables !== "string") {
    variables = JSON.stringify([])
  }
  return {
    id: raw.id,
    name: raw.name,
    content: raw.content,
    variables,
    category: raw.category ?? null,
  }
}

function normalizeFollowUp(raw: any): FollowUpEntry {
  const templateVars = parseTemplateVariables(raw.templateVariables)
  return {
    id: raw.id,
    leadId: raw.leadId,
    conversationId: raw.conversationId,
    sendAt: raw.sendAt,
    message: raw.message,
    status: raw.status,
    templateId: raw.templateId ?? null,
    template: raw.template ?? null,
    templateVariables: templateVars,
    sentAt: raw.sentAt ?? null,
    lastError: raw.lastError ?? null,
  }
}

function normalizeMessage(raw: any): Message {
  return {
    id: raw.id,
    externalId: raw.externalId ?? null,
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
  let labels: string[] = []
  try { labels = JSON.parse(raw.labels || "[]") } catch { /* */ }
  return {
    ...raw,
    isArchived: Boolean(raw.isArchived),
    isPinned: Boolean(raw.isPinned),
    labels,
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
  while (size >= 1024 && unitIndex < units.length - 1) { size /= 1024; unitIndex++ }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

function formatDuration(seconds?: unknown): string | null {
  if (typeof seconds !== "number" || Number.isNaN(seconds) || seconds <= 0) return null
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

function formatTimeHHMM(date: Date) {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false })
}

function formatFollowUpDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "--"
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date).replace(/\./g, "")
}

function hasMediaPayload(msg: Message): boolean {
  return Boolean(msg.mediaUrl && msg.messageType && msg.messageType !== "text")
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatDateSeparatorLabel(dateStr: string) {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return "--"
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  if (isSameDay(date, today)) return "Hoje"
  if (isSameDay(date, yesterday)) return "Ontem"
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "2-digit",
    month: "short",
  }
  if (date.getFullYear() !== today.getFullYear()) options.year = "numeric"
  const label = date.toLocaleDateString("pt-BR", options)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function formatTime(date: string) {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return "--:--"
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

function matchesDateFilter(dateStr: string, filter: string) {
  if (!filter) return true
  const target = parseLocalDate(filter)
  const date = new Date(dateStr)
  if (!target || Number.isNaN(date.getTime())) return true
  return isSameDay(target, date)
}

function formatLocalDateISO(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseLocalDate(value?: string | null) {
  if (!value) return null
  const [yearStr, monthStr, dayStr] = value.split("-")
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)
  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

// ─── VoiceMessagePlayer ──────────────────────────────────────────────────────

type VoiceMessagePlayerProps = { src: string; mimeType?: string | null; duration?: number; direction: MessageDirection; waveform?: string | null }

function VoiceMessagePlayer({ src, mimeType, duration, direction, waveform: waveformB64 }: VoiceMessagePlayerProps) {
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
      const handleLoaded = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) setTotalDuration(audio.duration)
    }
    const handleDurationChange = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) setTotalDuration(audio.duration)
    }
    const handleTime = () => setCurrentTime(audio.currentTime)
    const handleEnded = () => { setIsPlaying(false); setCurrentTime(0) }
    audio.addEventListener("loadedmetadata", handleLoaded)
    audio.addEventListener("durationchange", handleDurationChange)
    audio.addEventListener("timeupdate", handleTime)
    audio.addEventListener("ended", handleEnded)
    return () => {
      audio.removeEventListener("loadedmetadata", handleLoaded)
      audio.removeEventListener("durationchange", handleDurationChange)
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
  const formattedTotal = totalDuration > 0 ? formatDuration(totalDuration) : "--:--"

  // Build waveform bar heights (0-100) from base64 metadata, or fallback to flat bars
  const STATIC_FALLBACK = [18, 12, 22, 10, 26, 16, 24, 8, 18, 20, 14, 22, 12, 25, 9, 21, 13, 24, 11, 19, 15, 23, 12, 18, 18, 12, 22, 10, 26, 16, 24, 8, 18, 20, 14, 22, 12, 25, 9, 21, 13, 24, 11, 19, 15, 23, 12, 18, 18, 12, 22, 10, 26, 16, 24, 8, 18, 20, 14, 22, 12, 25, 9, 21]
  const waveformHeights: number[] = useMemo(() => {
    if (!waveformB64) return STATIC_FALLBACK
    try {
      const bytes = Uint8Array.from(atob(waveformB64), c => c.charCodeAt(0))
      if (bytes.length === 0) return STATIC_FALLBACK
      // Scale 0-100 values to pixel heights (4px min, 28px max)
      return Array.from(bytes).map(v => Math.max(4, Math.round(v / 100 * 28)))
    } catch { return STATIC_FALLBACK }
  }, [waveformB64])

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
  if (msg.messageType && msg.messageType !== "text" && !msg.mediaUrl) {
    // Optimistic placeholder while upload is in-flight
    const label = MEDIA_LABELS[msg.messageType] || "📎 Enviando..."
    return (
      <div className="mb-2 flex items-center gap-2 text-xs text-white/60">
        <span className="animate-pulse">{label}</span>
        <span className="text-[10px]">Enviando...</span>
      </div>
    )
  }
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
    case "audio": {
      const waveformB64 = getMetadataString(metadata, "waveform")
      return (
        <div className="mb-2">
          <VoiceMessagePlayer src={getMediaUrl(msg.id)} mimeType={mimeType} duration={duration} direction={msg.direction} waveform={waveformB64} />
        </div>
      )
    }
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
          <div className="absolute bottom-11 left-0 z-20 flex flex-col gap-1 rounded-2xl bg-card border border-border shadow-xl p-2 min-w-[180px]">
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
      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-muted transition-colors text-left">
      <span className={`flex h-8 w-8 items-center justify-center rounded-full text-white ${color}`}>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

// ─── VoiceRecorder ────────────────────────────────────────────────────────────

type VoiceRecorderProps = {
  onSend: (blob: Blob, mimeType: string) => void
  onCancel: () => void
}

const WAVE_BARS = 50 // número de colunas no histograma

function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const [elapsed, setElapsed] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [ready, setReady] = useState(false)
  // Histograma de amplitudes: cada valor 0–1 representa uma coluna
  const [waveData, setWaveData] = useState<number[]>(() => new Array(WAVE_BARS).fill(0))

  const streamRef    = useRef<MediaStream | null>(null)
  const recorderRef  = useRef<MediaRecorder | null>(null)
  const chunksRef    = useRef<Blob[]>([])
  const timerRef     = useRef<NodeJS.Timeout | null>(null)
  const sampleRef    = useRef<NodeJS.Timeout | null>(null)
  const analyserRef  = useRef<AnalyserNode | null>(null)
  const audioCtxRef  = useRef<AudioContext | null>(null)
  const onSendRef    = useRef(onSend)
  const onCancelRef  = useRef(onCancel)
  useEffect(() => { onSendRef.current = onSend }, [onSend])
  useEffect(() => { onCancelRef.current = onCancel }, [onCancel])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream

        // ── Web Audio API para waveform em tempo real ──────────────────────
        const AudioCtx = window.AudioContext ?? (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        const audioCtx = new AudioCtx()
        audioCtxRef.current = audioCtx
        const source   = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.6
        source.connect(analyser)
        analyserRef.current = analyser
        const dataArray = new Uint8Array(analyser.frequencyBinCount)

        // Amostragem a cada 80ms → barras rolam da direita para esquerda
        sampleRef.current = setInterval(() => {
          if (!analyserRef.current) return
          analyserRef.current.getByteTimeDomainData(dataArray)
          let sum = 0
          for (let i = 0; i < dataArray.length; i++) {
            const v = (dataArray[i] - 128) / 128
            sum += v * v
          }
          const rms = Math.sqrt(sum / dataArray.length)
          const amp = Math.min(1, rms * 10) // amplifica para visibilidade
          setWaveData((prev) => [...prev.slice(1), amp])
        }, 80)

        // ── MediaRecorder ─────────────────────────────────────────────────
        const mimeType = ["audio/ogg;codecs=opus", "audio/webm;codecs=opus", "audio/webm"]
          .find((m) => MediaRecorder.isTypeSupported(m)) ?? ""

        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
        recorderRef.current = recorder
        chunksRef.current   = []
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
        recorder.start(100)
        setReady(true)
        timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
      } catch (err) {
        console.error("[VoiceRecorder] Microfone:", err)
        if (!cancelled) onCancelRef.current()
      }
    })()

    return () => {
      cancelled = true
      if (timerRef.current) clearInterval(timerRef.current)
      if (sampleRef.current) clearInterval(sampleRef.current)
      audioCtxRef.current?.close()
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Para apenas os timers (não toca no AudioContext nem no stream) */
  const stopTimers = () => {
    if (timerRef.current)  { clearInterval(timerRef.current);  timerRef.current  = null }
    if (sampleRef.current) { clearInterval(sampleRef.current); sampleRef.current = null }
  }

  /** Libera AudioContext e tracks de áudio */
  const releaseAudio = () => {
    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  // CRÍTICO: onstop definido ANTES de stop(); AudioContext fechado DENTRO do onstop
  const handleSend = () => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === "inactive") {
      console.warn("[VoiceRecorder] handleSend: recorder inativo")
      return
    }
    console.log("[VoiceRecorder] handleSend: chunks até agora =", chunksRef.current.length, "state =", recorder.state)
    stopTimers()
    recorder.onstop = () => {
      const mimeType = recorder.mimeType || "audio/webm"
      const blob = new Blob(chunksRef.current, { type: mimeType })
      console.log("[VoiceRecorder] onstop: blob size =", blob.size, "mimeType =", mimeType, "chunks =", chunksRef.current.length)
      releaseAudio()
      if (blob.size === 0) {
        console.error("[VoiceRecorder] Blob vazio — gravação sem dados")
        onCancelRef.current()
        return
      }
      onSendRef.current(blob, mimeType)
    }
    recorder.stop() // dispara ondataavailable final → onstop
  }

  const handleCancel = () => {
    stopTimers()
    const recorder = recorderRef.current
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null
      recorder.stop()
    }
    releaseAudio()
    onCancelRef.current()
  }

  const handlePause = () => {
    const recorder = recorderRef.current
    if (!recorder) return
    if (recorder.state === "recording") {
      recorder.pause()
      if (timerRef.current) clearInterval(timerRef.current)
      if (sampleRef.current) clearInterval(sampleRef.current)
      setIsPaused(true)
    } else if (recorder.state === "paused") {
      recorder.resume()
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
      // restartar amostragem
      const analyser = analyserRef.current
      if (analyser) {
        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        sampleRef.current = setInterval(() => {
          analyser.getByteTimeDomainData(dataArray)
          let sum = 0
          for (let i = 0; i <dataArray.length; i++) {
            const v = (dataArray[i] - 128) / 128; sum += v * v
          }
          const amp = Math.min(1, Math.sqrt(sum / dataArray.length) * 10)
          setWaveData((prev) => [...prev.slice(1), amp])
        }, 80)
      }
      setIsPaused(false)
    }
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`

  return (
    <div className="flex items-center gap-2 flex-1 bg-[#1f2c34] rounded-full px-2 py-1.5">

      {/* Cancelar */}
      <button type="button" onClick={handleCancel} title="Cancelar"
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-green-500 hover:bg-green-500/10 transition-colors">
        <Trash2 className="h-4 w-4 text-green-500" />
      </button>

      {/* Timer + waveform */}
      <div className="flex flex-1 items-center gap-2 min-w-0 overflow-hidden">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`h-2.5 w-2.5 rounded-full bg-red-500 ${!isPaused ? "animate-pulse" : "opacity-30"}`} />
          <span className="text-sm font-mono font-medium text-white tabular-nums w-10">{fmt(elapsed)}</span>
        </div>

        {/* Waveform real-time — rola direita → esquerda */}
        <div className="flex flex-1 items-center gap-[2px] overflow-hidden">
          {waveData.map((amp, i) => (
            <span key={i}
              className="inline-block flex-shrink-0 w-[3px] rounded-full bg-[#aebac1]"
              style={{ height: `${Math.max(3, Math.round(amp * 28))}px`, opacity: 0.7 + amp * 0.3 }}
            />
          ))}
        </div>
      </div>

      {/* Pausar/Retomar */}
      <button type="button" onClick={handlePause} title={isPaused ? "Retomar" : "Pausar"} disabled={!ready}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#aebac1]/20 hover:bg-[#aebac1]/30 transition-colors disabled:opacity-30">
        {isPaused ? (
          <span className="ml-0.5 inline-block h-0 w-0 border-y-[6px] border-y-transparent border-l-[9px] border-l-[#aebac1]" />
        ) : (
          <span className="flex gap-[3px]">
            <span className="inline-block h-[12px] w-[3px] rounded-sm bg-[#aebac1]" />
            <span className="inline-block h-[12px] w-[3px] rounded-sm bg-[#aebac1]" />
          </span>
        )}
      </button>

      {/* Enviar */}
      <button type="button" onClick={handleSend} title="Enviar" disabled={!ready}
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-green-500 hover:bg-green-600 transition-colors shadow-md disabled:opacity-40">
        <span className="ml-0.5 inline-block h-0 w-0 border-y-[7px] border-y-transparent border-l-[11px] border-l-white" />
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
  const [dateFilter, setDateFilter] = useState<string>("")
  const [templates, setTemplates] = useState<Template[]>([])
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({})
  const [templatePreview, setTemplatePreview] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isSyncingPics, setIsSyncingPics] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [showArchivedList, setShowArchivedList] = useState(false)

  const { user } = useAuthStore()
  const { toast } = useToast()
  const isSuperAdmin = user?.role === "super_admin"
  const [saveTemplateModal, setSaveTemplateModal] = useState<{ open: boolean; message: Message | null }>({ open: false, message: null })
  const [newTemplateName, setNewTemplateName] = useState("")
  const [newTemplateCategory, setNewTemplateCategory] = useState("")
  const [savingTemplate, setSavingTemplate] = useState(false)

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

  // Conversation context menu
  const [convMenu, setConvMenu] = useState<{ conv: Conversation; x: number; y: number } | null>(null)
  // Label input for conversations
  const [labelInput, setLabelInput] = useState<{ convId: string; value: string } | null>(null)
  // Forward: pick target lead
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null)

  // Tag management
  const [leadTags, setLeadTags] = useState<LeadTagInfo[]>([])
  const [allTags, setAllTags] = useState<CatalogTag[]>([])
  const [tagModal, setTagModal] = useState(false)
  const [tagSearch, setTagSearch] = useState("")
  const [tagCreateColor, setTagCreateColor] = useState("#10B981")
  const [creatingTag, setCreatingTag] = useState(false)

  // Lead details modal
  const [leadModalOpen, setLeadModalOpen] = useState(false)
  const [leadModalLoading, setLeadModalLoading] = useState(false)
  const [leadModalError, setLeadModalError] = useState<string | null>(null)
  const [leadEditMode, setLeadEditMode] = useState(false)
  const [leadSaving, setLeadSaving] = useState(false)
  const [leadDetails, setLeadDetails] = useState<LeadDetail | null>(null)
  const [leadForm, setLeadForm] = useState({
    name: "",
    email: "",
    phone: "",
    whatsappNumber: "",
    companyName: "",
    status: "novo",
    source: "whatsapp",
    qualificationLevel: "nao_qualificado",
    score: 0,
  })

  // Follow-up scheduling
  const [followUps, setFollowUps] = useState<FollowUpEntry[]>([])
  const [followUpModal, setFollowUpModal] = useState(false)
  const [followUpLoading, setFollowUpLoading] = useState(false)
  const [followUpSaving, setFollowUpSaving] = useState(false)
  const [followUpError, setFollowUpError] = useState<string | null>(null)
  const [followUpForm, setFollowUpForm] = useState<FollowUpFormState>(() => createDefaultFollowUpForm())
  const [followUpCalendarMonth, setFollowUpCalendarMonth] = useState(() => new Date())
  const [followUpTemplatePopover, setFollowUpTemplatePopover] = useState(false)

  const followUpSelectedTemplate = useMemo(() => {
    if (!followUpForm.templateId) return null
    return templates.find((tpl) => tpl.id === followUpForm.templateId) ?? null
  }, [templates, followUpForm.templateId])

  const scheduledFollowUps = useMemo(() => followUps.filter((f) => f.status === "scheduled"), [followUps])
  const scheduledFollowUpCount = scheduledFollowUps.length

  const timeOptions = useMemo(() => {
    const slots: string[] = []
    for (let hour = 8; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const label = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
        slots.push(label)
      }
    }
    return slots
  }, [])

  const followUpMonthLabel = useMemo(() =>
    new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })
      .format(followUpCalendarMonth)
      .replace(/\./g, "")
  , [followUpCalendarMonth])

  const followUpCalendarDays = useMemo(() => buildCalendarGrid(followUpCalendarMonth), [followUpCalendarMonth])
  const followUpTodayIso = useMemo(() => formatLocalDateISO(new Date()), [])
  const followUpSelectedIso = followUpForm.sendDate
  const followUpTemplatePreview = useMemo(() => (
    followUpSelectedTemplate ? renderTemplateContent(followUpSelectedTemplate, followUpForm.templateVariables) : ""
  ), [followUpSelectedTemplate, followUpForm.templateVariables])
  const followUpPlaceholders = useMemo(() => (
    followUpSelectedTemplate ? getTemplatePlaceholders(followUpSelectedTemplate) : []
  ), [followUpSelectedTemplate])

  const handleFollowUpPrevMonth = () => {
    setFollowUpCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleFollowUpNextMonth = () => {
    setFollowUpCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const closeLeadModal = useCallback(() => {
    setLeadModalOpen(false)
    setLeadEditMode(false)
    setLeadModalError(null)
    setLeadDetails(null)
  }, [])

  const openLeadModal = useCallback(async () => {
    if (!selected) return
    setLeadModalOpen(true)
    setLeadEditMode(false)
    setLeadModalError(null)
    setLeadModalLoading(true)
    try {
      const res = await fetch(`/api/leads/${selected.lead.id}`)
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message ?? "Erro ao carregar lead")
      }
      const lead: LeadDetail = {
        id: data.data.id,
        name: data.data.name,
        email: data.data.email ?? null,
        phone: data.data.phone ?? null,
        whatsappNumber: data.data.whatsappNumber ?? null,
        profilePicUrl: data.data.profilePicUrl ?? null,
        status: data.data.status ?? "novo",
        score: data.data.score ?? 0,
        qualificationLevel: data.data.qualificationLevel ?? "nao_qualificado",
        source: data.data.source ?? "whatsapp",
        companyName: data.data.companyName ?? null,
        createdAt: data.data.createdAt,
        updatedAt: data.data.updatedAt,
      }
      setLeadDetails(lead)
      setLeadForm({
        name: lead.name,
        email: lead.email ?? "",
        phone: lead.phone ?? "",
        whatsappNumber: lead.whatsappNumber ?? "",
        companyName: lead.companyName ?? "",
        status: lead.status,
        source: lead.source,
        qualificationLevel: lead.qualificationLevel,
        score: lead.score ?? 0,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar lead"
      setLeadModalError(message)
      setLeadDetails(null)
    } finally {
      setLeadModalLoading(false)
    }
  }, [selected])

  const handleLeadFormChange = (field: keyof typeof leadForm, value: string | number) => {
    setLeadForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleLeadSave = useCallback(async () => {
    if (!leadDetails) return
    setLeadSaving(true)
    setLeadModalError(null)
    try {
      const payload = {
        name: leadForm.name.trim(),
        email: leadForm.email.trim() || null,
        phone: leadForm.phone.trim() || null,
        whatsappNumber: leadForm.whatsappNumber.trim() || null,
        companyName: leadForm.companyName.trim() || null,
        status: leadForm.status,
        source: leadForm.source,
        qualificationLevel: leadForm.qualificationLevel,
        score: Number.isFinite(leadForm.score) ? leadForm.score : 0,
      }
      const res = await fetch(`/api/leads/${leadDetails.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error?.message ?? "Erro ao salvar lead")
      const updated: LeadDetail = {
        id: data.data.id,
        name: data.data.name,
        email: data.data.email ?? null,
        phone: data.data.phone ?? null,
        whatsappNumber: data.data.whatsappNumber ?? null,
        profilePicUrl: data.data.profilePicUrl ?? null,
        status: data.data.status ?? "novo",
        score: data.data.score ?? 0,
        qualificationLevel: data.data.qualificationLevel ?? "nao_qualificado",
        source: data.data.source ?? "whatsapp",
        companyName: data.data.companyName ?? null,
        createdAt: data.data.createdAt,
        updatedAt: data.data.updatedAt,
      }
      setLeadDetails(updated)
      setLeadForm((prev) => ({ ...prev, status: updated.status, source: updated.source, qualificationLevel: updated.qualificationLevel, score: updated.score }))
      setLeadEditMode(false)
      setSelected((prev) => {
        if (!prev || prev.lead.id !== updated.id) return prev
        return {
          ...prev,
          lead: {
            ...prev.lead,
            name: updated.name,
            phone: updated.phone,
            whatsappNumber: updated.whatsappNumber,
            companyName: updated.companyName,
            profilePicUrl: updated.profilePicUrl,
            qualificationLevel: updated.qualificationLevel,
            score: updated.score,
          },
        }
      })
      setConversations((prev) => prev.map((conv) => (
        conv.lead.id === updated.id
          ? {
              ...conv,
              lead: {
                ...conv.lead,
                name: updated.name,
                phone: updated.phone,
                whatsappNumber: updated.whatsappNumber,
                companyName: updated.companyName,
                profilePicUrl: updated.profilePicUrl,
                qualificationLevel: updated.qualificationLevel,
                score: updated.score,
              },
            }
          : conv
      )))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao salvar lead"
      setLeadModalError(message)
    } finally {
      setLeadSaving(false)
    }
  }, [leadDetails, leadForm, setConversations])

  // ── Follow-up scheduling ────────────────────────────────────────────────────

  const closeFollowUpModal = useCallback(() => {
    setFollowUpModal(false)
    setFollowUpError(null)
    setFollowUpTemplatePopover(false)
    setFollowUpForm(createDefaultFollowUpForm())
  }, [])

  const fetchFollowUpsList = useCallback(async (conversationId: string) => {
    setFollowUpLoading(true)
    setFollowUpError(null)
    try {
      const res = await fetch(`/api/follow-ups?conversationId=${conversationId}`)
      const data = await res.json()
      if (data.success) {
        const items = (data.data as any[]).map(normalizeFollowUp)
        setFollowUps(items)
      } else {
        setFollowUpError(data.error ?? "Erro ao carregar follow-ups")
      }
    } catch {
      setFollowUpError("Erro ao carregar follow-ups")
    } finally {
      setFollowUpLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selected?.id) {
      fetchFollowUpsList(selected.id)
    } else {
      setFollowUps([])
    }
  }, [selected?.id, fetchFollowUpsList])

  const openFollowUpModal = useCallback(() => {
    if (!selected) return
    setFollowUpError(null)
    setFollowUpForm(createDefaultFollowUpForm())
    setFollowUpModal(true)
    fetchFollowUpsList(selected.id)
    if (templates.length === 0 && !templateLoading) {
      fetchTemplates()
    }
  }, [selected, fetchFollowUpsList, templates.length, templateLoading])

  const handleFollowUpDateSelect = (iso: string) => {
    setFollowUpForm((prev) => ({ ...prev, sendDate: iso }))
  }

  const handleFollowUpTimeChange = (value: string) => {
    setFollowUpForm((prev) => ({ ...prev, sendTime: value }))
  }

  const handleFollowUpMessageChange = (value: string) => {
    setFollowUpForm((prev) => ({ ...prev, message: value }))
  }

  const handleFollowUpTemplateSelect = (tpl: Template, options?: { applyContent?: boolean }) => {
    const placeholders = getTemplatePlaceholders(tpl)
    const defaultVars = placeholders.reduce<Record<string, string>>((acc, key) => {
      const existing = followUpForm.templateVariables[key]
      acc[key] = existing ?? getDefaultTemplateValue(key, selected?.lead) ?? ""
      return acc
    }, {})
    setFollowUpForm((prev) => ({
      ...prev,
      templateId: tpl.id,
      templateName: tpl.name,
      templateVariables: defaultVars,
      message: options?.applyContent ? tpl.content : prev.message,
    }))
    setFollowUpTemplatePopover(false)
  }

  const clearFollowUpTemplate = () => {
    setFollowUpForm((prev) => ({ ...prev, templateId: null, templateName: null, templateVariables: {} }))
  }

  const handleFollowUpVarChange = (key: string, value: string) => {
    setFollowUpForm((prev) => ({ ...prev, templateVariables: { ...prev.templateVariables, [key]: value } }))
  }

  const handleFollowUpEdit = (entry: FollowUpEntry) => {
    const sendDate = formatLocalDateISO(new Date(entry.sendAt))
    const sendTime = formatTimeHHMM(new Date(entry.sendAt))
    if (templates.length === 0 && !templateLoading) fetchTemplates()

    const existingVars = entry.templateVariables ?? {}
    const tpl = entry.template ?? null
    const placeholders = tpl ? getTemplatePlaceholders(tpl as Template) : []
    const filledVars = placeholders.reduce<Record<string, string>>((acc, key) => {
      const existing = existingVars[key]
      acc[key] = existing ?? getDefaultTemplateValue(key, selected?.lead) ?? ""
      return acc
    }, { ...existingVars })

    setFollowUpForm({
      id: entry.id,
      sendDate,
      sendTime,
      message: entry.message,
      templateId: entry.templateId ?? null,
      templateName: entry.template?.name ?? null,
      templateVariables: placeholders.length > 0 ? filledVars : existingVars,
    })
    setFollowUpCalendarMonth(new Date(entry.sendAt))
    setFollowUpModal(true)
    setFollowUpError(null)
  }

  const handleFollowUpDelete = async (entry: FollowUpEntry) => {
    if (!confirm("Remover este follow-up?")) return
    try {
      const res = await fetch(`/api/follow-ups/${entry.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!data.success) {
        setFollowUpError(data.error ?? "Erro ao remover follow-up")
        return
      }
      setFollowUps((prev) => prev.filter((f) => f.id !== entry.id))
    } catch {
      setFollowUpError("Erro ao remover follow-up")
    }
  }

  const handleFollowUpSubmit = useCallback(async () => {
    if (!selected) return
    const trimmedMessage = followUpForm.message.trim()
    const hasTemplate = Boolean(followUpForm.templateId)
    if (!trimmedMessage && !hasTemplate) {
      setFollowUpError("Escreva a mensagem ou selecione um template")
      return
    }
    if (hasTemplate && followUpPlaceholders.length > 0) {
      const missing = followUpPlaceholders.filter((key) => !followUpForm.templateVariables[key]?.trim())
      if (missing.length > 0) {
        setFollowUpError(`Preencha todas as variáveis: ${missing.join(", ")}`)
        return
      }
    }
    const sendDateTime = combineDateTime(followUpForm.sendDate, followUpForm.sendTime)
    if (!sendDateTime) {
      setFollowUpError("Selecione data e horário válidos")
      return
    }
    setFollowUpSaving(true)
    setFollowUpError(null)
    try {
      const payload: Record<string, unknown> = {
        leadId: selected.lead.id,
        conversationId: selected.id,
        sendAt: sendDateTime.toISOString(),
        message: trimmedMessage,
        templateId: followUpForm.templateId,
        templateVariables: followUpForm.templateVariables,
      }
      if (followUpForm.id) payload.id = followUpForm.id
      const res = await fetch("/api/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!data.success) {
        setFollowUpError(data.error ?? "Erro ao salvar follow-up")
        return
      }
      const normalized = normalizeFollowUp(data.data)
      setFollowUps((prev) => {
        const exists = prev.some((f) => f.id === normalized.id)
        if (exists) {
          return prev.map((f) => (f.id === normalized.id ? normalized : f))
        }
        return [...prev, normalized].sort((a, b) => new Date(a.sendAt).getTime() - new Date(b.sendAt).getTime())
      })
      setFollowUpForm(createDefaultFollowUpForm())
    } catch {
      setFollowUpError("Erro ao salvar follow-up")
    } finally {
      setFollowUpSaving(false)
    }
  }, [selected, followUpForm, followUpPlaceholders])

  // AI Classifier panel
  interface AiResult {
    summary: string
    keyPoints: string[]
    suggestedStageId: string | null
    suggestedStageName: string | null
    confidence: number
    suggestedTagIds: string[]
    suggestedTagNames: string[]
    score: number
    qualificationLevel: string
    sentiment: "positivo" | "neutro" | "negativo"
    nextAction: string
    reasoning: string
  }
  interface AiHistoryItem extends AiResult {
    id: string
    createdAt: string
    triggeredBy: string
  }
  const [aiPanel, setAiPanel] = useState(() => {
    try { return localStorage.getItem("ai_panel_open") === "true" } catch { return false }
  })
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<AiResult | null>(null)
  const [aiHistory, setAiHistory] = useState<AiHistoryItem[]>([])
  const [aiHistoryLoading, setAiHistoryLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiApplying, setAiApplying] = useState(false)
  const [aiHistoryOpen, setAiHistoryOpen] = useState(false)

  // Persistir estado do painel
  const openAiPanel = useCallback((open: boolean) => {
    setAiPanel(open)
    try { localStorage.setItem("ai_panel_open", String(open)) } catch { /* ignore */ }
  }, [])

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

  const handleInsertEmoji = useCallback((emoji: string) => {
    const textarea = textareaRef.current
    if (!textarea) {
      setNewMessage((prev) => prev + emoji)
      return
    }
    const start = textarea.selectionStart ?? textarea.value.length
    const end = textarea.selectionEnd ?? start
    setNewMessage((prev) => {
      const before = prev.slice(0, start)
      const after = prev.slice(end)
      return `${before}${emoji}${after}`
    })
    requestAnimationFrame(() => {
      textarea.focus()
      const cursor = start + emoji.length
      textarea.setSelectionRange(cursor, cursor)
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    })
  }, [])

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/conversations")
      const data = await res.json()
      if (data.success) {
        const convs = data.data.conversations.map(normalizeConversation)
        setConversations(convs)
        const storedId = getLastConversationId()
        setSelected((prev) => {
          let next: Conversation | null = null
          if (prev) {
            next = convs.find((c) => c.id === prev.id) ?? null
          }
          if (!next && storedId) {
            next = convs.find((c) => c.id === storedId) ?? null
          }
          if (!next) {
            next = convs.length > 0 ? convs[0] : null
          }
          if (next) setLastConversationId(next.id)
          if (!next) setLastConversationId(null)
          return next
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

  useEffect(() => {
    if (selected?.id) {
      setLastConversationId(selected.id)
    }
  }, [selected?.id])

  // Auto-scroll when messages change
  // Rolar para o fim ao trocar de conversa (instantâneo)
  const selectedId = selected?.id
  useEffect(() => {
    if (!selectedId) return
    // usar setTimeout para garantir que o DOM já renderizou as mensagens
    const t = setTimeout(() => scrollToBottom("instant"), 0)
    return () => clearTimeout(t)
  }, [selectedId, scrollToBottom])

  // Rolar para o fim ao receber nova mensagem (suave, só se já estava perto do fim)
  useEffect(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distFromBottom < 200) scrollToBottom("smooth")
    else setShowScrollDown(true)
  }, [selected?.messages?.length, scrollToBottom])

  // ── Templates ──────────────────────────────────────────────────────────────

  const fetchTemplates = async (force = false) => {
    if ((templates.length > 0 && !force) || templateLoading) return
    try {
      setTemplateLoading(true)
      const res = await fetch("/api/templates")
      const data = await res.json()
      if (data.success) {
        const convs = data.data.templates.map(normalizeTemplate)
        setTemplates(convs)
      }
    } catch (err) { console.error(err) } finally { setTemplateLoading(false) }
  }

  function getTemplatePlaceholders(tpl?: Template | null) {
    if (!tpl) return [] as string[]
    if (Array.isArray(tpl.variables)) return tpl.variables as string[]
    try { return JSON.parse(tpl.variables || "[]") as string[] } catch { return [] as string[] }
  }

  function renderTemplateContent(tpl: Template, vars: Record<string, string>) {
    const placeholders = getTemplatePlaceholders(tpl)
    return placeholders.reduce((text, key) => {
      const value = vars[key] || ""
      return text.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), value)
    }, tpl.content)
  }

  function getDefaultTemplateValue(key: string, lead?: Conversation["lead"]) {
    if (!lead) return ""
    const normalized = key.trim().toLowerCase().replace(/[^a-z0-9]/g, "")
    if (["name", "nome", "firstname"].includes(normalized)) return lead.name || ""
    if (["lastname", "sobrenome"].includes(normalized)) return lead.name?.split(" ").slice(1).join(" ") || ""
    if (["phone", "telefone", "whatsapp", "numero"].includes(normalized)) {
      return lead.phone || lead.whatsappNumber || ""
    }
    if (["company", "empresa", "companyname"].includes(normalized)) return lead.companyName || ""
    return ""
  }

  const updateTemplatePreview = (tpl: Template | null, vars: Record<string, string>) => {
    if (!tpl) { setTemplatePreview(""); return }
    const preview = renderTemplateContent(tpl, vars)
    setTemplatePreview(preview)
    setNewMessage(preview)
  }

  const personalTemplates = useMemo(() => templates.filter((tpl) => tpl.isGlobal === false || (!!tpl.createdById && tpl.createdById === user?.id)), [templates, user?.id])
  const globalTemplates = useMemo(() => templates.filter((tpl) => tpl.isGlobal !== false && !tpl.createdById), [templates])

  const openSaveTemplateModal = (msg: Message) => {
    setNewTemplateName("")
    setNewTemplateCategory("")
    setSaveTemplateModal({ open: true, message: msg })
  }

  const handleSaveTemplate = async () => {
    const message = saveTemplateModal.message
    if (!message || !newTemplateName.trim()) {
      toast({ variant: "destructive", title: "Informe um nome para o template" })
      return
    }
    try {
      setSavingTemplate(true)
      const body = {
        name: newTemplateName.trim(),
        content: message.content,
        variables: JSON.stringify([]),
        category: newTemplateCategory || null,
        scope: "personal",
      }
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast({ variant: "destructive", title: "Erro ao salvar template", description: data.error?.message || "Tente novamente" })
        return
      }
      toast({ title: "Template salvo", description: "Disponível em Meus templates" })
      setSaveTemplateModal({ open: false, message: null })
      setNewTemplateName("")
      setNewTemplateCategory("")
      fetchTemplates(true)
    } catch (err) {
      console.error("[template] erro ao salvar", err)
      toast({ variant: "destructive", title: "Erro ao salvar template" })
    } finally {
      setSavingTemplate(false)
    }
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

    const tempId = `temp-${Date.now()}`
    const capturedReplyTo = replyTo
    const msg: Message = {
      id: tempId,
      direction: "outgoing",
      content: text,
      createdAt: new Date().toISOString(),
      isRead: false,
      messageType: "text",
      mediaUrl: null,
      metadata: capturedReplyTo
        ? {
            quotedContent: capturedReplyTo.content || MEDIA_LABELS[capturedReplyTo.messageType || ""] || "Anexo",
            quotedMessageType: capturedReplyTo.messageType || "text",
            quotedMsgId: capturedReplyTo.externalId ?? null,
          }
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
      if (capturedReplyTo?.externalId) {
        payload.quotedMsgId = capturedReplyTo.externalId
        payload.quotedFromMe = capturedReplyTo.direction === "outgoing"
        payload.quotedContent = capturedReplyTo.content || ""
        payload.quotedMsgType = capturedReplyTo.messageType || "text"
      }
      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (selectedTemplate) clearTemplate()
      if (!response.ok) console.error("Erro ao enviar:", await response.text())
      // Remove temp message — SSE will deliver the real one from DB
      setSelected((s) => s ? { ...s, messages: s.messages.filter((m) => m.id !== tempId) } : s)
      setConversations((prev) => prev.map((c) => c.id === selected.id ? { ...c, messages: c.messages.filter((m) => m.id !== tempId) } : c))
    } catch (err) { console.error(err) } finally { setIsSending(false) }
  }

  // ── Send media ─────────────────────────────────────────────────────────────

  const handleSendMedia = useCallback(async (file: File, mediaType: string, ptt = false) => {
    if (!selected) return
    setUploadingMedia(true)

    // Optimistic placeholder
    const tempMsg: Message = {
      id: `temp-media-${Date.now()}`,
      direction: "outgoing",
      content: "",
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
      if (ptt) form.append("ptt", "true")
      console.log("[handleSendMedia] POST /api/whatsapp/send/media — leadId:", selected.lead.id, "file:", file.name, file.size, "ptt:", ptt)
      const response = await fetch("/api/whatsapp/send/media", { method: "POST", body: form })
      const json = await response.json().catch(() => null)
      console.log("[handleSendMedia] resposta:", response.status, json)
      if (response.ok) {
        await loadConversations()
      } else {
        console.error("[handleSendMedia] Erro:", json)
        setSelected((s) => s ? { ...s, messages: s.messages.filter((m) => m.id !== tempMsg.id) } : s)
      }
    } catch (err) { console.error(err) } finally { setUploadingMedia(false) }
  }, [selected, loadConversations])

  // ── Send voice ─────────────────────────────────────────────────────────────

  const handleVoiceSend = useCallback(async (blob: Blob, mimeType: string) => {
    console.log("[handleVoiceSend] blob.size =", blob.size, "mimeType =", mimeType, "selected =", selected?.id)
    setIsRecording(false)
    if (!selected) { console.error("[handleVoiceSend] Nenhuma conversa selecionada"); return }
    const ext = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "mp4" : "webm"
    const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeType })
    console.log("[handleVoiceSend] arquivo criado:", file.name, file.size, "bytes — enviando como PTT")
    await handleSendMedia(file, "audio", true)
  }, [selected, handleSendMedia])

  // ── Delete message ─────────────────────────────────────────────────────────

  const handleDeleteMessage = useCallback(async (msg: Message) => {
    setMenuMsg(null)
    // Optimistic remove from UI
    setSelected((s) => s ? { ...s, messages: s.messages.filter((m) => m.id !== msg.id) } : s)
    setConversations((prev) =>
      prev.map((c) => ({ ...c, messages: c.messages.filter((m) => m.id !== msg.id) }))
    )
    try {
      await fetch(`/api/whatsapp/messages/${msg.id}`, { method: "DELETE" })
    } catch (err) {
      console.error("[handleDeleteMessage] Erro ao deletar mensagem:", err)
    }
  }, [])

  // ── Conversation actions ───────────────────────────────────────────────────

  const handleArchiveConv = useCallback(async (conv: Conversation) => {
    setConvMenu(null)
    const newVal = !conv.isArchived
    setConversations((prev) => prev.map((c) => c.id === conv.id ? { ...c, isArchived: newVal } : c))
    await fetch(`/api/whatsapp/conversations/${conv.id}/archive`, { method: "POST" })
  }, [])

  const handlePinConv = useCallback(async (conv: Conversation) => {
    setConvMenu(null)
    const newVal = !conv.isPinned
    setConversations((prev) => prev.map((c) => c.id === conv.id ? { ...c, isPinned: newVal } : c))
    await fetch(`/api/whatsapp/conversations/${conv.id}/pin`, { method: "POST" })
  }, [])

  const handleDeleteConv = useCallback(async (conv: Conversation) => {
    setConvMenu(null)
    if (!confirm(`Apagar conversa com ${conv.lead.name}?`)) return
    setConversations((prev) => prev.filter((c) => c.id !== conv.id))
    if (selected?.id === conv.id) setSelected(null)
    await fetch(`/api/whatsapp/conversations/${conv.id}`, { method: "DELETE" })
  }, [selected])

  const handleAddLabel = useCallback(async (convId: string, label: string) => {
    if (!label.trim()) return
    setLabelInput(null)
    const res = await fetch(`/api/whatsapp/conversations/${convId}/labels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label.trim() }),
    })
    const json = await res.json()
    if (json.success) {
      setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, labels: json.labels } : c))
      setSelected((s) => s?.id === convId ? { ...s, labels: json.labels } : s)
    }
  }, [])

  const handleRemoveLabel = useCallback(async (convId: string, label: string) => {
    const res = await fetch(`/api/whatsapp/conversations/${convId}/labels`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    })
    const json = await res.json()
    if (json.success) {
      setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, labels: json.labels } : c))
      setSelected((s) => s?.id === convId ? { ...s, labels: json.labels } : s)
    }
  }, [])

  const handleStarMessage = useCallback(async (msg: Message) => {
    const cur = (msg.metadata?.isStarred as boolean) ?? false
    setSelected((s) => s ? {
      ...s, messages: s.messages.map((m) => m.id === msg.id
        ? { ...m, metadata: { ...(m.metadata || {}), isStarred: !cur } } : m)
    } : s)
    await fetch(`/api/whatsapp/messages/${msg.id}/star`, { method: "POST" })
  }, [])

  // ── Lead tag handlers ──────────────────────────────────────────────────────

  const handleApplyTag = useCallback(async (tagId: string) => {
    if (!selected) return
    try {
      const res = await fetch(`/api/leads/${selected.lead.id}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId, source: "manual" }),
      })
      const data = await res.json()
      if (data.success) {
        setLeadTags((prev) => {
          const exists = prev.some((lt) => lt.tagId === tagId)
          return exists ? prev : [...prev, data.data]
        })
      }
    } catch { /* ignore */ }
  }, [selected])

  const handleRemoveTag = useCallback(async (tagId: string) => {
    if (!selected) return
    try {
      await fetch(`/api/leads/${selected.lead.id}/tags?tagId=${tagId}`, { method: "DELETE" })
      setLeadTags((prev) => prev.filter((lt) => lt.tagId !== tagId))
    } catch { /* ignore */ }
  }, [selected])

  const handleCreateAndApplyTag = useCallback(async (name: string, colorHex: string) => {
    if (!selected || !name.trim()) return
    setCreatingTag(true)
    try {
      // Create tag in catalog
      const createRes = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), colorHex }),
      })
      const createData = await createRes.json()
      if (!createData.success) return
      const newTag: CatalogTag = { ...createData.data, _count: { leadTags: 0 } }
      setAllTags((prev) => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)))
      // Apply to lead
      const applyRes = await fetch(`/api/leads/${selected.lead.id}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId: newTag.id, source: "manual" }),
      })
      const applyData = await applyRes.json()
      if (applyData.success) {
        setLeadTags((prev) => [...prev, applyData.data])
        setTagSearch("")
        setTagCreateColor("#10B981")
      }
    } catch { /* ignore */ }
    finally { setCreatingTag(false) }
  }, [selected])

  // ── AI Classifier ──────────────────────────────────────────────────────────

  const fetchAiHistory = useCallback(async (leadId: string) => {
    setAiHistoryLoading(true)
    try {
      const res = await fetch(`/api/ai/analyses?leadId=${leadId}`)
      const data = await res.json()
      if (data.success && data.data.length > 0) {
        setAiHistory(data.data)
        setAiResult(data.data[0]) // mostra análise mais recente automaticamente
        setAiError(null)
      } else {
        setAiHistory([])
        setAiResult(null)
      }
    } catch { /* ignore */ }
    finally { setAiHistoryLoading(false) }
  }, [])

  const handleAnalyze = useCallback(async () => {
    if (!selected) return
    openAiPanel(true)
    setAiLoading(true)
    setAiResult(null)
    setAiError(null)
    try {
      const res = await fetch("/api/ai/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: selected.lead.id }),
      })
      const data = await res.json()
      if (data.success) {
        setAiResult(data.data.result)
        setAiError(null)
        // Recarregar histórico do banco
        fetchAiHistory(selected.lead.id)
      } else {
        setAiError(data.error ?? "Erro desconhecido")
      }
    } catch {
      setAiError("Erro ao conectar com o servidor")
    } finally {
      setAiLoading(false)
    }
  }, [selected, openAiPanel, fetchAiHistory])

  const handleApplyAiSuggestions = useCallback(async (opts: { tags: boolean; stage: boolean; score: boolean }) => {
    if (!selected || !aiResult) return
    setAiApplying(true)
    try {
      const body: Record<string, unknown> = { leadId: selected.lead.id }
      if (opts.tags && aiResult.suggestedTagIds.length > 0) body.tagIds = aiResult.suggestedTagIds
      if (opts.stage && aiResult.suggestedStageId) body.stageId = aiResult.suggestedStageId
      if (opts.score) { body.score = aiResult.score; body.qualificationLevel = aiResult.qualificationLevel }

      const res = await fetch("/api/ai/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success) {
        // Atualizar tags no painel
        if (opts.tags) {
          const r = await fetch(`/api/leads/${selected.lead.id}/tags`)
          const d = await r.json()
          if (d.success) setLeadTags(d.data)
        }
        // Atualizar qualificação na lista de conversas (sem refresh)
        if ((opts.score || opts.stage) && data.data?.lead) {
          const { qualificationLevel, score } = data.data.lead
          setConversations((prev) => prev.map((c) =>
            c.lead.id === selected.lead.id
              ? { ...c, lead: { ...c.lead, qualificationLevel, score } }
              : c
          ))
        }
      }
    } catch { /* ignore */ }
    finally { setAiApplying(false) }
  }, [selected, aiResult])

  // ── Conversation selection ─────────────────────────────────────────────────

  const fetchLeadTags = useCallback(async (leadId: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}/tags`)
      const data = await res.json()
      if (data.success) setLeadTags(data.data)
    } catch { /* ignore */ }
  }, [])

  const fetchAllTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags")
      const data = await res.json()
      if (data.success) setAllTags(data.data)
    } catch { /* ignore */ }
  }, [])

  const handleSelectConversation = async (conv: Conversation) => {
    setSelected(conv)
    setLastConversationId(conv.id)
    setReplyTo(null)
    setMenuMsg(null)
    setReactingMsg(null)
    fetchLeadTags(conv.lead.id)
    // Carregar histórico de análises do banco
    setAiResult(null)
    setAiHistory([])
    setAiError(null)
    setAiHistoryOpen(false)
    fetchAiHistory(conv.lead.id)
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

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      const matchesSearch = !searchTerm || c.lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.lead.phone?.includes(searchTerm)
      const matchesDate = !dateFilter
        || c.messages.some((msg) => matchesDateFilter(msg.createdAt, dateFilter))
        || matchesDateFilter(c.lastMessageAt, dateFilter)
      return matchesSearch && matchesDate
    })
  }, [conversations, searchTerm, dateFilter])

  const visibleConversations = useMemo(() => filtered.filter((c) => !c.isArchived), [filtered])
  const archivedConversations = useMemo(() => filtered.filter((c) => c.isArchived), [filtered])
  const currentConversations = useMemo(() => (showArchivedList ? archivedConversations : visibleConversations), [showArchivedList, visibleConversations, archivedConversations])

  const leadFirstContactDate = useMemo(() => {
    if (!selected?.messages?.length) return null
    return selected.messages.reduce<Date | null>((min, msg) => {
      const date = new Date(msg.createdAt)
      if (Number.isNaN(date.getTime())) return min
      if (!min) return date
      return date.getTime() < min.getTime() ? date : min
    }, null)
  }, [selected])

  const activeDate = useMemo(() => {
    return dateFilter ? parseLocalDate(dateFilter) : leadFirstContactDate
  }, [dateFilter, leadFirstContactDate])

  useEffect(() => {
    if (!isDatePickerOpen && activeDate) {
      setCalendarMonth(activeDate)
    }
  }, [activeDate, isDatePickerOpen])

  const todayIso = formatLocalDateISO(new Date())
  const selectedIso = dateFilter || (leadFirstContactDate ? formatLocalDateISO(leadFirstContactDate) : "")
  const displayDateLabel = activeDate
    ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
        .format(activeDate)
        .replace(/\./g, "")
    : "dd/mm/aaaa"

  const calendarMonthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })
    .format(calendarMonth)
    .replace(/\./g, "")

  const calendarDays = useMemo(() => {
    const startOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
    const startWeekDay = startOfMonth.getDay()
    const gridStart = new Date(startOfMonth)
    gridStart.setDate(startOfMonth.getDate() - startWeekDay)

    return Array.from({ length: 42 }, (_, idx) => {
      const date = new Date(gridStart)
      date.setDate(gridStart.getDate() + idx)
      return {
        date,
        iso: formatLocalDateISO(date),
        label: date.getDate(),
        isCurrentMonth: date.getMonth() === calendarMonth.getMonth(),
      }
    })
  }, [calendarMonth])

  const handleSelectDate = (date: Date) => {
    setDateFilter(formatLocalDateISO(date))
    setIsDatePickerOpen(false)
  }

  const handleClearDate = () => {
    setDateFilter("")
    setIsDatePickerOpen(false)
  }

  const handleTodaySelect = () => {
    const today = new Date()
    setCalendarMonth(today)
    setDateFilter(formatLocalDateISO(today))
    setIsDatePickerOpen(false)
  }

  const handlePrevMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const timelineItems = useMemo<TimelineItem[]>(() => {
    if (!selected?.messages?.length) return []
    const items: TimelineItem[] = []
    let lastKey: string | null = null
    for (const msg of selected.messages) {
      const d = new Date(msg.createdAt)
      const key = Number.isNaN(d.getTime()) ? msg.createdAt : d.toDateString()
      if (key !== lastKey) {
        items.push({ kind: "separator", id: `separator-${msg.id}`, label: formatDateSeparatorLabel(msg.createdAt) })
        lastKey = key
      }
      items.push({ kind: "message", id: msg.id, msg })
    }
    return items
  }, [selected?.messages])

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 h-[calc(100vh-120px)]">
        <div><Skeleton className="h-8 w-36 mb-2" /><Skeleton className="h-4 w-56" /></div>
        <Card className="flex flex-1 overflow-hidden min-h-0">
          <div className="w-80 flex-shrink-0 border-r flex flex-col">
            <div className="h-16 flex items-center px-3 border-b flex-shrink-0">
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar conversas..." className="pl-8 h-9 w-full" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
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
    <div className="flex flex-col gap-4 h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-h3 font-bold" data-testid="heading-whatsapp">WhatsApp</h1>
          <p className="text-muted-foreground">Gerencie suas conversas do WhatsApp</p>
        </div>
        <div className="flex gap-2 items-center">
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm"
                className="gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                <Calendar className="h-4 w-4" />
                <span className="min-w-[120px] text-left">{displayDateLabel}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="popover-content w-[280px] p-3" align="end">
              <div className="flex items-center justify-between text-sm font-medium capitalize text-foreground mb-2">
                <button type="button" onClick={handlePrevMonth} className="p-1 rounded-full hover:bg-muted/40"><ChevronLeft className="h-4 w-4" /></button>
                <span>{calendarMonthLabel}</span>
                <button type="button" onClick={handleNextMonth} className="p-1 rounded-full hover:bg-muted/40"><ChevronRight className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-7 text-[11px] uppercase text-muted-foreground mb-1">
                {WEEK_DAYS.map((day) => (
                  <span key={day} className="text-center py-1 font-semibold">{day}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map(({ date, iso, label, isCurrentMonth }) => {
                  const isSelected = dateFilter === iso
                  const isToday = iso === todayIso
                  return (
                    <button key={iso} type="button"
                      onClick={() => handleSelectDate(date)}
                      className={`h-9 rounded-full text-sm transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow"
                          : isToday
                            ? "border border-primary/40 text-primary"
                            : "text-foreground hover:bg-muted/60"
                      } ${!isCurrentMonth ? "opacity-40" : ""}`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs font-medium text-primary">
                <button type="button" onClick={handleClearDate} className="hover:underline">Limpar</button>
                <button type="button" onClick={handleTodaySelect} className="hover:underline">Hoje</button>
              </div>
            </PopoverContent>
          </Popover>
          <Button type="button" variant="outline" size="sm" className="gap-2"
            onClick={() => setShowArchivedList((prev) => !prev)}>
            {showArchivedList ? <Inbox className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            {showArchivedList ? "Caixa de entrada" : "Arquivadas"}
            {!showArchivedList && archivedConversations.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/20 text-primary px-1.5 text-[11px] font-semibold">
                {archivedConversations.length}
              </span>
            )}
          </Button>
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
            <DialogContent className="max-h-[80vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
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
                <Button onClick={handleApplyTemplate} disabled={!selectedTemplate}>Aplicar template</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </div>

      <Card className="flex flex-1 overflow-hidden min-h-0">

        {/* ── Conversation list ─────────────────────────────────────────────── */}
        <div className="w-80 flex-shrink-0 border-r flex flex-col">
          <div className="h-16 flex items-center px-3 border-b flex-shrink-0">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar conversas..." className="pl-8 h-9 w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {showArchivedList && (
              <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b flex items-center justify-between">
                Arquivadas
                <button type="button" className="text-primary hover:underline flex items-center gap-1"
                  onClick={() => setShowArchivedList(false)}>
                  <Inbox className="h-3 w-3" /> Caixa de entrada
                </button>
              </div>
            )}
            {currentConversations.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                {showArchivedList ? "Nenhuma conversa arquivada encontrada." : "Nenhuma conversa encontrada."}
              </div>
            ) : (
              currentConversations.map((conv) => (
                <div key={conv.id}
                  className={`relative flex items-center gap-3 px-3 py-3 cursor-pointer border-b hover:bg-muted/50 transition-colors group/conv ${selected?.id === conv.id ? "bg-primary/5 border-l-2 border-l-primary" : ""} ${conv.isArchived ? "opacity-60" : ""}`}
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
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 min-w-0">
                        <p className={`text-sm truncate ${conv.unreadCount > 0 ? "font-bold" : "font-medium"}`}>{conv.lead.name}</p>
                        {conv.lead.qualificationLevel && conv.lead.qualificationLevel !== "nao_qualificado" && (
                          <span className={`flex-shrink-0 text-[9px] font-bold rounded-full px-1.5 py-0.5 leading-none ${
                            conv.lead.qualificationLevel === "quente" ? "bg-red-500/20 text-red-400" :
                            conv.lead.qualificationLevel === "morno" ? "bg-orange-500/20 text-orange-400" :
                            "bg-blue-500/20 text-blue-400"}`}>
                            {conv.lead.qualificationLevel === "quente" ? "🔥" : conv.lead.qualificationLevel === "morno" ? "🌤" : "❄️"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {conv.isPinned && <Pin className="h-3 w-3 text-muted-foreground" />}
                        {conv.isArchived && <Archive className="h-3 w-3 text-muted-foreground" />}
                        <span className="text-[10px] text-muted-foreground">{formatTime(conv.lastMessageAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs text-muted-foreground truncate flex-1">{getMessagePreview(conv.messages[conv.messages.length - 1])}</p>
                      <button type="button"
                        className="flex p-0.5 rounded-full hover:bg-muted text-muted-foreground flex-shrink-0 opacity-0 group-hover/conv:opacity-100 group-hover/conv:pointer-events-auto pointer-events-none transition-opacity"
                        onClick={(e) => { e.stopPropagation(); setConvMenu({ conv, x: e.clientX, y: e.clientY }) }}>
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {conv.labels && conv.labels.length > 0 && (
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {conv.labels.map((lbl) => (
                          <span key={lbl} className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary font-medium">
                            <Tag className="h-2.5 w-2.5" />{lbl}
                            <button type="button" className="ml-0.5 hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleRemoveLabel(conv.id, lbl) }}><X className="h-2.5 w-2.5" /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Chat area ────────────────────────────────────────────────────── */}
        {selected ? (
          <div className="flex-1 flex min-w-0">
          {/* ── Main chat column ── */}
          <div className={`flex flex-col min-w-0 transition-all duration-300 ${aiPanel ? "flex-1" : "flex-1"}`}>

            {/* Header */}
            <div className="flex items-center gap-3 border-b px-4 h-16 bg-card flex-shrink-0">
              {selected.lead.profilePicUrl ? (
                <img src={selected.lead.profilePicUrl} alt={selected.lead.name} className="h-10 w-10 rounded-full object-cover" referrerPolicy="no-referrer"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.removeAttribute("style") }} />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white text-sm font-bold">{getInitials(selected.lead.name)}</div>
              )}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <p className="font-semibold text-sm">{selected.lead.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                  {selected.lead.phone || selected.lead.whatsappNumber || "WhatsApp"}
                  {selected.lead.companyName && ` · ${selected.lead.companyName}`}
                </p>
              </div>
              {/* Tags alinhadas com os botões */}
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <div className="flex items-center gap-1 flex-wrap">
                  {leadTags.map((lt) => (
                    <span key={lt.id}
                      className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium flex-shrink-0"
                      style={{ backgroundColor: lt.tag.colorHex + "33", color: lt.tag.colorHex, border: `1px solid ${lt.tag.colorHex}55` }}>
                      {lt.source === "ai" && <span className="opacity-70">✦</span>}
                      {lt.tag.name}
                      <button type="button" className="ml-0.5 opacity-60 hover:opacity-100 leading-none" onClick={() => handleRemoveTag(lt.tagId)}>×</button>
                    </span>
                  ))}
                  {scheduledFollowUpCount > 0 && (
                    <button type="button" onClick={openFollowUpModal}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200 flex-shrink-0 hover:border-amber-300/80 transition-colors"
                      title="Ver follow-ups agendados">
                      <Clock className="h-3 w-3" />
                      {scheduledFollowUpCount} follow-up{scheduledFollowUpCount > 1 ? "s" : ""}
                    </button>
                  )}
                </div>
                <Button variant="ghost" size="icon" title="Gerenciar tags" onClick={() => { setTagModal(true); fetchAllTags() }}>
                  <Tag className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" title="Analisar conversa com IA"
                  className={aiPanel ? "text-primary bg-primary/10" : ""}
                  onClick={() => aiPanel ? openAiPanel(false) : handleAnalyze()}>
                  <Sparkles className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" title="Agendar follow-up" onClick={openFollowUpModal}>
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" title="Detalhes do lead" onClick={openLeadModal}>
                  <User className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 relative overflow-hidden">
            <div ref={messagesContainerRef} onScroll={handleMessagesScroll}
              className="h-full overflow-y-auto p-4 flex flex-col gap-1"
              style={{
                backgroundColor: resolvedTheme === "light" ? "#f5f0e7" : "#0b141a",
                backgroundImage: chatBackgroundUrl
                  ? `url(${chatBackgroundUrl})`
                  : "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
                backgroundSize: "cover",
              }}>
              {/* Spacer: empurra mensagens para o fundo quando há poucas */}
              <div className="flex-1 min-h-[8px]" />

              {timelineItems.map((item) => {
                if (item.kind === "separator") {
                  return (
                    <div key={item.id} className="my-3 flex justify-center">
                      <span className="px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-black/30 text-white/80 border border-white/10 shadow-sm backdrop-blur">
                        {item.label}
                      </span>
                    </div>
                  )
                }
                const msg = item.msg
                const mediaBlock = renderMediaContent(msg)
                const showText = Boolean(msg.content && !(msg.mediaUrl && !msg.content))
                const isMenuOpen = menuMsg?.id === msg.id
                const isReacting = reactingMsg?.id === msg.id
                const isOut = msg.direction === "outgoing"

                return (
                  <div key={item.id} data-msg-id={msg.externalId ?? msg.id} className={`flex ${isOut ? "justify-end" : "justify-start"} group mb-1`}>
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
                        <button type="button" title="Favoritar"
                          onClick={() => handleStarMessage(msg)}
                          className={`p-1 rounded-full hover:bg-muted transition-colors ${msg.metadata?.isStarred ? "text-yellow-400" : "text-muted-foreground hover:text-foreground"}`}>
                          <Star className={`h-3.5 w-3.5 ${msg.metadata?.isStarred ? "fill-yellow-400" : ""}`} />
                        </button>
                        {isOut && (
                          <button type="button" title="Salvar como template"
                            onClick={() => openSaveTemplateModal(msg)}
                            className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                            <FileText className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {msg.externalId && (
                          <button type="button" title="Reencaminhar"
                            onClick={() => setForwardMsg(msg)}
                            className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                            <Forward className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button type="button" title="Apagar" onClick={() => handleDeleteMessage(msg)}
                          className="p-1 rounded-full hover:bg-muted transition-colors text-red-400 hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Reaction picker */}
                      {isReacting && (
                        <ReactionPicker
                          onReact={async (emoji) => {
                            setReactingMsg(null)
                            // Toggle locally
                            const cur = reactions[msg.id] ?? []
                            const already = cur.includes(emoji)
                            setReactions((prev) => ({
                              ...prev,
                              [msg.id]: already
                                ? cur.filter((e) => e !== emoji)
                                : [...cur, emoji],
                            }))
                            // Send to WhatsApp
                            try {
                              await fetch("/api/whatsapp/react", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ messageId: msg.id, emoji: already ? "" : emoji }),
                              })
                            } catch (err) {
                              console.error("[reaction] Erro ao enviar reação:", err)
                            }
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
                          <button
                            type="button"
                            className="mb-2 w-full text-left rounded border-l-2 border-white/50 bg-white/10 px-2 py-1 text-xs text-white/70 line-clamp-2 hover:bg-white/20 transition-colors"
                            onClick={() => {
                              const quotedId = msg.metadata?.quotedMsgId as string | undefined
                              if (!quotedId) return
                              const el = document.querySelector(`[data-msg-id="${quotedId}"]`)
                              if (el) {
                                el.scrollIntoView({ behavior: "smooth", block: "center" })
                                el.classList.add("bg-white/10")
                                setTimeout(() => el.classList.remove("bg-white/10"), 1500)
                              }
                            }}
                          >
                            {`${msg.metadata.quotedContent}`}
                          </button>
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
                              onClick={async () => {
                                setReactions((prev) => ({ ...prev, [msg.id]: (prev[msg.id] ?? []).filter((e) => e !== emoji) }))
                                try {
                                  await fetch("/api/whatsapp/react", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ messageId: msg.id, emoji: "" }),
                                  })
                                } catch (err) { console.error("[reaction remove]", err) }
                              }}>
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

                  <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        title="Inserir emoji"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted/40 text-lg shadow-sm hover:bg-muted transition-colors"
                      >
                        <Smile className="h-4 w-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-64 p-3 space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Emojis populares</div>
                      <div className="grid grid-cols-6 gap-1.5">
                        {POPULAR_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className="flex items-center justify-center rounded-md bg-muted/60 hover:bg-muted text-xl p-1 transition-colors"
                            onClick={() => handleInsertEmoji(emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground text-center">Clique para inserir na mensagem</p>
                    </PopoverContent>
                  </Popover>

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
          {/* ── AI Analysis Panel ───────────────────────────────────────────── */}
          {aiPanel && (
            <div className="w-80 flex-shrink-0 border-l border-border bg-card flex flex-col overflow-hidden">
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 h-16 border-b border-border flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">Análise IA</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Reanalisar" onClick={handleAnalyze} disabled={aiLoading || aiHistoryLoading}>
                    {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openAiPanel(false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {aiLoading && (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground text-center">Analisando a conversa...</p>
                  </div>
                )}

                {aiError && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 flex gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{aiError}</p>
                  </div>
                )}

                {aiResult && !aiLoading && (
                  <>
                    {/* Sentiment + Score */}
                    <div className="flex gap-2">
                      <div className="flex-1 rounded-lg border border-border p-2.5 text-center">
                        <p className="text-[10px] text-muted-foreground mb-1">Sentimento</p>
                        <span className={`text-xs font-semibold ${aiResult.sentiment === "positivo" ? "text-green-500" : aiResult.sentiment === "negativo" ? "text-destructive" : "text-muted-foreground"}`}>
                          {aiResult.sentiment === "positivo" ? "😊 Positivo" : aiResult.sentiment === "negativo" ? "😟 Negativo" : "😐 Neutro"}
                        </span>
                      </div>
                      <div className="flex-1 rounded-lg border border-border p-2.5 text-center">
                        <p className="text-[10px] text-muted-foreground mb-1">Score</p>
                        <span className="text-xs font-semibold text-primary">{aiResult.score}/100</span>
                      </div>
                    </div>

                    {/* Confidence bar */}
                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Confiança da análise</span>
                        <span>{aiResult.confidence}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${aiResult.confidence}%` }} />
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Resumo</p>
                      <p className="text-xs leading-relaxed">{aiResult.summary}</p>
                    </div>

                    {/* Key points */}
                    {aiResult.keyPoints.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pontos-chave</p>
                        <ul className="space-y-1.5">
                          {aiResult.keyPoints.map((pt, i) => (
                            <li key={i} className="flex gap-2 text-xs">
                              <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Suggested stage */}
                    {aiResult.suggestedStageName && (
                      <div className="rounded-lg border border-border p-3">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Estágio sugerido</p>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5 text-primary" />
                            <span className="text-sm font-medium">{aiResult.suggestedStageName}</span>
                          </div>
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            disabled={aiApplying}
                            onClick={() => handleApplyAiSuggestions({ tags: false, stage: true, score: false })}>
                            {aiApplying ? <Loader2 className="h-3 w-3 animate-spin" /> : "Aplicar"}
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1.5 italic">{aiResult.reasoning}</p>
                      </div>
                    )}

                    {/* Suggested tags */}
                    {aiResult.suggestedTagNames.length > 0 && (
                      <div className="rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Tags sugeridas</p>
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            disabled={aiApplying}
                            onClick={() => handleApplyAiSuggestions({ tags: true, stage: false, score: false })}>
                            {aiApplying ? <Loader2 className="h-3 w-3 animate-spin" /> : "Aplicar"}
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {aiResult.suggestedTagNames.map((name, i) => (
                            <span key={i} className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 px-2 py-0.5 text-[10px] font-medium">
                              <Sparkles className="h-2.5 w-2.5" />{name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Score suggestion */}
                    <div className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Qualificação</p>
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          disabled={aiApplying}
                          onClick={() => handleApplyAiSuggestions({ tags: false, stage: false, score: true })}>
                          {aiApplying ? <Loader2 className="h-3 w-3 animate-spin" /> : "Aplicar"}
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`rounded-full px-2 py-0.5 font-medium text-[10px] ${
                          aiResult.qualificationLevel === "quente" ? "bg-red-500/20 text-red-400" :
                          aiResult.qualificationLevel === "morno" ? "bg-orange-500/20 text-orange-400" :
                          aiResult.qualificationLevel === "frio" ? "bg-blue-500/20 text-blue-400" :
                          "bg-muted text-muted-foreground"}`}>
                          {aiResult.qualificationLevel === "quente" ? "🔥 Quente" :
                           aiResult.qualificationLevel === "morno" ? "🌤 Morno" :
                           aiResult.qualificationLevel === "frio" ? "❄️ Frio" : "— Não qualificado"}
                        </span>
                        <span className="text-muted-foreground">Score: {aiResult.score}</span>
                      </div>
                    </div>

                    {/* Next action */}
                    {aiResult.nextAction && (
                      <div className="rounded-lg bg-primary/10 border border-primary/20 p-3">
                        <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-1.5 flex items-center gap-1">
                          <Zap className="h-3 w-3" />Próxima ação
                        </p>
                        <p className="text-xs leading-relaxed">{aiResult.nextAction}</p>
                      </div>
                    )}

                    {/* Apply all */}
                    <Button className="w-full" size="sm" disabled={aiApplying}
                      onClick={() => handleApplyAiSuggestions({ tags: true, stage: true, score: true })}>
                      {aiApplying ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="mr-2 h-3.5 w-3.5" />}
                      Aplicar tudo
                    </Button>
                  </>
                )}

                {!aiResult && !aiLoading && !aiError && (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                    {aiHistoryLoading
                      ? <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
                      : <>
                          <Sparkles className="h-10 w-10 text-primary/40" />
                          <p className="text-sm text-muted-foreground">Clique em <strong>Analisar</strong> para gerar a análise desta conversa.</p>
                        </>
                    }
                  </div>
                )}

                {/* ── Histórico de análises ── */}
                {aiHistory.length > 1 && (
                  <div className="border-t border-border pt-3">
                    <button type="button"
                      className="flex w-full items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors mb-2"
                      onClick={() => setAiHistoryOpen((v) => !v)}>
                      <span>Histórico ({aiHistory.length} análises)</span>
                      <ChevronUp className={`h-3 w-3 transition-transform ${aiHistoryOpen ? "" : "rotate-180"}`} />
                    </button>
                    {aiHistoryOpen && (
                      <div className="space-y-1.5">
                        {aiHistory.map((h, i) => (
                          <button key={h.id} type="button"
                            className={`w-full text-left rounded-lg border px-3 py-2 hover:bg-muted transition-colors ${i === 0 && aiResult?.summary === h.summary ? "border-primary/40 bg-primary/5" : "border-border"}`}
                            onClick={() => setAiResult(h)}>
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(h.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                              </span>
                              <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-medium ${h.triggeredBy === "auto" ? "bg-blue-500/15 text-blue-400" : "bg-primary/15 text-primary"}`}>
                                {h.triggeredBy === "auto" ? "Auto" : "Manual"}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{h.summary ?? h.suggestedStageName ?? "Análise"}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
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

      {/* ── Conversation context menu ──────────────────────────────────────── */}
      {convMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setConvMenu(null)} />
          <div className="fixed z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[180px] text-sm"
            style={{ left: Math.min(convMenu.x, window.innerWidth - 200), top: Math.min(convMenu.y, window.innerHeight - 280) }}>
            <button type="button" className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted"
              onClick={() => handlePinConv(convMenu.conv)}>
              {convMenu.conv.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              {convMenu.conv.isPinned ? "Desafixar" : "Fixar conversa"}
            </button>
            <button type="button" className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted"
              onClick={() => handleArchiveConv(convMenu.conv)}>
              {convMenu.conv.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              {convMenu.conv.isArchived ? "Desarquivar" : "Arquivar conversa"}
            </button>
            <button type="button" className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted"
              onClick={() => { setConvMenu(null); setLabelInput({ convId: convMenu.conv.id, value: "" }) }}>
              <Tag className="h-4 w-4" /> Adicionar etiqueta
            </button>
            <div className="my-1 border-t border-border" />
            <button type="button" className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted text-destructive"
              onClick={() => handleDeleteConv(convMenu.conv)}>
              <Trash2 className="h-4 w-4" /> Apagar conversa
            </button>
          </div>
        </>
      )}

      {/* ── Add label dialog ───────────────────────────────────────────────── */}
      {labelInput && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setLabelInput(null)} />
          <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-xl shadow-2xl p-5 w-80">
            <p className="font-semibold mb-3">Adicionar etiqueta</p>
            <input
              autoFocus
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mb-3"
              placeholder="Nome da etiqueta..."
              value={labelInput.value}
              onChange={(e) => setLabelInput((l) => l ? { ...l, value: e.target.value } : l)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddLabel(labelInput.convId, labelInput.value) }}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setLabelInput(null)}>Cancelar</Button>
              <Button size="sm" onClick={() => handleAddLabel(labelInput.convId, labelInput.value)}>Adicionar</Button>
            </div>
          </div>
        </>
      )}

      {/* ── Tag management modal ──────────────────────────────────────────── */}
      {tagModal && selected && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => { setTagModal(false); setTagSearch(""); setTagCreateColor("#10B981") }} />
          <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-xl shadow-2xl p-5 w-96 max-h-[80vh] flex flex-col">
            <p className="font-semibold mb-3 flex items-center gap-2"><Tag className="h-4 w-4" /> Tags — {selected.lead.name}</p>

            {/* Tags aplicadas ao lead */}
            {leadTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3 pb-3 border-b border-border">
                {leadTags.map((lt) => (
                  <span key={lt.id}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{ backgroundColor: lt.tag.colorHex + "33", color: lt.tag.colorHex, border: `1px solid ${lt.tag.colorHex}55` }}>
                    {lt.source === "ai" && <span className="opacity-70 text-[10px]">✦</span>}
                    {lt.tag.name}
                    <button type="button" className="ml-0.5 opacity-60 hover:opacity-100 leading-none" title="Remover" onClick={() => handleRemoveTag(lt.tagId)}>×</button>
                  </span>
                ))}
              </div>
            )}

            {/* Campo de busca + criar */}
            <div className="flex gap-2 mb-2">
              <input
                autoFocus
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Buscar ou criar tag..."
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && tagSearch.trim()) {
                    const exact = allTags.find((t) => t.name.toLowerCase() === tagSearch.trim().toLowerCase())
                    if (exact) { handleApplyTag(exact.id) }
                    else { handleCreateAndApplyTag(tagSearch.trim(), tagCreateColor) }
                  }
                }}
              />
              <input type="color" value={tagCreateColor} onChange={(e) => setTagCreateColor(e.target.value)}
                className="h-9 w-9 rounded-md border border-input cursor-pointer p-0.5 flex-shrink-0" title="Cor da nova tag" />
            </div>

            {/* Lista do catálogo */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-0.5 min-h-0">
              {(() => {
                const filtered = allTags.filter((t) => !tagSearch || t.name.toLowerCase().includes(tagSearch.toLowerCase()))
                const noExact = tagSearch.trim() && !allTags.some((t) => t.name.toLowerCase() === tagSearch.trim().toLowerCase())

                return (
                  <>
                    {filtered.map((t) => {
                      const applied = leadTags.some((lt) => lt.tagId === t.id)
                      return (
                        <button key={t.id} type="button"
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left w-full transition-colors ${applied ? "opacity-40 cursor-default" : "hover:bg-muted"}`}
                          onClick={() => { if (!applied) handleApplyTag(t.id) }}>
                          <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.colorHex }} />
                          <span className="text-sm flex-1">{t.name}</span>
                          {applied ? <span className="text-xs text-muted-foreground">✓</span> : <span className="text-xs text-muted-foreground">Aplicar</span>}
                        </button>
                      )
                    })}

                    {/* Opção de criar tag nova */}
                    {noExact && (
                      <button type="button"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-left w-full hover:bg-muted transition-colors border border-dashed border-border mt-1"
                        onClick={() => handleCreateAndApplyTag(tagSearch.trim(), tagCreateColor)}
                        disabled={creatingTag}>
                        <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: tagCreateColor }} />
                        <span className="text-sm flex-1">
                          {creatingTag ? "Criando..." : <>Criar e aplicar <strong>&ldquo;{tagSearch.trim()}&rdquo;</strong></>}
                        </span>
                        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )}

                    {filtered.length === 0 && !noExact && (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        Digite o nome de uma tag para buscar ou criar
                      </p>
                    )}
                  </>
                )
              })()}
            </div>

            <Button variant="outline" size="sm" className="mt-3" onClick={() => { setTagModal(false); setTagSearch(""); setTagCreateColor("#10B981") }}>Fechar</Button>
          </div>
        </>
      )}

      {/* ── Follow-up modal ───────────────────────────────────────────────── */}
      <Dialog open={followUpModal} onOpenChange={(open) => { if (!open) closeFollowUpModal() }}>
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden border border-border rounded-2xl bg-card shadow-2xl max-h-[90vh] flex flex-col">
          <div className="px-6 py-4 border-b border-border/60">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" /> Agendar follow-up automático
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Escolha data, horário e mensagem para que o sistema envie automaticamente para o lead.
            </DialogDescription>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {followUpError && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{followUpError}</span>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Calendar + time */}
              <div className="rounded-2xl border border-border/70 bg-muted/10 p-4 space-y-3 shadow-inner">
                <div className="flex items-center justify-between text-sm font-semibold capitalize text-foreground">
                  <button type="button" onClick={handleFollowUpPrevMonth} className="p-1 rounded-full hover:bg-muted/60">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span>{followUpMonthLabel}</span>
                  <button type="button" onClick={handleFollowUpNextMonth} className="p-1 rounded-full hover:bg-muted/60">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-7 text-[11px] uppercase text-muted-foreground">
                  {WEEK_DAYS.map((day) => (
                    <span key={day} className="text-center py-1 font-semibold">{day}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {followUpCalendarDays.map(({ date, iso, label, isCurrentMonth }) => {
                    const isSelected = followUpSelectedIso === iso
                    const isToday = iso === followUpTodayIso
                    return (
                      <button key={iso} type="button" onClick={() => handleFollowUpDateSelect(iso)}
                        className={`h-9 rounded-full text-sm transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow"
                            : isToday
                              ? "border border-primary/40 text-primary"
                              : "text-foreground hover:bg-muted/60"
                        } ${!isCurrentMonth ? "opacity-40" : ""}`}>
                        {label}
                      </button>
                    )
                  })}
                </div>
                <div className="space-y-2 text-sm">
                  <Label className="text-xs uppercase text-muted-foreground">Horário</Label>
                  <select value={followUpForm.sendTime} onChange={(e) => handleFollowUpTimeChange(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    {timeOptions.map((slot) => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Mensagem + template picker */}
              <div className="rounded-2xl border border-border/70 bg-muted/10 p-4 space-y-4 shadow-inner">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase text-muted-foreground">Mensagem</Label>
                  <div className="flex gap-1">
                    {FOLLOW_UP_EMOJIS.map((emoji) => (
                      <button key={emoji} type="button" onClick={() => handleFollowUpMessageChange(followUpForm.message + emoji)}
                        className="text-sm hover:scale-110 transition-transform">
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <Textarea value={followUpForm.message} onChange={(e) => handleFollowUpMessageChange(e.target.value)}
                  rows={6}
                  className="bg-background text-sm"
                  placeholder="Escreva a mensagem que será enviada ao lead" />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase text-muted-foreground">Templates disponíveis</Label>
                    {followUpForm.templateId && (
                      <button type="button" onClick={clearFollowUpTemplate} className="text-xs text-destructive hover:underline">Limpar seleção</button>
                    )}
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {templateLoading && <p className="text-xs text-muted-foreground">Carregando templates...</p>}
                    {!templateLoading && templates.length === 0 && (
                      <p className="text-xs text-muted-foreground">Nenhum template cadastrado.</p>
                    )}
                    {templates.map((tpl) => (
                      <button key={tpl.id} type="button" onClick={() => handleFollowUpTemplateSelect(tpl, { applyContent: true })}
                        className={`w-full rounded-xl border px-3 py-2 text-left transition hover:border-primary/60 ${followUpForm.templateId === tpl.id ? "border-primary bg-primary/5" : "border-border/60"}`}>
                        <div className="flex items-center justify-between text-sm font-semibold">
                          <span>{tpl.name}</span>
                          {tpl.category && <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{tpl.category}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{tpl.content}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {followUpTemplatePreview && (
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Prévia do template</p>
                    <p className="text-sm whitespace-pre-wrap">{followUpTemplatePreview}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Listas */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/10 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" /> Agendados
                  </p>
                  {followUpLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                {scheduledFollowUps.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum follow-up futuro.</p>
                ) : (
                  <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                    {scheduledFollowUps.map((item) => (
                      <div key={item.id} className="border border-border rounded-xl p-3 bg-background/40 space-y-2">
                        <div className="flex items-center justify-between text-sm font-semibold">
                          <span>{formatFollowUpDateTime(item.sendAt)}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${FOLLOW_UP_STATUS_STYLES[item.status]}`}>
                            {item.status === "scheduled" ? "Agendado" : item.status === "sent" ? "Enviado" : "Falhou"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{item.message || "Mensagem via template"}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          {item.template && <span>Template: {item.template.name}</span>}
                          <div className="flex gap-2">
                            <button type="button" className="text-primary hover:underline" onClick={() => handleFollowUpEdit(item)}>Editar</button>
                            <button type="button" className="text-destructive hover:underline" onClick={() => handleFollowUpDelete(item)}>Remover</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/10 p-4">
                <p className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-4 w-4" /> Histórico
                </p>
                {followUps.filter((f) => f.status !== "scheduled").length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum envio realizado.</p>
                ) : (
                  <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                    {followUps.filter((f) => f.status !== "scheduled").map((item) => (
                      <div key={item.id} className="border border-border rounded-xl p-3 text-sm space-y-1 bg-background/40">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{formatFollowUpDateTime(item.sendAt)}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${FOLLOW_UP_STATUS_STYLES[item.status]}`}>
                            {item.status === "sent" ? "Enviado" : "Falhou"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.message || "Mensagem via template"}</p>
                        {item.lastError && (
                          <p className="text-[11px] text-destructive">Erro: {item.lastError}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border/60 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Mensagens serão disparadas no horário configurado automaticamente.
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={closeFollowUpModal}>Cancelar</Button>
              <Button onClick={handleFollowUpSubmit} disabled={followUpSaving}>
                {followUpSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar agendamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Lead details modal ───────────────────────────────────────────── */}
      <Dialog open={leadModalOpen} onOpenChange={(open) => { if (!open) closeLeadModal() }}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden border border-border rounded-2xl bg-card shadow-2xl">
          <div className="bg-card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
              <div>
                <DialogTitle className="text-lg font-semibold">Detalhes do Lead</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Visualize e atualize as informações do contato selecionado.
                </DialogDescription>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {leadModalLoading && (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <div className="grid grid-cols-2 gap-3">
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                  </div>
                </div>
              )}

              {!leadModalLoading && leadModalError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  {leadModalError}
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" onClick={openLeadModal}>Tentar novamente</Button>
                    <Button size="sm" variant="outline" onClick={closeLeadModal}>Fechar</Button>
                  </div>
                </div>
              )}

              {!leadModalLoading && leadDetails && !leadEditMode && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {leadDetails.profilePicUrl ? (
                      <img src={leadDetails.profilePicUrl} alt={leadDetails.name} className="h-12 w-12 rounded-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold">
                        {getInitials(leadDetails.name)}
                      </div>
                    )}
                    <div>
                      <p className="text-base font-semibold">{leadDetails.name}</p>
                      <p className="text-sm text-muted-foreground">{leadDetails.companyName || "—"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
                      <p className="text-[11px] uppercase text-muted-foreground">E-mail</p>
                      <p className="text-sm font-medium break-all">{leadDetails.email || "—"}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
                      <p className="text-[11px] uppercase text-muted-foreground">Telefone</p>
                      <p className="text-sm font-medium">{leadDetails.phone || leadDetails.whatsappNumber || "—"}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
                      <p className="text-[11px] uppercase text-muted-foreground">Status</p>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusVisuals[leadDetails.status]?.bg ?? "bg-primary/15"} ${statusVisuals[leadDetails.status]?.text ?? "text-primary"}`}>
                        <Circle className="h-2 w-2" />
                        {statusLabels[leadDetails.status] ?? leadDetails.status}
                      </span>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
                      <p className="text-[11px] uppercase text-muted-foreground">Origem</p>
                      <p className="text-sm font-medium">{sourceLabels[leadDetails.source] ?? leadDetails.source}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
                      <p className="text-[11px] uppercase text-muted-foreground">Score</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, leadDetails.score ?? 0))}%` }} />
                        </div>
                        <span className="text-xs font-semibold">{leadDetails.score ?? 0}</span>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
                      <p className="text-[11px] uppercase text-muted-foreground">Criado em</p>
                      <p className="text-sm font-medium">{new Date(leadDetails.createdAt).toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={closeLeadModal}>Fechar</Button>
                    <Button onClick={() => setLeadEditMode(true)}>
                      <Edit3 className="h-4 w-4 mr-2" /> Editar
                    </Button>
                  </div>
                </div>
              )}

              {!leadModalLoading && leadDetails && leadEditMode && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <Input value={leadForm.name} onChange={(e) => handleLeadFormChange("name", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Empresa</Label>
                      <Input value={leadForm.companyName} onChange={(e) => handleLeadFormChange("companyName", e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>E-mail</Label>
                      <Input type="email" value={leadForm.email} onChange={(e) => handleLeadFormChange("email", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone/WhatsApp</Label>
                      <Input value={leadForm.phone || leadForm.whatsappNumber} onChange={(e) => {
                        handleLeadFormChange("phone", e.target.value)
                        handleLeadFormChange("whatsappNumber", e.target.value)
                      }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <select
                        value={leadForm.status}
                        onChange={(e) => handleLeadFormChange("status", e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Origem</Label>
                      <select
                        value={leadForm.source}
                        onChange={(e) => handleLeadFormChange("source", e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {Object.entries(sourceLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nível de qualificação</Label>
                      <select
                        value={leadForm.qualificationLevel}
                        onChange={(e) => handleLeadFormChange("qualificationLevel", e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {Object.entries(qualificationLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Score</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={leadForm.score}
                        onChange={(e) => {
                          const next = Number(e.target.value)
                          handleLeadFormChange("score", Number.isNaN(next) ? 0 : Math.min(100, Math.max(0, next)))
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setLeadEditMode(false)}>Cancelar</Button>
                    <Button onClick={handleLeadSave} disabled={leadSaving || !leadForm.name.trim()}>
                      {leadSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar alterações
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Forward message dialog ─────────────────────────────────────────── */}
      {forwardMsg && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setForwardMsg(null)} />
          <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-xl shadow-2xl p-5 w-80">
            <p className="font-semibold mb-3">Reencaminhar para...</p>
            <div className="max-h-60 overflow-y-auto flex flex-col gap-1">
              {conversations.filter((c) => c.id !== selected?.id).map((c) => (
                <button key={c.id} type="button"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted text-left w-full"
                  onClick={async () => {
                    setForwardMsg(null)
                    await fetch(`/api/whatsapp/messages/${forwardMsg.id}/forward`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ targetLeadId: c.lead.id }),
                    })
                  }}>
                  <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {getInitials(c.lead.name)}
                  </div>
                  <span className="text-sm truncate">{c.lead.name}</span>
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setForwardMsg(null)}>Cancelar</Button>
          </div>
        </>
      )}
    </div>
  )
}

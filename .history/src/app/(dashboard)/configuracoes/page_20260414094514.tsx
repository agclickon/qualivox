"use client"

import React, { useState, useEffect, useRef, type ReactNode } from "react"
import { useTheme } from "next-themes"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useConfirm } from "@/hooks/use-confirm"
import {
  Settings, Shield, Bell, Palette, Sun, Moon, Monitor,
  MessageSquare, Webhook, Key, Globe, Lock, Eye, EyeOff,
  CheckCircle, XCircle, Save, Loader2, Smartphone, QrCode, RefreshCw, Wifi, WifiOff, LogOut, ExternalLink,
  Plus, Trash, Tag, Edit2, ToggleLeft, ToggleRight, Sparkles, Zap, Star, ChevronDown,
  Crown, Cpu, Flame, Brain, Mic2, Bolt, Calendar, Link2, Link2Off,
  Send, ChevronRight, AlertCircle, RotateCcw, Copy,
} from "lucide-react"

interface SelectOption { value: string; label: string; icon?: React.ReactNode }

function CustomSelect({ value, onChange, options, placeholder, className = "", size = "md" }: {
  value: string
  onChange: (v: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  size?: "sm" | "md"
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)
  const h = size === "sm" ? "h-8 text-xs" : "h-9 text-sm"

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full ${h} flex items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-foreground hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors cursor-pointer`}>
        <span className="flex items-center gap-2 truncate">
          {selected?.icon && <span className="flex-shrink-0 text-muted-foreground">{selected.icon}</span>}
          {selected?.label ?? placeholder ?? "Selecione..."}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-xl overflow-hidden">
          <div className="max-h-56 overflow-y-auto py-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-muted ${opt.value === value ? "bg-primary/10 text-primary font-medium" : "text-foreground"}`}>
                {opt.icon && <span className="flex-shrink-0 text-muted-foreground">{opt.icon}</span>}
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Mantém compatibilidade com children (para selects simples não migrados)
function StyledSelect({ value, onChange, children, className = "" }: {
  value: string; onChange: (v: string) => void; children: ReactNode; className?: string
}) {
  return (
    <div className={`relative ${className}`}>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 appearance-none rounded-md border border-input bg-card px-3 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors cursor-pointer">
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
    </div>
  )
}

export default function ConfiguracoesPage() {
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const { showConfirm, ConfirmDialogElement } = useConfirm()
  const [isSaving, setIsSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Geral
  const [companyName, setCompanyName] = useState("Qualivox")
  const [timezone, setTimezone] = useState("America/Sao_Paulo")
  const [language, setLanguage] = useState("pt-BR")

  // Segurança
  const [sessionTimeout, setSessionTimeout] = useState("60")
  const [twoFactor, setTwoFactor] = useState(false)
  const [lgpdEnabled, setLgpdEnabled] = useState(true)
  const [dataRetentionDays, setDataRetentionDays] = useState("365")

  // Notificações
  const [emailNotif, setEmailNotif] = useState(true)
  const [pushNotif, setPushNotif] = useState(true)
  const [newLeadNotif, setNewLeadNotif] = useState(true)
  const [qualificationNotif, setQualificationNotif] = useState(true)
  const [messageNotif, setMessageNotif] = useState(true)

  // Integrações
  const [n8nUrl, setN8nUrl] = useState("")
  const [openaiKey, setOpenaiKey] = useState("")
  const [openaiModel, setOpenaiModel] = useState("gpt-4o-mini")
  const [anthropicKey, setAnthropicKey] = useState("")
  const [anthropicModel, setAnthropicModel] = useState("claude-sonnet-4-6")
  const [geminiKey, setGeminiKey] = useState("")
  const [geminiModel, setGeminiModel] = useState("gemini-2.5-flash")
  const [grokKey, setGrokKey] = useState("")
  const [grokModel, setGrokModel] = useState("grok-3-fast")
  const [deepseekKey, setDeepseekKey] = useState("")
  const [deepseekModel, setDeepseekModel] = useState("deepseek-chat")
  const [aiDefaultProvider, setAiDefaultProvider] = useState("openai")
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [elevenLabsKey, setElevenLabsKey] = useState("")
  const [elevenLabsVoices, setElevenLabsVoices] = useState<{ voice_id: string; name: string; category: string }[]>([])
  const [elevenLabsVoicesLoading, setElevenLabsVoicesLoading] = useState(false)

  // Google Calendar
  const [googleClientId, setGoogleClientId] = useState("")
  const [googleClientSecret, setGoogleClientSecret] = useState("")
  const [calendarConfigured, setCalendarConfigured] = useState(false)
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [calendarConnecting, setCalendarConnecting] = useState(false)

  // Lembretes de agendamento
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminder1Enabled, setReminder1Enabled] = useState(true)
  const [reminder1HoursBefore, setReminder1HoursBefore] = useState("24")
  const [reminder1Message, setReminder1Message] = useState(
    "Olá {lead_name}! 📅 Lembrando que você tem *{title}* agendado para *{date}*.\n\nConfirme sua presença respondendo *SIM* para confirmar ou *NÃO* para cancelar."
  )
  const [reminder2Enabled, setReminder2Enabled] = useState(true)
  const [reminder2HoursBefore, setReminder2HoursBefore] = useState("1")
  const [reminder2Message, setReminder2Message] = useState(
    "Olá {lead_name}! ⏰ Em {hours_before}h começa *{title}*. Estamos te esperando!"
  )

  // IA - Análise automática
  const [autoClassifyEnabled, setAutoClassifyEnabled] = useState(false)
  const [autoClassifyEvery, setAutoClassifyEvery] = useState("10")
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)

  // Ciclo de vida - conversão Lead → Cliente
  const [autoConvertOnWin, setAutoConvertOnWin] = useState(false)
  const [maxConvSimultaneous, setMaxConvSimultaneous] = useState("")

  // Tags
  interface TagItem { id: string; name: string; slug: string; colorHex: string; description: string | null; isActive: boolean; _count: { leadTags: number } }
  const [tags, setTags] = useState<TagItem[]>([])
  const [tagsLoaded, setTagsLoaded] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState("#10B981")
  const [newTagDesc, setNewTagDesc] = useState("")
  const [editingTag, setEditingTag] = useState<TagItem | null>(null)
  const [savingTag, setSavingTag] = useState(false)

  // WhatsApp Connections (multi)
  interface WaConnection {
    id: string
    name: string
    phoneNumber: string | null
    status: string
    isDefault: boolean
    defaultAssignedToId?: string | null
    qrCode?: string | null
    loading?: boolean
    profilePicUrl?: string | null
  }
  interface TeamUser { id: string; name: string }
  type NewConnStep = "name" | "connecting" | "qr" | "connected"

  const [waConnections, setWaConnections] = useState<WaConnection[]>([])
  const [waListLoading, setWaListLoading] = useState(false)
  const [newConnModal, setNewConnModal] = useState(false)
  const [newConnName, setNewConnName] = useState("")
  const [newConnStep, setNewConnStep] = useState<NewConnStep>("name")
  const [newConnData, setNewConnData] = useState<WaConnection | null>(null)
  const [editingConnId, setEditingConnId] = useState<string | null>(null)
  const [editingConnName, setEditingConnName] = useState("")
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([])
  const [savingDefaultAttendant, setSavingDefaultAttendant] = useState<string | null>(null)

  const loadConnections = async () => {
    setWaListLoading(true)
    try {
      const res = await fetch("/api/whatsapp/connections")
      const data = await res.json()
      if (data.success) {
        setWaConnections(data.data.connections.map((c: WaConnection) => ({ ...c, qrCode: null, loading: false })))
      }
    } catch { /* ignore */ } finally { setWaListLoading(false) }
  }

  const loadTeamUsers = async () => {
    if (teamUsers.length > 0) return
    try {
      const res = await fetch("/api/team")
      const data = await res.json()
      if (data.success) setTeamUsers(data.data.users.filter((u: TeamUser & { role: string }) => u.role !== "super_admin"))
    } catch { /* ignore */ }
  }

  const saveDefaultAttendant = async (connId: string, userId: string | null) => {
    setSavingDefaultAttendant(connId)
    try {
      await fetch(`/api/whatsapp/connections/${connId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultAssignedToId: userId }),
      })
      setWaConnections((prev) => prev.map((c) => c.id === connId ? { ...c, defaultAssignedToId: userId } : c))
    } catch { /* ignore */ } finally { setSavingDefaultAttendant(null) }
  }

  const openNewConnModal = () => {
    setNewConnName("")
    setNewConnStep("name")
    setNewConnData(null)
    setNewConnModal(true)
  }

  const closeNewConnModal = () => {
    // If a half-created connection exists and is not connected, delete it
    if (newConnData && newConnData.status !== "CONNECTED") {
      fetch(`/api/whatsapp/connections/${newConnData.id}`, { method: "DELETE" }).catch(() => {})
    }
    setNewConnModal(false)
    setNewConnStep("name")
    setNewConnData(null)
    setNewConnName("")
  }

  const createAndConnect = async () => {
    if (!newConnName.trim()) return
    setNewConnStep("connecting")
    try {
      // 1. Create connection
      const res = await fetch("/api/whatsapp/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newConnName.trim() }),
      })
      const data = await res.json()
      if (!data.success) throw new Error("Erro ao criar conexão")
      const connId = data.data.connection.id

      // 2. Immediately start session / get QR
      const connRes = await fetch(`/api/whatsapp/connect?connectionId=${connId}`)
      const connData = await connRes.json()
      if (!connData.success) throw new Error("Erro ao iniciar sessão")

      const state = connData.data.state === "open" ? "CONNECTED" : connData.data.state
      const conn: WaConnection = {
        id: connId,
        name: newConnName.trim(),
        status: state,
        phoneNumber: connData.data.phoneNumber ?? null,
        qrCode: connData.data.qrCode ?? null,
        isDefault: false,
      }
      setNewConnData(conn)
      setNewConnStep(state === "CONNECTED" ? "connected" : "qr")
    } catch (err) {
      toast({ variant: "destructive", title: err instanceof Error ? err.message : "Erro ao criar conexão" })
      setNewConnStep("name")
    }
  }

  // Poll status while modal QR is shown - only READ status, never re-init session
  useEffect(() => {
    if (!newConnModal || newConnStep !== "qr" || !newConnData) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/whatsapp/connections")
        const data = await res.json()
        if (!data.success) return
        const conn = data.data.connections.find((c: WaConnection) => c.id === newConnData.id)
        if (!conn) return
        setNewConnData((prev) => prev ? {
          ...prev,
          status: conn.status,
          phoneNumber: conn.phoneNumber ?? prev.phoneNumber,
        } : prev)
        if (conn.status === "CONNECTED") {
          setNewConnStep("connected")
          clearInterval(interval)
          loadConnections()
        }
      } catch { /* ignore */ }
    }, 3000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newConnModal, newConnStep, newConnData?.id])

  // Auto-close modal after connected
  useEffect(() => {
    if (newConnStep !== "connected") return
    const t = setTimeout(() => {
      setNewConnModal(false)
      setNewConnStep("name")
      setNewConnData(null)
      setNewConnName("")
    }, 2500)
    return () => clearTimeout(t)
  }, [newConnStep])

  const saveConnName = async (conn: WaConnection) => {
    const name = editingConnName.trim()
    if (!name || name === conn.name) { setEditingConnId(null); return }
    try {
      await fetch(`/api/whatsapp/connections/${conn.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      setWaConnections((prev) => prev.map((c) => c.id === conn.id ? { ...c, name } : c))
      setEditingConnId(null)
      toast({ title: "Nome atualizado" })
    } catch { toast({ variant: "destructive", title: "Erro ao atualizar nome" }) }
  }

  const connectConnection = async (conn: WaConnection) => {
    setWaConnections((prev) => prev.map((c) => c.id === conn.id ? { ...c, loading: true } : c))
    try {
      const res = await fetch(`/api/whatsapp/connect?connectionId=${conn.id}`)
      const data = await res.json()
      if (data.success) {
        const state = data.data.state === "open" ? "CONNECTED" : data.data.state
        setWaConnections((prev) => prev.map((c) => c.id === conn.id ? {
          ...c,
          status: state,
          phoneNumber: data.data.phoneNumber ?? c.phoneNumber,
          qrCode: data.data.qrCode ?? null,
          loading: false,
        } : c))
      } else {
        setWaConnections((prev) => prev.map((c) => c.id === conn.id ? { ...c, loading: false } : c))
      }
    } catch {
      setWaConnections((prev) => prev.map((c) => c.id === conn.id ? { ...c, loading: false } : c))
    }
  }

  // Poll status for cards showing QR - only READ, never re-init
  useEffect(() => {
    const connectingIds = waConnections.filter((c) => c.qrCode && c.status !== "CONNECTED").map((c) => c.id)
    if (connectingIds.length === 0) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/whatsapp/connections")
        const data = await res.json()
        if (!data.success) return
        data.data.connections.forEach((conn: WaConnection) => {
          if (!connectingIds.includes(conn.id)) return
          setWaConnections((prev) => prev.map((c) => c.id === conn.id ? {
            ...c,
            status: conn.status,
            phoneNumber: conn.phoneNumber ?? c.phoneNumber,
            qrCode: conn.status === "CONNECTED" ? null : c.qrCode,
          } : c))
        })
      } catch { /* ignore */ }
    }, 5000)
    return () => clearInterval(interval)
  }, [waConnections])

  const disconnectConnection = async (conn: WaConnection) => {
    setWaConnections((prev) => prev.map((c) => c.id === conn.id ? { ...c, loading: true } : c))
    try {
      await fetch(`/api/whatsapp/connections/${conn.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      })
      setWaConnections((prev) => prev.map((c) => c.id === conn.id ? { ...c, status: "disconnected", qrCode: null, loading: false } : c))
      toast({ title: "Número desconectado" })
    } catch { toast({ variant: "destructive", title: "Erro ao desconectar" }) }
  }

  const setDefaultConnection = async (conn: WaConnection) => {
    try {
      await fetch(`/api/whatsapp/connections/${conn.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_default" }),
      })
      setWaConnections((prev) => prev.map((c) => ({ ...c, isDefault: c.id === conn.id })))
      toast({ title: `"${conn.name}" definido como padrão` })
    } catch { toast({ variant: "destructive", title: "Erro ao definir padrão" }) }
  }

  const deleteConnection = async (conn: WaConnection) => {
    if (!await showConfirm({ title: `Excluir "${conn.name}"?`, description: "A conexão e seu histórico serão removidos.", variant: "danger", confirmLabel: "Excluir" })) return
    try {
      const res = await fetch(`/api/whatsapp/connections/${conn.id}`, { method: "DELETE" })
      if (!res.ok) { toast({ variant: "destructive", title: "Erro ao excluir" }); return }
      setWaConnections((prev) => prev.filter((c) => c.id !== conn.id))
      toast({ title: "Conexão removida" })
    } catch { toast({ variant: "destructive", title: "Erro ao excluir" }) }
  }

  const deleteAllDisconnected = async () => {
    const disconnected = waConnections.filter((c) => c.status !== "CONNECTED")
    if (disconnected.length === 0) return
    if (!await showConfirm({
      title: `Excluir ${disconnected.length} conexão(ões) desconectada(s)?`,
      description: "Todas as conexões sem número ativo serão removidas.",
      variant: "danger",
      confirmLabel: "Excluir todas",
    })) return
    await Promise.all(disconnected.map((c) => fetch(`/api/whatsapp/connections/${c.id}`, { method: "DELETE" }).catch(() => {})))
    setWaConnections((prev) => prev.filter((c) => c.status === "CONNECTED"))
    toast({ title: "Conexões desconectadas removidas" })
  }

  // Carregar configurações do banco
  const loadTags = async () => {
    try {
      const res = await fetch("/api/tags?all=1")
      const data = await res.json()
      if (data.success) setTags(data.data)
    } catch { /* ignore */ } finally { setTagsLoaded(true) }
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return
    setSavingTag(true)
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim(), colorHex: newTagColor, description: newTagDesc.trim() || null }),
      })
      const data = await res.json()
      if (data.success) {
        setTags((prev) => [...prev, { ...data.data, _count: { leadTags: 0 } }])
        setNewTagName("")
        setNewTagColor("#10B981")
        setNewTagDesc("")
        toast({ title: "Tag criada!" })
      } else {
        toast({ variant: "destructive", title: data.error || "Erro ao criar tag" })
      }
    } catch { toast({ variant: "destructive", title: "Erro ao criar tag" }) }
    finally { setSavingTag(false) }
  }

  const handleUpdateTag = async () => {
    if (!editingTag) return
    setSavingTag(true)
    try {
      const res = await fetch(`/api/tags/${editingTag.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingTag.name, colorHex: editingTag.colorHex, description: editingTag.description }),
      })
      const data = await res.json()
      if (data.success) {
        setTags((prev) => prev.map((t) => t.id === editingTag.id ? { ...data.data, _count: t._count } : t))
        setEditingTag(null)
        toast({ title: "Tag atualizada!" })
      } else {
        toast({ variant: "destructive", title: data.error || "Erro ao atualizar tag" })
      }
    } catch { toast({ variant: "destructive", title: "Erro ao atualizar tag" }) }
    finally { setSavingTag(false) }
  }

  const handleToggleTag = async (tag: TagItem) => {
    try {
      const res = await fetch(`/api/tags/${tag.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !tag.isActive }),
      })
      const data = await res.json()
      if (data.success) setTags((prev) => prev.map((t) => t.id === tag.id ? { ...t, isActive: !t.isActive } : t))
    } catch { /* ignore */ }
  }

  const handleDeleteTag = async (tag: TagItem) => {
    if (!await showConfirm({ title: `Apagar a tag "${tag.name}"?`, description: "Isso remove a tag de todos os leads.", variant: "danger", confirmLabel: "Apagar" })) return
    try {
      await fetch(`/api/tags/${tag.id}`, { method: "DELETE" })
      setTags((prev) => prev.filter((t) => t.id !== tag.id))
      toast({ title: "Tag apagada" })
    } catch { toast({ variant: "destructive", title: "Erro ao apagar tag" }) }
  }

  useEffect(() => {
    loadConnections()
    loadTags()
  }, [])

  // SSE: update connection cards in real-time when Baileys events arrive
  useEffect(() => {
    let es: EventSource | null = null
    try {
      es = new EventSource("/api/whatsapp/events")
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === "connection_update" && data.connectionId) {
            setWaConnections((prev) => prev.map((c) => {
              if (c.id !== data.connectionId) return c
              const status = data.status === "CONNECTED" ? "CONNECTED" : data.status === "DISCONNECTED" ? "disconnected" : c.status
              return { ...c, status, phoneNumber: data.phoneNumber ?? c.phoneNumber }
            }))
            // Atualiza o modal se a conexão em andamento ficou conectada
            if (data.status === "CONNECTED") {
              setNewConnData((prev) => {
                if (!prev || prev.id !== data.connectionId) return prev
                return { ...prev, status: "CONNECTED" as string, phoneNumber: (data.phoneNumber ?? prev.phoneNumber) as string | null } as WaConnection
              })
              setNewConnStep((prev) => prev === "qr" ? "connected" : prev)
            }
          }
          // Atualiza o QR no modal quando Baileys gera um novo QR code
          if (data.type === "qrcode" && data.connectionId && data.qrBase64) {
            setNewConnData((prev) => {
              if (!prev || prev.id !== data.connectionId) return prev
              return { ...prev, qrCode: data.qrBase64 as string } as WaConnection
            })
            // Atualiza também os cards de conexões existentes
            setWaConnections((prev) => prev.map((c) => {
              if (c.id !== data.connectionId) return c
              return { ...c, qrCode: data.qrBase64 as string, status: "qrcode", loading: false }
            }))
          }
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
    return () => { es?.close() }
  }, [])


  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings")
        const data = await res.json()
        if (data.success) {
          const s = data.data
          if (s.companyName) setCompanyName(s.companyName)
          if (s.timezone) setTimezone(s.timezone)
          if (s.language) setLanguage(s.language)
          if (s.sessionTimeout) setSessionTimeout(s.sessionTimeout)
          if (s.twoFactor) setTwoFactor(s.twoFactor === "true")
          if (s.lgpdEnabled) setLgpdEnabled(s.lgpdEnabled === "true")
          if (s.dataRetentionDays) setDataRetentionDays(s.dataRetentionDays)
          if (s.emailNotif) setEmailNotif(s.emailNotif === "true")
          if (s.pushNotif) setPushNotif(s.pushNotif === "true")
          if (s.newLeadNotif) setNewLeadNotif(s.newLeadNotif === "true")
          if (s.qualificationNotif) setQualificationNotif(s.qualificationNotif === "true")
          if (s.messageNotif) setMessageNotif(s.messageNotif === "true")
          if (s.n8nUrl) setN8nUrl(s.n8nUrl)
          if (s.openaiKey) setOpenaiKey(s.openaiKey)
          if (s.openaiModel) setOpenaiModel(s.openaiModel)
          if (s.anthropicKey) setAnthropicKey(s.anthropicKey)
          if (s.anthropicModel) setAnthropicModel(s.anthropicModel)
          if (s.geminiKey) setGeminiKey(s.geminiKey)
          if (s.geminiModel) setGeminiModel(s.geminiModel)
          if (s.grokKey) setGrokKey(s.grokKey)
          if (s.grokModel) setGrokModel(s.grokModel)
          if (s.deepseekKey) setDeepseekKey(s.deepseekKey)
          if (s.deepseekModel) setDeepseekModel(s.deepseekModel)
          if (s.aiDefaultProvider) setAiDefaultProvider(s.aiDefaultProvider)
          if (s.elevenLabsKey) {
            setElevenLabsKey(s.elevenLabsKey)
            // Carrega vozes automaticamente se tiver chave
            fetchElevenLabsVoices(s.elevenLabsKey)
          }
          if (s.autoClassifyEnabled) setAutoClassifyEnabled(s.autoClassifyEnabled === "true")
          if (s.autoClassifyEvery) setAutoClassifyEvery(s.autoClassifyEvery)
          if (s.autoConvertOnWin) setAutoConvertOnWin(s.autoConvertOnWin === "true")
          if (s.maxConvSimultaneous) setMaxConvSimultaneous(s.maxConvSimultaneous)
          if (s.googleClientId) setGoogleClientId(s.googleClientId)
          if (s.googleClientSecret) setGoogleClientSecret(s.googleClientSecret)
          if (s.eventReminderEnabled) setReminderEnabled(s.eventReminderEnabled === "true")
          if (s.eventReminder1Enabled !== undefined) setReminder1Enabled(s.eventReminder1Enabled !== "false")
          if (s.eventReminder1HoursBefore) setReminder1HoursBefore(s.eventReminder1HoursBefore)
          if (s.eventReminder1Message) setReminder1Message(s.eventReminder1Message)
          if (s.eventReminder2Enabled !== undefined) setReminder2Enabled(s.eventReminder2Enabled !== "false")
          if (s.eventReminder2HoursBefore) setReminder2HoursBefore(s.eventReminder2HoursBefore)
          if (s.eventReminder2Message) setReminder2Message(s.eventReminder2Message)

          // Persiste defaults no banco na primeira vez (sem sobrescrever valores já salvos)
          const defaults: Record<string, string> = {}
          if (!s.eventReminder1Message) defaults.eventReminder1Message = "Olá {lead_name}! 📅 Lembrando que você tem *{title}* agendado para *{date}*.\n\nConfirme sua presença respondendo *SIM* para confirmar ou *NÃO* para cancelar."
          if (!s.eventReminder2Message) defaults.eventReminder2Message = "Olá {lead_name}! ⏰ Em {hours_before}h começa *{title}*. Estamos te esperando!"
          if (Object.keys(defaults).length > 0) {
            fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(defaults) }).catch(() => {})
          }
        }
      } catch (err) {
        console.error("Erro ao carregar configurações:", err)
      } finally {
        setLoaded(true)
      }
    }
    loadSettings()
  }, [])

  // Carrega status do Google Calendar e trata retorno OAuth
  useEffect(() => {
    async function loadCalendarStatus() {
      setCalendarLoading(true)
      try {
        const res = await fetch("/api/integrations/calendar/google/status")
        const data = await res.json()
        if (data.success) {
          setCalendarConfigured(data.data.configured)
          setCalendarConnected(!!data.data.connected)
        }
      } catch { /* ignore */ } finally { setCalendarLoading(false) }
    }
    loadCalendarStatus()

    // Trata query params de retorno OAuth
    const params = new URLSearchParams(window.location.search)
    const calResult = params.get("calendar")
    if (calResult === "connected") {
      toast({ title: "Google Calendar conectado!", description: "Sua agenda foi vinculada com sucesso." })
      // Limpa query param da URL sem reload
      const url = new URL(window.location.href)
      url.searchParams.delete("calendar")
      url.searchParams.delete("tab")
      window.history.replaceState({}, "", url.toString())
    } else if (calResult === "error") {
      toast({ variant: "destructive", title: "Erro ao conectar Google Calendar", description: "Tente novamente ou verifique as credenciais." })
      const url = new URL(window.location.href)
      url.searchParams.delete("calendar")
      window.history.replaceState({}, "", url.toString())
    }
  }, [])

  const connectGoogleCalendar = async () => {
    setCalendarConnecting(true)
    try {
      const res = await fetch("/api/integrations/calendar/google/connect")
      const data = await res.json()
      if (data.success && data.data.url) {
        window.location.href = data.data.url
      } else {
        toast({ variant: "destructive", title: "Erro ao iniciar conexão", description: data.error ?? "Verifique as variáveis de ambiente." })
        setCalendarConnecting(false)
      }
    } catch {
      toast({ variant: "destructive", title: "Erro ao conectar" })
      setCalendarConnecting(false)
    }
  }

  const disconnectGoogleCalendar = async () => {
    if (!await showConfirm({ title: "Desconectar Google Calendar?", description: "O agente não poderá mais agendar eventos automaticamente.", variant: "danger", confirmLabel: "Desconectar" })) return
    try {
      await fetch("/api/integrations/calendar/google/disconnect", { method: "POST" })
      setCalendarConnected(false)
      toast({ title: "Google Calendar desconectado" })
    } catch {
      toast({ variant: "destructive", title: "Erro ao desconectar" })
    }
  }


  const fetchElevenLabsVoices = async (key?: string) => {
    const apiKey = key || elevenLabsKey
    if (!apiKey) return
    setElevenLabsVoicesLoading(true)
    try {
      const res = await fetch(`/api/elevenlabs/voices?apiKey=${encodeURIComponent(apiKey)}`)
      const data = await res.json()
      if (data.success) setElevenLabsVoices(data.data.voices)
      else toast({ variant: "destructive", title: "Erro ao buscar vozes", description: data.error })
    } catch {
      toast({ variant: "destructive", title: "Erro ao conectar com ElevenLabs" })
    } finally {
      setElevenLabsVoicesLoading(false)
    }
  }

  const handleSave = async (section: string, data: Record<string, string>) => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (result.success) {
        toast({ title: `${section} salvas!`, description: "As configurações foram atualizadas com sucesso." })
      } else {
        toast({ variant: "destructive", title: "Erro ao salvar configurações" })
      }
    } catch {
      toast({ variant: "destructive", title: "Erro ao salvar configurações" })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
    <div className="space-y-6">
      <div>
        <h1 className="text-h3 font-bold" data-testid="heading-configuracoes">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações do sistema</p>
      </div>

      {/* Geral */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Geral</CardTitle>
          </div>
          <CardDescription>Configurações gerais do sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nome da empresa</Label>
              <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fuso horário</Label>
              <CustomSelect value={timezone} onChange={setTimezone} options={[
                { value: "America/Sao_Paulo", label: "Brasília (GMT-3)" },
                { value: "America/Manaus", label: "Manaus (GMT-4)" },
                { value: "America/Belem", label: "Belém (GMT-3)" },
                { value: "America/Fortaleza", label: "Fortaleza (GMT-3)" },
              ]} />
            </div>
            <div className="space-y-2">
              <Label>Idioma</Label>
              <CustomSelect value={language} onChange={setLanguage} options={[
                { value: "pt-BR", label: "Português (Brasil)" },
                { value: "en-US", label: "English (US)" },
                { value: "es", label: "Español" },
              ]} />
            </div>
          </div>
          <Button onClick={() => handleSave("Configurações gerais", { companyName, timezone, language })} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar
          </Button>
        </CardContent>
      </Card>

      {/* Aparência */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Aparência</CardTitle>
          </div>
          <CardDescription>Personalização visual do sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <Label className="mb-3 block">Tema</Label>
          <div className="flex gap-3">
            {[
              { value: "light", label: "Claro", icon: Sun },
              { value: "dark", label: "Escuro", icon: Moon },
              { value: "system", label: "Sistema", icon: Monitor },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors min-w-[100px] ${
                  theme === value ? "border-primary bg-primary/5" : "border-[var(--border)] hover:border-primary/50"
                }`}
              >
                <Icon className={`h-6 w-6 ${theme === value ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${theme === value ? "text-primary" : ""}`}>{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Segurança & LGPD */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Segurança & LGPD</CardTitle>
          </div>
          <CardDescription>Políticas de segurança e compliance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Timeout da sessão (minutos)</Label>
              <Input id="sessionTimeout" type="number" value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataRetention">Retenção de dados (dias)</Label>
              <Input id="dataRetention" type="number" value={dataRetentionDays} onChange={(e) => setDataRetentionDays(e.target.value)} />
            </div>
          </div>
          <div className="space-y-3">
            <ToggleOption
              label="Autenticação em duas etapas (2FA)"
              description="Exigir código de verificação ao fazer login"
              icon={Lock}
              enabled={twoFactor}
              onToggle={() => setTwoFactor(!twoFactor)}
            />
            <ToggleOption
              label="Compliance LGPD"
              description="Habilitar funcionalidades de conformidade com a LGPD"
              icon={Shield}
              enabled={lgpdEnabled}
              onToggle={() => setLgpdEnabled(!lgpdEnabled)}
            />
          </div>
          <Button onClick={() => handleSave("Configurações de segurança", { sessionTimeout, twoFactor: String(twoFactor), lgpdEnabled: String(lgpdEnabled), dataRetentionDays })} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar
          </Button>
        </CardContent>
      </Card>

      {/* Notificações */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Notificações</CardTitle>
          </div>
          <CardDescription>Preferências de notificações do sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleOption label="Notificações por email" description="Receber notificações via email" icon={Bell} enabled={emailNotif} onToggle={() => setEmailNotif(!emailNotif)} />
          <ToggleOption label="Notificações push" description="Receber notificações no navegador" icon={Bell} enabled={pushNotif} onToggle={() => setPushNotif(!pushNotif)} />
          <div className="border-t pt-3 mt-3">
            <p className="text-sm font-medium mb-3">Eventos</p>
            <div className="space-y-3">
              <ToggleOption label="Novo lead" description="Quando um novo lead é criado" icon={Bell} enabled={newLeadNotif} onToggle={() => setNewLeadNotif(!newLeadNotif)} />
              <ToggleOption label="Qualificação IA" description="Quando a IA qualifica um lead" icon={Bell} enabled={qualificationNotif} onToggle={() => setQualificationNotif(!qualificationNotif)} />
              <ToggleOption label="Nova mensagem WhatsApp" description="Quando uma mensagem é recebida" icon={MessageSquare} enabled={messageNotif} onToggle={() => setMessageNotif(!messageNotif)} />
            </div>
          </div>
          <Button onClick={() => handleSave("Preferências de notificações", { emailNotif: String(emailNotif), pushNotif: String(pushNotif), newLeadNotif: String(newLeadNotif), qualificationNotif: String(qualificationNotif), messageNotif: String(messageNotif) })} disabled={isSaving} className="mt-2">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar
          </Button>
        </CardContent>
      </Card>

      {/* Integrações */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Integrações</CardTitle>
          </div>
          <CardDescription>Configure as integrações com serviços externos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* WhatsApp Connections */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-green-500" />
                <p className="font-medium text-sm">Conexões WhatsApp</p>
              </div>
              <div className="flex items-center gap-2">
                {waConnections.filter((c) => c.status !== "CONNECTED").length > 1 && (
                  <Button size="sm" variant="ghost" className="text-xs text-destructive hover:bg-destructive/10" onClick={deleteAllDisconnected}>
                    <Trash className="h-3 w-3 mr-1" /> Limpar desconectadas
                  </Button>
                )}
                <Button size="sm" onClick={openNewConnModal}>
                  <Plus className="h-3 w-3 mr-1" /> Nova conexão
                </Button>
              </div>
            </div>

            {waListLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando conexões...
              </div>
            )}

            {!waListLoading && waConnections.length === 0 && (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Nenhuma conexão criada. Clique em &ldquo;Nova conexão&rdquo; para adicionar um número.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {waConnections.map((conn) => {
                const isConnected = conn.status === "CONNECTED"
                const hasQr = !!conn.qrCode
                return (
                  <div key={conn.id} className={`rounded-lg border p-4 space-y-3 ${isConnected ? "border-green-500/30 bg-green-500/5" : "border-border"}`}>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full overflow-hidden ${isConnected ? "bg-[#25D366]" : "bg-muted"}`}>
                          {conn.profilePicUrl ? (
                            <img src={conn.profilePicUrl} alt={conn.name} className="h-full w-full object-cover" />
                          ) : (
                            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" xmlns="http://www.w3.org/2000/svg">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          )}
                        </div>
                        {isConnected && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#25D366] border-2 border-card" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {editingConnId === conn.id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                autoFocus
                                className="h-7 text-xs w-36"
                                value={editingConnName}
                                onChange={(e) => setEditingConnName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveConnName(conn)
                                  if (e.key === "Escape") setEditingConnId(null)
                                }}
                              />
                              <Button size="sm" className="h-7 text-xs" onClick={() => saveConnName(conn)}>Salvar</Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingConnId(null)}>✕</Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-sm">{conn.name}</p>
                              <button type="button" title="Editar nome"
                                className="text-muted-foreground hover:text-foreground transition"
                                onClick={() => { setEditingConnId(conn.id); setEditingConnName(conn.name) }}>
                                <Edit2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                          {conn.isDefault && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">Padrão</span>
                          )}
                          <span className={`flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full ${isConnected ? "bg-green-500/15 text-green-600" : hasQr ? "bg-yellow-500/15 text-yellow-600" : "bg-muted text-muted-foreground"}`}>
                            {isConnected ? <><Wifi className="h-2.5 w-2.5" /> Conectado</> : hasQr ? <><Loader2 className="h-2.5 w-2.5 animate-spin" /> Aguardando QR</> : <><WifiOff className="h-2.5 w-2.5" /> Desconectado</>}
                          </span>
                        </div>
                        {conn.phoneNumber && (
                          <p className="text-xs text-muted-foreground mt-0.5">{conn.phoneNumber}</p>
                        )}
                        {!conn.phoneNumber && isConnected && (
                          <p className="text-xs text-muted-foreground mt-0.5">Número não identificado</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!isConnected && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => connectConnection(conn)} disabled={conn.loading}>
                            {conn.loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <QrCode className="h-3 w-3 mr-1" />}
                            {conn.loading ? "" : "Conectar"}
                          </Button>
                        )}
                        {isConnected && (
                          <Button size="sm" variant="outline" className="h-7 text-xs text-red-500 border-red-500/30 hover:bg-red-500/10" onClick={() => disconnectConnection(conn)} disabled={conn.loading}>
                            {conn.loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3 mr-1" />}
                            {conn.loading ? "" : "Desconectar"}
                          </Button>
                        )}
                        {!conn.isDefault && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" title="Definir como padrão" onClick={() => setDefaultConnection(conn)}>
                            <Star className="h-3 w-3" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:bg-destructive/10" title="Excluir" onClick={() => deleteConnection(conn)}>
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Atendente padrão */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                      <span className="text-xs text-muted-foreground w-36 flex-shrink-0">Atendente padrão:</span>
                      <div className="flex-1" onClick={loadTeamUsers}>
                        <CustomSelect
                          size="sm"
                          value={conn.defaultAssignedToId ?? ""}
                          onChange={(v) => saveDefaultAttendant(conn.id, v || null)}
                          options={[
                            { value: "", label: "- Nenhum (em espera) -" },
                            ...teamUsers.map((u) => ({ value: u.id, label: u.name })),
                          ]}
                        />
                      </div>
                    </div>

                    {hasQr && (
                      <div className="flex flex-col items-center gap-3 pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground">Escaneie o QR Code com o WhatsApp</p>
                        <div className="bg-white p-2 rounded-lg shadow-sm">
                          <img src={`data:image/png;base64,${conn.qrCode}`} alt="QR Code" className="w-48 h-48" />
                        </div>
                        <p className="text-[11px] text-muted-foreground text-center">WhatsApp &gt; Aparelhos conectados &gt; Conectar um aparelho</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* N8N */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Webhook className="h-4 w-4 text-orange-500" />
                <p className="font-medium text-sm">N8N (Automações)</p>
              </div>
              <span className={`flex items-center gap-1 text-xs font-medium ${n8nUrl ? "text-green-600" : "text-muted-foreground"}`}>
                {n8nUrl ? <><CheckCircle className="h-3 w-3" /> Configurado</> : <><XCircle className="h-3 w-3" /> Não configurado</>}
              </span>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">URL do N8N</Label>
              <Input placeholder="https://n8n.exemplo.com" value={n8nUrl} onChange={(e) => setN8nUrl(e.target.value)} />
            </div>
          </div>

          {/* Provedor padrão */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="font-medium text-sm">Provedor padrão para análises e agentes</p>
            </div>
            <CustomSelect
              value={aiDefaultProvider}
              onChange={setAiDefaultProvider}
              options={[
                { value: "openai", label: "OpenAI" },
                { value: "anthropic", label: "Anthropic (Claude)" },
                { value: "gemini", label: "Google Gemini" },
                { value: "grok", label: "Grok (xAI)" },
                { value: "deepseek", label: "DeepSeek" },
              ]}
            />
            <p className="text-xs text-muted-foreground">Configure as chaves abaixo. O provedor selecionado aqui será usado em todas as análises e agentes.</p>
          </div>

          {/* Cards de providers */}
          <div className="grid grid-cols-2 gap-4">
          {([
            {
              id: "openai", label: "OpenAI", color: "text-green-500", placeholder: "sk-...",
              keyVal: openaiKey, setKey: setOpenaiKey,
              modelVal: openaiModel, setModel: setOpenaiModel,
              models: [
                { value: "gpt-4.1", label: "GPT-4.1", badge: "", icon: <Star className="h-3.5 w-3.5 text-yellow-400" /> },
                { value: "gpt-4.1-mini", label: "GPT-4.1 Mini", badge: "", icon: <Zap className="h-3.5 w-3.5 text-green-400" /> },
                { value: "gpt-4.1-nano", label: "GPT-4.1 Nano", badge: "", icon: <Flame className="h-3.5 w-3.5 text-orange-400" /> },
                { value: "gpt-4o", label: "GPT-4o", badge: "", icon: <Cpu className="h-3.5 w-3.5 text-muted-foreground" /> },
                { value: "gpt-4o-mini", label: "GPT-4o Mini", badge: "", icon: <Cpu className="h-3.5 w-3.5 text-muted-foreground" /> },
              ],
            },
            {
              id: "anthropic", label: "Anthropic (Claude)", color: "text-orange-400", placeholder: "sk-ant-...",
              keyVal: anthropicKey, setKey: setAnthropicKey,
              modelVal: anthropicModel, setModel: setAnthropicModel,
              models: [
                { value: "claude-opus-4-6", label: "Claude Opus 4.6", badge: "", icon: <Crown className="h-3.5 w-3.5 text-yellow-400" /> },
                { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", badge: "", icon: <Star className="h-3.5 w-3.5 text-orange-400" /> },
                { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", badge: "", icon: <Zap className="h-3.5 w-3.5 text-green-400" /> },
              ],
            },
            {
              id: "gemini", label: "Google Gemini", color: "text-blue-400", placeholder: "AIza...",
              keyVal: geminiKey, setKey: setGeminiKey,
              modelVal: geminiModel, setModel: setGeminiModel,
              models: [
                { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", badge: "", icon: <Crown className="h-3.5 w-3.5 text-yellow-400" /> },
                { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", badge: "", icon: <Star className="h-3.5 w-3.5 text-blue-400" /> },
                { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", badge: "", icon: <Zap className="h-3.5 w-3.5 text-green-400" /> },
                { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash", badge: "", icon: <Cpu className="h-3.5 w-3.5 text-muted-foreground" /> },
              ],
            },
            {
              id: "grok", label: "Grok (xAI)", color: "text-gray-300", placeholder: "xai-...",
              keyVal: grokKey, setKey: setGrokKey,
              modelVal: grokModel, setModel: setGrokModel,
              models: [
                { value: "grok-3", label: "Grok 3", badge: "", icon: <Crown className="h-3.5 w-3.5 text-yellow-400" /> },
                { value: "grok-3-fast", label: "Grok 3 Fast", badge: "", icon: <Flame className="h-3.5 w-3.5 text-orange-400" /> },
                { value: "grok-3-mini", label: "Grok 3 Mini", badge: "", icon: <Zap className="h-3.5 w-3.5 text-green-400" /> },
              ],
            },
            {
              id: "deepseek", label: "DeepSeek", color: "text-cyan-400", placeholder: "sk-...",
              keyVal: deepseekKey, setKey: setDeepseekKey,
              modelVal: deepseekModel, setModel: setDeepseekModel,
              models: [
                { value: "deepseek-chat", label: "DeepSeek V3.2 (Chat)", badge: "", icon: <Star className="h-3.5 w-3.5 text-cyan-400" /> },
                { value: "deepseek-reasoner", label: "DeepSeek V3.2 (Reasoner)", badge: "", icon: <Brain className="h-3.5 w-3.5 text-purple-400" /> },
              ],
            },
          ] as const).map((provider) => {
            const isDefault = aiDefaultProvider === provider.id
            const isConfigured = !!provider.keyVal
            const showKey = showKeys[provider.id]
            return (
              <div key={provider.id} className={`rounded-lg border p-4 space-y-3 transition-colors ${isDefault ? "border-primary/40 bg-primary/5" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className={`h-4 w-4 ${provider.color}`} />
                    <p className="font-medium text-sm">{provider.label}</p>
                    {isDefault && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-semibold">Padrão</span>}
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-medium ${isConfigured ? "text-green-600" : "text-muted-foreground"}`}>
                    {isConfigured ? <><CheckCircle className="h-3 w-3" /> Configurado</> : <><XCircle className="h-3 w-3" /> Não configurado</>}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">API Key</Label>
                    <div className="relative">
                      <Input
                        type={showKey ? "text" : "password"}
                        placeholder={provider.placeholder}
                        value={provider.keyVal}
                        onChange={(e) => provider.setKey(e.target.value)}
                        className="pr-10 text-xs"
                      />
                      <button type="button"
                        onClick={() => setShowKeys((prev) => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Modelo</Label>
                    <CustomSelect
                      value={provider.modelVal}
                      onChange={provider.setModel}
                      options={provider.models.map((m) => ({
                        value: m.value,
                        label: m.label,
                        icon: m.icon,
                      }))}
                    />
                  </div>
                </div>
              </div>
            )
          })}
          </div>

          {/* ElevenLabs TTS */}
          <div className="rounded-lg border border-border p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Mic2 className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">ElevenLabs — Síntese de Voz</p>
                <p className="text-xs text-muted-foreground">Permite que agentes respondam com mensagens de áudio no WhatsApp</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">API Key</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKeys["elevenlabs"] ? "text" : "password"}
                    value={elevenLabsKey}
                    onChange={(e) => setElevenLabsKey(e.target.value)}
                    placeholder="sk_..."
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono pr-10 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button type="button"
                    onClick={() => setShowKeys((p) => ({ ...p, elevenlabs: !p.elevenlabs }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showKeys["elevenlabs"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchElevenLabsVoices()} disabled={!elevenLabsKey || elevenLabsVoicesLoading}>
                  {elevenLabsVoicesLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Testar"}
                </Button>
              </div>
            </div>
            {elevenLabsVoices.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">{elevenLabsVoices.length} voz(es) encontrada(s) na conta</p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {elevenLabsVoices.map((v) => (
                    <span key={v.voice_id} className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      {v.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Google Calendar ── */}
          <div className="rounded-lg border border-border p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Google Calendar</p>
                <p className="text-xs text-muted-foreground">Permite que agentes agendem reuniões diretamente na agenda do Google</p>
              </div>
              {calendarLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />
              ) : calendarConnected ? (
                <span className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Conectado
                </span>
              ) : (
                <span className="ml-auto flex items-center gap-1.5 rounded-full bg-zinc-500/20 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                  Desconectado
                </span>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Crie um projeto no{" "}
                <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">Google Cloud Console</a>, ative a API do Calendar e adicione as credenciais OAuth 2.0 abaixo.
                As credenciais ficam armazenadas no banco de dados — cada empresa configura as suas.
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Client ID</label>
                <input
                  type="text"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                  placeholder="123456789-abc...apps.googleusercontent.com"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Client Secret</label>
                <div className="relative">
                  <input
                    type={showKeys["googleSecret"] ? "text" : "password"}
                    value={googleClientSecret}
                    onChange={(e) => setGoogleClientSecret(e.target.value)}
                    placeholder="GOCSPX-..."
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono pr-10 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button type="button"
                    onClick={() => setShowKeys((p) => ({ ...p, googleSecret: !p.googleSecret }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showKeys["googleSecret"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  URI de redirecionamento autorizado:{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded select-all">
                    {typeof window !== "undefined" ? window.location.origin : ""}/api/integrations/calendar/google/callback
                  </code>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              {calendarConnected ? (
                <Button variant="outline" size="sm" onClick={disconnectGoogleCalendar} className="gap-1.5 text-rose-400 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300">
                  <Link2Off className="h-3.5 w-3.5" />
                  Desconectar
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={connectGoogleCalendar}
                  disabled={!googleClientId || !googleClientSecret || calendarConnecting}
                  className="gap-1.5">
                  {calendarConnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                  Conectar Google Calendar
                </Button>
              )}
              {!calendarConfigured && googleClientId && googleClientSecret && (
                <p className="text-xs text-amber-400">Salve as integrações antes de conectar.</p>
              )}
            </div>
          </div>

          <Button onClick={() => handleSave("Integrações", {
            n8nUrl, openaiKey, openaiModel,
            anthropicKey, anthropicModel,
            geminiKey, geminiModel,
            grokKey, grokModel,
            deepseekKey, deepseekModel,
            aiDefaultProvider,
            elevenLabsKey,
            googleClientId,
            googleClientSecret,
          })} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Integrações
          </Button>
        </CardContent>
      </Card>

      {/* ── Lembretes de Agendamento ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Lembretes de Agendamento</CardTitle>
          </div>
          <CardDescription>
            Configure mensagens automáticas enviadas pelo WhatsApp antes dos eventos agendados pelo agente IA.
            O lead pode confirmar ou cancelar diretamente no chat — o agente gerencia o fluxo automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Toggle principal */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Habilitar lembretes automáticos</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Quando ativado, o sistema envia mensagens de confirmação antes dos eventos agendados pelo agente.
              </p>
            </div>
            <button
              onClick={() => setReminderEnabled((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${reminderEnabled ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${reminderEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {reminderEnabled && (
            <div className="space-y-4">
              {/* Lembrete 1 */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-400" />
                    <p className="text-sm font-medium">Lembrete 1 — Confirmação antecipada</p>
                  </div>
                  <button
                    onClick={() => setReminder1Enabled((v) => !v)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${reminder1Enabled ? "bg-primary" : "bg-muted"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${reminder1Enabled ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
                {reminder1Enabled && (
                  <div className="space-y-3 pl-4">
                    <div className="flex items-center gap-3">
                      <Label className="text-xs text-muted-foreground w-20 flex-shrink-0">Enviar com</Label>
                      <CustomSelect
                        value={reminder1HoursBefore}
                        onChange={setReminder1HoursBefore}
                        size="sm"
                        className="w-44"
                        options={[
                          { value: "6",  label: "6 horas antes" },
                          { value: "12", label: "12 horas antes" },
                          { value: "24", label: "1 dia antes" },
                          { value: "48", label: "2 dias antes" },
                          { value: "72", label: "3 dias antes" },
                        ]}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Mensagem</Label>
                      <textarea
                        rows={4}
                        className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                        value={reminder1Message}
                        onChange={(e) => setReminder1Message(e.target.value)}
                      />
                      <p className="text-[11px] text-muted-foreground">Variáveis: <code className="bg-muted px-1 rounded text-[10px]">{"{lead_name}"}</code> <code className="bg-muted px-1 rounded text-[10px]">{"{title}"}</code> <code className="bg-muted px-1 rounded text-[10px]">{"{date}"}</code></p>
                    </div>
                  </div>
                )}
              </div>

              {/* Lembrete 2 */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-sky-400" />
                    <p className="text-sm font-medium">Lembrete 2 — Aviso de proximidade</p>
                  </div>
                  <button
                    onClick={() => setReminder2Enabled((v) => !v)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${reminder2Enabled ? "bg-primary" : "bg-muted"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${reminder2Enabled ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
                {reminder2Enabled && (
                  <div className="space-y-3 pl-4">
                    <div className="flex items-center gap-3">
                      <Label className="text-xs text-muted-foreground w-20 flex-shrink-0">Enviar com</Label>
                      <CustomSelect
                        value={reminder2HoursBefore}
                        onChange={setReminder2HoursBefore}
                        size="sm"
                        className="w-44"
                        options={[
                          { value: "1", label: "1 hora antes" },
                          { value: "2", label: "2 horas antes" },
                          { value: "3", label: "3 horas antes" },
                          { value: "6", label: "6 horas antes" },
                        ]}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Mensagem</Label>
                      <textarea
                        rows={3}
                        className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                        value={reminder2Message}
                        onChange={(e) => setReminder2Message(e.target.value)}
                      />
                      <p className="text-[11px] text-muted-foreground">Variáveis: <code className="bg-muted px-1 rounded text-[10px]">{"{lead_name}"}</code> <code className="bg-muted px-1 rounded text-[10px]">{"{title}"}</code> <code className="bg-muted px-1 rounded text-[10px]">{"{hours_before}"}</code></p>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Como funciona:</p>
                <p>• Quando o agente cria um evento no Google Calendar via WhatsApp, os lembretes são agendados automaticamente</p>
                <p>• Se o lead responder <strong>NÃO</strong>, o agente ativa e oferece reagendamento com horários disponíveis</p>
                <p>• O agente só pode alterar reuniões que ele mesmo agendou — reuniões manuais são protegidas</p>
              </div>
            </div>
          )}

          <Button onClick={() => handleSave("Lembretes", {
            eventReminderEnabled: String(reminderEnabled),
            eventReminder1Enabled: String(reminder1Enabled),
            eventReminder1HoursBefore: reminder1HoursBefore,
            eventReminder1Message: reminder1Message,
            eventReminder2Enabled: String(reminder2Enabled),
            eventReminder2HoursBefore: reminder2HoursBefore,
            eventReminder2Message: reminder2Message,
          })} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Lembretes
          </Button>
        </CardContent>
      </Card>

      {/* IA - Agente de Classificação */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Agente IA - Classificação de Leads</CardTitle>
          </div>
          <CardDescription>
            Configure o agente que analisa conversas do WhatsApp e classifica leads automaticamente no Kanban.
            Requer a chave da OpenAI configurada acima.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleOption
            label="Análise automática de conversas"
            description="O agente analisa cada conversa a cada N mensagens e aplica tags, score e estágio automaticamente."
            icon={Zap}
            enabled={autoClassifyEnabled}
            onToggle={() => setAutoClassifyEnabled((v) => !v)}
          />

          {autoClassifyEnabled && (
            <div className="space-y-2 pl-1">
              <Label htmlFor="autoClassifyEvery">Analisar a cada quantas mensagens</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="autoClassifyEvery"
                  type="number"
                  min={1}
                  max={100}
                  className="w-24"
                  value={autoClassifyEvery}
                  onChange={(e) => setAutoClassifyEvery(e.target.value)}
                />
                <span className="text-sm text-muted-foreground">mensagens por conversa</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Ex: valor 10 → analisa na 10ª, 20ª, 30ª mensagem da conversa.
              </p>
            </div>
          )}

          <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">O que o agente faz automaticamente:</p>
            <p>• Aplica tags do catálogo com base no conteúdo da conversa (fonte: IA)</p>
            <p>• Atualiza o score e nível de qualificação do lead</p>
            <p>• Move o lead para o estágio do Kanban mais adequado</p>
            <p>• Salva o histórico de análises para auditoria</p>
          </div>

          <Button onClick={() => handleSave("IA", { autoClassifyEnabled: String(autoClassifyEnabled), autoClassifyEvery })} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar configurações de IA
          </Button>
        </CardContent>
      </Card>

      {/* Ciclo de Vida */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Ciclo de Vida do Lead</CardTitle>
          </div>
          <CardDescription>Configure como leads são convertidos em clientes e limites de atendimento por operador.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 space-y-4">
            {/* Conversão automática */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Conversão automática em cliente</p>
                <p className="text-xs text-muted-foreground">Ao mover lead para "Fechado Ganho" no pipeline, converter automaticamente para Cliente. Se desativado, exibe botão de confirmação manual.</p>
              </div>
              <button
                onClick={() => setAutoConvertOnWin(!autoConvertOnWin)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${autoConvertOnWin ? "bg-[#5fb642]" : "bg-muted"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${autoConvertOnWin ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            {/* Limite de conversas por atendente */}
            <div className="space-y-1.5">
              <Label className="text-sm">Máximo de conversas simultâneas por atendente</Label>
              <p className="text-xs text-muted-foreground">Deixe em branco para sem limite. Quando atingido, novas conversas vão para a fila de espera.</p>
              <Input
                type="number"
                min="1"
                max="200"
                placeholder="Sem limite"
                value={maxConvSimultaneous}
                onChange={(e) => setMaxConvSimultaneous(e.target.value)}
                className="w-40"
              />
            </div>
          </div>

          <Button onClick={() => handleSave("Ciclo de vida", { autoConvertOnWin: String(autoConvertOnWin), maxConvSimultaneous })} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar configurações
          </Button>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Catálogo de Tags</CardTitle>
          </div>
          <CardDescription>Gerencie as etiquetas usadas no chat e Kanban. Tags marcadas com ✦ foram aplicadas por IA.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Create tag form */}
          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-medium">Nova tag</p>
            <div className="flex gap-2">
              <Input placeholder="Nome da tag" value={newTagName} onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateTag() }} className="flex-1" />
              <div className="flex items-center gap-1">
                <input type="color" value={newTagColor} onChange={(e) => setNewTagColor(e.target.value)}
                  className="h-10 w-10 rounded-md border border-input cursor-pointer p-0.5" title="Cor" />
              </div>
            </div>
            <Input placeholder="Descrição (opcional)" value={newTagDesc} onChange={(e) => setNewTagDesc(e.target.value)} />
            <Button size="sm" onClick={handleCreateTag} disabled={savingTag || !newTagName.trim()}>
              {savingTag ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Criar tag
            </Button>
          </div>

          {/* Tag list */}
          {!tagsLoaded ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : tags.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma tag criada ainda.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Tag</th>
                    <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Descrição</th>
                    <th className="text-center px-4 py-2 font-medium">Leads</th>
                    <th className="text-center px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tags.map((tag) => (
                    <tr key={tag.id} className={`hover:bg-muted/30 transition-colors ${!tag.isActive ? "opacity-50" : ""}`}>
                      <td className="px-4 py-2">
                        {editingTag?.id === tag.id ? (
                          <div className="flex items-center gap-2">
                            <input type="color" value={editingTag.colorHex}
                              onChange={(e) => setEditingTag((t) => t ? { ...t, colorHex: e.target.value } : t)}
                              className="h-7 w-7 rounded border border-input cursor-pointer p-0" />
                            <Input value={editingTag.name} onChange={(e) => setEditingTag((t) => t ? { ...t, name: e.target.value } : t)}
                              className="h-7 text-xs" />
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                            style={{ backgroundColor: tag.colorHex + "33", color: tag.colorHex, border: `1px solid ${tag.colorHex}55` }}>
                            {tag.name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground hidden sm:table-cell">
                        {editingTag?.id === tag.id ? (
                          <Input value={editingTag.description ?? ""} onChange={(e) => setEditingTag((t) => t ? { ...t, description: e.target.value } : t)}
                            className="h-7 text-xs" placeholder="Descrição..." />
                        ) : (
                          <span className="text-xs">{tag.description || "-"}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center text-muted-foreground">{tag._count.leadTags}</td>
                      <td className="px-4 py-2 text-center">
                        <button type="button" onClick={() => handleToggleTag(tag)} title={tag.isActive ? "Desativar" : "Ativar"}>
                          {tag.isActive
                            ? <ToggleRight className="h-5 w-5 text-primary" />
                            : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                        </button>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1 justify-end">
                          {editingTag?.id === tag.id ? (
                            <>
                              <Button size="sm" variant="default" className="h-7 text-xs" onClick={handleUpdateTag} disabled={savingTag}>
                                {savingTag ? <Loader2 className="h-3 w-3 animate-spin" /> : "Salvar"}
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingTag(null)}>Cancelar</Button>
                            </>
                          ) : (
                            <>
                              <button type="button" className="p-1 rounded hover:bg-muted" onClick={() => setEditingTag(tag)} title="Editar">
                                <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                              <button type="button" className="p-1 rounded hover:bg-muted" onClick={() => handleDeleteTag(tag)} title="Apagar">
                                <Trash className="h-3.5 w-3.5 text-destructive" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhooks — movido para /webhooks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Webhooks</CardTitle>
                <CardDescription className="mt-0.5">
                  Gerencie endpoints de webhook para receber notificações em tempo real.
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/40 border border-border p-4 flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              A gestão de webhooks foi movida para uma página dedicada com log de entregas e reenvio manual.
            </p>
            <Button size="sm" variant="outline" asChild>
              <a href="/webhooks" className="gap-1.5 flex items-center whitespace-nowrap">
                <Webhook className="h-4 w-4" />
                Abrir Webhooks
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    {ConfirmDialogElement}

    {/* Modal nova conexão */}
    {newConnModal && (
      <>
        <div className="fixed inset-0 z-[300] bg-black/50" onClick={newConnStep === "name" ? closeNewConnModal : undefined} />
        <div className="fixed z-[310] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-xl shadow-2xl p-6 w-96">

          {/* Step: name */}
          {newConnStep === "name" && (
            <>
              <p className="font-semibold mb-1 flex items-center gap-2"><Smartphone className="h-4 w-4" /> Nova conexão WhatsApp</p>
              <p className="text-xs text-muted-foreground mb-4">Dê um apelido para identificar este número (ex: Vendas, Suporte).</p>
              <Label className="text-xs mb-1 block">Apelido *</Label>
              <Input
                autoFocus
                placeholder="Ex: Vendas, Suporte, SAC..."
                value={newConnName}
                onChange={(e) => setNewConnName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createAndConnect() }}
              />
              <p className="text-[11px] text-muted-foreground mt-1">O número será preenchido automaticamente após escanear o QR.</p>
              <div className="flex gap-2 justify-end mt-4">
                <Button variant="outline" size="sm" onClick={closeNewConnModal}>Cancelar</Button>
                <Button size="sm" onClick={createAndConnect} disabled={!newConnName.trim()}>
                  <QrCode className="mr-2 h-3.5 w-3.5" /> Criar e conectar
                </Button>
              </div>
            </>
          )}

          {/* Step: connecting (loading) */}
          {newConnStep === "connecting" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Iniciando sessão...</p>
              <p className="text-xs text-muted-foreground">Aguarde enquanto geramos o QR Code</p>
            </div>
          )}

          {/* Step: QR code */}
          {newConnStep === "qr" && newConnData && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-sm">{newConnData.name}</p>
                  <p className="text-xs text-muted-foreground">Escaneie o QR Code com o WhatsApp</p>
                </div>
                <span className="flex items-center gap-1 text-[11px] text-yellow-600 bg-yellow-500/15 px-2 py-0.5 rounded-full">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" /> Aguardando
                </span>
              </div>
              {newConnData.qrCode ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <img src={`data:image/png;base64,${newConnData.qrCode}`} alt="QR Code" className="w-56 h-56" />
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center">WhatsApp → Aparelhos conectados → Conectar um aparelho</p>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              <div className="flex justify-end mt-4">
                <Button variant="outline" size="sm" onClick={closeNewConnModal}>Cancelar</Button>
              </div>
            </>
          )}

          {/* Step: connected */}
          {newConnStep === "connected" && newConnData && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15">
                <CheckCircle className="h-7 w-7 text-green-600" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm text-green-600">Conectado com sucesso!</p>
                <p className="text-xs text-muted-foreground mt-1">{newConnData.name}{newConnData.phoneNumber ? ` · ${newConnData.phoneNumber}` : ""}</p>
              </div>
            </div>
          )}
        </div>
      </>
    )}
    </>
  )
}

function ToggleOption({ label, description, icon: Icon, enabled, onToggle }: {
  label: string; description: string; icon: React.ElementType; enabled: boolean; onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <button onClick={onToggle} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? "bg-primary" : "bg-muted"}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  )
}

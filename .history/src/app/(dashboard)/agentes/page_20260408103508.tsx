"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useAuthStore } from "@/stores/auth-store"
import {
  Bot,
  Plus,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  Loader2,
  Brain,
  Zap,
  Users,
  AlertTriangle,
  ChevronDown,
  X,
  BookOpen,
  MessageSquare,
  Upload,
  FileText,
  FileType2,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  PlusCircle,
  MinusCircle,
  Settings2,
  Mic2,
  MicOff,
  User,
  BrainCircuit,
  Eye,
  CheckCircle,
  Cpu,
  MessageSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── tipos ──────────────────────────────────────────────────────────────────────

interface Agent {
  id: string
  name: string
  description: string | null
  systemPrompt: string
  tone: string
  mode: string
  provider: string | null
  model: string | null
  temperature: number
  maxTokens: number
  escalateThreshold: number
  connectionIds: string // JSON array
  avatarUrl?: string | null
  isActive: boolean
  createdAt: string
  createdBy: { id: string; name: string } | null
  _count: { knowledgeFiles: number }
  // Voice settings
  voiceEnabled?: boolean
  voiceMode?: string
  voiceId?: string
  // ElevenLabs voice settings
  voiceSpeed?: number
  voiceStability?: number
  voiceSimilarity?: number
  // Behavior settings
  typingDelay?: boolean
  typingDelayMax?: number
  markAsRead?: boolean
  splitMessages?: boolean
  // Learning
  learningPolicy?: string
}

interface WaConnection {
  id: string
  name: string
  phoneNumber: string | null
  status: string
}

// ── helpers ────────────────────────────────────────────────────────────────────

const TONE_LABELS: Record<string, string> = {
  formal: "Formal",
  casual: "Casual",
  profissional: "Profissional",
}

const MODE_LABELS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  autonomous: { label: "Autônomo", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: Zap },
  assisted: { label: "Assistido", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: Users },
  hybrid: { label: "Híbrido", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", icon: Brain },
}

const PROVIDER_MODELS: Record<string, string[]> = {
  openai: ["gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "gpt-4o", "gpt-4o-mini"],
  anthropic: ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
  gemini: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"],
  grok: ["grok-3", "grok-3-fast", "grok-3-mini"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
}

// ── CustomSelect ───────────────────────────────────────────────────────────────

function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Selecionar...",
  className = "",
  upward = false,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  className?: string
  upward?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  const selected = options.find((o) => o.value === value)

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
      >
        <span className={!selected ? "text-muted-foreground" : ""}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className={cn(
          "absolute z-50 w-full rounded-md border border-border bg-card shadow-xl",
          upward ? "bottom-full mb-1" : "top-full mt-1"
        )}>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={cn(
                "flex w-full items-center px-3 py-2 text-sm hover:bg-accent transition-colors first:rounded-t-md last:rounded-b-md",
                o.value === value && "bg-primary/10 text-primary font-medium"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── KnowledgePanel ────────────────────────────────────────────────────────────

interface KnowledgeFile {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  status: "pending" | "processing" | "indexed" | "error"
  chunkCount: number
  errorMsg: string | null
  createdAt: string
}

const STATUS_ICONS: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pending:    { icon: Clock,         color: "text-muted-foreground", label: "Aguardando" },
  processing: { icon: Loader2,       color: "text-blue-500",         label: "Processando" },
  indexed:    { icon: CheckCircle2,  color: "text-green-500",        label: "Indexado" },
  error:      { icon: XCircle,       color: "text-destructive",      label: "Erro" },
}

const FILE_ICONS: Record<string, React.ElementType> = {
  pdf: FileType2,
  docx: FileText,
  txt: FileText,
  md: FileText,
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function KnowledgePanel({
  agent,
  onClose,
}: {
  agent: Agent
  onClose: () => void
}) {
  const { toast } = useToast()
  const [files, setFiles] = useState<KnowledgeFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadFiles = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/agents/${agent.id}/knowledge`)
      const data = await res.json()
      if (data.success) setFiles(data.data.files)
    } catch {
      toast({ variant: "destructive", title: "Erro ao carregar arquivos" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadFiles() }, [agent.id])

  // Polling para arquivos em processamento
  useEffect(() => {
    const hasProcessing = files.some((f) => f.status === "processing" || f.status === "pending")
    if (!hasProcessing) return
    const timer = setTimeout(loadFiles, 3000)
    return () => clearTimeout(timer)
  }, [files])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    const ext = file.name.split(".").pop()?.toLowerCase() || ""
    const allowed = ["txt", "md", "pdf", "docx"]
    if (!allowed.includes(ext)) {
      toast({ variant: "destructive", title: `Tipo não suportado. Use: ${allowed.join(", ")}` })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Arquivo muito grande. Máximo: 10MB" })
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch(`/api/agents/${agent.id}/knowledge`, { method: "POST", body: formData })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Arquivo enviado e sendo processado..." })
        loadFiles()
      } else {
        toast({ variant: "destructive", title: data.error || "Erro ao enviar arquivo" })
      }
    } catch {
      toast({ variant: "destructive", title: "Erro ao enviar arquivo" })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (fileId: string) => {
    setDeletingId(fileId)
    try {
      const res = await fetch(`/api/agents/${agent.id}/knowledge/${fileId}`, { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        setFiles((prev) => prev.filter((f) => f.id !== fileId))
        toast({ title: "Arquivo removido" })
      } else {
        toast({ variant: "destructive", title: data.error || "Erro ao remover" })
      }
    } catch {
      toast({ variant: "destructive", title: "Erro ao remover arquivo" })
    } finally {
      setDeletingId(null)
    }
  }

  const totalIndexed = files.filter((f) => f.status === "indexed").length
  const totalChunks = files.filter((f) => f.status === "indexed").reduce((s, f) => s + f.chunkCount, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-xl flex-col rounded-xl border border-border bg-card shadow-2xl max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Base de Conhecimento</h2>
              <p className="text-xs text-muted-foreground">{agent.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 border-b px-6 py-3">
          <div className="text-center">
            <p className="text-lg font-bold">{files.length}</p>
            <p className="text-[11px] text-muted-foreground">Arquivos</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-green-600 dark:text-green-400">{totalIndexed}</p>
            <p className="text-[11px] text-muted-foreground">Indexados</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{totalChunks}</p>
            <p className="text-[11px] text-muted-foreground">Chunks</p>
          </div>
        </div>

        {/* Upload */}
        <div className="px-6 py-4 border-b">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.pdf,.docx"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/20 py-4 text-sm text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary disabled:opacity-50"
          >
            {uploading
              ? <><Loader2 className="h-4 w-4 animate-spin" />Enviando...</>
              : <><Upload className="h-4 w-4" />Clique para enviar arquivo (TXT, MD, PDF, DOCX · máx 10MB)</>
            }
          </button>
        </div>

        {/* Lista de arquivos */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">Nenhum arquivo adicionado</p>
              <p className="text-xs text-muted-foreground">Adicione documentos para o agente usar como referência</p>
            </div>
          ) : (
            files.map((file) => {
              const statusInfo = STATUS_ICONS[file.status] || STATUS_ICONS.pending
              const StatusIcon = statusInfo.icon
              const FileIcon = FILE_ICONS[file.fileType] || FileText

              return (
                <div key={file.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-card border border-border">
                    <FileIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{file.fileName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{formatBytes(file.fileSize)}</span>
                      {file.status === "indexed" && (
                        <span className="text-xs text-muted-foreground">· {file.chunkCount} chunks</span>
                      )}
                      <div className={cn("flex items-center gap-1 text-xs", statusInfo.color)}>
                        <StatusIcon className={cn("h-3 w-3", file.status === "processing" && "animate-spin")} />
                        {statusInfo.label}
                      </div>
                    </div>
                    {file.errorMsg && (
                      <p className="text-xs text-destructive mt-0.5 truncate">{file.errorMsg}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(file.id)}
                    disabled={deletingId === file.id}
                    className="rounded-md p-1.5 hover:bg-accent transition-colors flex-shrink-0"
                  >
                    {deletingId === file.id
                      ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      : <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    }
                  </button>
                </div>
              )
            })
          )}
        </div>

        <div className="border-t px-6 py-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  )
}

// ── PromptWizard ───────────────────────────────────────────────────────────────

interface WizardData {
  // Empresa
  company: string
  companyDescription: string
  companySector: string
  companyProducts: string[]
  companyServices: string[]
  // Identidade
  role: string
  agentPersonality: string
  voiceTone: string
  speechStyle: string
  useEmojis: boolean
  // Objetivos
  mainObjective: string
  flowSteps: string[]
  // Regras
  generalRules: string[]
  dataToCollect: string[]
  forbiddenTerms: string[]
  recommendedExpressions: string[]
  // Objeções & Horário
  objections: { objection: string; response: string }[]
  workingDays: string[]
  workingHoursStart: string
  workingHoursEnd: string
}

const WIZARD_DEFAULT: WizardData = {
  company: "",
  companyDescription: "",
  companySector: "",
  companyProducts: [""],
  companyServices: [""],
  role: "",
  agentPersonality: "",
  voiceTone: "",
  speechStyle: "",
  useEmojis: false,
  mainObjective: "",
  flowSteps: [""],
  generalRules: [""],
  dataToCollect: [],
  forbiddenTerms: [""],
  recommendedExpressions: [""],
  objections: [{ objection: "", response: "" }],
  workingDays: [],
  workingHoursStart: "09:00",
  workingHoursEnd: "18:00",
}

const WEEK_DAYS = [
  { value: "segunda", label: "Seg" },
  { value: "terça", label: "Ter" },
  { value: "quarta", label: "Qua" },
  { value: "quinta", label: "Qui" },
  { value: "sexta", label: "Sex" },
  { value: "sábado", label: "Sáb" },
  { value: "domingo", label: "Dom" },
]

function generatePromptFromWizard(d: WizardData): string {
  const lines: string[] = []

  // Sobre a Empresa
  const hasCompanyInfo = d.company || d.companyDescription || d.companySector
  const hasProducts = d.companyProducts.some((p) => p.trim())
  const hasServices = d.companyServices.some((s) => s.trim())
  if (hasCompanyInfo || hasProducts || hasServices) {
    lines.push("## Sobre a Empresa")
    if (d.companyDescription) {
      lines.push(d.companyDescription)
    } else if (d.company) {
      const sector = d.companySector ? ` no segmento de ${d.companySector}` : ""
      lines.push(`A ${d.company} atua${sector}.`)
    }
    if (hasProducts) lines.push(`Produtos: ${d.companyProducts.filter((p) => p.trim()).join(", ")}.`)
    if (hasServices) lines.push(`Serviços: ${d.companyServices.filter((s) => s.trim()).join(", ")}.`)
    lines.push("")
  }

  // Identidade
  if (d.role || d.company) {
    const identity = [d.role, d.company ? `da ${d.company}` : ""].filter(Boolean).join(" ")
    lines.push(`Você é ${identity}.`)
  }
  if (d.agentPersonality) lines.push(d.agentPersonality)
  lines.push("")

  // Personalidade
  const personality: string[] = []
  if (d.voiceTone) personality.push(`Tom de voz: ${d.voiceTone}`)
  if (d.speechStyle) personality.push(`Estilo de fala: ${d.speechStyle}`)
  personality.push(d.useEmojis ? "Use emojis moderadamente para tornar a conversa mais leve" : "Não use emojis")
  personality.push("Chame o cliente pelo nome sempre que possível")
  personality.push("Faça uma pergunta por vez — nunca sobrecarregue o cliente")
  lines.push("## Personalidade")
  personality.forEach((p) => lines.push(`- ${p}`))
  lines.push("")

  // Objetivo
  if (d.mainObjective) {
    lines.push("## Objetivo Principal")
    lines.push(d.mainObjective)
    lines.push("")
  }

  // Fluxo
  const validSteps = d.flowSteps.filter((s) => s.trim())
  if (validSteps.length > 0) {
    lines.push("## Fluxo de Atendimento")
    validSteps.forEach((s, i) => lines.push(`${i + 1}. ${s}`))
    lines.push("")
  }

  // Regras
  const validRules = d.generalRules.filter((r) => r.trim())
  if (validRules.length > 0) {
    lines.push("## Regras Gerais")
    validRules.forEach((r) => lines.push(`- ${r}`))
    lines.push("")
  }

  // Dados a coletar
  if (d.dataToCollect.length > 0) {
    lines.push("## Dados a Coletar")
    lines.push(`Antes de executar qualquer ação, colete obrigatoriamente: ${d.dataToCollect.join(", ")}.`)
    lines.push("")
  }

  // Linguagem
  const forbidden = d.forbiddenTerms.filter((t) => t.trim())
  const recommended = d.recommendedExpressions.filter((t) => t.trim())
  if (forbidden.length > 0 || recommended.length > 0) {
    lines.push("## Guia de Linguagem")
    if (forbidden.length > 0) lines.push(`🚫 Evite: ${forbidden.join(", ")}`)
    if (recommended.length > 0) lines.push(`✅ Use: ${recommended.join(", ")}`)
    lines.push("")
  }

  // Objeções
  const validObjections = d.objections.filter((o) => o.objection.trim())
  if (validObjections.length > 0) {
    lines.push("## Como Lidar com Objeções")
    validObjections.forEach((o) => {
      lines.push(`- ${o.objection}${o.response.trim() ? `: ${o.response}` : ""}`)
    })
    lines.push("")
  }

  // Horário
  if (d.workingDays.length > 0) {
    const daysStr = d.workingDays.join(", ")
    lines.push("## Horário de Atendimento")
    lines.push(`Atenda de ${daysStr}, das ${d.workingHoursStart} às ${d.workingHoursEnd}.`)
    lines.push("Fora desse horário, informe que o atendimento retomará em breve.")
    lines.push("")
  }

  return lines.join("\n").trim()
}

const WIZARD_STEPS = [
  { title: "Empresa", subtitle: "Sobre a empresa, produtos e serviços" },
  { title: "Identidade", subtitle: "Quem é o agente e como ele se comunica" },
  { title: "Objetivos", subtitle: "O que o agente deve fazer, passo a passo" },
  { title: "Regras", subtitle: "Termos, regras e dados a coletar" },
  { title: "Objeções", subtitle: "Como responder objeções e quando atender" },
]

function PromptWizard({
  onApply,
  onClose,
  wizardData,
  setWizardData,
}: {
  onApply: (prompt: string) => void
  onClose: () => void
  wizardData: WizardData
  setWizardData: React.Dispatch<React.SetStateAction<WizardData>>
}) {
  const [step, setStep] = useState(0)
  const data = wizardData
  const setData = setWizardData
  const set = <K extends keyof WizardData>(key: K, val: WizardData[K]) =>
    setData((p) => ({ ...p, [key]: val }))

  const setListItem = (key: "flowSteps" | "generalRules" | "forbiddenTerms" | "recommendedExpressions", idx: number, val: string) => {
    setData((p) => {
      const arr = [...p[key]]
      arr[idx] = val
      return { ...p, [key]: arr }
    })
  }
  const addListItem = (key: "flowSteps" | "generalRules" | "forbiddenTerms" | "recommendedExpressions") =>
    setData((p) => ({ ...p, [key]: [...p[key], ""] }))
  const removeListItem = (key: "flowSteps" | "generalRules" | "forbiddenTerms" | "recommendedExpressions", idx: number) =>
    setData((p) => ({ ...p, [key]: p[key].filter((_, i) => i !== idx) }))

  const toggleDay = (day: string) =>
    set("workingDays", data.workingDays.includes(day)
      ? data.workingDays.filter((d) => d !== day)
      : [...data.workingDays, day])

  const toggleDataCollect = (item: string) =>
    set("dataToCollect", data.dataToCollect.includes(item)
      ? data.dataToCollect.filter((d) => d !== item)
      : [...data.dataToCollect, item])

  const generatedPrompt = generatePromptFromWizard(data)

  const inputCls = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
  const labelCls = "text-sm font-medium"

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-2xl max-h-[92vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Assistente de Criação de Prompt</h2>
              <p className="text-xs text-muted-foreground">{WIZARD_STEPS[step].subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>

        {/* Progress */}
        <div className="px-8 py-4 border-b bg-muted/20">
          {/* Linha de fundo + progresso */}
          <div className="relative mb-3">
            <div className="absolute left-[16px] right-[16px] top-4 h-px bg-border" />
            <div
              className="absolute left-[16px] top-4 h-px bg-primary/50 transition-all duration-300"
              style={{ width: `calc((100% - 32px) * ${step / (WIZARD_STEPS.length - 1)})` }}
            />
            {/* Círculos */}
            <div className="relative flex justify-between">
              {WIZARD_STEPS.map((_s, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  style={i < step ? { backgroundColor: "#011813" } : undefined}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold border-2 transition-all bg-card",
                    i === step
                      ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30"
                      : i < step
                      ? "border-primary/60 text-primary"
                      : "border-border text-muted-foreground"
                  )}
                >
                  {i < step ? "✓" : i + 1}
                </button>
              ))}
            </div>
          </div>
          {/* Labels */}
          <div className="flex justify-between">
            {WIZARD_STEPS.map((s, i) => (
              <span
                key={i}
                className={cn(
                  "w-8 text-center text-[11px] font-medium whitespace-nowrap transition-colors",
                  i === step ? "text-primary" : i < step ? "text-primary/60" : "text-muted-foreground"
                )}
              >
                {s.title}
              </span>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* ── Step 1: Empresa & Produtos ── */}
          {step === 0 && (
            <>
              <div className="space-y-1.5">
                <label className={labelCls}>Nome da Empresa / Profissional</label>
                <input value={data.company} onChange={(e) => set("company", e.target.value)}
                  placeholder="Ex: Clínica Bem Viver, Agência Pulse, Dr. Carlos Silva..." className={inputCls} />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>O que a empresa faz</label>
                <p className="text-xs text-muted-foreground">Descreva o negócio, missão ou proposta de valor</p>
                <textarea value={data.companyDescription} onChange={(e) => set("companyDescription", e.target.value)}
                  placeholder="Ex: Somos uma clínica de estética especializada em procedimentos minimamente invasivos para mulheres que buscam se sentir bem consigo mesmas..."
                  rows={3} className={cn(inputCls, "resize-none")} />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Segmento / Setor</label>
                <input value={data.companySector} onChange={(e) => set("companySector", e.target.value)}
                  placeholder="Ex: Estética e beleza, SaaS B2B, Imobiliário de luxo..." className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className={labelCls}>Produtos</label>
                    <button type="button" onClick={() => setData((p) => ({ ...p, companyProducts: [...p.companyProducts, ""] }))}
                      className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <PlusCircle className="h-3.5 w-3.5" />Adicionar
                    </button>
                  </div>
                  {data.companyProducts.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input value={p} onChange={(e) => { const arr = [...data.companyProducts]; arr[i] = e.target.value; set("companyProducts", arr) }}
                        placeholder="Ex: Botox, Preenchimento Labial..." className={cn(inputCls, "flex-1")} />
                      {data.companyProducts.length > 1 && (
                        <button type="button" onClick={() => set("companyProducts", data.companyProducts.filter((_, j) => j !== i))}
                          className="text-muted-foreground hover:text-destructive">
                          <MinusCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className={labelCls}>Serviços</label>
                    <button type="button" onClick={() => setData((p) => ({ ...p, companyServices: [...p.companyServices, ""] }))}
                      className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <PlusCircle className="h-3.5 w-3.5" />Adicionar
                    </button>
                  </div>
                  {data.companyServices.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input value={s} onChange={(e) => { const arr = [...data.companyServices]; arr[i] = e.target.value; set("companyServices", arr) }}
                        placeholder="Ex: Consultoria gratuita, Atendimento domiciliar..." className={cn(inputCls, "flex-1")} />
                      {data.companyServices.length > 1 && (
                        <button type="button" onClick={() => set("companyServices", data.companyServices.filter((_, j) => j !== i))}
                          className="text-muted-foreground hover:text-destructive">
                          <MinusCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Step 2: Identidade ── */}
          {step === 1 && (
            <>
              <div className="space-y-1.5">
                <label className={labelCls}>Papel / Função do Agente</label>
                <CustomSelect
                  value={data.role}
                  onChange={(v) => set("role", v)}
                  placeholder="Selecionar..."
                  options={[
                    { value: "assistente de vendas", label: "Assistente de Vendas" },
                    { value: "SDR (pré-vendas)", label: "SDR (Pré-vendas)" },
                    { value: "consultor", label: "Consultor" },
                    { value: "atendente", label: "Atendente" },
                    { value: "secretária virtual", label: "Secretária Virtual" },
                    { value: "suporte técnico", label: "Suporte Técnico" },
                  ]}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Descrição da Personalidade</label>
                <p className="text-xs text-muted-foreground">Descreva a identidade do agente em poucas palavras</p>
                <input value={data.agentPersonality} onChange={(e) => set("agentPersonality", e.target.value)}
                  placeholder="Ex: Especialista em vendas, acolhedora, focada em agendar reuniões de consultoria gratuita"
                  className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={labelCls}>Tom de Voz</label>
                  <CustomSelect value={data.voiceTone} onChange={(v) => set("voiceTone", v)} placeholder="Selecionar..." upward
                    options={[
                      { value: "acolhedor e empático", label: "Acolhedor e empático" },
                      { value: "direto e objetivo", label: "Direto e objetivo" },
                      { value: "técnico e especialista", label: "Técnico e especialista" },
                      { value: "simpático e descontraído", label: "Simpático e descontraído" },
                      { value: "consultivo e profissional", label: "Consultivo e profissional" },
                    ]}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Estilo de Fala</label>
                  <CustomSelect value={data.speechStyle} onChange={(v) => set("speechStyle", v)} placeholder="Selecionar..." upward
                    options={[
                      { value: "formal", label: "Formal" },
                      { value: "informal e humano", label: "Informal e humano" },
                      { value: "objetivo e conciso", label: "Objetivo e conciso" },
                      { value: "jovial e extrovertido", label: "Jovial e extrovertido" },
                    ]}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Usar emojis na conversa?</p>
                  <p className="text-xs text-muted-foreground">Torna o atendimento mais leve e humanizado</p>
                </div>
                <button type="button" onClick={() => set("useEmojis", !data.useEmojis)}
                  className={cn(
                    "relative h-6 w-11 flex-shrink-0 rounded-full transition-colors",
                    data.useEmojis ? "bg-primary" : "border border-muted-foreground/40 bg-muted-foreground/20"
                  )}>
                  <span className={cn(
                    "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                    data.useEmojis ? "translate-x-5" : "translate-x-0"
                  )} />
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: Objetivos & Fluxo ── */}
          {step === 2 && (
            <>
              <div className="space-y-1.5">
                <label className={labelCls}>Objetivo Principal do Agente</label>
                <p className="text-xs text-muted-foreground">O que o agente deve conquistar em cada conversa?</p>
                <textarea value={data.mainObjective} onChange={(e) => set("mainObjective", e.target.value)}
                  placeholder="Ex: Qualificar leads interessados no produto, entender sua necessidade e agendar uma demonstração gratuita com um especialista"
                  rows={3} className={cn(inputCls, "resize-none")} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className={labelCls}>Fluxo de Atendimento (passo a passo)</label>
                    <p className="text-xs text-muted-foreground mt-0.5">Descreva cada etapa da conversa em ordem</p>
                  </div>
                  <button type="button" onClick={() => addListItem("flowSteps")}
                    className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <PlusCircle className="h-3.5 w-3.5" />Adicionar etapa
                  </button>
                </div>
                {data.flowSteps.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                    <input value={s} onChange={(e) => setListItem("flowSteps", i, e.target.value)}
                      placeholder={`Ex: ${["Boas-vindas e identificação do cliente", "Entender a necessidade principal", "Apresentar a solução", "Oferecer agendamento de demonstração"][i] || "Próximo passo..."}`}
                      className={cn(inputCls, "flex-1")} />
                    {data.flowSteps.length > 1 && (
                      <button type="button" onClick={() => removeListItem("flowSteps", i)} className="text-muted-foreground hover:text-destructive">
                        <MinusCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Step 4: Regras & Linguagem ── */}
          {step === 3 && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className={labelCls}>Regras Gerais do Agente</label>
                  <button type="button" onClick={() => addListItem("generalRules")}
                    className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <PlusCircle className="h-3.5 w-3.5" />Adicionar
                  </button>
                </div>
                {data.generalRules.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={r} onChange={(e) => setListItem("generalRules", i, e.target.value)}
                      placeholder="Ex: Não falar sobre valores, sempre redirecionar para agendamento..."
                      className={cn(inputCls, "flex-1")} />
                    {data.generalRules.length > 1 && (
                      <button type="button" onClick={() => removeListItem("generalRules", i)} className="text-muted-foreground hover:text-destructive">
                        <MinusCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-xs text-muted-foreground self-center">Sugestões:</span>
                  {[
                    "Não mencionar concorrentes",
                    "Nunca discutir preços sem autorização",
                    "Sempre perguntar o nome antes de continuar",
                    "Encaminhar reclamações para humano",
                    "Não fazer promessas que não possam ser cumpridas",
                    "Nunca pressionar o cliente",
                    "Confirmar entendimento antes de prosseguir",
                    "Redirecionar para agendamento ao detectar interesse",
                  ].filter((s) => !data.generalRules.includes(s)).map((s) => (
                    <button key={s} type="button"
                      onClick={() => {
                        const empty = data.generalRules.findIndex((r) => !r.trim())
                        if (empty >= 0) setListItem("generalRules", empty, s)
                        else setData((p) => ({ ...p, generalRules: [...p.generalRules, s] }))
                      }}
                      className="rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                      + {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Dados a Coletar do Cliente</label>
                <div className="flex flex-wrap gap-2">
                  {["Nome", "E-mail", "Telefone", "Empresa", "Cargo", "Orçamento", "Prazo", "Cidade"].map((item) => (
                    <button key={item} type="button" onClick={() => toggleDataCollect(item)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                        data.dataToCollect.includes(item)
                          ? "bg-primary/10 border-primary text-primary"
                          : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                      )}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className={labelCls}>🚫 Termos a Evitar</label>
                    <button type="button" onClick={() => addListItem("forbiddenTerms")}
                      className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <PlusCircle className="h-3.5 w-3.5" />Adicionar
                    </button>
                  </div>
                  {data.forbiddenTerms.map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input value={t} onChange={(e) => setListItem("forbiddenTerms", i, e.target.value)}
                        placeholder='Ex: "promoção", "rapidinho"' className={cn(inputCls, "flex-1")} />
                      {data.forbiddenTerms.length > 1 && (
                        <button type="button" onClick={() => removeListItem("forbiddenTerms", i)} className="text-muted-foreground hover:text-destructive">
                          <MinusCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-1.5">
                    {["rapidinho", "problema", "impossível", "não sei", "barato", "promoção relâmpago", "calma", "não posso"].filter((s) => !data.forbiddenTerms.includes(s)).map((s) => (
                      <button key={s} type="button"
                        onClick={() => {
                          const empty = data.forbiddenTerms.findIndex((t) => !t.trim())
                          if (empty >= 0) setListItem("forbiddenTerms", empty, s)
                          else setData((p) => ({ ...p, forbiddenTerms: [...p.forbiddenTerms, s] }))
                        }}
                        className="rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-destructive hover:text-destructive transition-colors">
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className={labelCls}>✅ Expressões Recomendadas</label>
                    <button type="button" onClick={() => addListItem("recommendedExpressions")}
                      className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <PlusCircle className="h-3.5 w-3.5" />Adicionar
                    </button>
                  </div>
                  {data.recommendedExpressions.map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input value={t} onChange={(e) => setListItem("recommendedExpressions", i, e.target.value)}
                        placeholder='Ex: "posso te explicar melhor"' className={cn(inputCls, "flex-1")} />
                      {data.recommendedExpressions.length > 1 && (
                        <button type="button" onClick={() => removeListItem("recommendedExpressions", i)} className="text-muted-foreground hover:text-destructive">
                          <MinusCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-1.5">
                    {["posso te ajudar com isso", "entendo sua necessidade", "deixa eu verificar para você", "com certeza", "ótima pergunta", "fique à vontade", "vou te explicar melhor", "posso esclarecer isso"].filter((s) => !data.recommendedExpressions.includes(s)).map((s) => (
                      <button key={s} type="button"
                        onClick={() => {
                          const empty = data.recommendedExpressions.findIndex((t) => !t.trim())
                          if (empty >= 0) setListItem("recommendedExpressions", empty, s)
                          else setData((p) => ({ ...p, recommendedExpressions: [...p.recommendedExpressions, s] }))
                        }}
                        className="rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Step 5: Objeções & Horário ── */}
          {step === 4 && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className={labelCls}>Objeções Comuns e Como Responder</label>
                    <p className="text-xs text-muted-foreground mt-0.5">Prepare o agente para lidar com resistências</p>
                  </div>
                  <button type="button"
                    onClick={() => setData((p) => ({ ...p, objections: [...p.objections, { objection: "", response: "" }] }))}
                    className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <PlusCircle className="h-3.5 w-3.5" />Adicionar
                  </button>
                </div>
                {data.objections.map((o, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3 relative">
                    <input value={o.objection}
                      onChange={(e) => setData((p) => { const arr = [...p.objections]; arr[i] = { ...arr[i], objection: e.target.value }; return { ...p, objections: arr } })}
                      placeholder='Objeção: "É muito caro"' className={inputCls} />
                    <input value={o.response}
                      onChange={(e) => setData((p) => { const arr = [...p.objections]; arr[i] = { ...arr[i], response: e.target.value }; return { ...p, objections: arr } })}
                      placeholder="Como responder..." className={inputCls} />
                    {data.objections.length > 1 && (
                      <button type="button"
                        onClick={() => setData((p) => ({ ...p, objections: p.objections.filter((_, j) => j !== i) }))}
                        className="absolute -top-2 -right-2 rounded-full bg-card border border-border p-0.5 text-muted-foreground hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-xs text-muted-foreground self-center">Sugestões:</span>
                  {[
                    { objection: "É muito caro", response: "Entendo sua preocupação. O investimento reflete o retorno que você terá. Posso mostrar casos de clientes com resultado similar?" },
                    { objection: "Preciso pensar", response: "Claro! O que posso esclarecer para ajudar na sua decisão?" },
                    { objection: "Já tenho um fornecedor", response: "Compreendo. Posso mostrar em que nos diferenciamos e como podemos complementar o que você já usa?" },
                    { objection: "Não tenho tempo agora", response: "Sem problema! Posso agendar um momento mais conveniente para você." },
                    { objection: "Não é prioridade agora", response: "Entendo. Posso te mostrar como isso pode economizar tempo já no primeiro mês?" },
                    { objection: "Preciso falar com meu sócio", response: "Claro! Posso preparar um resumo para facilitar a conversa com ele?" },
                    { objection: "Não conheço a empresa", response: "Faz sentido! Temos clientes como [referência]. Posso compartilhar mais sobre nossa história?" },
                  ].filter((s) => !data.objections.some((o) => o.objection === s.objection)).map((s) => (
                    <button key={s.objection} type="button"
                      onClick={() => {
                        const empty = data.objections.findIndex((o) => !o.objection.trim())
                        if (empty >= 0) setData((p) => { const arr = [...p.objections]; arr[empty] = s; return { ...p, objections: arr } })
                        else setData((p) => ({ ...p, objections: [...p.objections, s] }))
                      }}
                      className="rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                      + {s.objection}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Dias de Atendimento</label>
                <div className="flex gap-2">
                  {WEEK_DAYS.map((d) => (
                    <button key={d.value} type="button" onClick={() => toggleDay(d.value)}
                      className={cn(
                        "flex-1 rounded-md border py-2 text-xs font-medium transition-colors",
                        data.workingDays.includes(d.value)
                          ? "bg-primary/10 border-primary text-primary"
                          : "border-border text-muted-foreground hover:border-primary"
                      )}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={labelCls}>Horário de Início</label>
                  <input type="time" value={data.workingHoursStart}
                    onChange={(e) => set("workingHoursStart", e.target.value)} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Horário de Término</label>
                  <input type="time" value={data.workingHoursEnd}
                    onChange={(e) => set("workingHoursEnd", e.target.value)} className={inputCls} />
                </div>
              </div>

            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-6 py-4">
          <button type="button" onClick={() => step > 0 ? setStep(step - 1) : onClose()}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
            {step === 0 ? "Cancelar" : "Anterior"}
          </button>
          <div className="flex gap-3">
            {step < WIZARD_STEPS.length - 1 ? (
              <Button onClick={() => setStep(step + 1)}>
                Próximo <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Fechar
                </Button>
                <Button onClick={() => { onApply(generatedPrompt) }}
                  disabled={!generatedPrompt.trim()}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Gerar Prompt
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── AgentModal ─────────────────────────────────────────────────────────────────

interface AgentFormData {
  name: string
  description: string
  systemPrompt: string
  tone: string
  mode: string
  provider: string
  model: string
  temperature: number
  maxTokens: number
  escalateThreshold: number
  connectionIds: string[]
  isActive: boolean
  avatarUrl: string | null
  voiceEnabled: boolean
  voiceMode: string
  voiceId: string
  // ElevenLabs voice settings
  voiceSpeed: number
  voiceStability: number
  voiceSimilarity: number
  typingDelay: boolean
  typingDelayMax: number
  markAsRead: boolean
  splitMessages: boolean
  learningPolicy: string
}

const DEFAULT_FORM: AgentFormData = {
  name: "",
  description: "",
  systemPrompt: "",
  tone: "profissional",
  mode: "assisted",
  provider: "",
  model: "",
  temperature: 0.3,
  maxTokens: 1500,
  escalateThreshold: -30,
  connectionIds: [],
  isActive: true,
  avatarUrl: null,
  voiceEnabled: false,
  voiceMode: "if_audio",
  voiceId: "",
  // ElevenLabs voice settings (valores padrão da API)
  voiceSpeed: 1.0,
  voiceStability: 0.5,
  voiceSimilarity: 0.75,
  typingDelay: true,
  typingDelayMax: 8,
  markAsRead: true,
  splitMessages: true,
  learningPolicy: "manual",
}

function AgentModal({
  open,
  onClose,
  onSaved,
  editAgent,
  connections,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editAgent: Agent | null
  connections: WaConnection[]
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<AgentFormData>(DEFAULT_FORM)
  const [activeTab, setActiveTab] = useState<"geral" | "personalidade" | "voz" | "avancado" | "aprendizado">("geral")
  const [showWizard, setShowWizard] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [wizardData, setWizardData] = useState<WizardData>(WIZARD_DEFAULT)
  const [voices, setVoices] = useState<{ voice_id: string; name: string; category: string }[]>([])
  const [voicesLoading, setVoicesLoading] = useState(false)
  const [learnStats, setLearnStats] = useState<{
    totalFiles: number
    totalChunks: number
    totalConversations: number
    pendingReview: number
  } | null>(null)
  const [pendingItems, setPendingItems] = useState<Array<{ id: string; fileName: string; createdAt: string }>>([])
  const [statsLoading, setStatsLoading] = useState(false)

  const loadLearnStats = useCallback(async (agentId: string) => {
    setStatsLoading(true)
    try {
      const [statsRes, pendingRes] = await Promise.all([
        fetch(`/api/agents/${agentId}/knowledge/stats`),
        fetch(`/api/agents/${agentId}/knowledge?sourceType=conversation&reviewStatus=pending`),
      ])
      const statsData = await statsRes.json()
      const pendingData = await pendingRes.json()
      if (statsData.success) setLearnStats(statsData.data)
      if (pendingData.success) setPendingItems(pendingData.data?.files || [])
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    if (editAgent) {
      setForm({
        name: editAgent.name,
        description: editAgent.description || "",
        systemPrompt: editAgent.systemPrompt,
        tone: editAgent.tone,
        mode: editAgent.mode,
        provider: editAgent.provider || "",
        model: editAgent.model || "",
        temperature: editAgent.temperature,
        maxTokens: editAgent.maxTokens,
        escalateThreshold: editAgent.escalateThreshold,
        connectionIds: (() => { try { return JSON.parse(editAgent.connectionIds) } catch { return [] } })(),
        isActive: editAgent.isActive,
        avatarUrl: editAgent.avatarUrl || null,
        voiceEnabled: editAgent.voiceEnabled ?? false,
        voiceMode: editAgent.voiceMode ?? "if_audio",
        voiceId: editAgent.voiceId ?? "",
        // ElevenLabs voice settings
        voiceSpeed: editAgent.voiceSpeed ?? 1.0,
        voiceStability: editAgent.voiceStability ?? 0.5,
        voiceSimilarity: editAgent.voiceSimilarity ?? 0.75,
        typingDelay: editAgent.typingDelay ?? true,
        typingDelayMax: editAgent.typingDelayMax ?? 8,
        markAsRead: editAgent.markAsRead ?? true,
        splitMessages: editAgent.splitMessages ?? true,
        learningPolicy: (editAgent as any).learningPolicy ?? (editAgent as any).learning_policy ?? "manual",
      })
    } else {
      setForm(DEFAULT_FORM)
    }
    setActiveTab("geral")
    setLearnStats(null)
    setPendingItems([])
  }, [open, editAgent])

  if (!open) return null

  const set = (key: keyof AgentFormData, val: unknown) =>
    setForm((prev) => ({ ...prev, [key]: val }))

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editAgent) return
    e.target.value = ""
    setUploadingAvatar(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("agentId", editAgent.id)
      const res = await fetch("/api/agents/avatar", { method: "POST", body: fd })
      const data = await res.json()
      if (data.success) {
        set("avatarUrl", data.data.avatarUrl)
        toast({ title: "Foto atualizada" })
      } else {
        toast({ variant: "destructive", title: data.error || "Erro ao enviar foto" })
      }
    } catch {
      toast({ variant: "destructive", title: "Erro ao enviar foto" })
    } finally {
      setUploadingAvatar(false)
    }
  }

  // Renderiza o wizard por cima do modal quando aberto
  if (showWizard) {
    return (
      <PromptWizard
        onApply={(prompt) => { set("systemPrompt", prompt); setActiveTab("personalidade") }}
        onClose={() => setShowWizard(false)}
        wizardData={wizardData}
        setWizardData={setWizardData}
      />
    )
  }

  const toggleConnection = (id: string) => {
    set("connectionIds", form.connectionIds.includes(id)
      ? form.connectionIds.filter((c) => c !== id)
      : [...form.connectionIds, id])
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ variant: "destructive", title: "Nome é obrigatório" })
      return
    }
    setSaving(true)
    try {
      const url = editAgent ? `/api/agents/${editAgent.id}` : "/api/agents"
      const method = editAgent ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          provider: form.provider || null,
          model: form.model || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: editAgent ? "Agente atualizado" : "Agente criado com sucesso" })
        onSaved()
        onClose()
      } else {
        toast({ variant: "destructive", title: data.error || "Erro ao salvar" })
      }
    } catch {
      toast({ variant: "destructive", title: "Erro ao salvar agente" })
    } finally {
      setSaving(false)
    }
  }

  const modelOptions = form.provider
    ? (PROVIDER_MODELS[form.provider] || []).map((m) => ({ value: m, label: m }))
    : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            {/* Avatar clicável — só disponível ao editar */}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <button
              type="button"
              onClick={() => editAgent && avatarInputRef.current?.click()}
              disabled={!editAgent || uploadingAvatar}
              title={editAgent ? "Clique para trocar a foto" : "Salve o agente primeiro para adicionar foto"}
              className={cn(
                "relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border-2 transition-all",
                editAgent ? "border-primary/50 hover:border-primary cursor-pointer" : "border-border cursor-default",
              )}
            >
              {uploadingAvatar ? (
                <div className="flex h-full w-full items-center justify-center bg-muted">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : form.avatarUrl ? (
                <img src={form.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-primary/10">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
              )}
              {editAgent && !uploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors rounded-full">
                  <Upload className="h-3.5 w-3.5 text-white opacity-0 hover:opacity-100" />
                </div>
              )}
            </button>
            <div>
              <h2 className="text-base font-semibold">
                {editAgent ? "Editar Agente" : "Novo Agente IA"}
              </h2>
              <p className="text-xs text-muted-foreground">Configure o comportamento do agente</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6">
          {([
            { id: "geral", label: "Geral", icon: <Bot className="h-3.5 w-3.5" /> },
            { id: "personalidade", label: "Personalidade", icon: <User className="h-3.5 w-3.5" /> },
            { id: "voz", label: "Voz", icon: <Mic2 className="h-3.5 w-3.5" /> },
            { id: "avancado", label: "Avançado", icon: <Settings2 className="h-3.5 w-3.5" /> },
            { id: "aprendizado", label: "Aprendizado", icon: <BrainCircuit className="h-3.5 w-3.5" /> },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                if (tab.id === "aprendizado" && editAgent?.id) {
                  loadLearnStats(editAgent.id)
                }
              }}
              className={cn(
                "flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === "geral" && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nome do Agente *</label>
                <input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Ex: Agente de Qualificação"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Descrição</label>
                <input
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Breve descrição da função do agente"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Modo de Atuação</label>
                <CustomSelect
                  value={form.mode}
                  onChange={(v) => set("mode", v)}
                  options={[
                    { value: "autonomous", label: "Autônomo — responde sozinho" },
                    { value: "assisted", label: "Assistido — sugere respostas para o humano aprovar" },
                    { value: "hybrid", label: "Híbrido — autônomo até escalar para humano" },
                  ]}
                />
                <p className="text-xs text-muted-foreground">
                  {form.mode === "autonomous" && "O agente responde automaticamente sem intervenção humana."}
                  {form.mode === "assisted" && "O agente gera sugestões que precisam ser aprovadas pelo atendente."}
                  {form.mode === "hybrid" && "O agente responde de forma autônoma, mas escala para humano quando necessário."}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Conexões WhatsApp Associadas</label>
                {connections.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma conexão disponível</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {connections.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleConnection(c.id)}
                        className={cn(
                          "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors text-left",
                          form.connectionIds.includes(c.id)
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:bg-accent"
                        )}
                      >
                        <div className={cn("h-2 w-2 rounded-full flex-shrink-0", c.status === "connected" ? "bg-green-500" : "bg-muted-foreground")} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{c.name}</p>
                          {c.phoneNumber && <p className="truncate text-xs text-muted-foreground">{c.phoneNumber}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Agente Ativo</p>
                  <p className="text-xs text-muted-foreground">Quando desativado, não processa mensagens</p>
                </div>
                <button
                  type="button"
                  onClick={() => set("isActive", !form.isActive)}
                  className={cn(
                    "relative h-6 w-11 flex-shrink-0 rounded-full transition-colors",
                    form.isActive ? "bg-primary" : "border border-muted-foreground/40 bg-muted-foreground/20"
                  )}
                >
                  <span className={cn(
                    "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                    form.isActive ? "translate-x-5" : "translate-x-0"
                  )} />
                </button>
              </div>

              {/* Comportamento humano */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Comportamento Humano</p>
                <p className="text-xs text-muted-foreground">Simula comportamento natural para não parecer um bot</p>

                {/* Marcar como lido */}
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Marcar mensagem como lida</p>
                    <p className="text-xs text-muted-foreground">Envia o "visto azul" antes de responder</p>
                  </div>
                  <button type="button" onClick={() => set("markAsRead", !form.markAsRead)}
                    className={cn("relative h-6 w-11 flex-shrink-0 rounded-full transition-colors",
                      form.markAsRead ? "bg-primary" : "border border-muted-foreground/40 bg-muted-foreground/20")}>
                    <span className={cn("absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                      form.markAsRead ? "translate-x-5" : "translate-x-0")} />
                  </button>
                </div>

                {/* Simulação de digitação */}
                <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Simular digitação</p>
                      <p className="text-xs text-muted-foreground">Mostra "digitando..." proporcional ao tamanho da resposta</p>
                    </div>
                    <button type="button" onClick={() => set("typingDelay", !form.typingDelay)}
                      className={cn("relative h-6 w-11 flex-shrink-0 rounded-full transition-colors",
                        form.typingDelay ? "bg-primary" : "border border-muted-foreground/40 bg-muted-foreground/20")}>
                      <span className={cn("absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                        form.typingDelay ? "translate-x-5" : "translate-x-0")} />
                    </button>
                  </div>
                  {form.typingDelay && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground">Delay máximo</label>
                        <span className="text-xs font-medium text-primary">{form.typingDelayMax}s</span>
                      </div>
                      <input type="range" min={2} max={20} step={1}
                        value={form.typingDelayMax}
                        onChange={(e) => set("typingDelayMax", Number(e.target.value))}
                        className="w-full accent-primary h-1.5 rounded-full cursor-pointer" />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>2s</span><span>Rápido — Lento</span><span>20s</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Separar mensagens longas */}
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Separar respostas longas</p>
                    <p className="text-xs text-muted-foreground">Envia parágrafos separados (listas ficam agrupadas)</p>
                  </div>
                  <button type="button" onClick={() => set("splitMessages", !form.splitMessages)}
                    className={cn("relative h-6 w-11 flex-shrink-0 rounded-full transition-colors",
                      form.splitMessages ? "bg-primary" : "border border-muted-foreground/40 bg-muted-foreground/20")}>
                    <span className={cn("absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                      form.splitMessages ? "translate-x-5" : "translate-x-0")} />
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === "personalidade" && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tom de Comunicação</label>
                <CustomSelect
                  value={form.tone}
                  onChange={(v) => set("tone", v)}
                  options={[
                    { value: "formal", label: "Formal — linguagem corporativa e técnica" },
                    { value: "profissional", label: "Profissional — equilibrado e direto" },
                    { value: "casual", label: "Casual — amigável e descontraído" },
                  ]}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Prompt de Sistema</label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Instruções base do agente. O sistema adiciona automaticamente o contexto do lead.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowWizard(true)}
                    className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Assistente de Criação
                  </button>
                </div>
                <textarea
                  value={form.systemPrompt}
                  onChange={(e) => set("systemPrompt", e.target.value)}
                  placeholder={`Exemplo:\nVocê é um assistente de vendas da [Empresa]. Seu objetivo é qualificar leads e agendar demonstrações do produto.\n\nRegras:\n- Sempre pergunte sobre o orçamento disponível\n- Não ofereça descontos sem aprovação do gerente\n- Se o lead pedir preço, direcione para a página de planos`}
                  rows={10}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono resize-none"
                />
                {form.systemPrompt && (
                  <p className="text-xs text-muted-foreground text-right">{form.systemPrompt.length} caracteres</p>
                )}
              </div>
            </>
          )}

          {activeTab === "voz" && (
            <>
              {/* Toggle voz */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Ativar respostas em voz</p>
                  <p className="text-xs text-muted-foreground">O agente pode responder com mensagens de áudio via ElevenLabs</p>
                </div>
                <button type="button" onClick={() => set("voiceEnabled", !form.voiceEnabled)}
                  className={cn(
                    "relative h-6 w-11 flex-shrink-0 rounded-full transition-colors",
                    form.voiceEnabled ? "bg-primary" : "border border-muted-foreground/40 bg-muted-foreground/20"
                  )}>
                  <span className={cn(
                    "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                    form.voiceEnabled ? "translate-x-5" : "translate-x-0"
                  )} />
                </button>
              </div>

              {form.voiceEnabled && (
                <>
                  {/* Modo de uso da voz */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Quando usar voz</label>
                    <div className="space-y-2">
                      {[
                        { value: "if_audio", label: "Somente se o lead enviou áudio", desc: "Responde em voz apenas quando a última mensagem recebida foi um áudio" },
                        { value: "smart", label: "Decisão inteligente do agente", desc: "O agente decide quando usar voz estrategicamente para engajar ou chamar a atenção do lead — inclui instrução no prompt automaticamente" },
                        { value: "always", label: "Sempre", desc: "Todas as respostas do agente serão enviadas como mensagem de voz" },
                        { value: "never", label: "Nunca", desc: "Não envia áudio (desativa temporariamente sem perder a voz selecionada)" },
                      ].map((opt) => (
                        <button key={opt.value} type="button"
                          onClick={() => set("voiceMode", opt.value)}
                          className={cn(
                            "w-full flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                            form.voiceMode === opt.value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}>
                          <div className={cn(
                            "mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 transition-colors",
                            form.voiceMode === opt.value ? "border-primary bg-primary" : "border-muted-foreground"
                          )} />
                          <div>
                            <p className="text-sm font-medium">{opt.label}</p>
                            <p className="text-xs text-muted-foreground">{opt.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Seleção de voz */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Voz do Agente</label>
                      <button type="button"
                        onClick={async () => {
                          setVoicesLoading(true)
                          try {
                            const res = await fetch("/api/elevenlabs/voices")
                            const data = await res.json()
                            if (data.success) setVoices(data.data.voices)
                            else toast({ variant: "destructive", title: "Erro ao buscar vozes", description: data.error })
                          } catch {
                            toast({ variant: "destructive", title: "Erro ao conectar com ElevenLabs" })
                          } finally {
                            setVoicesLoading(false)
                          }
                        }}
                        disabled={voicesLoading}
                        className="flex items-center gap-1 text-xs text-primary hover:underline">
                        {voicesLoading
                          ? <><span className="animate-spin">⟳</span> Carregando...</>
                          : "↻ Carregar vozes"}
                      </button>
                    </div>

                    {voices.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                        Configure a API Key da ElevenLabs em Configurações → Integrações e clique em "Carregar vozes"
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                        {voices.map((v) => (
                          <button key={v.voice_id} type="button"
                            onClick={() => set("voiceId", v.voice_id)}
                            className={cn(
                              "flex flex-col items-start rounded-lg border px-3 py-2.5 text-left transition-colors",
                              form.voiceId === v.voice_id
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            )}>
                            <span className="text-sm font-medium truncate w-full">{v.name}</span>
                            <span className="text-xs text-muted-foreground capitalize">{v.category}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {form.voiceId && (
                      <p className="text-xs text-primary">✓ Voz selecionada: {voices.find((v) => v.voice_id === form.voiceId)?.name || form.voiceId}</p>
                    )}
                  </div>

                  {/* Ajustes de voz ElevenLabs */}
                  <div className="space-y-4 rounded-lg border border-border bg-muted/30 px-4 py-4">
                    <p className="text-sm font-medium">Ajustes da Voz</p>
                    <p className="text-xs text-muted-foreground">Configure como a voz será gerada pela ElevenLabs</p>

                    {/* Velocidade */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Velocidade</label>
                        <span className="text-xs font-medium text-primary">{form.voiceSpeed.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.05"
                        value={form.voiceSpeed}
                        onChange={(e) => set("voiceSpeed", parseFloat(e.target.value))}
                        className="w-full accent-primary h-1.5 rounded-full cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Mais devagar (0.5x)</span>
                        <span>Normal (1.0x)</span>
                        <span>Mais rápido (2.0x)</span>
                      </div>
                    </div>

                    {/* Estabilidade */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Estabilidade</label>
                        <span className="text-xs font-medium text-primary">{(form.voiceStability * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={form.voiceStability}
                        onChange={(e) => set("voiceStability", parseFloat(e.target.value))}
                        className="w-full accent-primary h-1.5 rounded-full cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Mais variável</span>
                        <span>Mais estável</span>
                      </div>
                    </div>

                    {/* Similaridade */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Similaridade</label>
                        <span className="text-xs font-medium text-primary">{(form.voiceSimilarity * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={form.voiceSimilarity}
                        onChange={(e) => set("voiceSimilarity", parseFloat(e.target.value))}
                        className="w-full accent-primary h-1.5 rounded-full cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Baixa</span>
                        <span>Alta</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === "avancado" && (
            <>
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                Deixe Provedor e Modelo em branco para usar a configuração global definida em Integrações.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Provedor (opcional)</label>
                  <CustomSelect
                    value={form.provider}
                    onChange={(v) => { set("provider", v); set("model", "") }}
                    options={[
                      { value: "", label: "Usar padrão global" },
                      { value: "openai", label: "OpenAI" },
                      { value: "anthropic", label: "Anthropic" },
                      { value: "gemini", label: "Google Gemini" },
                      { value: "grok", label: "xAI Grok" },
                      { value: "deepseek", label: "DeepSeek" },
                    ]}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Modelo (opcional)</label>
                  <CustomSelect
                    value={form.model}
                    onChange={(v) => set("model", v)}
                    options={[{ value: "", label: "Usar padrão global" }, ...modelOptions]}
                    placeholder="Usar padrão global"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Temperatura: {form.temperature}</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={form.temperature}
                    onChange={(e) => set("temperature", parseFloat(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Preciso (0)</span>
                    <span>Criativo (1)</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Máx. Tokens: {form.maxTokens}</label>
                  <input
                    type="range"
                    min="500"
                    max="4000"
                    step="100"
                    value={form.maxTokens}
                    onChange={(e) => set("maxTokens", parseInt(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>500</span>
                    <span>4000</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Threshold de Escalada: {form.escalateThreshold}
                </label>
                <p className="text-xs text-muted-foreground">
                  Score de sentimento abaixo do qual o agente escala para um humano. (-100 a 0)
                </p>
                <input
                  type="range"
                  min="-100"
                  max="0"
                  step="5"
                  value={form.escalateThreshold}
                  onChange={(e) => set("escalateThreshold", parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Escalar sempre (-100)</span>
                  <span>Nunca escalar (0)</span>
                </div>
              </div>
            </>
          )}

          {activeTab === "aprendizado" && (
            <>
              {/* Seção 1 — Política de Aprendizado */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Política de Aprendizado</label>
                <p className="text-xs text-muted-foreground">Define como o agente aprende com conversas encerradas</p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    {
                      value: "disabled",
                      label: "Desativado",
                      desc: "Não aprende com conversas",
                      icon: <XCircle className="h-4 w-4 flex-shrink-0" />,
                    },
                    {
                      value: "manual",
                      label: "Manual",
                      desc: "Você revisa antes de indexar",
                      icon: <Eye className="h-4 w-4 flex-shrink-0" />,
                    },
                    {
                      value: "auto",
                      label: "Automático",
                      desc: "Aprende automaticamente ao fechar conversa",
                      icon: <Zap className="h-4 w-4 flex-shrink-0" />,
                    },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set("learningPolicy", opt.value)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                        form.learningPolicy === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className={cn(
                        "transition-colors",
                        form.learningPolicy === opt.value ? "text-primary" : "text-muted-foreground"
                      )}>
                        {opt.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                      <div className={cn(
                        "ml-auto h-4 w-4 flex-shrink-0 rounded-full border-2 transition-colors",
                        form.learningPolicy === opt.value ? "border-primary bg-primary" : "border-muted-foreground"
                      )} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Seção 2 — Estatísticas */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Estatísticas de Conhecimento</label>
                {!editAgent ? (
                  <p className="text-xs text-muted-foreground">Salve o agente para visualizar estatísticas.</p>
                ) : statsLoading ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-16 rounded-lg border border-border bg-muted/30 animate-pulse" />
                    ))}
                  </div>
                ) : learnStats ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Documentos", value: learnStats.totalFiles },
                      { label: "Chunks", value: learnStats.totalChunks },
                      { label: "Conversas indexadas", value: learnStats.totalConversations },
                      { label: "Aguardando revisão", value: learnStats.pendingReview, highlight: learnStats.pendingReview > 0 },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className={cn(
                          "rounded-lg border px-4 py-3",
                          stat.highlight
                            ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
                            : "border-border bg-muted/30"
                        )}
                      >
                        <p className={cn(
                          "text-xl font-bold",
                          stat.highlight ? "text-amber-600 dark:text-amber-400" : ""
                        )}>
                          {stat.value}
                        </p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => editAgent && loadLearnStats(editAgent.id)}
                    className="text-xs text-primary hover:underline"
                  >
                    Carregar estatísticas
                  </button>
                )}
              </div>

              {/* Seção 3 — Fila de Revisão */}
              {form.learningPolicy === "manual" && pendingItems.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Aguardando Revisão</label>
                  <div className="space-y-2">
                    {pendingItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3"
                      >
                        <BrainCircuit className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">{item.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            type="button"
                            title="Aprovar"
                            onClick={async () => {
                              if (!editAgent) return
                              const res = await fetch(
                                `/api/agents/${editAgent.id}/knowledge/${item.id}/review`,
                                {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ action: "approve" }),
                                }
                              )
                              const data = await res.json()
                              if (data.success) {
                                setPendingItems((prev) => prev.filter((p) => p.id !== item.id))
                                setLearnStats((prev) =>
                                  prev
                                    ? { ...prev, pendingReview: prev.pendingReview - 1, totalConversations: prev.totalConversations + 1 }
                                    : prev
                                )
                                toast({ title: "Conversa aprovada e indexada" })
                              } else {
                                toast({ variant: "destructive", title: data.error || "Erro ao aprovar" })
                              }
                            }}
                            className="rounded-md p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Rejeitar"
                            onClick={async () => {
                              if (!editAgent) return
                              const res = await fetch(
                                `/api/agents/${editAgent.id}/knowledge/${item.id}/review`,
                                {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ action: "reject" }),
                                }
                              )
                              const data = await res.json()
                              if (data.success) {
                                setPendingItems((prev) => prev.filter((p) => p.id !== item.id))
                                setLearnStats((prev) =>
                                  prev ? { ...prev, pendingReview: prev.pendingReview - 1 } : prev
                                )
                                toast({ title: "Conversa rejeitada" })
                              } else {
                                toast({ variant: "destructive", title: data.error || "Erro ao rejeitar" })
                              }
                            }}
                            className="rounded-md p-1.5 text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {editAgent ? "Salvar Alterações" : "Criar Agente"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Página Principal ───────────────────────────────────────────────────────────

export default function AgentesPage() {
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === "super_admin" || user?.role === "admin"

  const [agents, setAgents] = useState<Agent[]>([])
  const [connections, setConnections] = useState<WaConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editAgent, setEditAgent] = useState<Agent | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [knowledgeAgent, setKnowledgeAgent] = useState<Agent | null>(null)

  const loadAgents = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/agents")
      const data = await res.json()
      if (data.success) setAgents(data.data.agents)
    } catch {
      toast({ variant: "destructive", title: "Erro ao carregar agentes" })
    } finally {
      setLoading(false)
    }
  }

  const loadConnections = async () => {
    try {
      const res = await fetch("/api/whatsapp/connections")
      const data = await res.json()
      if (data.success) setConnections(data.data.connections || [])
    } catch {
      // silencioso
    }
  }

  useEffect(() => {
    loadAgents()
    loadConnections()
  }, [])

  const handleToggle = async (agent: Agent) => {
    setToggling(agent.id)
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !agent.isActive }),
      })
      const data = await res.json()
      if (data.success) {
        setAgents((prev) => prev.map((a) => a.id === agent.id ? { ...a, isActive: !a.isActive } : a))
        toast({ title: agent.isActive ? "Agente desativado" : "Agente ativado" })
      }
    } catch {
      toast({ variant: "destructive", title: "Erro ao alterar status" })
    } finally {
      setToggling(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/agents/${deleteId}`, { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Agente excluído" })
        setAgents((prev) => prev.filter((a) => a.id !== deleteId))
        setDeleteId(null)
      } else {
        toast({ variant: "destructive", title: data.error || "Erro ao excluir" })
      }
    } catch {
      toast({ variant: "destructive", title: "Erro ao excluir agente" })
    } finally {
      setDeleting(false)
    }
  }

  const openEdit = (agent: Agent) => {
    setEditAgent(agent)
    setModalOpen(true)
  }

  const openCreate = () => {
    setEditAgent(null)
    setModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agentes IA</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure agentes inteligentes para atendimento autônomo e assistido via WhatsApp
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Agente
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{agents.length}</p>
              <p className="text-xs text-muted-foreground">Total de Agentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{agents.filter((a) => a.isActive).length}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{connections.length}</p>
              <p className="text-xs text-muted-foreground">Conexões Disponíveis</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Bot className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium">Nenhum agente criado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Crie seu primeiro agente IA para automatizar o atendimento via WhatsApp
              </p>
            </div>
            {isAdmin && (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Agente
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {agents.map((agent) => {
            const modeInfo = MODE_LABELS[agent.mode] || MODE_LABELS.assisted
            const ModeIcon = modeInfo.icon
            const connIds: string[] = (() => { try { return JSON.parse(agent.connectionIds) } catch { return [] } })()
            const connNames = connIds
              .map((id) => connections.find((c) => c.id === id)?.name)
              .filter(Boolean)

            return (
              <Card key={agent.id} className={cn("transition-opacity", !agent.isActive && "opacity-60")}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    {/* Avatar + Info */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={cn(
                        "flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full overflow-hidden border-2",
                        agent.isActive ? "border-primary/30" : "border-border"
                      )}>
                        {(agent as any).avatarUrl ? (
                          <img src={(agent as any).avatarUrl} alt={agent.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className={cn("flex h-full w-full items-center justify-center", agent.isActive ? "bg-primary/10" : "bg-muted")}>
                            <Bot className={cn("h-4 w-4", agent.isActive ? "text-primary" : "text-muted-foreground")} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">{agent.name}</h3>
                          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium flex items-center gap-1", modeInfo.color)}>
                            <ModeIcon className="h-3 w-3" />
                            {modeInfo.label}
                          </span>
                        </div>
                        {agent.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{agent.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Ações */}
                    {isAdmin && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleToggle(agent)}
                          disabled={toggling === agent.id}
                          title={agent.isActive ? "Desativar" : "Ativar"}
                          className="rounded-md p-1.5 hover:bg-accent transition-colors"
                        >
                          {toggling === agent.id
                            ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            : agent.isActive
                              ? <Power className="h-4 w-4 text-green-500" />
                              : <PowerOff className="h-4 w-4 text-muted-foreground" />
                          }
                        </button>
                        <button
                          onClick={() => setKnowledgeAgent(agent)}
                          title="Base de conhecimento"
                          className="rounded-md p-1.5 hover:bg-accent transition-colors"
                        >
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => openEdit(agent)}
                          className="rounded-md p-1.5 hover:bg-accent transition-colors"
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => setDeleteId(agent.id)}
                          className="rounded-md p-1.5 hover:bg-accent transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Detalhes */}
                  <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    {/* Tom */}
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Tom</p>
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-violet-500" />
                        <span className="font-medium truncate">{TONE_LABELS[agent.tone] || agent.tone || "—"}</span>
                      </div>
                    </div>
                    {/* Provedor */}
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Provedor</p>
                      <div className="flex items-center gap-1.5">
                        <Cpu className="h-3.5 w-3.5 text-sky-500" />
                        <span className="font-medium capitalize">{agent.provider || "Global"}</span>
                      </div>
                    </div>
                    {/* Modo de Operação */}
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Modo</p>
                      <div className="flex items-center gap-1.5">
                        {(() => {
                          const mode = agent.mode || "autonomous";
                          const modeInfo = MODE_LABELS[mode] || MODE_LABELS.autonomous;
                          const ModeIcon = modeInfo.icon;
                          const iconColor = mode === "autonomous" ? "text-green-500" : mode === "assisted" ? "text-blue-500" : "text-purple-500";
                          return (
                            <>
                              <ModeIcon className={cn("h-3.5 w-3.5", iconColor)} />
                              <span className="font-medium">{modeInfo.label}</span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    {/* Voz */}
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Voz</p>
                      <div className="flex items-center gap-1.5">
                        {agent.voiceEnabled ? (
                          <>
                            <Mic2 className="h-3.5 w-3.5 text-green-500" />
                            <span className="font-medium text-green-600 dark:text-green-400">Ativa</span>
                          </>
                        ) : (
                          <>
                            <MicOff className="h-3.5 w-3.5 text-rose-400" />
                            <span className="font-medium text-muted-foreground">Desativada</span>
                          </>
                        )}
                      </div>
                    </div>
                    {/* Base RAG */}
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Base RAG</p>
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-orange-500" />
                        <span className="font-medium">{agent._count?.knowledgeFiles ?? 0} {agent._count?.knowledgeFiles === 1 ? "arquivo" : "arquivos"}</span>
                      </div>
                    </div>
                    {/* Aprendizado */}
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Aprendizado</p>
                      <div className="flex items-center gap-1.5">
                        {agent.learningPolicy === "auto" && <><Zap className="h-3.5 w-3.5 text-amber-500" /><span className="font-medium text-amber-600 dark:text-amber-400">Automático</span></>}
                        {agent.learningPolicy === "manual" && <><Eye className="h-3.5 w-3.5 text-blue-500" /><span className="font-medium text-blue-600 dark:text-blue-400">Manual</span></>}
                        {(agent.learningPolicy === "disabled" || !agent.learningPolicy) && <><XCircle className="h-3.5 w-3.5 text-rose-400" /><span className="font-medium text-muted-foreground">Desativado</span></>}
                      </div>
                    </div>
                  </div>

                  {/* Conexões associadas */}
                  {connNames.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {connNames.map((name) => (
                        <span key={name} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          {name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Prompt preview */}
                  {agent.systemPrompt && (
                    <p className="mt-3 text-xs text-muted-foreground line-clamp-2 italic border-t pt-3">
                      &ldquo;{agent.systemPrompt.slice(0, 120)}{agent.systemPrompt.length > 120 ? "…" : ""}&rdquo;
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal criar/editar */}
      <AgentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={loadAgents}
        editAgent={editAgent}
        connections={connections}
      />

      {/* Painel Base de Conhecimento */}
      {knowledgeAgent && (
        <KnowledgePanel
          agent={knowledgeAgent}
          onClose={() => { setKnowledgeAgent(null); loadAgents() }}
        />
      )}

      {/* Modal confirmar exclusão */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setDeleteId(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold">Excluir agente?</h3>
                <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>Cancelar</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

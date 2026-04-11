"use client"

import React, { useState, useEffect, useCallback, DragEvent } from "react"
import { GripVertical, User, X, Eye, Edit, Phone, Mail, Building2, Star, Flame, Thermometer, Snowflake, Loader2, AlertTriangle, Webhook } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { getInitials } from "@/lib/utils"
import { LifecycleBadge } from "@/components/ui/lifecycle-badge"
import { createPortal } from "react-dom"
import { TooltipProvider, TooltipRoot, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

function Tip({ label, children, side = "top" }: { label: string; children: React.ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <TooltipProvider delayDuration={400}>
      <TooltipRoot>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side}>{label}</TooltipContent>
      </TooltipRoot>
    </TooltipProvider>
  )
}

interface KanbanTag {
  id: string
  name: string
  colorHex: string
  source: string
}

interface KanbanLead {
  id: string
  name: string
  email: string | null
  phone: string | null
  score: number
  companyName: string | null
  lifecycleStage?: string | null
  qualificationLevel?: string | null
  status?: string | null
  source?: string | null
  profilePicUrl?: string | null
  createdAt?: string
  lastInteraction?: string | null
  updatedAt?: string
  tags: KanbanTag[]
  assignedTo: { id: string; name: string; avatarUrl: string | null } | null
}

const QUALIFICATION_LABELS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  quente:           { label: "Quente",          color: "text-red-500 bg-red-500/10 border-red-500/30",        icon: Flame },
  morno:            { label: "Morno",            color: "text-amber-500 bg-amber-500/10 border-amber-500/30",  icon: Thermometer },
  frio:             { label: "Frio",             color: "text-blue-400 bg-blue-400/10 border-blue-400/30",    icon: Snowflake },
  nao_qualificado:  { label: "Não qualificado",  color: "text-muted-foreground bg-muted border-border",       icon: Star },
}

const STATUS_LABELS: Record<string, string> = {
  novo: "Novo", contatado: "Contatado", qualificado: "Qualificado",
  em_negociacao: "Em negociação", proposta_enviada: "Proposta enviada",
  fechado_ganho: "Fechado ganho", fechado_perdido: "Fechado perdido",
}

const SOURCE_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp", website: "Website", indicacao: "Indicação",
  telefone: "Telefone", email: "Email", rede_social: "Rede social",
  evento: "Evento", outro: "Outro",
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("pt-BR")
}

function formatRelativeDate(dateStr?: string | null): string {
  if (!dateStr) return "—"
  const date = new Date(dateStr)
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "agora"
  if (mins < 60) return `${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  const days = Math.floor(hrs / 24)
  if (days < 2) return `${days}d ${time}`
  return `${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${time}`
}

function LeadAvatar({ lead, size = "md" }: { lead: KanbanLead; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-9 w-9 text-[10px]", md: "h-10 w-10 text-xs", lg: "h-14 w-14 text-sm" }
  const cls = sizes[size]
  if (lead.profilePicUrl) {
    return <img src={lead.profilePicUrl} alt={lead.name} className={`${cls} rounded-full object-cover flex-shrink-0 border-2 border-primary/30`} />
  }
  return (
    <div className={`${cls} rounded-full bg-primary/15 flex items-center justify-center font-bold text-primary flex-shrink-0 border-2 border-primary/40`}>
      {getInitials(lead.name)}
    </div>
  )
}

function LeadDetailModal({ lead, onClose, onUpdated }: { lead: KanbanLead; onClose: () => void; onUpdated?: () => void }) {
  const { toast } = useToast()
  const [tab, setTab] = useState<"info" | "edit">("info")
  const [saving, setSaving] = useState(false)
  const [converting, setConverting] = useState(false)
  const [hasWebhook, setHasWebhook] = useState<boolean | null>(null)
  const qual = QUALIFICATION_LABELS[lead.qualificationLevel ?? "nao_qualificado"] ?? QUALIFICATION_LABELS.nao_qualificado

  const [form, setForm] = useState({
    name: lead.name ?? "",
    companyName: lead.companyName ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    status: lead.status ?? "novo",
    source: lead.source ?? "whatsapp",
    qualificationLevel: lead.qualificationLevel ?? "nao_qualificado",
    score: String(lead.score ?? 0),
  })

  const field = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  useEffect(() => {
    fetch("/api/webhooks")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const active = data.data.filter((w: { isActive: boolean; events: string[] }) =>
            w.isActive && (w.events.includes("lead.converted") || w.events.includes("*"))
          )
          setHasWebhook(active.length > 0)
        } else {
          setHasWebhook(false)
        }
      })
      .catch(() => setHasWebhook(false))
  }, [])

  async function handleConvert() {
    setConverting(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: `${lead.name} convertido em cliente!` })
        onUpdated?.()
        onClose()
      } else {
        toast({ variant: "destructive", title: data.error?.message || "Erro ao converter" })
      }
    } catch {
      toast({ variant: "destructive", title: "Erro ao converter lead" })
    } finally {
      setConverting(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, score: Number(form.score) }),
      })
      if (!res.ok) throw new Error()
      toast({ title: "Lead atualizado com sucesso" })
      onUpdated?.()
      onClose()
    } catch {
      toast({ variant: "destructive", title: "Erro ao salvar alterações" })
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
  const selectCls = "flex h-10 w-full rounded-lg border border-input bg-muted px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
  const labelCls = "block text-sm font-medium mb-1.5"

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-card border border-border shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-lg font-semibold">Detalhes do Lead</h3>
            <p className="text-xs text-muted-foreground">Visualize e atualize as informações do contato selecionado.</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-accent transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex gap-2 px-6 pt-4">
          <button
            onClick={() => setTab("info")}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${tab === "info" ? "bg-primary border-primary text-primary-foreground" : "border-border bg-muted/40 text-foreground hover:bg-muted"}`}
          >
            Informações
          </button>
          <button
            onClick={() => setTab("edit")}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${tab === "edit" ? "bg-primary border-primary text-primary-foreground" : "border-border bg-muted/40 text-foreground hover:bg-muted"}`}
          >
            Editar
          </button>
        </div>

        {/* Conteúdo */}
        {tab === "info" ? (
          <div className="p-6 space-y-5">
            {/* Avatar + Nome */}
            <div className="flex items-center gap-4">
              <LeadAvatar lead={lead} size="lg" />
              <div className="min-w-0">
                <p className="font-semibold text-lg leading-tight">{lead.name}</p>
                {lead.companyName && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Building2 className="h-3.5 w-3.5" />{lead.companyName}
                  </p>
                )}
                <div className="mt-1.5">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${qual.color}`}>
                    <qual.icon className="h-2.5 w-2.5" />{qual.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">E-mail</p>
                <p className="text-sm font-medium truncate flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />{lead.email || "—"}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Telefone</p>
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />{lead.phone || "—"}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Status</p>
                <p className="text-sm font-medium">{STATUS_LABELS[lead.status ?? ""] || lead.status || "—"}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Origem</p>
                <p className="text-sm font-medium">{SOURCE_LABELS[lead.source ?? ""] || lead.source || "—"}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Score</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${lead.score}%` }} />
                  </div>
                  <span className="text-sm font-mono font-bold">{lead.score}</span>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Criado em</p>
                <p className="text-sm font-medium">{formatDate(lead.createdAt)}</p>
              </div>
            </div>

            {lead.assignedTo && (
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Atribuído a</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-[9px] font-bold">
                    {getInitials(lead.assignedTo.name)}
                  </div>
                  <p className="text-sm font-medium">{lead.assignedTo.name}</p>
                </div>
              </div>
            )}

            {lead.tags.length > 0 && (
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {lead.tags.map((tag) => (
                    <span key={tag.id} className="rounded-full px-2 py-0.5 text-xs font-medium border"
                      style={{ backgroundColor: tag.colorHex + "22", color: tag.colorHex, borderColor: tag.colorHex + "44" }}>
                      {tag.source === "ai" && <span className="mr-0.5 opacity-70">✦</span>}{tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Nome <span className="text-destructive">*</span></label>
                <input className={inputCls} value={form.name} onChange={field("name")} />
              </div>
              <div>
                <label className={labelCls}>Empresa</label>
                <input className={inputCls} value={form.companyName} onChange={field("companyName")} />
              </div>
              <div>
                <label className={labelCls}>E-mail</label>
                <input className={inputCls} type="email" value={form.email} onChange={field("email")} />
              </div>
              <div>
                <label className={labelCls}>Telefone/WhatsApp</label>
                <input className={inputCls} value={form.phone} onChange={field("phone")} />
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select className={selectCls} value={form.status} onChange={field("status")}>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Origem</label>
                <select className={selectCls} value={form.source} onChange={field("source")}>
                  {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Nível de qualificação</label>
                <select className={selectCls} value={form.qualificationLevel} onChange={field("qualificationLevel")}>
                  <option value="quente">Quente</option>
                  <option value="morno">Morno</option>
                  <option value="frio">Frio</option>
                  <option value="nao_qualificado">Não qualificado</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Score</label>
                <input className={inputCls} type="number" min={0} max={100} value={form.score} onChange={field("score")} />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t">
          {tab === "info" ? (
            <>
              <div>
                {lead.lifecycleStage !== "cliente" && (
                  <div className="relative group inline-flex">
                    <Button
                      variant="outline"
                      className={`border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10 gap-2 ${
                        hasWebhook === false ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      onClick={() => hasWebhook !== false && handleConvert()}
                      disabled={converting}>
                      {converting
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Star className="h-4 w-4" />}
                      Converter para Cliente
                    </Button>
                    {hasWebhook === false && (
                      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-[200]">
                        <div className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white shadow-xl">
                          <p className="flex items-start gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                            <span>Nenhum webhook ativo. <a href="/webhooks" className="underline font-medium pointer-events-auto">Configurar</a> para enviar os dados ao CRM.</span>
                          </p>
                        </div>
                        <div className="mx-auto w-2.5 h-2.5 bg-zinc-900 border-r border-b border-zinc-700 rotate-45 -mt-[5px]" />
                      </div>
                    )}
                  </div>
                )}
                {lead.lifecycleStage === "cliente" && (
                  <div className="flex items-center gap-2">
                    <LifecycleBadge stage="cliente" />
                    <select
                      defaultValue=""
                      className="text-[11px] bg-transparent border border-border rounded px-1.5 py-0.5 text-muted-foreground cursor-pointer hover:border-destructive transition-colors"
                      onChange={async (e) => {
                        const stage = e.target.value
                        if (!stage) return
                        await fetch(`/api/leads/${lead.id}/lifecycle`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ lifecycleStage: stage, notes: "Conversão revertida manualmente" }),
                        })
                        toast({ title: "Estágio atualizado" })
                        onUpdated?.()
                        onClose()
                      }}>
                      <option value="" disabled>Reverter para...</option>
                      <option value="prospect">Prospect</option>
                      <option value="lead_qualificado">Lead Qualificado</option>
                      <option value="oportunidade">Oportunidade</option>
                      <option value="pos_venda">Pós-venda</option>
                      <option value="churned">Inativo</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={onClose} className="rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Fechar</button>
                <button onClick={() => setTab("edit")} className="rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2">
                  <Edit className="h-4 w-4" />Editar
                </button>
              </div>
            </>
          ) : (
            <>
              <button onClick={() => setTab("info")} disabled={saving} className="rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50">Cancelar</button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar alterações
              </Button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

interface PipelineStage {
  id: string
  name: string
  color: string
  order: number
  leads: KanbanLead[]
  _count: { leads: number }
}

export default function KanbanPage() {
  const { toast } = useToast()
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [draggedLead, setDraggedLead] = useState<{ lead: KanbanLead; fromStageId: string } | null>(null)
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null)
  const [detailLead, setDetailLead] = useState<KanbanLead | null>(null)

  const fetchPipeline = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/pipeline")
      const data = await res.json()
      if (data.success) {
        setStages(data.data.stages)
      }
    } catch {
      toast({ variant: "destructive", title: "Erro ao carregar pipeline" })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchPipeline()
  }, [fetchPipeline])

  const handleDragStart = (e: DragEvent, lead: KanbanLead, stageId: string) => {
    setDraggedLead({ lead, fromStageId: stageId })
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", lead.id)
  }

  const handleDragOver = (e: DragEvent, stageId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverStageId(stageId)
  }

  const handleDragLeave = () => {
    setDragOverStageId(null)
  }

  const handleDrop = async (e: DragEvent, toStageId: string) => {
    e.preventDefault()
    setDragOverStageId(null)

    if (!draggedLead || draggedLead.fromStageId === toStageId) {
      setDraggedLead(null)
      return
    }

    const { lead, fromStageId } = draggedLead

    // Atualização otimista
    setStages((prev) =>
      prev.map((stage) => {
        if (stage.id === fromStageId) {
          return {
            ...stage,
            leads: stage.leads.filter((l) => l.id !== lead.id),
            _count: { leads: stage._count.leads - 1 },
          }
        }
        if (stage.id === toStageId) {
          return {
            ...stage,
            leads: [...stage.leads, lead],
            _count: { leads: stage._count.leads + 1 },
          }
        }
        return stage
      })
    )

    setDraggedLead(null)

    try {
      const res = await fetch(`/api/leads/${lead.id}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: toStageId }),
      })
      const data = await res.json()
      if (!data.success) {
        toast({ variant: "destructive", title: "Erro ao mover lead" })
        fetchPipeline()
      } else if (data.requiresConversionConfirm) {
        // Conversão manual: exibe toast com ação de confirmar
        toast({
          title: `${lead.name} fechou negócio!`,
          description: "Deseja converter para Cliente?",
          action: (
            <button
              className="rounded bg-[#5fb642] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#4fa535]"
              onClick={async () => {
                await fetch(`/api/leads/${lead.id}/convert`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
                fetchPipeline()
              }}
            >
              Converter
            </button>
          ),
        })
      }
    } catch {
      toast({ variant: "destructive", title: "Erro ao mover lead" })
      fetchPipeline()
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-8 w-32 mb-2" /><Skeleton className="h-4 w-64" /></div>
        <div className="flex gap-4 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="min-w-[300px] rounded-lg border bg-muted/20">
              <div className="flex items-center gap-2 border-b p-3">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-8 rounded-full ml-auto" />
              </div>
              <div className="space-y-2 p-2">
                {[...Array(3)].map((_, j) => (
                  <Card key={j}><CardContent className="p-3"><Skeleton className="h-5 w-28 mb-1" /><Skeleton className="h-3 w-20" /><Skeleton className="h-2 w-16 mt-2" /></CardContent></Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h3 font-bold" data-testid="heading-kanban">Kanban</h1>
        <p className="text-muted-foreground">
          Arraste os leads entre os estágios do pipeline
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 250px)" }}>
        {stages.map((stage) => (
          <div
            key={stage.id}
            className={`min-w-[300px] max-w-[300px] flex-shrink-0 rounded-lg border transition-colors ${
              dragOverStageId === stage.id ? "border-primary bg-primary/5" : "bg-muted/20"
            }`}
            onDragOver={(e) => handleDragOver(e, stage.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage.id)}
            data-testid={`kanban-column-${stage.id}`}
          >
            {/* Header do estágio */}
            <div className="flex items-center gap-2 border-b p-3">
              <div
                className="h-3 w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: stage.color }}
              />
              <h3 className="text-sm font-semibold flex-1 truncate">{stage.name}</h3>
              <span className="flex-shrink-0 text-xs text-muted-foreground rounded-full bg-muted px-2 py-0.5">
                {stage._count.leads}
              </span>
            </div>

            {/* Cards dos leads */}
            <div className="space-y-2 p-2 min-h-[200px]">
              {stage.leads.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
                  Arraste leads aqui
                </div>
              ) : (
                stage.leads.map((lead) => {
                  const qual = QUALIFICATION_LABELS[lead.qualificationLevel ?? "nao_qualificado"] ?? QUALIFICATION_LABELS.nao_qualificado
                  return (
                    <Card
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead, stage.id)}
                      className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group"
                      data-testid={`kanban-card-${lead.id}`}
                    >
                      <CardContent className="p-3">
                        {/* Linha superior: grip + avatar + nome + botão */}
                        <div className="flex items-start gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <LeadAvatar lead={lead} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className="font-semibold text-sm truncate leading-tight">{lead.name}</p>
                              <Tip label="Ver detalhes">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDetailLead(lead) }}
                                  className="flex-shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                              </Tip>
                            </div>
                            {lead.companyName && (
                              <p className="text-xs text-muted-foreground truncate">{lead.companyName}</p>
                            )}
                          </div>
                        </div>

                        {/* Qualificação + Tags na mesma linha */}
                        <div className="flex items-center gap-1 flex-wrap mt-2 ml-6">
                          <span className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${qual.color}`}>
                            <qual.icon className="h-2 w-2" />{qual.label}
                          </span>
                          {lead.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag.id}
                              className="rounded-full px-2 py-0.5 text-[10px] font-medium border"
                              style={{ backgroundColor: tag.colorHex + "22", color: tag.colorHex, borderColor: tag.colorHex + "55" }}
                              title={tag.source === "ai" ? "Aplicada por IA" : "Aplicada manualmente"}
                            >
                              {tag.source === "ai" && <span className="mr-0.5 opacity-70">✦</span>}
                              {tag.name}
                            </span>
                          ))}
                          {lead.tags.length > 2 && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground border border-border">+{lead.tags.length - 2}</span>
                          )}
                        </div>

                        {/* Score + Sentimento + Data última conversa */}
                        {(() => {
                          const s = lead.score
                          const sentiment = s >= 70 ? "positivo" : s >= 40 ? "neutro" : "negativo"
                          const sentimentLabel = s >= 70 ? "Sentimento positivo" : s >= 40 ? "Sentimento neutro" : "Sentimento negativo"
                          const pingColor = sentiment === "positivo" ? "bg-emerald-400" : sentiment === "negativo" ? "bg-red-400" : "bg-zinc-400"
                          const dotColor = sentiment === "positivo" ? "bg-emerald-400" : sentiment === "negativo" ? "bg-red-400" : "bg-zinc-400"
                          return (
                            <div className="flex items-center justify-between mt-2 ml-6">
                              <div className="flex items-center gap-1.5">
                                <div className="h-1.5 w-14 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full rounded-full bg-primary" style={{ width: `${lead.score}%` }} />
                                </div>
                                <span className="text-[10px] font-mono text-muted-foreground">{lead.score}</span>
                                <Tip label={sentimentLabel} side="top">
                                  <span className="relative flex h-2 w-2 flex-shrink-0 cursor-default">
                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${pingColor}`} />
                                    <span className={`relative inline-flex h-2 w-2 rounded-full ${dotColor}`} />
                                  </span>
                                </Tip>
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {formatRelativeDate(lead.lastInteraction ?? lead.updatedAt)}
                              </span>
                            </div>
                          )
                        })()}
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal de detalhes */}
      {detailLead && <LeadDetailModal lead={detailLead} onClose={() => setDetailLead(null)} onUpdated={fetchPipeline} />}
    </div>
  )
}

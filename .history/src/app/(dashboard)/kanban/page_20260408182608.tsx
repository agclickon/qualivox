"use client"

import React, { useState, useEffect, useCallback, DragEvent } from "react"
import { GripVertical, User, X, Eye, Edit, Phone, Mail, Building2, Star, Flame, Thermometer, Snowflake } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { getInitials } from "@/lib/utils"
import { LifecycleBadge } from "@/components/ui/lifecycle-badge"
import { createPortal } from "react-dom"

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

function LeadDetailModal({ lead, onClose }: { lead: KanbanLead; onClose: () => void }) {
  const qual = QUALIFICATION_LABELS[lead.qualificationLevel ?? "nao_qualificado"] ?? QUALIFICATION_LABELS.nao_qualificado
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-card border border-border shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-lg font-semibold">Detalhes do Lead</h3>
            <p className="text-xs text-muted-foreground">Visualize as informações do contato</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-accent transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

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

          {/* Grid de dados */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">E-mail</p>
              <p className="text-sm font-medium truncate flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                {lead.email || "—"}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Telefone</p>
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                {lead.phone || "—"}
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

          {/* Atribuído */}
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

          {/* Tags */}
          {lead.tags.length > 0 && (
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {lead.tags.map((tag) => (
                  <span key={tag.id} className="rounded-md px-2 py-0.5 text-xs font-medium border"
                    style={{ backgroundColor: tag.colorHex + "22", color: tag.colorHex, borderColor: tag.colorHex + "44" }}>
                    {tag.source === "ai" && <span className="mr-0.5 opacity-70">✦</span>}{tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button asChild>
            <a href={`/leads?id=${lead.id}`}>
              <Edit className="mr-2 h-4 w-4" />Editar
            </a>
          </Button>
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
                              <button
                                onClick={(e) => { e.stopPropagation(); setDetailLead(lead) }}
                                className="flex-shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                title="Ver detalhes"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
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
                          {lead.lifecycleStage && lead.lifecycleStage !== "prospect" && (
                            <LifecycleBadge stage={lead.lifecycleStage} />
                          )}
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

                        {/* Score + Data última conversa */}
                        <div className="flex items-center justify-between mt-2 ml-6">
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-14 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${lead.score}%` }} />
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground">{lead.score}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground" title="Última interação">
                            {formatRelativeDate(lead.lastInteraction ?? lead.updatedAt)}
                          </span>
                        </div>
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
      {detailLead && <LeadDetailModal lead={detailLead} onClose={() => setDetailLead(null)} />}
    </div>
  )
}

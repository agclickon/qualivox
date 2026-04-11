"use client"

import { useState, useEffect, useCallback, DragEvent } from "react"
import { Loader2, GripVertical, User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { getInitials } from "@/lib/utils"
import { LifecycleBadge } from "@/components/ui/lifecycle-badge"

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
  tags: KanbanTag[]
  assignedTo: { id: string; name: string; avatarUrl: string | null } | null
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
                stage.leads.map((lead) => (
                  <Card
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead, stage.id)}
                    className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                    data-testid={`kanban-card-${lead.id}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-medium text-sm truncate">{lead.name}</p>
                            {lead.lifecycleStage && lead.lifecycleStage !== "prospect" && (
                              <LifecycleBadge stage={lead.lifecycleStage} />
                            )}
                          </div>
                          {lead.companyName && (
                            <p className="text-xs text-muted-foreground truncate">{lead.companyName}</p>
                          )}

                          <div className="flex items-center justify-between mt-2">
                            {/* Score */}
                            <div className="flex items-center gap-1.5">
                              <div className="h-1.5 w-10 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${lead.score}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground">{lead.score}</span>
                            </div>

                            {/* Atribuído */}
                            {lead.assignedTo ? (
                              <div
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[9px] font-bold text-secondary-foreground"
                                title={lead.assignedTo.name}
                              >
                                {getInitials(lead.assignedTo.name)}
                              </div>
                            ) : (
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                                <User className="h-3 w-3 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          {/* Tags */}
                          {lead.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {lead.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag.id}
                                  className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                                  style={{
                                    backgroundColor: tag.colorHex + "33",
                                    color: tag.colorHex,
                                    border: `1px solid ${tag.colorHex}55`,
                                  }}
                                  title={tag.source === "ai" ? "Aplicada por IA" : "Aplicada manualmente"}
                                >
                                  {tag.source === "ai" && <span className="mr-0.5 opacity-70">✦</span>}
                                  {tag.name}
                                </span>
                              ))}
                              {lead.tags.length > 3 && (
                                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                  +{lead.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Workflow, Loader2, Zap, ZapOff, Play, Activity, AlertCircle, CheckCircle2, Trash2, AlertTriangle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Portal } from "@/components/ui/portal"
import { useToast } from "@/hooks/use-toast"

interface Automation {
  id: string
  name: string
  description: string | null
  trigger: string
  actions: string
  isActive: boolean
  createdAt: string
  _count: { logs: number }
}

export default function AutomacoesPage() {
  const { toast } = useToast()
  const [automations, setAutomations] = useState<Automation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newTriggerEvent, setNewTriggerEvent] = useState("lead.created")
  const [newActions, setNewActions] = useState<{ type: string; templateName?: string; message?: string; status?: string; path?: string }[]>([])

  const triggerOptions = [
    { value: "lead.created", label: "Quando lead é criado" },
    { value: "lead.qualified", label: "Quando lead é qualificado" },
    { value: "lead.no_response", label: "Quando lead não responde" },
    { value: "lead.inactive", label: "Quando lead fica inativo" },
  ]

  const actionTypeOptions = [
    { value: "notify_team", label: "Notificar equipe" },
    { value: "send_template", label: "Enviar template" },
    { value: "assign_lead", label: "Atribuir lead" },
    { value: "change_status", label: "Mudar status" },
    { value: "n8n_webhook", label: "Enviar para N8N" },
    { value: "webhook", label: "Webhook genérico" },
  ]

  const addAction = () => {
    setNewActions([...newActions, { type: "notify_team", message: "" }])
  }

  const removeAction = (index: number) => {
    setNewActions(newActions.filter((_, i) => i !== index))
  }

  const updateAction = (index: number, field: string, value: string) => {
    const updated = [...newActions]
    updated[index] = { ...updated[index], [field]: value }
    setNewActions(updated)
  }

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast({ variant: "destructive", title: "Nome é obrigatório" })
      return
    }
    if (newActions.length === 0) {
      toast({ variant: "destructive", title: "Adicione pelo menos uma ação" })
      return
    }
    setCreating(true)
    try {
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || null,
          trigger: JSON.stringify({ event: newTriggerEvent }),
          actions: JSON.stringify(newActions),
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Automação criada com sucesso!" })
        setShowCreate(false)
        setNewName("")
        setNewDescription("")
        setNewTriggerEvent("lead.created")
        setNewActions([])
        fetchAutomations()
      } else {
        toast({ variant: "destructive", title: "Erro ao criar automação" })
      }
    } catch {
      toast({ variant: "destructive", title: "Erro ao criar automação" })
    } finally {
      setCreating(false)
    }
  }

  const fetchAutomations = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/automations")
      const data = await res.json()
      if (data.success) {
        setAutomations(data.data.automations)
      }
    } catch (err) {
      console.error("Erro ao carregar automações:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchAutomations() }, [])

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/automations/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Automação excluída com sucesso" })
        fetchAutomations()
      } else {
        toast({ variant: "destructive", title: "Erro ao excluir automação" })
      }
    } catch {
      toast({ variant: "destructive", title: "Erro ao excluir automação" })
    } finally {
      setDeleteId(null)
    }
  }

  const parseTrigger = (t: string): string => {
    try {
      const obj = JSON.parse(t)
      const events: Record<string, string> = {
        "lead.created": "Quando lead é criado",
        "lead.no_response": "Quando lead não responde",
        "lead.qualified": "Quando lead é qualificado",
        "lead.inactive": "Quando lead fica inativo",
      }
      return events[obj.event] || obj.event || t
    } catch { return t }
  }

  const parseActions = (a: string): string[] => {
    try {
      const arr = JSON.parse(a)
      return arr.map((act: { type: string; templateName?: string; message?: string }) => {
        const types: Record<string, string> = {
          send_template: `Enviar template "${act.templateName || ""}"`,
          notify_team: `Notificar equipe: "${act.message || ""}"`,
          notify_user: `Notificar usuário`,
          create_task: "Criar tarefa",
          assign_lead: "Atribuir lead",
        }
        return types[act.type] || act.type
      })
    } catch { return [] }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-8 w-40 mb-2" /><Skeleton className="h-4 w-56" /></div>
          <Skeleton className="h-10 w-44" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (<Card key={i}><CardContent className="p-4 flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-lg" /><div><Skeleton className="h-7 w-10 mb-1" /><Skeleton className="h-3 w-24" /></div></CardContent></Card>))}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (<Card key={i}><CardContent className="p-5"><div className="flex items-start gap-3"><Skeleton className="h-8 w-8 rounded-full" /><div className="flex-1"><Skeleton className="h-5 w-40 mb-2" /><Skeleton className="h-3 w-64 mb-3" /><Skeleton className="h-4 w-48" /></div></div></CardContent></Card>))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h3 font-bold" data-testid="heading-automacoes">Automações</h1>
          <p className="text-muted-foreground">Configure automações e workflows</p>
        </div>
        <Button data-testid="button-new-automation" onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Automação
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2"><Workflow className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold">{automations.length}</p>
              <p className="text-xs text-muted-foreground">Total automações</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-2"><Zap className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold">{automations.filter(a => a.isActive).length}</p>
              <p className="text-xs text-muted-foreground">Ativas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2"><Activity className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold">{automations.reduce((sum, a) => sum + a._count.logs, 0)}</p>
              <p className="text-xs text-muted-foreground">Execuções totais</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Automations list */}
      <div className="space-y-4">
        {automations.map((auto) => (
          <Card key={auto.id} className={`transition-opacity ${!auto.isActive ? "opacity-60" : ""}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`mt-1 rounded-full p-1.5 ${auto.isActive ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
                    {auto.isActive ? <Zap className="h-4 w-4 text-green-600" /> : <ZapOff className="h-4 w-4 text-gray-400" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{auto.name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${auto.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800"}`}>
                        {auto.isActive ? "Ativa" : "Inativa"}
                      </span>
                    </div>
                    {auto.description && <p className="text-sm text-muted-foreground mt-1">{auto.description}</p>}

                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Play className="h-3.5 w-3.5 text-blue-500" />
                        <span className="font-medium">Gatilho:</span>
                        <span className="text-muted-foreground">{parseTrigger(auto.trigger)}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5" />
                        <span className="font-medium">Ações:</span>
                        <div className="flex flex-wrap gap-1">
                          {parseActions(auto.actions).map((action, i) => (
                            <span key={i} className="rounded bg-accent px-2 py-0.5 text-xs">{action}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4 flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1 text-muted-foreground text-sm">
                    <AlertCircle className="h-3 w-3" />
                    <span>{auto._count.logs} execuções</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(auto.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal Criar Automação */}
      {showCreate && (
        <Portal><div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Nova Automação</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Boas-vindas automático"
                  className="mt-1 flex h-10 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Descrição</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Ex: Envia mensagem quando lead é criado"
                  className="mt-1 flex h-10 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Gatilho *</label>
                <select
                  value={newTriggerEvent}
                  onChange={(e) => setNewTriggerEvent(e.target.value)}
                  className="mt-1 flex h-10 w-full rounded-md border border-[var(--border)] bg-card text-foreground px-3 py-2 text-sm"
                >
                  {triggerOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Ações *</label>
                  <Button variant="outline" size="sm" onClick={addAction}>
                    <Plus className="mr-1 h-3 w-3" /> Adicionar ação
                  </Button>
                </div>

                {newActions.length === 0 && (
                  <p className="text-sm text-muted-foreground border border-dashed rounded-md p-4 text-center">
                    Nenhuma ação adicionada. Clique em &quot;Adicionar ação&quot;.
                  </p>
                )}

                <div className="space-y-3">
                  {newActions.map((action, index) => (
                    <div key={index} className="rounded-md border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Ação {index + 1}</span>
                        <button onClick={() => removeAction(index)} className="text-destructive hover:text-destructive/80 text-xs">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <select
                        value={action.type}
                        onChange={(e) => updateAction(index, "type", e.target.value)}
                        className="flex h-9 w-full rounded-md border border-[var(--border)] bg-card text-foreground px-3 py-1.5 text-sm"
                      >
                        {actionTypeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>

                      {action.type === "notify_team" && (
                        <input
                          type="text"
                          placeholder="Mensagem da notificação"
                          value={action.message || ""}
                          onChange={(e) => updateAction(index, "message", e.target.value)}
                          className="flex h-9 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm"
                        />
                      )}
                      {action.type === "send_template" && (
                        <input
                          type="text"
                          placeholder="Nome do template"
                          value={action.templateName || ""}
                          onChange={(e) => updateAction(index, "templateName", e.target.value)}
                          className="flex h-9 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm"
                        />
                      )}
                      {action.type === "change_status" && (
                        <select
                          value={action.status || ""}
                          onChange={(e) => updateAction(index, "status", e.target.value)}
                          className="flex h-9 w-full rounded-md border border-[var(--border)] bg-card text-foreground px-3 py-1.5 text-sm"
                        >
                          <option value="">Selecione o status</option>
                          <option value="novo">Novo</option>
                          <option value="contatado">Contatado</option>
                          <option value="qualificado">Qualificado</option>
                          <option value="em_negociacao">Em Negociação</option>
                          <option value="proposta_enviada">Proposta Enviada</option>
                          <option value="fechado_ganho">Fechado (Ganho)</option>
                          <option value="fechado_perdido">Fechado (Perdido)</option>
                        </select>
                      )}
                      {action.type === "n8n_webhook" && (
                        <input
                          type="text"
                          placeholder="Path do webhook (ex: /webhook/leadflow)"
                          value={action.path || ""}
                          onChange={(e) => updateAction(index, "path", e.target.value)}
                          className="flex h-9 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm"
                        />
                      )}
                      {action.type === "webhook" && (
                        <input
                          type="text"
                          placeholder="URL do webhook (https://...)"
                          value={action.path || ""}
                          onChange={(e) => updateAction(index, "path", e.target.value)}
                          className="flex h-9 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowCreate(false); setNewActions([]); setNewName(""); setNewDescription("") }}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Criar Automação
              </Button>
            </div>
          </div>
        </div></Portal>
      )}

      {/* Modal Confirmar Exclusão */}
      {deleteId && (
        <Portal><div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-card p-6 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Excluir automação</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tem certeza que deseja excluir esta automação? Todos os logs de execução também serão removidos.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={() => handleDelete(deleteId)}>
                <Trash2 className="mr-2 h-4 w-4" />Excluir
              </Button>
            </div>
          </div>
        </div></Portal>
      )}
    </div>
  )
}

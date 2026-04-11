"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useConfirm } from "@/hooks/use-confirm"
import {
  Webhook, Plus, Trash, Loader2, ToggleLeft, ToggleRight,
  ChevronRight, CheckCircle, AlertCircle, RotateCcw, Send,
} from "lucide-react"

interface WebhookEndpoint {
  id: string
  name: string
  url: string
  events: string[]
  secret: string | null
  isActive: boolean
  created_at: string
}

interface WebhookDelivery {
  id: string
  event: string
  status: string
  status_code: number | null
  attempt: number
  created_at: string
  response_body: string | null
}

const WEBHOOK_EVENT_OPTIONS = [
  { value: "lead.converted", label: "lead.converted — Lead convertido em cliente" },
  { value: "*", label: "* — Todos os eventos" },
]

export default function WebhooksPage() {
  const { toast } = useToast()
  const { showConfirm, ConfirmDialogElement } = useConfirm()

  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [wName, setWName] = useState("")
  const [wUrl, setWUrl] = useState("")
  const [wSecret, setWSecret] = useState("")
  const [wEvents, setWEvents] = useState<string[]>(["lead.converted"])
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deliveries, setDeliveries] = useState<Record<string, WebhookDelivery[]>>({})
  const [deliveriesLoading, setDeliveriesLoading] = useState<Record<string, boolean>>({})
  const [retrying, setRetrying] = useState<string | null>(null)

  const loadWebhooks = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/webhooks")
      const data = await res.json()
      if (data.success) setWebhooks(data.data)
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  const loadDeliveries = async (webhookId: string) => {
    setDeliveriesLoading((p) => ({ ...p, [webhookId]: true }))
    try {
      const res = await fetch(`/api/webhooks/${webhookId}/deliveries`)
      const data = await res.json()
      if (data.success) setDeliveries((p) => ({ ...p, [webhookId]: data.data }))
    } catch { /* ignore */ } finally {
      setDeliveriesLoading((p) => ({ ...p, [webhookId]: false }))
    }
  }

  const handleCreate = async () => {
    if (!wUrl.startsWith("http")) { toast({ variant: "destructive", title: "URL inválida" }); return }
    setSaving(true)
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: wName, url: wUrl, secret: wSecret || null, events: wEvents }),
      })
      const data = await res.json()
      if (data.success) {
        await loadWebhooks()
        setFormOpen(false)
        setWName(""); setWUrl(""); setWSecret(""); setWEvents(["lead.converted"])
        toast({ title: "Webhook criado!" })
      } else {
        toast({ variant: "destructive", title: data.error?.message || "Erro ao criar" })
      }
    } catch { toast({ variant: "destructive", title: "Erro ao criar webhook" }) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!await showConfirm({
      title: "Excluir endpoint?",
      description: "O histórico de entregas também será removido.",
      variant: "danger",
      confirmLabel: "Excluir",
    })) return
    await fetch(`/api/webhooks/${id}`, { method: "DELETE" })
    setWebhooks((p) => p.filter((w) => w.id !== id))
    if (expandedId === id) setExpandedId(null)
    toast({ title: "Webhook removido" })
  }

  const handleToggle = async (w: WebhookEndpoint) => {
    await fetch(`/api/webhooks/${w.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !w.isActive }),
    })
    setWebhooks((p) => p.map((x) => x.id === w.id ? { ...x, isActive: !w.isActive } : x))
  }

  const handleExpand = (id: string) => {
    const next = expandedId === id ? null : id
    setExpandedId(next)
    if (next && !deliveries[next]) loadDeliveries(next)
  }

  const handleRetry = async (webhookId: string, deliveryId: string) => {
    setRetrying(deliveryId)
    try {
      const res = await fetch(`/api/webhooks/${webhookId}/deliveries/${deliveryId}/retry`, { method: "POST" })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Reenvio iniciado!" })
        setTimeout(() => loadDeliveries(webhookId), 1500)
      } else {
        toast({ variant: "destructive", title: data.error?.message || "Erro ao reenviar" })
      }
    } catch { toast({ variant: "destructive", title: "Erro ao reenviar" }) }
    finally { setRetrying(null) }
  }

  useEffect(() => { loadWebhooks() }, [])

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Webhook className="h-6 w-6 text-primary" />
            Webhooks
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Receba notificações HTTP em tempo real quando leads forem convertidos. Suporta assinatura HMAC-SHA256 e retry automático.
          </p>
        </div>
        <Button onClick={() => setFormOpen((v) => !v)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Novo endpoint
        </Button>
      </div>

      {/* Formulário de criação */}
      {formOpen && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Novo endpoint de webhook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome</Label>
                <Input placeholder="Ex: HubSpot CRM" value={wName} onChange={(e) => setWName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">URL do endpoint</Label>
                <Input placeholder="https://..." value={wUrl} onChange={(e) => setWUrl(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Secret (opcional — para assinatura HMAC)</Label>
                <Input placeholder="meu-secret-seguro" value={wSecret} onChange={(e) => setWSecret(e.target.value)} />
                <p className="text-[11px] text-muted-foreground">
                  Enviado no header <code className="bg-muted px-1 rounded">X-LeadFlow-Signature</code>
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Eventos</Label>
                <div className="space-y-1.5">
                  {WEBHOOK_EVENT_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wEvents.includes(opt.value)}
                        onChange={(e) => {
                          if (e.target.checked) setWEvents((p) => [...p, opt.value])
                          else setWEvents((p) => p.filter((v) => v !== opt.value))
                        }}
                        className="rounded border-border accent-primary"
                      />
                      <span className="text-xs font-mono">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={handleCreate} disabled={saving || !wUrl}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Criar endpoint
              </Button>
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de endpoints */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : webhooks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Webhook className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-base font-medium text-muted-foreground">Nenhum webhook configurado</p>
            <p className="text-sm text-muted-foreground">Clique em &quot;Novo endpoint&quot; para começar.</p>
            <Button variant="outline" onClick={() => setFormOpen(true)} className="mt-2 gap-1.5">
              <Plus className="h-4 w-4" /> Novo endpoint
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {webhooks.map((w) => (
            <Card key={w.id} className="overflow-hidden">
              {/* Header do endpoint */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{w.name || "Sem nome"}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${
                      w.isActive
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-muted text-muted-foreground border-border"
                    }`}>
                      {w.isActive ? "Ativo" : "Inativo"}
                    </span>
                    {w.events.map((ev) => (
                      <span key={ev} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {ev}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">{w.url}</p>
                  {w.secret && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Secret: <code className="bg-muted px-1 rounded">••••••••</code>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    title={w.isActive ? "Desativar" : "Ativar"}
                    onClick={() => handleToggle(w)}
                    className="p-2 rounded-lg hover:bg-muted transition-colors">
                    {w.isActive
                      ? <ToggleRight className="h-5 w-5 text-primary" />
                      : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                  </button>
                  <button
                    type="button"
                    title="Ver log de entregas"
                    onClick={() => handleExpand(w.id)}
                    className="p-2 rounded-lg hover:bg-muted transition-colors">
                    <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${expandedId === w.id ? "rotate-90" : ""}`} />
                  </button>
                  <button
                    type="button"
                    title="Excluir"
                    onClick={() => handleDelete(w.id)}
                    className="p-2 rounded-lg hover:bg-destructive/10 transition-colors">
                    <Trash className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              </div>

              {/* Painel de entregas */}
              {expandedId === w.id && (
                <div className="border-t border-border">
                  <div className="flex items-center justify-between px-5 py-3 bg-muted/30">
                    <p className="text-sm font-medium text-muted-foreground">Log de entregas (últimas 50)</p>
                    <button
                      type="button"
                      onClick={() => loadDeliveries(w.id)}
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                      <RotateCcw className="h-3 w-3" /> Atualizar
                    </button>
                  </div>

                  {deliveriesLoading[w.id] ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : !deliveries[w.id] || deliveries[w.id].length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-10">
                      Nenhuma entrega registrada ainda.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/20">
                            <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Evento</th>
                            <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                            <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Código HTTP</th>
                            <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Tentativa</th>
                            <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Data</th>
                            <th className="px-5 py-2.5" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {deliveries[w.id].map((d) => (
                            <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-5 py-3 font-mono text-xs">{d.event}</td>
                              <td className="px-5 py-3">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                                  d.status === "success"
                                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                    : d.status === "failed"
                                    ? "bg-destructive/10 text-destructive border border-destructive/20"
                                    : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                }`}>
                                  {d.status === "success"
                                    ? <CheckCircle className="h-3 w-3" />
                                    : d.status === "failed"
                                    ? <AlertCircle className="h-3 w-3" />
                                    : <Loader2 className="h-3 w-3 animate-spin" />}
                                  {d.status === "success" ? "Sucesso" : d.status === "failed" ? "Falha" : "Pendente"}
                                </span>
                              </td>
                              <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                                {d.status_code ?? "—"}
                              </td>
                              <td className="px-5 py-3 text-xs text-muted-foreground">{d.attempt}ª tentativa</td>
                              <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(d.created_at).toLocaleString("pt-BR", {
                                  day: "2-digit", month: "2-digit", year: "2-digit",
                                  hour: "2-digit", minute: "2-digit",
                                })}
                              </td>
                              <td className="px-5 py-3">
                                {d.status === "failed" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1.5"
                                    disabled={retrying === d.id}
                                    onClick={() => handleRetry(w.id, d.id)}>
                                    {retrying === d.id
                                      ? <Loader2 className="h-3 w-3 animate-spin" />
                                      : <RotateCcw className="h-3 w-3" />}
                                    Reenviar
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Info técnica */}
                  <div className="px-5 py-3 border-t border-border/50 bg-muted/10">
                    <p className="text-[11px] text-muted-foreground">
                      Assinatura: <code className="bg-muted px-1 rounded">X-LeadFlow-Signature: sha256=&lt;hmac&gt;</code>
                      {" · "}
                      ID da entrega: <code className="bg-muted px-1 rounded">X-LeadFlow-Delivery: &lt;uuid&gt;</code>
                      {" · "}
                      Evento: <code className="bg-muted px-1 rounded">X-LeadFlow-Event: lead.converted</code>
                    </p>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Info sobre retry */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Como funciona</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1.5">
          <p>• <strong className="text-foreground">Retry automático com backoff:</strong> falha imediata → retry em 1 min → 5 min → 30 min (máx 4 tentativas)</p>
          <p>• <strong className="text-foreground">Payload enriquecido:</strong> dados completos do lead, notas da timeline, análise IA, tags, pipeline e atendente</p>
          <p>• <strong className="text-foreground">Evento:</strong> <code className="bg-muted px-1 rounded font-mono">lead.converted</code> disparado em conversão manual ou automática (ao mover para &quot;Fechado Ganho&quot;)</p>
          <p>• <strong className="text-foreground">Segurança:</strong> configure um secret para validar a autenticidade do payload via HMAC-SHA256</p>
        </CardContent>
      </Card>

      {ConfirmDialogElement}
    </div>
  )
}

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
  X, ExternalLink, BookOpen,
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

interface CrmIntegration {
  id: string
  name: string
  description: string
  url: string
  color: string
  logo: string
  steps: { title: string; content: string }[]
  payloadMapping: { field: string; crm: string; note?: string }[]
}

const CRM_INTEGRATIONS: CrmIntegration[] = [
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Cria/atualiza contato e negócio automaticamente ao converter um lead.",
    url: "https://developers.hubspot.com/docs/api/webhooks",
    color: "#FF7A59",
    logo: "🟠",
    steps: [
      { title: "1. Crie um webhook no Qualivox", content: "Em Webhooks → Novo endpoint, insira a URL do seu fluxo no HubSpot (ex: via Workflow ou endpoint personalizado). Selecione o evento lead.converted." },
      { title: "2. Configure o receptor no HubSpot", content: "Acesse HubSpot → Automações → Webhooks (plano Pro+) ou use um Workflow com ação 'Enviar webhook de saída'. Cole a URL do Qualivox como origem.\n\nAlternativamente, use a API REST do HubSpot: POST https://api.hubapi.com/crm/v3/objects/contacts com o payload mapeado." },
      { title: "3. Mapeie os campos", content: "No receptor do HubSpot, mapeie os campos do payload Qualivox para as propriedades do HubSpot conforme a tabela abaixo." },
      { title: "4. Valide a assinatura (opcional)", content: "Configure um secret no Qualivox. O header X-Qualivox-Signature contém sha256=<hmac>. Valide com sua chave antes de processar o payload." },
      { title: "5. Teste a integração", content: "Converta um lead de teste no Qualivox e verifique no log de entregas se o status foi 'Sucesso'. No HubSpot, confirme que o contato foi criado/atualizado." },
    ],
    payloadMapping: [
      { field: "lead.name", crm: "firstname + lastname", note: "Divida pelo primeiro espaço" },
      { field: "lead.email", crm: "email" },
      { field: "lead.phone", crm: "phone" },
      { field: "lead.companyName", crm: "company" },
      { field: "lead.budgetCents", crm: "amount (deal)", note: "Dividir por 100 para reais" },
      { field: "lead.score", crm: "hs_lead_status ou custom" },
      { field: "convertedAt", crm: "closedate (deal)" },
      { field: "lead.assignedTo.email", crm: "hubspot_owner_id" },
    ],
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    description: "Cria uma Person e um Deal com estágio 'Won' ao receber a conversão.",
    url: "https://pipedrive.readme.io/docs/guide-for-webhooks",
    color: "#1A1F36",
    logo: "🔵",
    steps: [
      { title: "1. Obtenha sua API Token", content: "No Pipedrive, vá em Configurações → Pessoal → API. Copie seu token de API." },
      { title: "2. Use N8N ou Make como intermediário", content: "O Pipedrive não recebe webhooks diretamente, mas expõe uma API REST. Use o N8N (já configurado no Qualivox) para:\n- Receber o evento lead.converted\n- Chamar POST /persons para criar a pessoa\n- Chamar POST /deals para criar o negócio com status=won" },
      { title: "3. Configure o N8N", content: "No Qualivox → Configurações → N8N, insira a URL do seu N8N. Crie um workflow com trigger Webhook e nodes do Pipedrive para criar Person e Deal automaticamente." },
      { title: "4. Mapeie os campos", content: "Confira a tabela de mapeamento abaixo para os campos principais." },
      { title: "5. Defina o pipeline e estágio", content: "No node de Deal do N8N, defina stage_id como o ID do estágio 'Ganho' do seu pipeline no Pipedrive." },
    ],
    payloadMapping: [
      { field: "lead.name", crm: "name (person)" },
      { field: "lead.email", crm: "email[0].value (person)" },
      { field: "lead.phone", crm: "phone[0].value (person)" },
      { field: "lead.companyName", crm: "org_name (deal)" },
      { field: "lead.budgetCents", crm: "value (deal)", note: "Dividir por 100" },
      { field: "convertedAt", crm: "won_time (deal)" },
      { field: "lead.assignedTo.name", crm: "user_id (deal)", note: "Buscar por nome via GET /users" },
    ],
  },
  {
    id: "rdstation",
    name: "RD Station CRM",
    description: "Converte o lead em oportunidade e dispara automações de pós-venda.",
    url: "https://developers.rdstation.com/reference/webhooks",
    color: "#0066CC",
    logo: "🔵",
    steps: [
      { title: "1. Acesse o painel de desenvolvedores", content: "Entre em rdstation.com/pt-br → Menu → Integrações → API e Webhooks. Crie um novo webhook de saída ou entrada." },
      { title: "2. Configure o endpoint receptor", content: "No RD Station Marketing, crie uma automação que escuta conversões via webhook. A URL será algo como: https://app.rdstation.com.br/api/1.3/conversions\n\nAlternativamente, use a API REST para criar um Contato e mover para 'Cliente'." },
      { title: "3. Autentique com OAuth 2.0", content: "O RD Station usa OAuth 2.0. Obtenha um access_token em app.rdstation.com.br → Integrações → Criar aplicação. Armazene o token e use no header Authorization: Bearer <token>." },
      { title: "4. Envie o payload mapeado", content: "Use o N8N para transformar o payload Qualivox no formato esperado pelo RD Station e realizar o POST na API deles." },
      { title: "5. Mapeie os campos", content: "Veja a tabela de mapeamento abaixo." },
    ],
    payloadMapping: [
      { field: "lead.name", crm: "name" },
      { field: "lead.email", crm: "email" },
      { field: "lead.phone", crm: "mobile_phone" },
      { field: "lead.companyName", crm: "company_name" },
      { field: "lead.source", crm: "traffic_source" },
      { field: "lead.lifecycleStage", crm: "lifecycle_stage → cliente" },
      { field: "convertedAt", crm: "conversion_date" },
    ],
  },
  {
    id: "zoho",
    name: "Zoho CRM",
    description: "Cria Lead ou Contact com Deal vinculado usando a API REST do Zoho.",
    url: "https://www.zoho.com/crm/developer/docs/api/v6/",
    color: "#E42527",
    logo: "🔴",
    steps: [
      { title: "1. Configure OAuth no Zoho", content: "Acesse api-console.zoho.com → Crie uma aplicação 'Server-based Application'. Obtenha Client ID e Client Secret. Gere um Refresh Token com escopo ZohoCRM.modules.ALL." },
      { title: "2. Crie o endpoint receptor", content: "Use N8N ou uma função serverless para:\n1. Receber o webhook do Qualivox (lead.converted)\n2. Trocar o refresh_token por access_token\n3. Chamar POST https://www.zohoapis.com/crm/v6/Leads com os dados mapeados" },
      { title: "3. Configure o webhook no Qualivox", content: "Em Webhooks → Novo endpoint, insira a URL do seu receptor N8N ou função. Adicione um secret para validar a assinatura." },
      { title: "4. Valide a assinatura HMAC", content: "No receptor, valide o header X-Qualivox-Signature antes de processar:\nhmac = sha256(secret, body)\nassert header == 'sha256=' + hmac" },
      { title: "5. Verifique no Zoho", content: "Após o primeiro lead convertido, acesse Zoho CRM → Leads e confirme que o registro foi criado com os dados corretos." },
    ],
    payloadMapping: [
      { field: "lead.name", crm: "Last_Name + First_Name" },
      { field: "lead.email", crm: "Email" },
      { field: "lead.phone", crm: "Phone" },
      { field: "lead.companyName", crm: "Company" },
      { field: "lead.budgetCents", crm: "Annual_Revenue", note: "Dividir por 100" },
      { field: "lead.source", crm: "Lead_Source" },
      { field: "lead.assignedTo.name", crm: "Owner" },
      { field: "convertedAt", crm: "Converted_Date_Time" },
    ],
  },
  {
    id: "activecampaign",
    name: "ActiveCampaign",
    description: "Cria contato e deal, e dispara automações de e-mail pós-conversão.",
    url: "https://developers.activecampaign.com/reference/webhooks",
    color: "#356AE6",
    logo: "🟢",
    steps: [
      { title: "1. Obtenha sua API Key", content: "No ActiveCampaign, vá em Configurações → Developer → API Access. Copie a URL da API e a Key." },
      { title: "2. Configure o receptor", content: "O ActiveCampaign aceita criação de contatos via API REST:\nPOST https://<sua-conta>.api-us1.com/api/3/contacts\n\nUse N8N com o node ActiveCampaign para simplificar a integração." },
      { title: "3. Crie o Deal automaticamente", content: "Após criar o contato, crie um Deal com status=1 (won):\nPOST /api/3/deals\nVincule ao contato criado via contactid." },
      { title: "4. Dispare automações", content: "No ActiveCampaign, crie uma automação com trigger 'Tag adicionada' ou 'Deal ganho' para enviar e-mails de boas-vindas, onboarding e follow-up pós-venda." },
      { title: "5. Mapeie os campos", content: "Confira a tabela abaixo para os campos principais." },
    ],
    payloadMapping: [
      { field: "lead.name", crm: "firstName + lastName" },
      { field: "lead.email", crm: "email" },
      { field: "lead.phone", crm: "phone" },
      { field: "lead.companyName", crm: "fieldValues → orgname" },
      { field: "lead.budgetCents", crm: "deal.value", note: "Dividir por 100" },
      { field: "lead.tags", crm: "tags[]" },
      { field: "convertedAt", crm: "deal.currency + close_date" },
    ],
  },
  {
    id: "n8n",
    name: "N8N (Universal)",
    description: "Intermediário para qualquer CRM: Notion, Monday, Freshsales, Agendor, Moskit e mais.",
    url: "https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.webhooktrigger/",
    color: "#EA4B71",
    logo: "⚡",
    steps: [
      { title: "1. Configure o N8N no Qualivox", content: "Vá em Configurações → Integrações → N8N e insira a URL base do seu N8N (ex: https://n8n.meudominio.com)." },
      { title: "2. Crie um workflow com trigger Webhook", content: "No N8N, crie um novo workflow. Adicione o node 'Webhook' como trigger. Copie a URL gerada (ex: https://n8n.meudominio.com/webhook/qualivox-converted)." },
      { title: "3. Registre a URL no Qualivox", content: "Em Qualivox → Webhooks → Novo endpoint, cole a URL do N8N como endpoint. Selecione o evento lead.converted. Opcionalmente configure um secret." },
      { title: "4. Adicione nodes para o seu CRM", content: "No N8N, após o trigger Webhook, adicione nodes do CRM desejado:\n• HubSpot → node HubSpot CRM\n• Pipedrive → node Pipedrive\n• Notion → node Notion (cria página no banco)\n• Monday.com → node Monday.com (cria item no board)\n• Qualquer API → node HTTP Request" },
      { title: "5. Ative e teste", content: "Ative o workflow no N8N. Converta um lead de teste no Qualivox e acompanhe a execução no painel do N8N em tempo real." },
    ],
    payloadMapping: [
      { field: "lead.*", crm: "Acessível via {{ $json.body.data.lead.campo }}", note: "No N8N" },
      { field: "notes[]", crm: "{{ $json.body.data.notes }}" },
      { field: "aiAnalysis", crm: "{{ $json.body.data.aiAnalysis }}" },
      { field: "source", crm: "{{ $json.body.data.source }}" },
      { field: "convertedAt", crm: "{{ $json.body.data.convertedAt }}" },
    ],
  },
]

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
  const [selectedCrm, setSelectedCrm] = useState<CrmIntegration | null>(null)

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
                  Enviado no header <code className="bg-muted px-1 rounded">X-Qualivox-Signature</code>
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
                      Assinatura: <code className="bg-muted px-1 rounded">X-Qualivox-Signature: sha256=&lt;hmac&gt;</code>
                      {" · "}
                      ID da entrega: <code className="bg-muted px-1 rounded">X-Qualivox-Delivery: &lt;uuid&gt;</code>
                      {" · "}
                      Evento: <code className="bg-muted px-1 rounded">X-Qualivox-Event: lead.converted</code>
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

      {/* Integrações com CRMs */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Integrações com CRMs</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Guias passo a passo para conectar o Qualivox com os principais CRMs do mercado.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CRM_INTEGRATIONS.map((crm) => (
            <button
              key={crm.id}
              type="button"
              onClick={() => setSelectedCrm(crm)}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left hover:border-primary/40 hover:bg-accent/50 transition-all group">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-xl flex-shrink-0"
                style={{ backgroundColor: `${crm.color}18`, border: `1px solid ${crm.color}30` }}>
                {crm.logo}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm">{crm.name}</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{crm.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Modal de instruções do CRM */}
      {selectedCrm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedCrm(null)}>
          <div
            className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl"
            onClick={(e) => e.stopPropagation()}>

            {/* Header do modal */}
            <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card px-6 py-4">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-xl flex-shrink-0"
                style={{ backgroundColor: `${selectedCrm.color}18`, border: `1px solid ${selectedCrm.color}30` }}>
                {selectedCrm.logo}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg leading-none">{selectedCrm.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{selectedCrm.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={selectedCrm.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}>
                  <ExternalLink className="h-3.5 w-3.5" />
                  Documentação oficial
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedCrm(null)}
                  className="ml-2 p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* Passos */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">Guia de configuração</h4>
                </div>
                <div className="space-y-3">
                  {selectedCrm.steps.map((step, i) => (
                    <div key={i} className="rounded-xl border border-border overflow-hidden">
                      <div
                        className="flex items-center gap-2 px-4 py-2.5"
                        style={{ backgroundColor: `${selectedCrm.color}10` }}>
                        <span
                          className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: selectedCrm.color }}>
                          {i + 1}
                        </span>
                        <span className="font-medium text-sm">{step.title.replace(/^\d+\.\s*/, "")}</span>
                      </div>
                      <div className="px-4 py-3 bg-muted/20">
                        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{step.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabela de mapeamento */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Mapeamento de campos</h4>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Campo Qualivox</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Campo {selectedCrm.name}</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Observação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {selectedCrm.payloadMapping.map((row, i) => (
                        <tr key={i} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-primary">{row.field}</td>
                          <td className="px-4 py-2.5 font-mono">{row.crm}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{row.note ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payload de exemplo */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Exemplo de payload recebido</h4>
                <pre className="rounded-xl bg-muted/50 border border-border p-4 text-[11px] text-muted-foreground overflow-x-auto leading-relaxed">{`{
  "event": "lead.converted",
  "timestamp": "2026-04-09T18:00:00.000Z",
  "data": {
    "lead": {
      "id": "uuid",
      "name": "João Silva",
      "email": "joao@empresa.com",
      "phone": "+5511999999999",
      "companyName": "Empresa LTDA",
      "budgetCents": 500000,
      "score": 87,
      "lifecycleStage": "cliente",
      "pipelineStage": { "name": "Fechado Ganho" },
      "assignedTo": { "name": "Ana Costa" },
      "tags": [{ "name": "VIP" }]
    },
    "notes": [{ "type": "note", "content": "...", "date": "..." }],
    "aiAnalysis": { "sentimentScore": 0.9, "classification": "quente" },
    "source": "manual",
    "convertedAt": "2026-04-09T18:00:00.000Z"
  }
}`}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {ConfirmDialogElement}
    </div>
  )
}

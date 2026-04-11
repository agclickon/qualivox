"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Plus, Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Trash2, Edit, Eye, Loader2, X, AlertTriangle, Filter, Download, Upload, CalendarDays } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Portal } from "@/components/ui/portal"
import { useToast } from "@/hooks/use-toast"
import { createLeadSchema, type CreateLeadInput } from "@/lib/validators"
import { formatDate } from "@/lib/utils"
import { LifecycleBadge } from "@/components/ui/lifecycle-badge"

interface LeadsSelectOption { value: string; label: string }
function LeadsCustomSelect({ value, onChange, options, placeholder, className = "", testId }: {
  value: string
  onChange: (v: string) => void
  options: LeadsSelectOption[]
  placeholder?: string
  className?: string
  testId?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])
  return (
    <div ref={ref} className={`relative ${className}`} data-testid={testId}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="w-full h-9 flex items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm text-foreground hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors cursor-pointer">
        <span className="truncate">{selected?.label ?? placeholder ?? "Selecione..."}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-xl overflow-hidden">
          <div className="max-h-56 overflow-y-auto py-1">
            {options.map((opt) => (
              <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false) }}
                className={`w-full flex items-center px-3 py-2 text-sm text-left transition-colors hover:bg-muted ${opt.value === value ? "bg-primary/10 text-primary font-medium" : "text-foreground"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const MONTHS_PT = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"]
const WEEK_DAYS = ["D","S","T","Q","Q","S","S"]
function isoDay(date: Date) { return date.toISOString().slice(0, 10) }
function buildMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1)
  const startDay = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: { iso: string; label: number; isCurrentMonth: boolean }[] = []
  for (let i = 0; i < startDay; i++) {
    const d = new Date(year, month, 1 - (startDay - i))
    days.push({ iso: isoDay(d), label: d.getDate(), isCurrentMonth: false })
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i)
    days.push({ iso: isoDay(d), label: i, isCurrentMonth: true })
  }
  while (days.length % 7 !== 0) {
    const last = days[days.length - 1]
    const d = new Date(last.iso + "T12:00:00"); d.setDate(d.getDate() + 1)
    days.push({ iso: isoDay(d), label: d.getDate(), isCurrentMonth: false })
  }
  return days
}
function LeadsDatePicker({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false)
  const [navDate, setNavDate] = useState(() => value ? new Date(value + "T12:00:00") : new Date())
  const ref = useRef<HTMLDivElement>(null)
  const todayIso = isoDay(new Date())
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])
  const days = useMemo(() => buildMonthDays(navDate.getFullYear(), navDate.getMonth()), [navDate])
  const label = value ? new Date(value + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : placeholder ?? "Selecionar data"
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 h-9 text-sm hover:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary transition-colors text-left w-36">
        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <span className={value ? "text-foreground" : "text-muted-foreground"}>{label}</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 rounded-xl border border-border bg-card shadow-2xl p-3 w-64">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setNavDate((d) => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n })} className="p-1 rounded-full hover:bg-muted/40 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold capitalize">{MONTHS_PT[navDate.getMonth()]} {navDate.getFullYear()}</span>
            <button type="button" onClick={() => setNavDate((d) => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n })} className="p-1 rounded-full hover:bg-muted/40 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {WEEK_DAYS.map((d, i) => <span key={i} className="text-center text-[11px] font-semibold text-muted-foreground uppercase py-1">{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {days.map(({ iso, label: lbl, isCurrentMonth }) => (
              <button key={iso} type="button" onClick={() => { onChange(iso); setOpen(false) }}
                className={`h-8 rounded-full text-sm transition-all ${iso === value ? "bg-primary text-primary-foreground shadow font-semibold" : iso === todayIso ? "border border-primary/50 text-primary font-medium" : "text-foreground hover:bg-muted/60"} ${!isCurrentMonth ? "opacity-30" : ""}`}>
                {lbl}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-2 pt-2 border-t border-border">
            <button type="button" onClick={() => { onChange(""); setOpen(false) }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Limpar</button>
            <button type="button" onClick={() => { onChange(todayIso); setOpen(false) }} className="text-xs text-primary font-medium hover:text-primary/80 transition-colors">Hoje</button>
          </div>
        </div>
      )}
    </div>
  )
}

interface Lead {
  id: string
  name: string
  email: string | null
  phone: string | null
  status: string
  score: number
  source: string
  companyName: string | null
  tags: string
  createdAt: string
  lifecycleStage?: string | null
  assignedTo: { id: string; name: string; avatarUrl: string | null } | null
  pipelineStage: { id: string; name: string; color: string } | null
}

const statusLabels: Record<string, string> = {
  novo: "Novo",
  contatado: "Contatado",
  qualificado: "Qualificado",
  em_negociacao: "Em Negociação",
  proposta_enviada: "Proposta Enviada",
  fechado_ganho: "Fechado (Ganho)",
  fechado_perdido: "Fechado (Perdido)",
}

const sourceLabels: Record<string, string> = {
  whatsapp: "WhatsApp",
  website: "Website",
  indicacao: "Indicação",
  telefone: "Telefone",
  email: "E-mail",
  rede_social: "Rede Social",
  evento: "Evento",
  outro: "Outro",
}

export default function LeadsPage() {
  const { toast } = useToast()
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(10)
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState("")
  const [filterSource, setFilterSource] = useState("")
  const [filterDateFrom, setFilterDateFrom] = useState("")
  const [filterDateTo, setFilterDateTo] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [viewLead, setViewLead] = useState<Lead | null>(null)
  const [editLead, setEditLead] = useState<Lead | null>(null)

  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
      })
      if (search) params.set("search", search)
      if (filterStatus) params.set("status", filterStatus)
      if (filterSource) params.set("source", filterSource)
      if (filterDateFrom) params.set("dateFrom", filterDateFrom)
      if (filterDateTo) params.set("dateTo", filterDateTo)

      const res = await fetch(`/api/leads?${params}`)
      const data = await res.json()

      if (data.success) {
        setLeads(data.data.items)
        setTotalPages(data.data.pagination.totalPages)
        setTotal(data.data.pagination.total)
      }
    } catch {
      toast({ variant: "destructive", title: "Erro ao carregar leads" })
    } finally {
      setIsLoading(false)
    }
  }, [page, limit, sortBy, sortOrder, search, filterStatus, filterSource, filterDateFrom, filterDateTo, toast])

  useEffect(() => {
    const debounce = setTimeout(fetchLeads, 300)
    return () => clearTimeout(debounce)
  }, [fetchLeads])

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
    setPage(1)
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/leads/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Lead excluído com sucesso" })
        fetchLeads()
      } else {
        toast({ variant: "destructive", title: "Erro ao excluir lead" })
      }
    } catch {
      toast({ variant: "destructive", title: "Erro ao excluir lead" })
    } finally {
      setDeleteId(null)
    }
  }

  const handleExportCSV = () => {
    if (leads.length === 0) {
      toast({ variant: "destructive", title: "Nenhum lead para exportar" })
      return
    }
    const headers = ["Nome", "E-mail", "Telefone", "Empresa", "Status", "Score", "Origem", "Criado em"]
    const rows = leads.map((l) => [
      l.name,
      l.email || "",
      l.phone || "",
      l.companyName || "",
      statusLabels[l.status] || l.status,
      l.score.toString(),
      sourceLabels[l.source] || l.source,
      formatDate(l.createdAt),
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "CSV exportado com sucesso!" })
  }

  const handleUpdateLead = async (id: string, data: Partial<Lead>) => {
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (result.success) {
        toast({ title: "Lead atualizado com sucesso!" })
        setEditLead(null)
        fetchLeads()
      } else {
        toast({ variant: "destructive", title: "Erro ao atualizar lead" })
      }
    } catch {
      toast({ variant: "destructive", title: "Erro ao atualizar lead" })
    }
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return null
    return sortOrder === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h3 font-bold" data-testid="heading-leads">Leads</h1>
          <p className="text-muted-foreground">
            {total} lead{total !== 1 ? "s" : ""} cadastrado{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} data-testid="button-new-lead">
          <Plus className="mr-2 h-4 w-4" />
          Novo Lead
        </Button>
      </div>

      {/* Busca + Filtros */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email, telefone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-10"
              data-testid="input-search-leads"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            data-testid="button-toggle-filters"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtros
            {(filterStatus || filterSource || filterDateFrom || filterDateTo) && (
              <span className="ml-1 rounded-full bg-primary-foreground text-primary px-1.5 text-[10px] font-bold">
                {[filterStatus, filterSource, filterDateFrom, filterDateTo].filter(Boolean).length}
              </span>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} data-testid="button-export-csv">
            <Download className="mr-2 h-4 w-4" />Exportar CSV
          </Button>
        </div>

        {showFilters && (
          <div className="flex items-end gap-3 flex-wrap rounded-lg border bg-muted/30 p-3">
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <LeadsCustomSelect
                value={filterStatus}
                onChange={(v) => { setFilterStatus(v); setPage(1) }}
                options={[{ value: "", label: "Todos" }, ...Object.entries(statusLabels).map(([v, l]) => ({ value: v, label: l }))]}
                className="w-40"
                testId="filter-status"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Origem</Label>
              <LeadsCustomSelect
                value={filterSource}
                onChange={(v) => { setFilterSource(v); setPage(1) }}
                options={[{ value: "", label: "Todas" }, ...Object.entries(sourceLabels).map(([v, l]) => ({ value: v, label: l }))]}
                className="w-40"
                testId="filter-source"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data de início</Label>
              <LeadsDatePicker
                value={filterDateFrom}
                onChange={(v) => { setFilterDateFrom(v); setPage(1) }}
                placeholder="dd/mm/aaaa"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data final</Label>
              <LeadsDatePicker
                value={filterDateTo}
                onChange={(v) => { setFilterDateTo(v); setPage(1) }}
                placeholder="dd/mm/aaaa"
              />
            </div>
            {(filterStatus || filterSource || filterDateFrom || filterDateTo) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => { setFilterStatus(""); setFilterSource(""); setFilterDateFrom(""); setFilterDateTo(""); setPage(1) }}
              >
                <X className="mr-1 h-3 w-3" />Limpar filtros
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {[
                    { key: "name", label: "Nome" },
                    { key: "phone", label: "Telefone" },
                    { key: "email", label: "E-mail" },
                    { key: "status", label: "Status" },
                    { key: "score", label: "Score" },
                    { key: "source", label: "Origem" },
                    { key: "createdAt", label: "Criado em" },
                  ].map((col) => (
                    <th
                      key={col.key}
                      className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
                      onClick={() => handleSort(col.key)}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        <SortIcon field={col.key} />
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-4 py-3"><Skeleton className="h-5 w-32" /><Skeleton className="h-3 w-20 mt-1" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-6 w-24 rounded-full" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-3 w-16" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-8 w-24 ml-auto" /></td>
                    </tr>
                  ))
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-muted-foreground">
                      <p className="text-lg font-medium">Nenhum lead encontrado</p>
                      <p className="text-sm mt-1">Clique em &quot;Novo Lead&quot; para adicionar</p>
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{lead.name}</p>
                            {lead.lifecycleStage && lead.lifecycleStage !== "prospect" && (
                              <LifecycleBadge stage={lead.lifecycleStage} />
                            )}
                          </div>
                          {lead.companyName && (
                            <p className="text-xs text-muted-foreground">{lead.companyName}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs font-mono whitespace-nowrap">{lead.phone || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{lead.email || "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: lead.pipelineStage?.color ? `${lead.pipelineStage.color}20` : undefined,
                            color: lead.pipelineStage?.color,
                          }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: lead.pipelineStage?.color }} />
                          {statusLabels[lead.status] || lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${lead.score}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono">{lead.score}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {sourceLabels[lead.source] || lead.source}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {formatDate(lead.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewLead(lead)} data-testid={`button-view-${lead.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditLead(lead)} data-testid={`button-edit-${lead.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(lead.id)}
                            data-testid={`button-delete-${lead.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages} ({total} resultados)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  data-testid="button-next-page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Criar Lead */}
      {showCreateModal && (
        <CreateLeadModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); fetchLeads() }}
          isCreating={isCreating}
          setIsCreating={setIsCreating}
        />
      )}

      {/* Modal Visualizar Lead */}
      {viewLead && (
        <Portal><div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Detalhes do Lead</h3>
              <button onClick={() => setViewLead(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  {viewLead.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-lg">{viewLead.name}</p>
                  {viewLead.companyName && <p className="text-sm text-muted-foreground">{viewLead.companyName}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-1">E-mail</p>
                  <p className="text-sm font-medium">{viewLead.email || "—"}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Telefone</p>
                  <p className="text-sm font-medium">{viewLead.phone || "—"}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: viewLead.pipelineStage?.color ? `${viewLead.pipelineStage.color}20` : undefined,
                      color: viewLead.pipelineStage?.color,
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: viewLead.pipelineStage?.color }} />
                    {statusLabels[viewLead.status] || viewLead.status}
                  </span>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Origem</p>
                  <p className="text-sm font-medium">{sourceLabels[viewLead.source] || viewLead.source}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Score</p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${viewLead.score}%` }} />
                    </div>
                    <span className="text-sm font-mono font-bold">{viewLead.score}</span>
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Criado em</p>
                  <p className="text-sm font-medium">{formatDate(viewLead.createdAt)}</p>
                </div>
              </div>
              {viewLead.assignedTo && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Atribuído a</p>
                  <p className="text-sm font-medium">{viewLead.assignedTo.name}</p>
                </div>
              )}
              {(() => { try { const t = JSON.parse(viewLead.tags || "[]"); return Array.isArray(t) && t.length > 0 ? t : null } catch { return null } })() && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Tags</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(() => { try { return JSON.parse(viewLead.tags || "[]") } catch { return [] } })().map((tag: string) => (
                      <span key={tag} className="rounded-md bg-accent px-2 py-0.5 text-xs font-medium">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setViewLead(null)}>Fechar</Button>
              <Button onClick={() => { setEditLead(viewLead); setViewLead(null) }}>
                <Edit className="mr-2 h-4 w-4" />Editar
              </Button>
            </div>
          </div>
        </div></Portal>
      )}

      {/* Modal Editar Lead */}
      {editLead && (
        <EditLeadModal
          lead={editLead}
          onClose={() => setEditLead(null)}
          onSave={handleUpdateLead}
          statusLabels={statusLabels}
          sourceLabels={sourceLabels}
        />
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
                <h3 className="text-lg font-semibold">Confirmar exclusão</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteId(null)} data-testid="button-cancel-delete">
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteId)}
                data-testid="button-confirm-delete"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            </div>
          </div>
        </div></Portal>
      )}
    </div>
  )
}

function CreateLeadModal({
  onClose,
  onCreated,
  isCreating,
  setIsCreating,
}: {
  onClose: () => void
  onCreated: () => void
  isCreating: boolean
  setIsCreating: (v: boolean) => void
}) {
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateLeadInput>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: { source: "whatsapp", tags: [] },
  })

  const onSubmit = async (data: CreateLeadInput) => {
    try {
      setIsCreating(true)
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (result.success) {
        toast({ title: "Lead criado com sucesso!" })
        onCreated()
      } else {
        toast({ variant: "destructive", title: "Erro", description: result.error?.message })
      }
    } catch {
      toast({ variant: "destructive", title: "Erro ao criar lead" })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Portal><div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Novo Lead</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lead-name">Nome *</Label>
            <Input
              id="lead-name"
              placeholder="Nome do lead"
              data-testid="input-lead-name"
              className={errors.name ? "border-destructive" : ""}
              {...register("name")}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lead-email">E-mail</Label>
              <Input
                id="lead-email"
                type="email"
                placeholder="email@exemplo.com"
                data-testid="input-lead-email"
                {...register("email")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-phone">Telefone</Label>
              <Input
                id="lead-phone"
                placeholder="(11) 99999-9999"
                data-testid="input-lead-phone"
                {...register("phone")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lead-company">Empresa</Label>
              <Input
                id="lead-company"
                placeholder="Nome da empresa"
                data-testid="input-lead-company"
                {...register("companyName")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-source">Origem</Label>
              <select
                id="lead-source"
                className="flex h-10 w-full rounded-lg border border-input bg-muted px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                data-testid="select-lead-source"
                {...register("source")}
              >
                {Object.entries(sourceLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead-notes">Observações</Label>
            <textarea
              id="lead-notes"
              placeholder="Notas sobre o lead..."
              className="flex min-h-[80px] w-full rounded-lg border border-input bg-muted px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              data-testid="textarea-lead-notes"
              {...register("notes")}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating} data-testid="button-submit-lead">
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Lead
            </Button>
          </div>
        </form>
      </div>
    </div></Portal>
  )
}

function EditLeadModal({
  lead,
  onClose,
  onSave,
  statusLabels,
  sourceLabels,
}: {
  lead: Lead
  onClose: () => void
  onSave: (id: string, data: Partial<Lead>) => Promise<void>
  statusLabels: Record<string, string>
  sourceLabels: Record<string, string>
}) {
  const [name, setName] = useState(lead.name)
  const [email, setEmail] = useState(lead.email || "")
  const [phone, setPhone] = useState(lead.phone || "")
  const [companyName, setCompanyName] = useState(lead.companyName || "")
  const [status, setStatus] = useState(lead.status)
  const [source, setSource] = useState(lead.source)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setIsSaving(true)
    await onSave(lead.id, {
      name,
      email: email || null,
      phone: phone || null,
      companyName: companyName || null,
      status,
      source,
    })
    setIsSaving(false)
  }

  return (
    <Portal><div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Editar Lead</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} data-testid="input-edit-name" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-edit-email" />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="input-edit-phone" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} data-testid="input-edit-company" />
            </div>
            <div className="space-y-2">
              <Label>Origem</Label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-muted px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                data-testid="select-edit-source"
              >
                {Object.entries(sourceLabels).map(([val, lbl]) => (
                  <option key={val} value={val}>{lbl}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-input bg-muted px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              data-testid="select-edit-status"
            >
              {Object.entries(statusLabels).map(([val, lbl]) => (
                <option key={val} value={val}>{lbl}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving || !name.trim()} data-testid="button-save-edit">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </div>
        </div>
      </div>
    </div></Portal>
  )
}

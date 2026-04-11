"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, FileText, Loader2, Copy, Tag, Trash2, AlertTriangle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Portal } from "@/components/ui/portal"
import { useToast } from "@/hooks/use-toast"

interface Template {
  id: string
  name: string
  content: string
  variables: string
  category: string | null
  isActive: boolean
  createdAt: string
}

const categoryColors: Record<string, string> = {
  "boas-vindas": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "follow-up": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "proposta": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "agendamento": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  "reativacao": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
}

export default function TemplatesPage() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [newContent, setNewContent] = useState("")
  const [newCategory, setNewCategory] = useState("")

  const fetchTemplates = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/templates")
      const data = await res.json()
      if (data.success) {
        setTemplates(data.data.templates)
      }
    } catch (err) {
      console.error("Erro ao carregar templates:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchTemplates() }, [])

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Template excluído com sucesso" })
        fetchTemplates()
      } else {
        toast({ variant: "destructive", title: "Erro ao excluir template" })
      }
    } catch {
      toast({ variant: "destructive", title: "Erro ao excluir template" })
    } finally {
      setDeleteId(null)
    }
  }

  const handleCreate = async () => {
    if (!newName.trim() || !newContent.trim()) {
      toast({ variant: "destructive", title: "Preencha nome e conteúdo" })
      return
    }
    const vars = (newContent.match(/\{\{(\w+)\}\}/g) || []).map(v => v.replace(/[{}]/g, ""))
    setCreating(true)
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          content: newContent.trim(),
          variables: JSON.stringify([...new Set(vars)]),
          category: newCategory || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Template criado com sucesso!" })
        setShowCreate(false)
        setNewName(""); setNewContent(""); setNewCategory("")
        fetchTemplates()
      } else {
        toast({ variant: "destructive", title: "Erro ao criar template" })
      }
    } catch {
      toast({ variant: "destructive", title: "Erro ao criar template" })
    } finally {
      setCreating(false)
    }
  }

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content)
    toast({ title: "Copiado!", description: "Template copiado para a área de transferência" })
  }

  const parseVars = (v: string): string[] => {
    try { return JSON.parse(v || "[]") } catch { return [] }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-8 w-36 mb-2" /><Skeleton className="h-4 w-56" /></div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}><CardHeader className="pb-3"><Skeleton className="h-5 w-32" /></CardHeader><CardContent className="space-y-3"><Skeleton className="h-24 w-full rounded-lg" /><Skeleton className="h-8 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h3 font-bold" data-testid="heading-templates">Templates</h1>
          <p className="text-muted-foreground">
            Gerencie seus templates de mensagens
          </p>
        </div>
        <Button data-testid="button-new-template" onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Template
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">{template.name}</CardTitle>
                </div>
                {template.category && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${categoryColors[template.category] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"}`}>
                    {template.category}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-3">
              <div className="rounded-lg bg-muted/50 p-3 text-sm flex-1">
                <p className="whitespace-pre-wrap">{template.content}</p>
              </div>
              {parseVars(template.variables).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {parseVars(template.variables).map((v) => (
                    <span key={v} className="flex items-center gap-0.5 rounded bg-accent px-1.5 py-0.5 text-[10px] font-mono">
                      <Tag className="h-2.5 w-2.5" />{`{{${v}}}`}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => copyToClipboard(template.content)}
                >
                  <Copy className="mr-2 h-3 w-3" />
                  Copiar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteId(template.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal Criar Template */}
      {showCreate && (
        <Portal><div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Novo Template</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Boas-vindas"
                  className="mt-1 flex h-10 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Categoria</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="mt-1 flex h-10 w-full rounded-md border border-[var(--border)] bg-card text-foreground px-3 py-2 text-sm"
                >
                  <option value="">Sem categoria</option>
                  <option value="boas-vindas">Boas-vindas</option>
                  <option value="follow-up">Follow-up</option>
                  <option value="proposta">Proposta</option>
                  <option value="agendamento">Agendamento</option>
                  <option value="reativacao">Reativação</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Conteúdo *</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder={"Olá {{name}}! Obrigado pelo interesse..."}
                  rows={5}
                  className="mt-1 flex w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">Use {"{{variavel}}"} para inserir variáveis dinâmicas. Ex: {"{{name}}"}, {"{{email}}"}, {"{{company}}"}</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowCreate(false); setNewName(""); setNewContent(""); setNewCategory("") }}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Criar Template
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
                <h3 className="text-lg font-semibold">Excluir template</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.
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

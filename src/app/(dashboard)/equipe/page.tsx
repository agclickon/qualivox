"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Users, Mail, Phone, Shield, ShieldCheck, User, Loader2, MoreVertical, Trash2, AlertTriangle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Portal } from "@/components/ui/portal"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getInitials, formatDate } from "@/lib/utils"

interface TeamMember {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  avatarUrl: string | null
  isActive: boolean
  lastLogin: string | null
  createdAt: string
  _count: { leads: number }
}

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  user: "Vendedor",
}

const roleColors: Record<string, string> = {
  super_admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  user: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
}

export default function EquipePage() {
  const { toast } = useToast()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [invName, setInvName] = useState("")
  const [invEmail, setInvEmail] = useState("")
  const [invPhone, setInvPhone] = useState("")
  const [invPassword, setInvPassword] = useState("")
  const [invRole, setInvRole] = useState("user")

  const fetchTeam = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/team")
      const data = await res.json()
      if (data.success) {
        setMembers(data.data.users)
      }
    } catch (err) {
      console.error("Erro ao carregar equipe:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchTeam() }, [])

  const handleInvite = async () => {
    if (!invName.trim() || !invEmail.trim() || !invPassword.trim()) {
      toast({ variant: "destructive", title: "Preencha nome, email e senha" })
      return
    }
    setInviting(true)
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: invName.trim(), email: invEmail.trim(), phone: invPhone.trim() || null, password: invPassword, role: invRole }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Usuário criado com sucesso!" })
        setShowInvite(false)
        setInvName(""); setInvEmail(""); setInvPhone(""); setInvPassword(""); setInvRole("user")
        fetchTeam()
      } else {
        toast({ variant: "destructive", title: data.error?.message || "Erro ao criar usuário" })
      }
    } catch {
      toast({ variant: "destructive", title: "Erro ao criar usuário" })
    } finally {
      setInviting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/team/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Membro removido com sucesso" })
        fetchTeam()
      } else {
        toast({ variant: "destructive", title: "Erro ao remover membro" })
      }
    } catch {
      toast({ variant: "destructive", title: "Erro ao remover membro" })
    } finally {
      setDeleteId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-8 w-32 mb-2" /><Skeleton className="h-4 w-56" /></div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (<Card key={i}><CardContent className="p-4 flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-lg" /><div><Skeleton className="h-7 w-10 mb-1" /><Skeleton className="h-3 w-20" /></div></CardContent></Card>))}
        </div>
        <Card><CardHeader><Skeleton className="h-5 w-40" /></CardHeader><CardContent className="space-y-3">
          {[...Array(4)].map((_, i) => (<div key={i} className="flex items-center gap-4 rounded-lg border p-4"><Skeleton className="h-12 w-12 rounded-full" /><div className="flex-1"><Skeleton className="h-5 w-36 mb-2" /><Skeleton className="h-3 w-48" /></div><Skeleton className="h-4 w-16" /></div>))}
        </CardContent></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h3 font-bold" data-testid="heading-equipe">Equipe</h1>
          <p className="text-muted-foreground">
            Gerencie os membros da sua equipe
          </p>
        </div>
        <Button data-testid="button-invite-user" onClick={() => setShowInvite(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Convidar Usuário
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2"><Users className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold">{members.length}</p>
              <p className="text-xs text-muted-foreground">Total membros</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-2"><User className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold">{members.filter(m => m.isActive).length}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2"><ShieldCheck className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold">{members.filter(m => m.role === "admin" || m.role === "super_admin").length}</p>
              <p className="text-xs text-muted-foreground">Administradores</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 dark:bg-purple-900/30 p-2"><Shield className="h-5 w-5 text-purple-600" /></div>
            <div>
              <p className="text-2xl font-bold">{members.reduce((sum, m) => sum + m._count.leads, 0)}</p>
              <p className="text-xs text-muted-foreground">Leads atribuídos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members list */}
      <Card>
        <CardHeader>
          <CardTitle>Membros da Equipe</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm flex-shrink-0">
                  {getInitials(member.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{member.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${roleColors[member.role] || roleColors.user}`}>
                      {roleLabels[member.role] || member.role}
                    </span>
                    {!member.isActive && (
                      <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-500">Inativo</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{member.email}</span>
                    {member.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{member.phone}</span>}
                  </div>
                </div>
                <div className="text-right text-sm hidden md:block">
                  <p className="font-medium">{member._count.leads} leads</p>
                  <p className="text-xs text-muted-foreground">
                    {member.lastLogin ? `Último acesso: ${formatDate(member.lastLogin)}` : "Nunca acessou"}
                  </p>
                </div>
                <div className="relative flex-shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => setMenuOpen(menuOpen === member.id ? null : member.id)}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                  {menuOpen === member.id && (
                    <div className="absolute right-0 top-10 z-50 w-40 rounded-lg border bg-card p-1 shadow-lg">
                      <button
                        onClick={() => { setMenuOpen(null); setDeleteId(member.id) }}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />Remover
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {/* Modal Convidar Usuário */}
      {showInvite && (
        <Portal><div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Convidar Usuário</h3>
            <div className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input value={invName} onChange={(e) => setInvName(e.target.value)} placeholder="Nome completo" className="mt-1" />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={invEmail} onChange={(e) => setInvEmail(e.target.value)} placeholder="email@empresa.com" className="mt-1" />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={invPhone} onChange={(e) => setInvPhone(e.target.value)} placeholder="(11) 99999-0000" className="mt-1" />
              </div>
              <div>
                <Label>Senha *</Label>
                <Input type="password" value={invPassword} onChange={(e) => setInvPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="mt-1" />
              </div>
              <div>
                <Label>Papel</Label>
                <select
                  value={invRole}
                  onChange={(e) => setInvRole(e.target.value)}
                  className="mt-1 flex h-10 w-full rounded-md border border-[var(--border)] bg-card text-foreground px-3 py-2 text-sm"
                >
                  <option value="user">Vendedor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowInvite(false); setInvName(""); setInvEmail(""); setInvPhone(""); setInvPassword(""); setInvRole("user") }}>Cancelar</Button>
              <Button onClick={handleInvite} disabled={inviting}>
                {inviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Criar Usuário
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
                <h3 className="text-lg font-semibold">Remover membro</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tem certeza que deseja remover este membro da equipe? Os leads atribuídos a ele serão desvinculados.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={() => handleDelete(deleteId)}>
                <Trash2 className="mr-2 h-4 w-4" />Remover
              </Button>
            </div>
          </div>
        </div></Portal>
      )}
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/stores/auth-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Building2, Users, CreditCard, Activity, TrendingUp, Plus, Loader2, Edit, Trash2, Ban, Play, Check, Settings, DollarSign } from "lucide-react"

interface AdminStats {
  totalCompanies: number
  activeTrials: number
  totalRevenue: number
  companiesByPlan: Record<string, number>
}

interface Company {
  id: string
  name: string
  slug: string
  email: string
  status: string
  trialEndsAt: string | null
  plan: { name: string; priceMonthly: number }
  _count: { users: number }
}

export default function AdminPage() {
  const router = useRouter()
  const { toast } = useToast()
  const user = useAuthStore((state) => state.user)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Modal state - Nova Empresa
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [plans, setPlans] = useState<{id: string; name: string; priceMonthly: number; features: string; maxUsers: number; maxAgents: number; maxLeads: number; maxStorage: number}[]>([])
  const [selectedFeatures, setSelectedFeatures] = useState<Record<string, boolean>>({
    calendar_enabled: true,
    voice_enabled: false,
    webhooks_enabled: false,
    api_access: false,
    white_label: false
  })
  const [formData, setFormData] = useState({
    companyName: "",
    cnpj: "",
    email: "",
    phone: "",
    adminName: "",
    password: "",
    planId: "",
    trialDays: "14"
  })

  // Modal state - Novo Plano
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  const [isPlanSubmitting, setIsPlanSubmitting] = useState(false)
  const [planFormData, setPlanFormData] = useState({
    name: "",
    description: "",
    priceMonthly: "",
    maxUsers: "",
    maxAgents: "",
    maxLeads: "",
    maxStorage: ""
  })

  // Modal state - Editar Plano
  const [isEditPlanModalOpen, setIsEditPlanModalOpen] = useState(false)
  const [isEditPlanSubmitting, setIsEditPlanSubmitting] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [editPlanFormData, setEditPlanFormData] = useState({
    name: "",
    description: "",
    priceMonthly: "",
    maxUsers: "",
    maxAgents: "",
    maxLeads: "",
    maxStorage: ""
  })

  // Modal state - Features
  const [isFeaturesModalOpen, setIsFeaturesModalOpen] = useState(false)
  const [featuresConfig, setFeaturesConfig] = useState([
    { key: "calendar_enabled", name: "Google Calendar", price: 0, description: "Integração com Google Calendar" },
    { key: "voice_enabled", name: "Voz em mensagens", price: 1500, description: "Mensagens de voz nos atendimentos" },
    { key: "webhooks_enabled", name: "Webhooks", price: 2000, description: "Webhooks para integrações externas" },
    { key: "api_access", name: "API Access", price: 3000, description: "Acesso à API REST" },
    { key: "white_label", name: "White Label", price: 5000, description: "Personalização de marca" },
    { key: "ai_advanced", name: "IA Avançada", price: 4000, description: "Agentes com GPT-4 e embeddings" },
    { key: "analytics_premium", name: "Analytics Premium", price: 2500, description: "Dashboards e relatórios avançados" }
  ])

  // Features disponíveis com preços adicionais (calculados dinamicamente)
  const availableFeatures = featuresConfig.map(f => ({
    key: f.key,
    name: f.name,
    price: f.price,
    included: f.price === 0 ? ["Starter", "Pro", "Enterprise"] : ["Enterprise"]
  }))

  const planPrices: Record<string, number> = {
    "Starter": 2900,
    "Pro": 9900,
    "Enterprise": 29900
  }

  useEffect(() => {
    // Proteção: apenas super_admin
    if (user && user.role !== "super_admin") {
      router.push("/dashboard")
      return
    }

    fetchStats()
    fetchCompanies()
    fetchPlans()
  }, [user, router])

  async function fetchStats() {
    try {
      const res = await fetch("/api/admin/stats")
      if (res.ok) {
        const data = await res.json()
        setStats(data.data)
      }
    } catch (err) {
      console.error("[Admin] Erro ao buscar stats:", err)
    }
  }

  async function fetchCompanies() {
    try {
      setIsLoading(true)
      const res = await fetch("/api/admin/companies")
      console.log("[Admin] Status companies:", res.status)
      if (res.ok) {
        const data = await res.json()
        console.log("[Admin] Companies data:", data)
        setCompanies(data.data?.companies || [])
      } else {
        const errorData = await res.json()
        console.error("[Admin] Erro companies:", errorData)
      }
    } catch (err) {
      console.error("[Admin] Erro ao buscar companies:", err)
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchPlans() {
    try {
      const res = await fetch("/api/admin/plans")
      if (res.ok) {
        const data = await res.json()
        setPlans(data.data?.plans || [])
        // Seleciona Pro por padrão se existir
        const proPlan = data.data?.plans?.find((p: any) => p.name === "Pro")
        if (proPlan) {
          setFormData(prev => ({ ...prev, planId: proPlan.id }))
        }
      }
    } catch (err) {
      console.error("[Admin] Erro ao buscar planos:", err)
    }
  }

  async function handleCreateCompany(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: formData.companyName,
          cnpj: formData.cnpj,
          email: formData.email,
          phone: formData.phone,
          adminName: formData.adminName,
          adminEmail: formData.email,
          password: formData.password,
          planId: formData.planId,
          trialDays: parseInt(formData.trialDays),
          customFeatures: selectedFeatures // Features personalizadas
        })
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error?.message || "Erro ao criar empresa")
      }

      toast({
        title: "Empresa criada!",
        description: `${formData.companyName} foi registrada com ${formData.trialDays} dias de trial.`
      })

      setIsModalOpen(false)
      setFormData({ companyName: "", cnpj: "", email: "", phone: "", adminName: "", password: "", planId: "", trialDays: "14" })
      setSelectedFeatures({ calendar_enabled: true, voice_enabled: false, webhooks_enabled: false, api_access: false, white_label: false })
      fetchCompanies()
      fetchStats()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao criar empresa",
        description: error instanceof Error ? error.message : "Tente novamente"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSuspendCompany(companyId: string) {
    if (!confirm("Tem certeza que deseja suspender esta empresa?")) return

    try {
      const res = await fetch(`/api/admin/companies/${companyId}/suspend`, { method: "POST" })
      if (!res.ok) throw new Error("Erro ao suspender")

      toast({ title: "Empresa suspensa" })
      fetchCompanies()
    } catch {
      toast({ variant: "destructive", title: "Erro ao suspender empresa" })
    }
  }

  async function handleActivateCompany(companyId: string) {
    try {
      const res = await fetch(`/api/admin/companies/${companyId}/activate`, { method: "POST" })
      if (!res.ok) throw new Error("Erro ao ativar")

      toast({ title: "Empresa reativada" })
      fetchCompanies()
    } catch {
      toast({ variant: "destructive", title: "Erro ao ativar empresa" })
    }
  }

  async function handleDeleteCompany(companyId: string) {
    if (!confirm("⚠️ ATENÇÃO! Isso excluirá a empresa e TODOS os seus dados permanentemente.\n\nTem certeza?")) return
    if (!confirm("Confirmação final: digite 'excluir' para confirmar")) return

    try {
      const res = await fetch(`/api/admin/companies/${companyId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Erro ao excluir")

      toast({ title: "Empresa excluída" })
      fetchCompanies()
      fetchStats()
    } catch {
      toast({ variant: "destructive", title: "Erro ao excluir empresa" })
    }
  }

  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault()
    setIsPlanSubmitting(true)

    try {
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: planFormData.name,
          description: planFormData.description,
          priceMonthly: parseInt(planFormData.priceMonthly) * 100, // em centavos
          maxUsers: parseInt(planFormData.maxUsers),
          maxAgents: parseInt(planFormData.maxAgents),
          maxLeads: parseInt(planFormData.maxLeads),
          maxStorage: parseInt(planFormData.maxStorage),
          features: featuresConfig // usa as features configuradas
        })
      })

      if (!res.ok) throw new Error("Erro ao criar plano")

      toast({ title: "Plano criado com sucesso!" })
      setIsPlanModalOpen(false)
      setPlanFormData({ name: "", description: "", priceMonthly: "", maxUsers: "", maxAgents: "", maxLeads: "", maxStorage: "" })
      fetchPlans()
      fetchStats()
    } catch {
      toast({ variant: "destructive", title: "Erro ao criar plano" })
    } finally {
      setIsPlanSubmitting(false)
    }
  }

  async function handleDeletePlan(planId: string, planName: string) {
    if (!confirm(`Excluir o plano "${planName}"? Esta ação não pode ser desfeita.`)) return

    try {
      const res = await fetch(`/api/admin/plans/${planId}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao excluir plano")

      toast({ title: "Plano excluído com sucesso" })
      fetchPlans()
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message || "Erro ao excluir plano" })
    }
  }

  function handleOpenEditPlan(plan: typeof plans[0]) {
    setEditingPlanId(plan.id)
    setEditPlanFormData({
      name: plan.name,
      description: (plan as any).description || "",
      priceMonthly: (plan.priceMonthly / 100).toFixed(2),
      maxUsers: String(plan.maxUsers),
      maxAgents: String(plan.maxAgents),
      maxLeads: String(plan.maxLeads),
      maxStorage: String(plan.maxStorage)
    })
    setIsEditPlanModalOpen(true)
  }

  async function handleUpdatePlan(e: React.FormEvent) {
    e.preventDefault()
    if (!editingPlanId) return
    setIsEditPlanSubmitting(true)

    try {
      const res = await fetch(`/api/admin/plans/${editingPlanId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editPlanFormData.name,
          description: editPlanFormData.description,
          priceMonthly: Math.round(parseFloat(editPlanFormData.priceMonthly) * 100),
          maxUsers: parseInt(editPlanFormData.maxUsers),
          maxAgents: parseInt(editPlanFormData.maxAgents),
          maxLeads: parseInt(editPlanFormData.maxLeads),
          maxStorage: parseInt(editPlanFormData.maxStorage)
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erro ao atualizar plano")
      }

      toast({ title: "Plano atualizado com sucesso!" })
      setIsEditPlanModalOpen(false)
      setEditingPlanId(null)
      fetchPlans()
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message || "Erro ao atualizar plano" })
    } finally {
      setIsEditPlanSubmitting(false)
    }
  }

  function handleUpdateFeaturePrice(key: string, newPrice: string) {
    setFeaturesConfig(prev => prev.map(f => 
      f.key === key ? { ...f, price: parseInt(newPrice) * 100 || 0 } : f
    ))
  }

  // Calcula preço total baseado no plano + features extras
  function calculateTotalPrice(): number {
    const selectedPlan = plans.find(p => p.id === formData.planId)
    if (!selectedPlan) return 0

    let total = selectedPlan.priceMonthly

    // Adiciona preço de features não incluídas no plano
    availableFeatures.forEach(feature => {
      if (selectedFeatures[feature.key] && !feature.included.includes(selectedPlan.name)) {
        total += feature.price
      }
    })

    return total
  }

  if (!user || user.role !== "super_admin") {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Acesso restrito a super administradores</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Painel Administrativo</h1>
        <p className="text-muted-foreground">Gerencie empresas, planos e visualize métricas</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCompanies || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trials Ativos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeTrials || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {((stats?.totalRevenue || 0) / 100).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planos Ativos</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.companiesByPlan ? Object.keys(stats.companiesByPlan).length : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="companies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="companies">Empresas</TabsTrigger>
          <TabsTrigger value="plans">Planos</TabsTrigger>
          <TabsTrigger value="audit">Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="companies" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Empresas Cadastradas</CardTitle>
                <CardDescription>Gerencie as empresas do sistema</CardDescription>
              </div>
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Nova Empresa
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Nova Empresa</DialogTitle>
                    <DialogDescription>
                      Configure a nova empresa com plano, trial e features personalizadas.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateCompany} className="space-y-4">
                    {/* Dados da Empresa */}
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Razão Social / Nome da Empresa *</Label>
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        placeholder="Minha Empresa LTDA"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cnpj">CNPJ (opcional)</Label>
                        <Input
                          id="cnpj"
                          value={formData.cnpj}
                          onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                          placeholder="00.000.000/0000-00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone (opcional)</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail corporativo *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="voce@empresa.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adminName">Nome do Responsável *</Label>
                      <Input
                        id="adminName"
                        value={formData.adminName}
                        onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                        placeholder="Nome completo"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Mínimo 8 caracteres"
                        minLength={8}
                        required
                      />
                    </div>

                    {/* Plano e Trial */}
                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-medium mb-3">Plano e Configurações</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="planId">Plano *</Label>
                          <select
                            id="planId"
                            value={formData.planId}
                            onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                            required
                          >
                            <option value="">Selecione...</option>
                            {plans.map(plan => (
                              <option key={plan.id} value={plan.id}>
                                {plan.name} - R$ {(plan.priceMonthly / 100).toFixed(2)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="trialDays">Dias de Trial *</Label>
                          <Input
                            id="trialDays"
                            type="number"
                            min="1"
                            max="365"
                            value={formData.trialDays}
                            onChange={(e) => setFormData({ ...formData, trialDays: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">Features Personalizadas</h4>
                      <div className="space-y-2">
                        {availableFeatures.map(feature => {
                          const selectedPlan = plans.find(p => p.id === formData.planId)
                          const isIncluded = selectedPlan && feature.included.includes(selectedPlan.name)
                          const isSelected = selectedFeatures[feature.key]

                          return (
                            <div key={feature.key} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  id={feature.key}
                                  checked={isSelected}
                                  onChange={(e) => setSelectedFeatures(prev => ({ ...prev, [feature.key]: e.target.checked }))}
                                  className="h-4 w-4"
                                />
                                <Label htmlFor={feature.key} className="cursor-pointer">
                                  {feature.name}
                                  {isIncluded && <span className="ml-2 text-xs text-green-600">(incluído)</span>}
                                </Label>
                              </div>
                              {!isIncluded && feature.price > 0 && (
                                <span className="text-sm text-muted-foreground">
                                  +R$ {(feature.price / 100).toFixed(2)}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Preço Total */}
                    <div className="border-t pt-4 bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Preço Mensal Total:</span>
                        <span className="text-xl font-bold text-primary">
                          R$ {(calculateTotalPrice() / 100).toFixed(2)}
                        </span>
                      </div>
                      {calculateTotalPrice() > (plans.find(p => p.id === formData.planId)?.priceMonthly || 0) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Base: R$ {((plans.find(p => p.id === formData.planId)?.priceMonthly || 0) / 100).toFixed(2)} + Extras
                        </p>
                      )}
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Criando...
                          </>
                        ) : (
                          "Criar Empresa"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground">Carregando...</p>
              ) : companies.length === 0 ? (
                <p className="text-muted-foreground">Nenhuma empresa cadastrada</p>
              ) : (
                <div className="space-y-2">
                  {companies.map((company) => (
                    <div
                      key={company.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{company.name}</p>
                        <p className="text-sm text-muted-foreground">{company.email}</p>
                        {company.trialEndsAt && (
                          <p className="text-xs text-muted-foreground">
                            Trial até: {new Date(company.trialEndsAt).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm px-2 py-1 bg-primary/10 rounded">
                          {company.plan.name}
                        </span>
                        <span
                          className={`text-sm px-2 py-1 rounded ${
                            company.status === "trial"
                              ? "bg-yellow-100 text-yellow-700"
                              : company.status === "active"
                              ? "bg-green-100 text-green-700"
                              : company.status === "suspended"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {company.status}
                        </span>
                        {/* Ações */}
                        <div className="flex items-center gap-1 ml-2">
                          {company.status !== "suspended" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-yellow-600"
                              onClick={() => handleSuspendCompany(company.id)}
                              title="Suspender"
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-green-600"
                              onClick={() => handleActivateCompany(company.id)}
                              title="Reativar"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => alert("Editar em desenvolvimento")}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-600"
                            onClick={() => handleDeleteCompany(company.id)}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          {/* Botão de Features */}
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setIsFeaturesModalOpen(true)}>
              <Settings className="h-4 w-4 mr-1" />
              Features e Preços
            </Button>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Planos Disponíveis</CardTitle>
                <CardDescription>Gerencie os planos e limites do sistema</CardDescription>
              </div>
              <Dialog open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Novo Plano
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Novo Plano</DialogTitle>
                    <DialogDescription>
                      Crie um novo plano com limites e features específicas.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreatePlan} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="planName">Nome do Plano *</Label>
                      <Input
                        id="planName"
                        value={planFormData.name}
                        onChange={(e) => setPlanFormData({ ...planFormData, name: e.target.value })}
                        placeholder="Ex: Premium, Gold, Ultimate"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="planDescription">Descrição</Label>
                      <Input
                        id="planDescription"
                        value={planFormData.description}
                        onChange={(e) => setPlanFormData({ ...planFormData, description: e.target.value })}
                        placeholder="Descrição do plano"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="planPrice">Preço Mensal (R$) *</Label>
                      <Input
                        id="planPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        value={planFormData.priceMonthly}
                        onChange={(e) => setPlanFormData({ ...planFormData, priceMonthly: e.target.value })}
                        placeholder="99.90"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="maxUsers">Máx. Usuários *</Label>
                        <Input
                          id="maxUsers"
                          type="number"
                          min="1"
                          value={planFormData.maxUsers}
                          onChange={(e) => setPlanFormData({ ...planFormData, maxUsers: e.target.value })}
                          placeholder="3"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxAgents">Máx. Agentes *</Label>
                        <Input
                          id="maxAgents"
                          type="number"
                          min="1"
                          value={planFormData.maxAgents}
                          onChange={(e) => setPlanFormData({ ...planFormData, maxAgents: e.target.value })}
                          placeholder="5"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="maxLeads">Máx. Leads *</Label>
                        <Input
                          id="maxLeads"
                          type="number"
                          min="1"
                          value={planFormData.maxLeads}
                          onChange={(e) => setPlanFormData({ ...planFormData, maxLeads: e.target.value })}
                          placeholder="500"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxStorage">Storage (MB) *</Label>
                        <Input
                          id="maxStorage"
                          type="number"
                          min="1"
                          value={planFormData.maxStorage}
                          onChange={(e) => setPlanFormData({ ...planFormData, maxStorage: e.target.value })}
                          placeholder="1024"
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsPlanModalOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={isPlanSubmitting}>
                        {isPlanSubmitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                        Criar Plano
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {plans.length === 0 ? (
                <p className="text-muted-foreground">Nenhum plano cadastrado</p>
              ) : (
                <div className="space-y-2">
                  {plans.map((plan) => (
                    <div key={plan.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{plan.name}</p>
                          <span className="text-sm font-bold text-primary">
                            R$ {(plan.priceMonthly / 100).toFixed(2)}/mês
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {plan.maxUsers} usuários · {plan.maxAgents} agentes · {plan.maxLeads} leads · {plan.maxStorage}MB storage
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleOpenEditPlan(plan)} title="Editar">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600" onClick={() => handleDeletePlan(plan.id, plan.name)} title="Excluir">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Log de Auditoria</CardTitle>
              <CardDescription>Histórico de ações administrativas</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Funcionalidade em desenvolvimento</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Editar Plano */}
      <Dialog open={isEditPlanModalOpen} onOpenChange={setIsEditPlanModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Plano</DialogTitle>
            <DialogDescription>Atualize os dados e limites do plano.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdatePlan} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Plano *</Label>
              <Input
                value={editPlanFormData.name}
                onChange={(e) => setEditPlanFormData({ ...editPlanFormData, name: e.target.value })}
                placeholder="Ex: Premium"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={editPlanFormData.description}
                onChange={(e) => setEditPlanFormData({ ...editPlanFormData, description: e.target.value })}
                placeholder="Descrição do plano"
              />
            </div>
            <div className="space-y-2">
              <Label>Preço Mensal (R$) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={editPlanFormData.priceMonthly}
                onChange={(e) => setEditPlanFormData({ ...editPlanFormData, priceMonthly: e.target.value })}
                placeholder="99.90"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Máx. Usuários *</Label>
                <Input
                  type="number"
                  min="1"
                  value={editPlanFormData.maxUsers}
                  onChange={(e) => setEditPlanFormData({ ...editPlanFormData, maxUsers: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Máx. Agentes *</Label>
                <Input
                  type="number"
                  min="1"
                  value={editPlanFormData.maxAgents}
                  onChange={(e) => setEditPlanFormData({ ...editPlanFormData, maxAgents: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Máx. Leads *</Label>
                <Input
                  type="number"
                  min="1"
                  value={editPlanFormData.maxLeads}
                  onChange={(e) => setEditPlanFormData({ ...editPlanFormData, maxLeads: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Storage (MB) *</Label>
                <Input
                  type="number"
                  min="1"
                  value={editPlanFormData.maxStorage}
                  onChange={(e) => setEditPlanFormData({ ...editPlanFormData, maxStorage: e.target.value })}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditPlanModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isEditPlanSubmitting}>
                {isEditPlanSubmitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Features */}
      <Dialog open={isFeaturesModalOpen} onOpenChange={setIsFeaturesModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Features e Preços</DialogTitle>
            <DialogDescription>
              Configure as funcionalidades disponíveis e seus preços adicionais.
              Features com preço 0 são incluídas em todos os planos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {featuresConfig.map((feature) => (
              <div key={feature.key} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{feature.name}</p>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={(feature.price / 100).toFixed(2)}
                    onChange={(e) => handleUpdateFeaturePrice(feature.key, e.target.value)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">/mês</span>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsFeaturesModalOpen(false)}>
              <Check className="h-4 w-4 mr-1" />
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

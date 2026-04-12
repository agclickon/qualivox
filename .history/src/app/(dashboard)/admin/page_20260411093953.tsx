"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuthStore } from "@/stores/auth-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Building2, Users, CreditCard, Activity, TrendingUp, Plus, ExternalLink } from "lucide-react"

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
  const user = useAuthStore((state) => state.user)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Proteção: apenas super_admin
    if (user && user.role !== "super_admin") {
      router.push("/dashboard")
      return
    }

    fetchStats()
    fetchCompanies()
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
      if (res.ok) {
        const data = await res.json()
        setCompanies(data.data?.companies || [])
      }
    } catch (err) {
      console.error("[Admin] Erro ao buscar companies:", err)
    } finally {
      setIsLoading(false)
    }
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
              <Link href="/registrar-empresa" target="_blank">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Nova Empresa
                </Button>
              </Link>
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
                      <div>
                        <p className="font-medium">{company.name}</p>
                        <p className="text-sm text-muted-foreground">{company.email}</p>
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
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {company.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Planos Disponíveis</CardTitle>
                <CardDescription>Gerencie os planos e limites</CardDescription>
              </div>
              <Button size="sm" variant="outline" disabled>
                <Plus className="h-4 w-4 mr-1" />
                Novo Plano
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Funcionalidade em desenvolvimento</p>
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
    </div>
  )
}

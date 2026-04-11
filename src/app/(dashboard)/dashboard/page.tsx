"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, TrendingUp, Target, Award, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts"
import { formatDate } from "@/lib/utils"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const color = payload[0]?.payload?.color || payload[0]?.payload?.fill || payload[0]?.color || '#fff'
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-semibold mb-0.5" style={{ color }}>{label || payload[0]?.name}</p>
      <p className="font-bold text-base" style={{ color }}>{payload[0]?.value}</p>
    </div>
  )
}

const statusLabels: Record<string, string> = {
  novo: "Novo",
  contatado: "Contatado",
  qualificado: "Qualificado",
  em_negociacao: "Em Negociação",
  proposta_enviada: "Proposta",
  fechado_ganho: "Ganho",
  fechado_perdido: "Perdido",
}

const statusColors: Record<string, string> = {
  novo: "#3B82F6",
  contatado: "#8B5CF6",
  qualificado: "#10B981",
  em_negociacao: "#F59E0B",
  proposta_enviada: "#EC4899",
  fechado_ganho: "#22C55E",
  fechado_perdido: "#EF4444",
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

const sourceColors = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EC4899", "#22C55E", "#EF4444", "#6B7280"]

interface Analytics {
  summary: {
    totalLeads: number
    newLeadsToday: number
    conversionRate: number
    averageScore: number
    closedWon: number
    closedLost: number
  }
  leadsByStatus: Record<string, number>
  leadsBySource: Record<string, number>
  recentLeads: Array<{
    id: string
    name: string
    status: string
    createdAt: string
    assignedTo: { name: string } | null
    pipelineStage: { name: string; color: string } | null
  }>
}

export default function DashboardPage() {
  const { toast } = useToast()
  const [data, setData] = useState<Analytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/analytics/overview")
      const result = await res.json()
      if (result.success) {
        setData(result.data)
      }
    } catch {
      toast({ variant: "destructive", title: "Erro ao carregar métricas" })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-16 mb-1" /><Skeleton className="h-3 w-32" /></CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card><CardHeader><Skeleton className="h-5 w-36" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-5 w-36" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
        </div>
        <Card>
          <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
          <CardContent className="space-y-3">
            {[...Array(5)].map((_, i) => (<Skeleton key={i} className="h-14 w-full" />))}
          </CardContent>
        </Card>
      </div>
    )
  }

  const summary = data?.summary || {
    totalLeads: 0, newLeadsToday: 0, conversionRate: 0, averageScore: 0, closedWon: 0, closedLost: 0,
  }

  const statusChartData = Object.entries(data?.leadsByStatus || {}).map(([key, value]) => ({
    name: statusLabels[key] || key,
    value,
    fill: statusColors[key] || "#6B7280",
    color: statusColors[key] || "#6B7280",
  }))

  const sourceChartData = Object.entries(data?.leadsBySource || {}).map(([key, value], i) => ({
    name: sourceLabels[key] || key,
    value,
    fill: sourceColors[i % sourceColors.length],
    color: sourceColors[i % sourceColors.length],
  }))

  const metrics = [
    {
      title: "Total de Leads",
      value: summary.totalLeads.toString(),
      description: "leads cadastrados",
      icon: Users,
      color: "text-primary",
    },
    {
      title: "Novos Hoje",
      value: summary.newLeadsToday.toString(),
      description: "novos leads hoje",
      icon: TrendingUp,
      color: "text-success",
    },
    {
      title: "Taxa de Conversão",
      value: `${summary.conversionRate}%`,
      description: `${summary.closedWon} ganhos / ${summary.closedLost} perdidos`,
      icon: Target,
      color: "text-warning",
    },
    {
      title: "Score Médio",
      value: summary.averageScore.toString(),
      description: "pontuação média dos leads",
      icon: Award,
      color: "text-secondary",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h3 font-bold" data-testid="heading-dashboard">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral das métricas e KPIs do seu CRM
        </p>
      </div>

      {/* Métricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <metric.icon className={`h-5 w-5 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">{metric.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Leads por Status - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Leads por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusChartData.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
                Nenhum dado disponível
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={statusChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={{ stroke: "var(--border)" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={{ stroke: "var(--border)" }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.08)" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} activeBar={{ stroke: "none", fillOpacity: 0.7 }}>
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Leads por Origem - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Leads por Origem</CardTitle>
          </CardHeader>
          <CardContent>
            {sourceChartData.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
                Nenhum dado disponível
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={sourceChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent, x, y, textAnchor, index }: any) => (<text x={x} y={y} textAnchor={textAnchor} fill={sourceColors[index % sourceColors.length]} fontSize={12} fontWeight={600}>{`${name} ${(percent * 100).toFixed(0)}%`}</text>)}
                    labelLine={{ stroke: "var(--muted-foreground)" }}
                  >
                    {sourceChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11 }}
                    iconType="circle"
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leads Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Leads Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.recentLeads || data.recentLeads.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground text-sm">
              Nenhum lead cadastrado ainda
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: lead.pipelineStage?.color || "#6B7280" }}
                    />
                    <div>
                      <p className="text-sm font-medium">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {lead.pipelineStage?.name || statusLabels[lead.status] || lead.status}
                        {lead.assignedTo && ` • ${lead.assignedTo.name}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(lead.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

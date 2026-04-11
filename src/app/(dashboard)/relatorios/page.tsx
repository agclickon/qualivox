"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, TrendingUp, Users, DollarSign, Target, Award, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const color = payload[0]?.payload?.color || payload[0]?.color || payload[0]?.fill || '#fff'
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-semibold mb-0.5" style={{ color }}>{label || payload[0]?.name}</p>
      <p className="font-bold text-base" style={{ color }}>{payload[0]?.value}</p>
    </div>
  )
}

interface OverviewData {
  summary: {
    totalLeads: number
    newLeadsToday: number
    conversionRate: number
    averageScore: number
    closedWon: number
    closedLost: number
  }
  leadsBySource: Record<string, number>
  leadsByStatus: Record<string, number>
}

const sourceLabels: Record<string, string> = {
  whatsapp: "WhatsApp", website: "Website", indicacao: "Indicação",
  telefone: "Telefone", email: "Email", rede_social: "Rede Social",
  evento: "Evento", outro: "Outro",
}

const statusLabels: Record<string, string> = {
  novo: "Novo", contatado: "Contatado", qualificado: "Qualificado",
  em_negociacao: "Negociação", proposta_enviada: "Proposta",
  fechado_ganho: "Ganho", fechado_perdido: "Perdido",
}

const COLORS = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EC4899", "#22C55E", "#EF4444", "#6366F1"]

export default function RelatoriosPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/analytics/overview")
        const json = await res.json()
        if (json.success) setData(json.data)
      } catch (err) {
        console.error("Erro:", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-8 w-36 mb-2" /><Skeleton className="h-4 w-64" /></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (<Card key={i}><CardContent className="p-4"><Skeleton className="h-3 w-20 mb-2" /><Skeleton className="h-7 w-16 mb-1" /><Skeleton className="h-3 w-24" /></CardContent></Card>))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
          <Card className="md:col-span-2"><CardHeader><Skeleton className="h-5 w-44" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
        </div>
      </div>
    )
  }

  const s = data.summary
  const conversionRate = s.conversionRate.toFixed(1)
  const lossRate = s.totalLeads > 0 ? ((s.closedLost / s.totalLeads) * 100).toFixed(1) : "0"

  const sourceData = Object.entries(data.leadsBySource).map(([source, count], i) => ({
    name: sourceLabels[source] || source,
    value: count,
    color: COLORS[i % COLORS.length],
  }))

  const statusData = Object.entries(data.leadsByStatus).map(([status, count], i) => ({
    name: statusLabels[status] || status,
    value: count,
    color: COLORS[i % COLORS.length],
  }))

  const funnelData = [
    { name: "Novos", value: statusData.find(s => s.name === "Novo")?.value || 0, color: COLORS[0] },
    { name: "Contatados", value: statusData.find(s => s.name === "Contatado")?.value || 0, color: COLORS[1] },
    { name: "Qualificados", value: statusData.find(s => s.name === "Qualificado")?.value || 0, color: COLORS[2] },
    { name: "Negociação", value: statusData.find(s => s.name === "Negociação")?.value || 0, color: COLORS[3] },
    { name: "Proposta", value: statusData.find(s => s.name === "Proposta")?.value || 0, color: COLORS[4] },
    { name: "Ganhos", value: statusData.find(s => s.name === "Ganho")?.value || 0, color: COLORS[5] },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h3 font-bold" data-testid="heading-relatorios">Relatórios</h1>
        <p className="text-muted-foreground">Análises de performance e métricas detalhadas</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Users className="h-3.5 w-3.5" />Total Leads</div>
            <p className="text-2xl font-bold">{s.totalLeads}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.newLeadsToday} novos hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><TrendingUp className="h-3.5 w-3.5" />Taxa Conversão</div>
            <p className="text-2xl font-bold text-green-600">{conversionRate}%</p>
            <div className="flex items-center gap-1 text-xs text-green-600 mt-1"><ArrowUpRight className="h-3 w-3" />{s.closedWon} convertidos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Target className="h-3.5 w-3.5" />Taxa Perda</div>
            <p className="text-2xl font-bold text-red-500">{lossRate}%</p>
            <div className="flex items-center gap-1 text-xs text-red-500 mt-1"><ArrowDownRight className="h-3 w-3" />{s.closedLost} perdidos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Award className="h-3.5 w-3.5" />Score Médio</div>
            <p className="text-2xl font-bold">{s.averageScore}</p>
            <div className="h-1.5 w-full rounded-full bg-muted mt-2 overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${s.averageScore}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><DollarSign className="h-3.5 w-3.5" />Pipeline</div>
            <p className="text-2xl font-bold">{s.totalLeads - s.closedWon - s.closedLost}</p>
            <p className="text-xs text-muted-foreground mt-1">leads em andamento</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Funil de Vendas</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={funnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.08)" }} />
                <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} activeBar={{ stroke: "none", fillOpacity: 0.7 }}>
                  {funnelData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Leads por Origem</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={sourceData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent, x, y, textAnchor, index }) => (<text x={x} y={y} textAnchor={textAnchor} fill={COLORS[index % COLORS.length]} fontSize={12} fontWeight={600}>{`${name} ${(percent * 100).toFixed(0)}%`}</text>)} labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}>
                  {sourceData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Distribuição por Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.08)" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} activeBar={{ stroke: "none", fillOpacity: 0.7 }}>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

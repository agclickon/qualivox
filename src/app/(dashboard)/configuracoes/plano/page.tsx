"use client"

import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  CreditCard, 
  Users, 
  MessageSquare, 
  Bot, 
  Calendar,
  Check,
  AlertTriangle,
  TrendingUp,
  Clock
} from "lucide-react"

interface PlanUsageData {
  plan: {
    id: string
    name: string
    priceMonthly: number
    maxLeads: number
    maxUsers: number
    maxWhatsappConnections: number
    maxAgents: number
    features: Record<string, boolean>
  }
  company: {
    id: string
    name: string
    status: string
    trialEndsAt: string | null
    isTrial: boolean
  }
  usage: {
    leads: number
    users: number
    whatsappConnections: number
    agents: number
  }
  limits: {
    leads: number
    users: number
    whatsappConnections: number
    agents: number
  }
  percentages: {
    leads: number
    users: number
    whatsappConnections: number
    agents: number
  }
}

const PLAN_INFO: Record<string, { name: string; description: string; color: string }> = {
  Starter: { name: "Starter", description: "Para pequenas empresas iniciando", color: "bg-blue-500" },
  Pro: { name: "Pro", description: "Para equipes em crescimento", color: "bg-purple-500" },
  Enterprise: { name: "Enterprise", description: "Para grandes operações", color: "bg-amber-500" }
}

export default function PlanoPage() {
  const { toast } = useToast()
  const [data, setData] = useState<PlanUsageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadPlanUsage()
  }, [])

  async function loadPlanUsage() {
    try {
      setIsLoading(true)
      const res = await fetch("/api/plan/usage")
      const result = await res.json()
      if (result.success) {
        setData(result.data)
      } else {
        toast({ variant: "destructive", title: "Erro ao carregar plano", description: result.error })
      }
    } catch {
      toast({ variant: "destructive", title: "Erro ao carregar plano" })
    } finally {
      setIsLoading(false)
    }
  }

  function formatCurrency(cents: number): string {
    return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "-"
    return new Date(dateStr).toLocaleDateString("pt-BR")
  }

  function getDaysRemaining(trialEndsAt: string | null): number {
    if (!trialEndsAt) return 0
    const diff = new Date(trialEndsAt).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <h1 className="text-3xl font-bold">Meu Plano</h1>
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <h1 className="text-3xl font-bold">Meu Plano</h1>
        <p className="text-muted-foreground">Não foi possível carregar os dados do plano.</p>
      </div>
    )
  }

  const planInfo = PLAN_INFO[data.plan.name] || { name: data.plan.name, description: "", color: "bg-gray-500" }
  const daysRemaining = getDaysRemaining(data.company.trialEndsAt)

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meu Plano</h1>
          <p className="text-muted-foreground">Gerencie seu plano e visualize limites</p>
        </div>
        {data.company.isTrial && (
          <Badge variant="secondary" className="text-yellow-600 bg-yellow-100">
            <Clock className="h-3 w-3 mr-1" />
            Trial — {daysRemaining} dias restantes
          </Badge>
        )}
      </div>

      {/* Card do Plano Atual */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg ${planInfo.color} flex items-center justify-center`}>
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">Plano {planInfo.name}</CardTitle>
              <CardDescription>{planInfo.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">{formatCurrency(data.plan.priceMonthly)}</span>
            <span className="text-muted-foreground">/mês</span>
          </div>

          {data.company.isTrial && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-medium">Você está no trial do plano Pro</p>
                  <p>Após {formatDate(data.company.trialEndsAt)}, será necessário fazer upgrade para continuar.</p>
                </div>
              </div>
            </div>
          )}

          {/* Features */}
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(data.plan.features).map(([key, enabled]) => (
              <div key={key} className="flex items-center gap-2 text-sm">
                <div className={`h-4 w-4 rounded flex items-center justify-center ${enabled ? "bg-green-500" : "bg-gray-300"}`}>
                  {enabled && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className={enabled ? "" : "text-muted-foreground line-through"}>
                  {formatFeatureName(key)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" disabled={data.plan.name === "Enterprise"}>
            <TrendingUp className="h-4 w-4 mr-2" />
            {data.plan.name === "Enterprise" ? "Você já está no plano máximo" : "Fazer Upgrade"}
          </Button>
        </CardFooter>
      </Card>

      {/* Uso dos Limites */}
      <h2 className="text-xl font-semibold mt-8">Uso do Plano</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UsageCard
          icon={<Users className="h-5 w-5" />}
          title="Leads"
          current={data.usage.leads}
          limit={data.limits.leads}
          percentage={data.percentages.leads}
        />
        <UsageCard
          icon={<Users className="h-5 w-5" />}
          title="Usuários"
          current={data.usage.users}
          limit={data.limits.users}
          percentage={data.percentages.users}
        />
        <UsageCard
          icon={<MessageSquare className="h-5 w-5" />}
          title="Conexões WhatsApp"
          current={data.usage.whatsappConnections}
          limit={data.limits.whatsappConnections}
          percentage={data.percentages.whatsappConnections}
        />
        <UsageCard
          icon={<Bot className="h-5 w-5" />}
          title="Agentes IA"
          current={data.usage.agents}
          limit={data.limits.agents}
          percentage={data.percentages.agents}
        />
      </div>

      {/* Comparativo de Planos */}
      <h2 className="text-xl font-semibold mt-8">Planos Disponíveis</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PlanComparisonCard
          name="Starter"
          price={2900}
          limits={{ leads: 50, users: 2, whatsapp: 1, agents: 1 }}
          features={["calendar_enabled"]}
          currentPlan={data.plan.name === "Starter"}
        />
        <PlanComparisonCard
          name="Pro"
          price={9900}
          limits={{ leads: 500, users: 10, whatsapp: 3, agents: 5 }}
          features={["calendar_enabled", "voice_enabled", "webhooks_enabled", "api_access"]}
          currentPlan={data.plan.name === "Pro"}
          recommended
        />
        <PlanComparisonCard
          name="Enterprise"
          price={29900}
          limits={{ leads: "∞", users: "∞", whatsapp: "∞", agents: "∞" }}
          features={["calendar_enabled", "voice_enabled", "webhooks_enabled", "api_access", "white_label"]}
          currentPlan={data.plan.name === "Enterprise"}
        />
      </div>
    </div>
  )
}

function UsageCard({
  icon,
  title,
  current,
  limit,
  percentage
}: {
  icon: React.ReactNode
  title: string
  current: number
  limit: number
  percentage: number
}) {
  const isUnlimited = limit >= 999999
  const isWarning = percentage >= 80 && !isUnlimited
  const isDanger = percentage >= 100 && !isUnlimited

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium">{title}</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {isUnlimited ? `${current} / ∞` : `${current} / ${limit}`}
          </span>
        </div>
        {!isUnlimited && (
          <>
            <Progress 
              value={percentage} 
              className={`h-2 ${isDanger ? "bg-red-200" : isWarning ? "bg-yellow-200" : ""}`}
            />
            <p className={`text-xs mt-1 ${isDanger ? "text-red-600" : isWarning ? "text-yellow-600" : "text-muted-foreground"}`}>
              {isDanger ? "Limite atingido! Faça upgrade." : isWarning ? "Você usou mais de 80% do limite." : `${percentage}% utilizado`}
            </p>
          </>
        )}
        {isUnlimited && (
          <p className="text-xs text-green-600 mt-1">Ilimitado</p>
        )}
      </CardContent>
    </Card>
  )
}

function PlanComparisonCard({
  name,
  price,
  limits,
  features,
  currentPlan,
  recommended
}: {
  name: string
  price: number
  limits: { leads: number | string; users: number | string; whatsapp: number | string; agents: number | string }
  features: string[]
  currentPlan?: boolean
  recommended?: boolean
}) {
  const formatCurrency = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`

  return (
    <Card className={currentPlan ? "border-primary" : recommended ? "border-purple-300" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{name}</CardTitle>
          {currentPlan && <Badge>Atual</Badge>}
          {recommended && !currentPlan && <Badge variant="secondary">Recomendado</Badge>}
        </div>
        <CardDescription>
          <span className="text-2xl font-bold">{formatCurrency(price)}</span>/mês
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Leads</span>
            <span>{limits.leads}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Usuários</span>
            <span>{limits.users}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">WhatsApp</span>
            <span>{limits.whatsapp}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Agentes IA</span>
            <span>{limits.agents}</span>
          </div>
        </div>

        <div className="pt-2 border-t space-y-1">
          {features.includes("calendar_enabled") && (
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              <span>Integração Google Calendar</span>
            </div>
          )}
          {features.includes("voice_enabled") && (
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              <span>Voz em mensagens</span>
            </div>
          )}
          {features.includes("webhooks_enabled") && (
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              <span>Webhooks</span>
            </div>
          )}
          {features.includes("api_access") && (
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              <span>API Access</span>
            </div>
          )}
          {features.includes("white_label") && (
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              <span>White Label</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          variant={currentPlan ? "outline" : "default"} 
          className="w-full" 
          disabled={currentPlan}
        >
          {currentPlan ? "Plano Atual" : "Escolher Plano"}
        </Button>
      </CardFooter>
    </Card>
  )
}

function formatFeatureName(key: string): string {
  const names: Record<string, string> = {
    calendar_enabled: "Google Calendar",
    voice_enabled: "Voz em mensagens",
    webhooks_enabled: "Webhooks",
    api_access: "API Access",
    white_label: "White Label"
  }
  return names[key] || key
}

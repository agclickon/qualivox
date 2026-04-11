"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, X, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface UsageAlert {
  resource: string
  current: number
  limit: number
  percentage: number
}

export function PlanUsageBanner() {
  const [alerts, setAlerts] = useState<UsageAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    loadUsage()
  }, [])

  async function loadUsage() {
    try {
      const res = await fetch("/api/plan/usage")
      const result = await res.json()
      if (result.success && result.data) {
        const { usage, limits, percentages } = result.data
        const newAlerts: UsageAlert[] = []

        // Verifica cada recurso com uso > 80%
        const resources = [
          { key: "leads", name: "leads" },
          { key: "users", name: "usuários" },
          { key: "whatsappConnections", name: "conexões WhatsApp" },
          { key: "agents", name: "agentes IA" }
        ] as const

        for (const { key, name } of resources) {
          const limit = limits[key]
          if (limit >= 999999) continue // Ilimitado

          const pct = percentages[key]
          if (pct >= 80) {
            newAlerts.push({
              resource: name,
              current: usage[key],
              limit,
              percentage: pct
            })
          }
        }

        setAlerts(newAlerts)
      }
    } catch {
      // Silencioso — não quebra a UX se falhar
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || dismissed || alerts.length === 0) {
    return null
  }

  // Mostra apenas o alerte mais crítico (maior percentagem)
  const mostCritical = alerts.sort((a, b) => b.percentage - a.percentage)[0]
  const isDanger = mostCritical.percentage >= 100
  const isWarning = mostCritical.percentage >= 80 && !isDanger

  return (
    <div 
      className={`px-4 py-3 ${
        isDanger 
          ? "bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800" 
          : "bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle 
            className={`h-5 w-5 ${isDanger ? "text-red-600" : "text-yellow-600"}`} 
          />
          <div className="text-sm">
            <span className={isDanger ? "text-red-800 dark:text-red-200" : "text-yellow-800 dark:text-yellow-200"}>
              <span className="font-medium">
                {isDanger 
                  ? `Limite de ${mostCritical.resource} atingido! ` 
                  : `Você está próximo do limite de ${mostCritical.resource}. `
                }
              </span>
              <span className="ml-1">
                {mostCritical.current} / {mostCritical.limit} ({mostCritical.percentage}%)
              </span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/configuracoes/plano">
            <Button 
              size="sm" 
              variant={isDanger ? "default" : "outline"}
              className={isDanger ? "bg-red-600 hover:bg-red-700" : ""}
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              Fazer Upgrade
            </Button>
          </Link>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => setDismissed(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

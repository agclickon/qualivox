/**
 * API de Stats do Admin — Dashboard de métricas SaaS
 * 
 * GET /api/admin/stats
 * Retorna: total de empresas, trials ativos, receita, empresas por plano
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyAccessToken } from "@/lib/auth"

async function getUser(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value
  if (!token) return null
  return verifyAccessToken(token)
}

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  
  if (!user || user.role !== "super_admin") {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Acesso restrito a super admin" } },
      { status: 403 }
    )
  }

  try {
    // Total de empresas
    const totalCompanies = await prisma.saasCompany.count()

    // Trials ativos
    const activeTrials = await prisma.saasCompany.count({
      where: {
        status: "trial",
        trialEndsAt: { gt: new Date() }
      }
    })

    // Empresas por plano
    const companiesByPlan = await prisma.saasCompany.groupBy({
      by: ["planId"],
      _count: { id: true }
    })

    // Busca nomes dos planos
    const planIds = companiesByPlan.map(c => c.planId)
    const plans = await prisma.saasPlan.findMany({
      where: { id: { in: planIds } },
      select: { id: true, name: true, priceMonthly: true }
    })

    // Calcula receita mensal (empresas ativas * preço do plano)
    const activeCompanies = await prisma.saasCompany.findMany({
      where: { status: { in: ["active", "trial"] } },
      select: { planId: true }
    })

    let totalRevenue = 0
    const planMap = new Map(plans.map(p => [p.id, p]))
    
    for (const company of activeCompanies) {
      const plan = planMap.get(company.planId)
      if (plan) {
        totalRevenue += plan.priceMonthly
      }
    }

    // Formata companiesByPlan para o frontend
    const companiesByPlanFormatted: Record<string, number> = {}
    for (const item of companiesByPlan) {
      const plan = planMap.get(item.planId)
      const planName = plan?.name || "Desconhecido"
      companiesByPlanFormatted[planName] = item._count.id
    }

    return NextResponse.json({
      success: true,
      data: {
        totalCompanies,
        activeTrials,
        totalRevenue,
        companiesByPlan: companiesByPlanFormatted
      }
    })

  } catch (error) {
    console.error("[Admin Stats] Erro:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro ao buscar estatísticas" } },
      { status: 500 }
    )
  }
}

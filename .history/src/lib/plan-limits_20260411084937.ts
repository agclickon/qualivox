/**
 * Plan Limits — Fase 12 SaaS
 * 
 * Helpers para verificar limites do plano e retornar uso atual.
 */

import { prisma } from "./prisma"

export type ResourceType = "leads" | "users" | "whatsappConnections" | "agents"

export interface PlanLimitResult {
  allowed: boolean
  current: number
  limit: number
  usagePercent: number
  message?: string
}

export interface PlanUsage {
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
    trialEndsAt: Date | null
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

/**
 * Verifica se uma empresa pode criar mais recursos de um tipo específico.
 * Retorna { allowed: true } se dentro do limite, ou { allowed: false, message } se excedeu.
 */
export async function checkPlanLimit(
  companyId: string,
  resource: ResourceType
): Promise<PlanLimitResult> {
  // Busca a empresa e seu plano
  const company = await prisma.saasCompany.findUnique({
    where: { id: companyId },
    include: { plan: true }
  })

  if (!company || !company.plan) {
    return { allowed: false, current: 0, limit: 0, usagePercent: 0, message: "Empresa ou plano não encontrado" }
  }

  // Verifica se está em trial expirado
  if (company.status === "trial" && company.trialEndsAt && company.trialEndsAt < new Date()) {
    return { allowed: false, current: 0, limit: 0, usagePercent: 100, message: "Trial expirado. Faça upgrade para continuar." }
  }

  if (company.status === "suspended" || company.status === "cancelled") {
    return { allowed: false, current: 0, limit: 0, usagePercent: 100, message: "Conta suspensa. Entre em contato com o suporte." }
  }

  const plan = company.plan

  // Define o limite baseado no recurso
  let limit: number
  switch (resource) {
    case "leads": limit = plan.maxLeads; break
    case "users": limit = plan.maxUsers; break
    case "whatsappConnections": limit = plan.maxWhatsappConnections; break
    case "agents": limit = plan.maxAgents; break
    default: limit = 0
  }

  // Ilimitado (Enterprise)
  if (limit >= 999999) {
    const current = await getCurrentUsage(companyId, resource)
    return { allowed: true, current, limit: Infinity, usagePercent: 0 }
  }

  const current = await getCurrentUsage(companyId, resource)
  const usagePercent = Math.round((current / limit) * 100)

  if (current >= limit) {
    const messages: Record<ResourceType, string> = {
      leads: `Limite de ${limit} leads atingido. Faça upgrade para adicionar mais leads.`,
      users: `Limite de ${limit} usuários atingido. Faça upgrade para adicionar mais membros.`,
      whatsappConnections: `Limite de ${limit} conexões WhatsApp atingido.`,
      agents: `Limite de ${limit} agentes IA atingido. Faça upgrade para criar mais agentes.`
    }
    return { allowed: false, current, limit, usagePercent, message: messages[resource] }
  }

  return { allowed: true, current, limit, usagePercent }
}

/**
 * Retorna o uso atual de um recurso para uma empresa.
 */
async function getCurrentUsage(companyId: string, resource: ResourceType): Promise<number> {
  // Busca o usuário admin da empresa para contar recursos no banco do tenant
  const adminUser = await prisma.user.findFirst({
    where: { companyId, role: "admin" },
    select: { id: true }
  })

  if (!adminUser) return 0

  // Conta recursos no banco principal (simplificação — idealmente no banco do tenant)
  switch (resource) {
    case "leads":
      return prisma.lead.count({ where: { assignedToId: { not: null } } }) // Aproximação
    case "users":
      return prisma.user.count({ where: { companyId } })
    case "whatsappConnections":
      return prisma.whatsappConnection.count({ where: { isActive: true } })
    case "agents":
      return prisma.agent.count()
    default:
      return 0
  }
}

/**
 * Retorna o uso completo do plano para exibição na UI.
 */
export async function getPlanUsage(companyId: string): Promise<PlanUsage | null> {
  const company = await prisma.saasCompany.findUnique({
    where: { id: companyId },
    include: { plan: true }
  })

  if (!company || !company.plan) return null

  const plan = company.plan

  // Parse features JSON
  let features: Record<string, boolean> = {}
  try {
    features = JSON.parse(plan.features)
  } catch {
    features = {}
  }

  // Conta recursos
  const [leads, users, whatsappConnections, agents] = await Promise.all([
    prisma.lead.count(),
    prisma.user.count({ where: { companyId } }),
    prisma.whatsappConnection.count({ where: { isActive: true } }),
    prisma.agent.count()
  ])

  const limits = {
    leads: plan.maxLeads,
    users: plan.maxUsers,
    whatsappConnections: plan.maxWhatsappConnections,
    agents: plan.maxAgents
  }

  const percentages = {
    leads: Math.min(100, Math.round((leads / limits.leads) * 100)),
    users: Math.min(100, Math.round((users / limits.users) * 100)),
    whatsappConnections: Math.min(100, Math.round((whatsappConnections / limits.whatsappConnections) * 100)),
    agents: Math.min(100, Math.round((agents / limits.agents) * 100))
  }

  return {
    plan: {
      id: plan.id,
      name: plan.name,
      priceMonthly: plan.priceMonthly,
      maxLeads: plan.maxLeads,
      maxUsers: plan.maxUsers,
      maxWhatsappConnections: plan.maxWhatsappConnections,
      maxAgents: plan.maxAgents,
      features
    },
    company: {
      id: company.id,
      name: company.name,
      status: company.status,
      trialEndsAt: company.trialEndsAt,
      isTrial: company.status === "trial"
    },
    usage: { leads, users, whatsappConnections, agents },
    limits,
    percentages
  }
}

/**
 * Verifica se uma feature específica está habilitada no plano.
 */
export async function checkFeatureFlag(
  companyId: string,
  featureKey: string
): Promise<boolean> {
  const company = await prisma.saasCompany.findUnique({
    where: { id: companyId },
    include: { plan: true }
  })

  if (!company?.plan) return false

  try {
    const features = JSON.parse(company.plan.features)
    return features[featureKey] === true
  } catch {
    return false
  }
}

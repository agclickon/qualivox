/**
 * Helper de Prisma com resolução automática de tenant.
 * 
 * Uso nas rotas:
 *   import { getPrismaFromRequest } from "@/lib/prisma-tenant"
 *   const prisma = await getPrismaFromRequest(req)
 * 
 * Substitui: import { prisma } from "@/lib/prisma"
 */

import { NextRequest } from "next/server"
import { verifyAccessToken } from "@/lib/auth"
import { resolveTenant, getPrismaForTenant } from "@/lib/tenant"
import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@prisma/client"

// Cache: connectionId → companyId (sobrevive ao HMR via globalThis)
const globalForConnCache = globalThis as unknown as { __connectionTenantCache?: Map<string, string> }
const connectionTenantCache: Map<string, string> = globalForConnCache.__connectionTenantCache ??= new Map()

/**
 * Retorna o PrismaClient correto para uma conexão WhatsApp.
 * Usa cache para evitar overhead de varredura repetida.
 */
export async function getPrismaForConnection(connectionId: string): Promise<PrismaClient> {
  try {
    // Verifica cache primeiro
    const cachedCompanyId = connectionTenantCache.get(connectionId)
    if (cachedCompanyId) {
      try {
        return await getPrismaForTenant(cachedCompanyId)
      } catch { /* fallthrough */ }
    }

    // Busca nos tenants conhecidos qual tem essa conexão
    const companies = await defaultPrisma.saasCompany.findMany({
      select: { id: true },
    })

    for (const company of companies) {
      try {
        const tenantPrisma = await getPrismaForTenant(company.id)
        const conn = await tenantPrisma.whatsappConnection.findUnique({
          where: { id: connectionId },
          select: { id: true },
        })
        if (conn) {
          connectionTenantCache.set(connectionId, company.id)
          return tenantPrisma
        }
      } catch { /* tenant sem banco isolado */ }
    }

    // Fallback: banco default (conexão pode estar no banco legado)
    return defaultPrisma
  } catch {
    return defaultPrisma
  }
}

/**
 * Retorna todos os PrismaClients de tenants ativos (para jobs em background).
 * Cada entrada tem { companyId, db }.
 */
export async function getAllTenantDbs(): Promise<Array<{ companyId: string; db: PrismaClient }>> {
  try {
    const companies = await defaultPrisma.saasCompany.findMany({ select: { id: true } })
    const results: Array<{ companyId: string; db: PrismaClient }> = []
    for (const company of companies) {
      try {
        const db = await getPrismaForTenant(company.id)
        results.push({ companyId: company.id, db })
      } catch { /* pula tenants sem banco isolado */ }
    }
    // Inclui o banco default se não há tenants isolados
    if (results.length === 0) results.push({ companyId: "default", db: defaultPrisma })
    return results
  } catch {
    return [{ companyId: "default", db: defaultPrisma }]
  }
}

export async function getPrismaFromRequest(req?: NextRequest | unknown): Promise<PrismaClient> {
  try {
    // Tenta obter userId do header x-user-id (injetado pelo middleware)
    let userId: string | null = null

    if (req && typeof req === "object" && "headers" in (req as object)) {
      const r = req as NextRequest
      userId = r.headers.get("x-user-id")

      // Fallback: tenta pelo cookie access_token
      if (!userId) {
        const token = r.cookies?.get?.("access_token")?.value
        if (token) {
          const payload = await verifyAccessToken(token)
          userId = payload?.userId ?? null
        }
      }
    }

    if (!userId) return defaultPrisma

    const tenant = await resolveTenant(userId)
    if (!tenant || tenant.isDefault) return defaultPrisma

    try {
      const tenantPrisma = await getPrismaForTenant(tenant.companyId)
      return tenantPrisma
    } catch {
      return defaultPrisma
    }
  } catch {
    return defaultPrisma
  }
}

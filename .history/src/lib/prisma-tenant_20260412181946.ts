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

/**
 * Retorna o PrismaClient correto para o tenant do usuário autenticado.
 * Aceita qualquer NextRequest-like ou nada (usa fallback para default).
 * - Se o usuário tiver banco isolado → usa banco isolado
 * - Caso contrário → usa banco default (fallback seguro)
 */
/**
 * Retorna o PrismaClient correto para uma conexão WhatsApp.
 * Busca no banco central qual usuário da empresa tem essa conexão,
 * e retorna o banco isolado do tenant correto.
 * Usado pelo Baileys para ler/salvar sessões no banco certo.
 */
export async function getPrismaForConnection(connectionId: string): Promise<PrismaClient> {
  try {
    // Busca a conexão no banco default para descobrir se existe
    // Como as conexões ficam no banco isolado, precisamos iterar os tenants conhecidos
    // Estratégia: busca nos usuários do banco central qual companyId tem sessão para essa connectionId
    const users = await defaultPrisma.user.findMany({
      where: { companyId: { not: null } },
      select: { id: true, companyId: true },
      distinct: ["companyId"],
    })

    for (const user of users) {
      if (!user.companyId || user.companyId === "default") continue
      try {
        const tenantPrisma = await getPrismaForTenant(user.companyId)
        const conn = await tenantPrisma.whatsappConnection.findUnique({
          where: { id: connectionId },
          select: { id: true },
        })
        if (conn) return tenantPrisma
      } catch { /* tenant sem banco isolado */ }
    }

    // Fallback: banco default
    return defaultPrisma
  } catch {
    return defaultPrisma
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

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
 * - Se o usuário tiver companyId e banco isolado existir → usa banco isolado
 * - Caso contrário → usa banco default (fallback seguro)
 */
export async function getPrismaFromRequest(req: NextRequest): Promise<PrismaClient> {
  try {
    const token = req.cookies.get("access_token")?.value
    if (!token) return defaultPrisma

    const payload = await verifyAccessToken(token)
    if (!payload) return defaultPrisma

    const tenant = await resolveTenant(payload.userId)
    if (!tenant || tenant.isDefault) return defaultPrisma

    // Tenta conectar ao banco do tenant isolado
    try {
      const tenantPrisma = await getPrismaForTenant(tenant.companyId)
      return tenantPrisma
    } catch {
      // Banco isolado não encontrado — fallback para default
      return defaultPrisma
    }
  } catch {
    return defaultPrisma
  }
}

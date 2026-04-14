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

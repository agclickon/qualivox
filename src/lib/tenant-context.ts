/**
 * Tenant Context — Middleware de resolução para API Routes
 * 
 * Uso em API routes:
 * ```ts
 * import { withTenant } from "@/lib/tenant-context"
 * 
 * export async function GET(req: NextRequest) {
 *   const ctx = await withTenant(req)
 *   if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
 *   
 *   // ctx.prisma é o PrismaClient do tenant
 *   const leads = await ctx.prisma.lead.findMany()
 *   ...
 * }
 * ```
 */

import { NextRequest, NextResponse } from "next/server"
import type { PrismaClient } from "@prisma/client"
import { verifyAccessToken } from "@/lib/auth"
import { resolveTenant, getPrismaForTenant, type TenantContext } from "./tenant"

export interface TenantRequestContext extends TenantContext {
  prisma: PrismaClient
  userId: string
  userEmail: string
  userRole: string
}

/**
 * Extrai o token do cookie e retorna o payload do usuário
 */
async function getUserFromRequest(req: NextRequest): Promise<{
  userId: string
  email: string
  role: string
} | null> {
  const token = req.cookies.get("access_token")?.value
  if (!token) return null

  const payload = await verifyAccessToken(token)
  if (!payload) return null

  return {
    userId: payload.userId,
    email: payload.email,
    role: payload.role
  }
}

/**
 * Middleware principal: resolve tenant e retorna contexto completo.
 * 
 * Retorna null se:
 * - Não estiver autenticado
 * - Usuário não tiver companyId e não for super_admin (fallback para default)
 * - Banco do tenant não existir
 */
export async function withTenant(req: NextRequest): Promise<TenantRequestContext | null> {
  const user = await getUserFromRequest(req)
  if (!user) return null

  // Resolve o tenant do usuário
  const tenant = await resolveTenant(user.userId)
  if (!tenant) return null

  // Obtém o PrismaClient do tenant
  try {
    const tenantPrisma = await getPrismaForTenant(tenant.companyId)

    return {
      ...tenant,
      prisma: tenantPrisma,
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role
    }
  } catch (err) {
    console.error(`[TenantContext] Erro ao conectar ao tenant ${tenant.companyId}:`, err)
    return null
  }
}

/**
 * Versão que permite super_admin impersonar um tenant específico.
 * Requer header "X-Impersonate-Tenant" com o companyId alvo.
 */
export async function withTenantImpersonation(
  req: NextRequest
): Promise<TenantRequestContext | null> {
  const user = await getUserFromRequest(req)
  if (!user) return null

  // Verifica se está tentando impersonar
  const impersonateCompanyId = req.headers.get("x-impersonate-tenant")

  if (impersonateCompanyId && user.role === "super_admin") {
    // Super admin pode impersonar qualquer tenant
    try {
      const tenantPrisma = await getPrismaForTenant(impersonateCompanyId)
      
      return {
        companyId: impersonateCompanyId,
        dbPath: "", // Não expomos o caminho
        isDefault: impersonateCompanyId === "default",
        prisma: tenantPrisma,
        userId: user.userId,
        userEmail: user.email,
        userRole: user.role
      }
    } catch (err) {
      console.error(`[TenantContext] Erro ao impersonar tenant ${impersonateCompanyId}:`, err)
      return null
    }
  }

  // Caso normal: resolve o próprio tenant do usuário
  return withTenant(req)
}

/**
 * Helper para criar respostas de erro padronizadas
 */
export function tenantErrorResponse(
  message: string = "Acesso não autorizado ao tenant",
  status: number = 401
): NextResponse {
  return NextResponse.json(
    { success: false, error: { code: "TENANT_UNAUTHORIZED", message } },
    { status }
  )
}

/**
 * Verifica se uma feature está habilitada para o plano do tenant.
 * Usa o banco default para buscar o plano.
 */
export async function checkTenantFeature(
  companyId: string,
  featureKey: string
): Promise<boolean> {
  const { prisma: defaultPrisma } = await import("./prisma")

  const company = await defaultPrisma.saasCompany.findUnique({
    where: { id: companyId },
    include: { plan: true }
  })

  if (!company || !company.plan) return false

  try {
    const features = JSON.parse(company.plan.features)
    return features[featureKey] === true
  } catch {
    return false
  }
}

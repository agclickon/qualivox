/**
 * API para reativar empresa
 * 
 * POST /api/admin/companies/[id]/activate
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyAccessToken } from "@/lib/jwt"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = req.cookies.get("access_token")?.value
    if (!token) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 })
    }

    const payload = await verifyAccessToken(token)
    if (!payload || payload.role !== "super_admin") {
      return NextResponse.json({ success: false, error: "Acesso restrito" }, { status: 403 })
    }

    const companyId = params.id

    await prisma.saasCompany.update({
      where: { id: companyId },
      data: { status: "active" }
    })

    // Log de auditoria
    await prisma.saasAuditLog.create({
      data: {
        companyId,
        actorEmail: payload.email,
        action: "company_activate",
        resource: "saas_company",
        resourceId: companyId,
        details: JSON.stringify({ timestamp: new Date().toISOString() })
      }
    })

    return NextResponse.json({ success: true, message: "Empresa reativada" })

  } catch (error) {
    console.error("[API Activate] Erro:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}

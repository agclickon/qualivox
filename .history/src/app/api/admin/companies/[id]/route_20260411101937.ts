/**
 * API para excluir empresa
 * 
 * DELETE /api/admin/companies/[id]
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyAccessToken } from "@/lib/jwt"

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
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

    // Não permite excluir a empresa default
    if (companyId === "default") {
      return NextResponse.json({ success: false, error: "Não é possível excluir a empresa padrão" }, { status: 400 })
    }

    // Log de auditoria antes de excluir
    await prisma.saasAuditLog.create({
      data: {
        companyId,
        actorEmail: payload.email,
        action: "company_delete",
        resource: "saas_company",
        resourceId: companyId,
        details: JSON.stringify({ timestamp: new Date().toISOString(), deletedBy: payload.email })
      }
    })

    // Exclui a empresa (cascade exclui usuários relacionados via companyId)
    await prisma.saasCompany.delete({
      where: { id: companyId }
    })

    return NextResponse.json({ success: true, message: "Empresa excluída" })

  } catch (error) {
    console.error("[API Delete Company] Erro:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}

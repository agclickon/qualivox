/**
 * API para editar e excluir empresa
 * 
 * PUT    /api/admin/companies/[id] — atualiza empresa
 * DELETE /api/admin/companies/[id] — exclui empresa
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyAccessToken } from "@/lib/jwt"
import bcrypt from "bcryptjs"

async function getAdmin(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value
  if (!token) return null
  const payload = await verifyAccessToken(token)
  if (!payload || payload.role !== "super_admin") return null
  return payload
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await getAdmin(req)
    if (!admin) {
      return NextResponse.json({ success: false, error: "Acesso restrito" }, { status: 403 })
    }

    const { id } = params
    const body = await req.json()
    const { name, email, phone, cnpj, planId, status, trialDays, adminName, newPassword, customFeatures } = body

    if (!name || !email) {
      return NextResponse.json({ success: false, error: "Nome e e-mail são obrigatórios" }, { status: 400 })
    }

    // Calcula nova data de trial se status for trial
    let trialEndsAt: Date | null | undefined = undefined
    if (status === "trial" && trialDays != null) {
      const days = parseInt(trialDays) || 0
      trialEndsAt = days > 0
        ? new Date(Date.now() + days * 86400000)
        : null
    } else if (status !== "trial") {
      trialEndsAt = null
    }

    const updateData: any = {
      name,
      email,
      phone: phone || null,
      cnpj: cnpj || null,
      status
    }
    if (planId) updateData.planId = planId
    if (trialEndsAt !== undefined) updateData.trialEndsAt = trialEndsAt

    // Tenta incluir customFeatures — pode falhar se coluna não existe no Prisma Client ainda
    let company
    try {
      if (customFeatures) updateData.customFeatures = JSON.stringify(customFeatures)
      company = await prisma.saasCompany.update({ where: { id }, data: updateData })
    } catch (e: any) {
      // Se erro for por causa de customFeatures, tenta sem ele
      if (e.message?.includes("customFeatures") || e.code === "P2009") {
        delete updateData.customFeatures
        company = await prisma.saasCompany.update({ where: { id }, data: updateData })
        // Salva customFeatures via raw SQL como fallback
        if (customFeatures) {
          await prisma.$executeRaw`UPDATE saas_companies SET custom_features = ${JSON.stringify(customFeatures)} WHERE id = ${id}`
        }
      } else {
        throw e
      }
    }

    // Atualiza nome e/ou senha do admin da empresa se fornecidos
    if (adminName || newPassword) {
      try {
        const adminUser = await prisma.user.findFirst({
          where: { companyId: id },
          orderBy: { createdAt: "asc" }
        })
        console.log("[API Company PUT] Admin user encontrado:", adminUser?.id, adminUser?.role)

        if (adminUser) {
          const userUpdate: any = {}
          if (adminName) userUpdate.name = adminName
          if (newPassword) {
            if (newPassword.length < 8) {
              return NextResponse.json({ success: false, error: "Senha deve ter pelo menos 8 caracteres" }, { status: 400 })
            }
            userUpdate.passwordHash = await bcrypt.hash(newPassword, 12)
          }
          await prisma.user.update({ where: { id: adminUser.id }, data: userUpdate })
          console.log("[API Company PUT] Admin user atualizado")
        }
      } catch (userErr: any) {
        console.error("[API Company PUT] Erro ao atualizar user:", userErr?.message)
        // Não bloqueia o retorno — empresa já foi salva
      }
    }

    // Log de auditoria
    try {
      await prisma.saasAuditLog.create({
        data: {
          companyId: id,
          actorEmail: admin.email,
          action: "company_update",
          resource: "saas_company",
          resourceId: id,
          details: JSON.stringify({ updatedFields: Object.keys(updateData), timestamp: new Date().toISOString() })
        }
      })
    } catch (auditErr: any) {
      console.error("[API Company PUT] Erro no audit log:", auditErr?.message)
      // Não bloqueia o retorno
    }

    console.log("[API Company PUT] Empresa atualizada:", id)

    return NextResponse.json({ success: true, message: "Empresa atualizada", data: { company } })

  } catch (error: any) {
    console.error("[API Company PUT] Erro completo:", JSON.stringify(error, null, 2))
    console.error("[API Company PUT] Message:", error?.message)
    console.error("[API Company PUT] Code:", error?.code)
    console.error("[API Company PUT] Meta:", JSON.stringify(error?.meta))
    return NextResponse.json({ 
      success: false, 
      error: error?.message || "Erro interno",
      code: error?.code,
      meta: error?.meta
    }, { status: 500 })
  }
}

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

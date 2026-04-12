/**
 * API de edição e exclusão de Plano — Admin
 *
 * PUT  /api/admin/plans/[id] — atualiza plano
 * DELETE /api/admin/plans/[id] — exclui plano
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyAccessToken } from "@/lib/jwt"

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
    const { name, description, priceMonthly, maxUsers, maxAgents, maxLeads, maxStorage } = body

    if (!name || priceMonthly == null || !maxUsers || !maxAgents || !maxLeads || !maxStorage) {
      return NextResponse.json({ success: false, error: "Campos obrigatórios não preenchidos" }, { status: 400 })
    }

    // Verifica se outro plano com mesmo nome já existe
    const existing = await prisma.saasPlan.findFirst({
      where: { name, NOT: { id } }
    })
    if (existing) {
      return NextResponse.json({ success: false, error: "Já existe um plano com este nome" }, { status: 409 })
    }

    const plan = await prisma.saasPlan.update({
      where: { id },
      data: {
        name,
        description: description || null,
        priceMonthly,
        maxUsers,
        maxAgents,
        maxLeads,
        maxStorage
      }
    })

    console.log("[API Plans PUT] Plano atualizado:", plan.id)

    return NextResponse.json({
      success: true,
      message: "Plano atualizado com sucesso",
      data: { plan }
    })

  } catch (error) {
    console.error("[API Plans PUT] Erro:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await getAdmin(req)
    if (!admin) {
      return NextResponse.json({ success: false, error: "Acesso restrito" }, { status: 403 })
    }

    const { id } = params

    // Verifica se há empresas usando o plano
    const companiesUsingPlan = await prisma.saasCompany.count({ where: { planId: id } })
    if (companiesUsingPlan > 0) {
      return NextResponse.json(
        { success: false, error: `Não é possível excluir: ${companiesUsingPlan} empresa(s) usa(m) este plano` },
        { status: 400 }
      )
    }

    await prisma.saasPlan.delete({ where: { id } })

    console.log("[API Plans DELETE] Plano excluído:", id)

    return NextResponse.json({ success: true, message: "Plano excluído com sucesso" })

  } catch (error) {
    console.error("[API Plans DELETE] Erro:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}

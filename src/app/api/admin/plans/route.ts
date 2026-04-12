/**
 * API de Planos — Admin
 * 
 * GET /api/admin/plans
 * Retorna todos os planos disponíveis
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyAccessToken } from "@/lib/jwt"

export async function GET(req: NextRequest) {
  try {
    // Verifica autenticação e super_admin
    const token = req.cookies.get("access_token")?.value
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(token)
    if (!payload || payload.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: "Acesso restrito" },
        { status: 403 }
      )
    }

    // Busca todos os planos
    const plans = await prisma.saasPlan.findMany({
      orderBy: { priceMonthly: "asc" }
    })

    return NextResponse.json({
      success: true,
      data: { plans }
    })

  } catch (error) {
    console.error("[API Admin Plans] Erro:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verifica autenticação e super_admin
    const token = req.cookies.get("access_token")?.value
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(token)
    if (!payload || payload.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: "Acesso restrito" },
        { status: 403 }
      )
    }

    const body = await req.json()
    const {
      name,
      description,
      priceMonthly,
      maxUsers,
      maxAgents,
      maxLeads,
      maxStorage,
      features
    } = body

    // Validações
    if (!name || !priceMonthly || !maxUsers || !maxAgents || !maxLeads || !maxStorage) {
      return NextResponse.json(
        { success: false, error: "Campos obrigatórios não preenchidos" },
        { status: 400 }
      )
    }

    // Verifica se plano com mesmo nome já existe
    const existing = await prisma.saasPlan.findUnique({ where: { name } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Já existe um plano com este nome" },
        { status: 409 }
      )
    }

    // Monta features JSON
    const featuresJson = features ? JSON.stringify(features.reduce((acc: any, f: any) => {
      acc[f.key] = f.price === 0
      return acc
    }, {})) : "{}"

    console.log("[API Plans POST] Criando plano:", { name, priceMonthly, maxUsers, maxAgents, maxLeads, maxStorage })

    // Cria o plano
    const plan = await prisma.saasPlan.create({
      data: {
        name,
        description: description || null,
        priceMonthly,
        maxUsers,
        maxAgents,
        maxLeads,
        maxStorage,
        maxWhatsappConnections: 1, // Valor padrão
        features: featuresJson
      }
    })
    
    console.log("[API Plans POST] Plano criado:", plan.id)

    return NextResponse.json({
      success: true,
      message: "Plano criado com sucesso",
      data: { plan }
    })

  } catch (error) {
    console.error("[API Admin Plans POST] Erro:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno" },
      { status: 500 }
    )
  }
}

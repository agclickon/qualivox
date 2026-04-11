/**
 * API de Uso do Plano — Retorna limites e uso atual
 * 
 * GET /api/plan/usage
 * Retorna: dados do plano, uso atual, percentagens
 */

import { NextRequest, NextResponse } from "next/server"
import { getPlanUsage } from "@/lib/plan-limits"
import { verifyAccessToken } from "@/lib/jwt"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    // Autenticação
    const token = req.cookies.get("access_token")?.value
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Token inválido" },
        { status: 401 }
      )
    }

    // Busca o companyId do usuário
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { companyId: true }
    })

    if (!user?.companyId) {
      return NextResponse.json(
        { success: false, error: "Usuário não vinculado a uma empresa" },
        { status: 400 }
      )
    }

    // Busca uso do plano
    const usage = await getPlanUsage(user.companyId)
    if (!usage) {
      return NextResponse.json(
        { success: false, error: "Plano não encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: usage })

  } catch (error) {
    console.error("[API Plan Usage] Erro:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno" },
      { status: 500 }
    )
  }
}

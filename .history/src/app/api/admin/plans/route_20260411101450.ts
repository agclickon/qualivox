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

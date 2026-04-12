/**
 * API de Companies do Admin — CRUD de empresas
 * 
 * GET /api/admin/companies — lista empresas
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyAccessToken } from "@/lib/auth"

async function getUser(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value
  if (!token) return null
  return verifyAccessToken(token)
}

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  
  console.log("[Admin Companies] User:", user?.email, "Role:", user?.role)
  
  if (!user || user.role !== "super_admin") {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Acesso restrito a super admin" } },
      { status: 403 }
    )
  }

  try {
    const companies = await prisma.saasCompany.findMany({
      include: {
        plan: {
          select: {
            name: true,
            priceMonthly: true
          }
        },
        _count: {
          select: {
            auditLogs: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })
    
    console.log("[Admin Companies] Found:", companies.length, "companies")

    return NextResponse.json({
      success: true,
      data: { companies }
    })

  } catch (error) {
    console.error("[Admin Companies] Erro:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro ao buscar empresas" } },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/lgpd/consent?leadId=xxx - Listar consentimentos de um lead
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get("leadId")

    if (!leadId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "leadId é obrigatório" } },
        { status: 400 }
      )
    }

    const consents = await prisma.lgpdConsent.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ success: true, data: { consents } })
  } catch (error) {
    console.error("Erro ao listar consentimentos:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } },
      { status: 500 }
    )
  }
}

// POST /api/lgpd/consent - Registrar consentimento LGPD
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, consentType, granted } = body

    if (!leadId || !consentType) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "leadId e consentType são obrigatórios" } },
        { status: 400 }
      )
    }

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

    const consent = await prisma.lgpdConsent.create({
      data: {
        leadId,
        consentType,
        granted: granted ?? true,
        grantedAt: granted ? new Date() : null,
        revokedAt: !granted ? new Date() : null,
        ipAddress,
      },
    })

    return NextResponse.json({ success: true, data: consent }, { status: 201 })
  } catch (error) {
    console.error("Erro ao registrar consentimento:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } },
      { status: 500 }
    )
  }
}

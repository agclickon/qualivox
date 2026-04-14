import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"

// GET /api/lgpd/export-data?leadId=xxx - Exportar todos os dados de um lead (LGPD)
export async function GET(request: NextRequest) {
  const prisma = await getPrismaFromRequest(request)
  try {
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get("leadId")

    if (!leadId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "leadId é obrigatório" } },
        { status: 400 }
      )
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        interactions: true,
        conversations: {
          include: { messages: true },
        },
        aiAnalyses: true,
      },
    })

    if (!lead) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Lead não encontrado" } },
        { status: 404 }
      )
    }

    const consents = await prisma.lgpdConsent.findMany({
      where: { leadId },
    })

    const exportData = {
      lead: {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        whatsappNumber: lead.whatsappNumber,
        companyName: lead.companyName,
        position: lead.position,
        tags: lead.tags,
        notes: lead.notes,
        createdAt: lead.createdAt,
      },
      interactions: lead.interactions,
      conversations: lead.conversations.map((conv) => ({
        id: conv.id,
        messages: conv.messages.map((msg) => ({
          direction: msg.direction,
          content: msg.content,
          createdAt: msg.createdAt,
        })),
      })),
      aiAnalyses: lead.aiAnalyses,
      lgpdConsents: consents,
      exportedAt: new Date().toISOString(),
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="lead-data-${leadId}.json"`,
      },
    })
  } catch (error) {
    console.error("Erro ao exportar dados LGPD:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } },
      { status: 500 }
    )
  }
}

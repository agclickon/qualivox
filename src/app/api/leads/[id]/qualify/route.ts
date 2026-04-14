import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"
import { qualifyLead } from "@/lib/openai"

// POST /api/leads/:id/qualify - Qualificar lead com IA
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const prisma = await getPrismaFromRequest(_request)
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        conversations: {
          include: {
            messages: {
              orderBy: { createdAt: "asc" },
              take: 50,
            },
          },
        },
        interactions: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    })

    if (!lead) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Lead não encontrado" } },
        { status: 404 }
      )
    }

    // Montar histórico de conversas
    const conversationHistory = lead.conversations
      .flatMap((conv) =>
        conv.messages.map((msg) => {
          const prefix = msg.direction === "incoming" ? `${lead.name}` : "Vendedor"
          return `${prefix}: ${msg.content}`
        })
      )
      .join("\n")

    // Montar contexto
    const leadContext = [
      lead.companyName ? `Empresa: ${lead.companyName}` : "",
      lead.position ? `Cargo: ${lead.position}` : "",
      lead.source ? `Origem: ${lead.source}` : "",
      lead.notes ? `Notas: ${lead.notes}` : "",
      (() => { try { const t = JSON.parse(lead.tags || "[]"); return t.length > 0 ? `Tags: ${t.join(", ")}` : ""; } catch { return ""; } })(),
    ]
      .filter(Boolean)
      .join("\n")

    if (!conversationHistory && !leadContext) {
      return NextResponse.json(
        { success: false, error: { code: "NO_DATA", message: "Sem dados suficientes para qualificação" } },
        { status: 400 }
      )
    }

    const result = await qualifyLead(
      lead.name,
      conversationHistory || "Sem histórico de conversas.",
      leadContext
    )

    // Salvar análise
    const analysis = await prisma.aiAnalysis.create({
      data: {
        leadId: lead.id,
        sentimentScore: result.sentimentScore,
        leadScore: result.score,
        classification: result.classification,
        reasons: JSON.stringify(result.reasons || []),
        recommendations: JSON.stringify(result.recommendations || []),
        extractedData: result.extractedData ? JSON.stringify(result.extractedData) : null,
      },
    })

    // Atualizar score e qualificação do lead
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        score: result.score,
        qualificationLevel: result.classification as "quente" | "morno" | "frio" | "nao_qualificado",
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        analysis,
        qualification: result,
      },
    })
  } catch (error) {
    console.error("Erro ao qualificar lead:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Erro na qualificação" } },
      { status: 500 }
    )
  }
}

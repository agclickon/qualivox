import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// GET /api/ai/analyses?leadId=xxx&limit=20
export async function GET(req: NextRequest) {
  const leadId = req.nextUrl.searchParams.get("leadId")
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10)

  if (!leadId) return NextResponse.json({ success: false, error: "leadId obrigatório" }, { status: 400 })

  const allAnalyses = await prisma.aiAnalysis.findMany({
    where: { leadId },
    orderBy: { createdAt: "desc" },
    take: limit * 3, // busca mais para compensar os filtrados
  })

  // Filtra análises de sentimento em tempo real (não têm dados de qualificação)
  const analyses = allAnalyses.filter((a) => {
    try {
      const ed = a.extractedData ? JSON.parse(a.extractedData as string) : {}
      return ed.triggeredBy !== "realtime"
    } catch { return true }
  }).slice(0, limit)

  // Parse extractedData JSON for each record
  const parsed = analyses.map((a) => {
    let extra: Record<string, unknown> = {}
    try { extra = a.extractedData ? JSON.parse(a.extractedData as string) : {} } catch { /* ignore */ }
    let keyPoints: string[] = []
    try { keyPoints = a.reasons ? JSON.parse(a.reasons as string) : [] } catch { /* ignore */ }
    let recommendations: string[] = []
    try { recommendations = a.recommendations ? JSON.parse(a.recommendations as string) : [] } catch { /* ignore */ }

    return {
      id: a.id,
      createdAt: a.createdAt.toISOString(),
      triggeredBy: (extra.triggeredBy as string) ?? "manual",
      // AiResult fields
      score: a.leadScore ?? 0,
      suggestedStageName: a.classification ?? null,
      suggestedStageId: (extra.suggestedStageId as string) ?? null,
      sentiment: ((extra.sentiment as string) ?? (a.sentimentScore === 1 ? "positivo" : a.sentimentScore === -1 ? "negativo" : "neutro")) as "positivo" | "neutro" | "negativo",
      confidence: (extra.confidence as number) ?? 0,
      summary: (extra.summary as string) ?? "",
      reasoning: (extra.reasoning as string) ?? "",
      keyPoints,
      suggestedTagIds: (extra.suggestedTagIds as string[]) ?? [],
      suggestedTagNames: (extra.suggestedTagNames as string[]) ?? [],
      qualificationLevel: ((extra.qualificationLevel as string) ?? "nao_qualificado") as "quente" | "morno" | "frio" | "nao_qualificado",
      nextAction: (extra.nextAction as string) ?? "",
    }
  })

  return NextResponse.json({ success: true, data: parsed })
}

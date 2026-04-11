import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { classifyConversation } from "@/lib/ai-classifier"
import { emitConversationUpdate } from "@/lib/sse"

export const dynamic = "force-dynamic"

/**
 * POST /api/ai/auto-classify
 * Chamado automaticamente pelo listener de mensagens quando:
 *   - autoClassifyEnabled = "true" nas configurações
 *   - A conversa atingiu o intervalo de mensagens configurado (autoClassifyEvery)
 *
 * Body: { conversationId }
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar se a análise automática está habilitada
    const settings = await prisma.setting.findMany({
      where: { key: { in: ["autoClassifyEnabled", "autoClassifyEvery"] } },
    })
    const cfg = Object.fromEntries(settings.map((s) => [s.key, s.value]))

    if (cfg.autoClassifyEnabled !== "true") {
      return NextResponse.json({ success: false, error: "Análise automática desativada" }, { status: 200 })
    }

    const { conversationId } = await req.json() as { conversationId?: string }
    if (!conversationId) return NextResponse.json({ success: false, error: "conversationId obrigatório" }, { status: 400 })

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        lead: true,
        messages: {
          where: { messageType: "text" },
          orderBy: { createdAt: "asc" },
        },
      },
    })
    if (!conversation) return NextResponse.json({ success: false, error: "Conversa não encontrada" }, { status: 404 })

    const everyN = parseInt(cfg.autoClassifyEvery ?? "10", 10)
    const msgCount = conversation.messages.length

    // Só analisa se atingiu múltiplo de N mensagens
    if (msgCount === 0 || msgCount % everyN !== 0) {
      return NextResponse.json({ success: true, data: { skipped: true, reason: `${msgCount} msgs — aguardando múltiplo de ${everyN}` } })
    }

    const [pipelineStages, availableTags] = await Promise.all([
      prisma.pipelineStage.findMany({ orderBy: { order: "asc" } }),
      prisma.tag.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    ])

    const messages = conversation.messages.map((m) => ({
      direction: m.direction,
      content: m.content || "",
      createdAt: m.createdAt.toISOString(),
      messageType: m.messageType,
    }))

    const result = await classifyConversation({
      leadId: conversation.leadId,
      messages,
      pipelineStages,
      availableTags,
      currentStageId: conversation.lead.pipelineStageId,
      leadName: conversation.lead.name,
    })

    // Aplicar tags automaticamente (fonte: ai)
    if (result.suggestedTagIds.length > 0) {
      for (const tagId of result.suggestedTagIds) {
        const tag = await prisma.tag.findUnique({ where: { id: tagId } })
        if (tag?.isActive) {
          await prisma.leadTag.upsert({
            where: { leadId_tagId: { leadId: conversation.leadId, tagId } },
            create: { leadId: conversation.leadId, tagId, source: "ai", appliedBy: "auto-classifier" },
            update: { source: "ai", appliedBy: "auto-classifier", appliedAt: new Date() },
          })
        }
      }
    }

    // Atualizar score e qualificação automaticamente
    await prisma.lead.update({
      where: { id: conversation.leadId },
      data: {
        score: result.score,
        qualificationLevel: result.qualificationLevel,
        ...(result.suggestedStageId ? { pipelineStageId: result.suggestedStageId } : {}),
      },
    })

    // Salvar no histórico
    const sentimentScore = result.sentiment === "positivo" ? 80 : result.sentiment === "negativo" ? -80 : 0
    await prisma.aiAnalysis.create({
      data: {
        leadId: conversation.leadId,
        conversationId: conversationId,
        sentimentScore,
        leadScore: result.score,
        classification: result.suggestedStageName ?? null,
        reasons: JSON.stringify(result.keyPoints),
        recommendations: JSON.stringify([result.nextAction]),
        extractedData: JSON.stringify({
          label: result.sentiment,
          summary: result.summary,
          reasoning: result.reasoning,
          confidence: result.confidence,
          suggestedTagNames: result.suggestedTagNames,
          qualificationLevel: result.qualificationLevel,
          nextAction: result.nextAction,
          triggeredBy: "auto",
          messageCount: msgCount,
        }),
      },
    })

    // Emite SSE para atualizar o sentimento em tempo real no frontend
    emitConversationUpdate({
      conversationId,
      sentiment: result.sentiment,
      sentimentScore,
      urgency: 0,
      flags: [],
    })

    return NextResponse.json({ success: true, data: { result, msgCount } })
  } catch (e: unknown) {
    console.error("[ai/auto-classify]", e)
    return NextResponse.json({
      success: false,
      error: e instanceof Error ? e.message : "Erro interno",
    }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"
import { classifyConversation } from "@/lib/ai-classifier"
import { transcribeAudioMessages } from "@/lib/ai-transcribe"

export const dynamic = "force-dynamic"

/**
 * POST /api/ai/classify
 * Body: { leadId, applyTags?, applyStage?, applyScore? }
 */
export async function POST(req: NextRequest) {
  const prisma = await getPrismaFromRequest(req)
  try {
    const body = await req.json() as {
      leadId?: string
      applyTags?: boolean
      applyStage?: boolean
      applyScore?: boolean
    }

    if (!body.leadId) {
      return NextResponse.json({ success: false, error: "leadId obrigatório" }, { status: 400 })
    }

    // Buscar lead com todas as mensagens (texto + áudio)
    const lead = await prisma.lead.findUnique({
      where: { id: body.leadId },
      include: {
        pipelineStage: true,
        conversations: {
          include: {
            messages: {
              orderBy: { createdAt: "asc" },
              where: { messageType: { in: ["text", "audio"] } },
            },
          },
        },
      },
    })
    if (!lead) return NextResponse.json({ success: false, error: "Lead não encontrado" }, { status: 404 })

    const allMessages = lead.conversations.flatMap((c) => c.messages)

    if (allMessages.length === 0) {
      return NextResponse.json({ success: false, error: "Nenhuma mensagem encontrada para análise" }, { status: 400 })
    }

    // Transcrever áudios e mesclar com mensagens de texto
    const audioMessages = allMessages.filter((m) => m.messageType === "audio" && m.mediaUrl)
    const transcriptions = audioMessages.length > 0
      ? await transcribeAudioMessages(audioMessages.map((m) => ({ id: m.id, mediaUrl: m.mediaUrl!, direction: m.direction, createdAt: m.createdAt.toISOString() })))
      : {}

    const messages = allMessages.map((m) => ({
      direction: m.direction,
      content: m.messageType === "audio"
        ? (transcriptions[m.id] ? `[Áudio transcrito] ${transcriptions[m.id]}` : "[Áudio — transcrição indisponível]")
        : (m.content || ""),
      createdAt: m.createdAt.toISOString(),
      messageType: m.messageType,
    })).filter((m) => m.content)

    // Buscar estágios do pipeline e tags disponíveis
    const [pipelineStages, availableTags] = await Promise.all([
      prisma.pipelineStage.findMany({ orderBy: { order: "asc" } }),
      prisma.tag.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    ])

    // Classificar com IA
    const result = await classifyConversation({
      leadId: body.leadId,
      messages,
      pipelineStages,
      availableTags,
      currentStageId: lead.pipelineStageId,
      leadName: lead.name,
    })

    // Aplicar sugestões diretamente via Prisma (sem fetch interno)
    const applied: string[] = []

    if (body.applyTags && result.suggestedTagIds.length > 0) {
      for (const tagId of result.suggestedTagIds) {
        const tag = await prisma.tag.findUnique({ where: { id: tagId } })
        if (tag?.isActive) {
          await prisma.leadTag.upsert({
            where: { leadId_tagId: { leadId: body.leadId, tagId } },
            create: { leadId: body.leadId, tagId, source: "ai", appliedBy: "classifier" },
            update: { source: "ai", appliedBy: "classifier", appliedAt: new Date() },
          })
        }
      }
      applied.push("tags")
    }

    if (body.applyStage && result.suggestedStageId) {
      await prisma.lead.update({
        where: { id: body.leadId },
        data: { pipelineStageId: result.suggestedStageId },
      })
      applied.push("stage")
    }

    if (body.applyScore) {
      await prisma.lead.update({
        where: { id: body.leadId },
        data: { score: result.score, qualificationLevel: result.qualificationLevel },
      })
      applied.push("score")
    }

    // Salvar análise no histórico
    await prisma.aiAnalysis.create({
      data: {
        leadId: body.leadId,
        sentimentScore: result.sentiment === "positivo" ? 1 : result.sentiment === "negativo" ? -1 : 0,
        leadScore: result.score,
        classification: result.suggestedStageName ?? null,
        reasons: JSON.stringify(result.keyPoints),
        recommendations: JSON.stringify([result.nextAction]),
        extractedData: JSON.stringify({
          summary: result.summary,
          reasoning: result.reasoning,
          confidence: result.confidence,
          suggestedStageId: result.suggestedStageId,
          suggestedTagIds: result.suggestedTagIds,
          suggestedTagNames: result.suggestedTagNames,
          qualificationLevel: result.qualificationLevel,
          sentiment: result.sentiment,
          nextAction: result.nextAction,
          audioTranscribed: Object.keys(transcriptions).length,
          triggeredBy: "manual",
        }),
      },
    })

    return NextResponse.json({ success: true, data: { result, applied } })
  } catch (e: unknown) {
    console.error("[ai/classify]", e)
    return NextResponse.json({
      success: false,
      error: e instanceof Error ? e.message : "Erro interno",
    }, { status: 500 })
  }
}

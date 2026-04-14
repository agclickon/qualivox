import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"
import { prisma as defaultPrisma } from "@/lib/prisma"
import { getSession, initSession, registerSessionHook } from "@/lib/baileys-session"
import { startMessageListener } from "@/lib/baileys-listener"

export const dynamic = "force-dynamic"

async function ensureWhatsAppSession(tenantPrisma: typeof defaultPrisma) {
  try {
    const connections = await tenantPrisma.whatsappConnection.findMany()
    for (const connection of connections) {
      registerSessionHook(connection.id, (session) => {
        startMessageListener(session, connection.id)
      })
      if (!getSession(connection.id) && connection.session && connection.session.length > 2) {
        initSession(connection.id).catch((err) =>
          console.error(`[WhatsApp Conversations] initSession error for ${connection.name}:`, err)
        )
      }
    }
  } catch (err) {
    console.error("[WhatsApp Conversations] ensureSession error:", err)
  }
}

// GET /api/whatsapp/conversations - Listar conversas com mensagens
export async function GET(req: NextRequest) {
  const prisma = await getPrismaFromRequest(req)
  try {
    await ensureWhatsAppSession(prisma)

    const [conversations, activeAgents] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma.conversation.findMany as any)({
        orderBy: [{ isPinned: "desc" }, { lastMessageAt: "desc" }],
        include: {
          lead: {
            select: { id: true, name: true, phone: true, whatsappNumber: true, companyName: true, profilePicUrl: true, qualificationLevel: true, score: true },
          },
          assignedTo: {
            select: { id: true, name: true, avatarUrl: true },
          },
          messages: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              direction: true,
              content: true,
              createdAt: true,
              isRead: true,
              messageType: true,
              mediaUrl: true,
              metadata: true,
              externalId: true,
            },
          },
        },
      }),
      (prisma as any).agent.findMany({
        where: { isActive: true },
        select: { name: true, connectionIds: true },
      }),
    ])

    // Monta mapa connectionId → agentName para lookup rápido
    const agentByConnection = new Map<string, string>()
    for (const agent of activeAgents) {
      try {
        const ids: string[] = JSON.parse(agent.connectionIds || "[]")
        for (const id of ids) agentByConnection.set(id, agent.name)
      } catch { /* ignora */ }
    }

    // Lê agent_paused_until via raw SQL (campo novo adicionado após compile do Prisma client)
    const pauseRows = await prisma.$queryRaw<{ id: string; agent_paused_until: string | null }[]>`
      SELECT id, agent_paused_until FROM conversations
    `
    const pauseMap = new Map(pauseRows.map((r) => [r.id, r.agent_paused_until ?? null]))

    // Busca sentimento dominante por conversa: média ponderada dos últimos 5 registros
    // (evita que uma mensagem neutra curta sobrescreva sentimento estabelecido)
    const sentimentRows = await prisma.$queryRaw<{ conversation_id: string; sentiment_score: number | null; extracted_data: string | null }[]>`
      SELECT a.conversation_id, a.sentiment_score, a.extracted_data
      FROM ai_analyses a
      WHERE a.conversation_id IS NOT NULL
        AND a.rowid IN (
          SELECT rowid FROM ai_analyses b
          WHERE b.conversation_id = a.conversation_id
          ORDER BY b.created_at DESC
          LIMIT 5
        )
      ORDER BY a.conversation_id, a.created_at DESC
    `

    // Agrupa por conversa e calcula score médio ponderado (mais recente = peso maior)
    const convScores = new Map<string, number[]>()
    for (const r of sentimentRows) {
      if (!r.conversation_id) continue
      if (!convScores.has(r.conversation_id)) convScores.set(r.conversation_id, [])
      // Extrai score: prefere valor numérico real, fallback do label
      let score = r.sentiment_score !== null ? Number(r.sentiment_score) : null
      if (score === null && r.extracted_data) {
        try {
          const ed = JSON.parse(r.extracted_data)
          if (ed.label === "positivo") score = 50
          else if (ed.label === "negativo") score = -50
          else score = 0
        } catch { score = 0 }
      }
      if (score !== null) convScores.get(r.conversation_id)!.push(score)
    }

    const sentimentMap = new Map<string, "positivo" | "neutro" | "negativo" | null>()
    for (const [convId, scores] of convScores) {
      if (!scores.length) { sentimentMap.set(convId, null); continue }
      // Média ponderada: registro mais recente (índice 0) tem peso maior
      let weightedSum = 0, totalWeight = 0
      scores.forEach((s, i) => { const w = scores.length - i; weightedSum += s * w; totalWeight += w })
      const avg = weightedSum / totalWeight
      sentimentMap.set(convId, avg >= 5 ? "positivo" : avg <= -5 ? "negativo" : "neutro")
    }

    // Injeta agentName, agentPausedUntil e realtimeSentiment em cada conversa
    const enriched = conversations.map((conv: any) => {
      return {
        ...conv,
        agentName: conv.connectionId ? (agentByConnection.get(conv.connectionId) ?? null) : null,
        agentPausedUntil: pauseMap.get(conv.id) ?? null,
        realtimeSentiment: sentimentMap.get(conv.id) ?? null,
        realtimeUrgency: null, // urgência só disponível via SSE em tempo real
      }
    })

    return NextResponse.json({
      success: true,
      data: { conversations: enriched },
    })
  } catch (error) {
    console.error("Erro ao listar conversas:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } },
      { status: 500 }
    )
  }
}

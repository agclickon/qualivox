import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession, initSession, registerSessionHook } from "@/lib/baileys-session"
import { startMessageListener } from "@/lib/baileys-listener"

export const dynamic = "force-dynamic"

async function ensureWhatsAppSession() {
  try {
    // Initialize ALL connections that have session data, not just the default
    const connections = await prisma.whatsappConnection.findMany()
    for (const connection of connections) {
      // Register listener hook for all connections (idempotent)
      registerSessionHook(connection.id, (session) => {
        startMessageListener(session, connection.id)
      })
      // Only init if not already connected AND has saved session data
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
export async function GET() {
  try {
    await ensureWhatsAppSession()

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

    // Busca último sentimento registrado por conversa (realtime sentiment ao carregar)
    const sentimentRows = await prisma.$queryRaw<{ conversation_id: string; sentiment_score: number | null; extracted_data: string | null }[]>`
      SELECT a.conversation_id, a.sentiment_score, a.extracted_data
      FROM ai_analyses a
      INNER JOIN (
        SELECT conversation_id, MAX(created_at) AS max_created
        FROM ai_analyses
        WHERE conversation_id IS NOT NULL
        GROUP BY conversation_id
      ) latest ON a.conversation_id = latest.conversation_id AND a.created_at = latest.max_created
    `
    const sentimentMap = new Map(sentimentRows.map((r) => {
      // Prefere o label salvo pelo LLM; fallback para cálculo por score
      let label: "positivo" | "neutro" | "negativo" | null = null
      if (r.extracted_data) {
        try {
          const ed = JSON.parse(r.extracted_data)
          if (ed.label === "positivo" || ed.label === "negativo" || ed.label === "neutro") label = ed.label
        } catch { /* ignora */ }
      }
      if (!label) {
        const score = r.sentiment_score !== null ? Number(r.sentiment_score) : null
        if (score === null) label = null
        else if (score >= 20) label = "positivo"
        else if (score <= -20) label = "negativo"
        else label = "neutro"
      }
      return [r.conversation_id, label] as [string, typeof label]
    }))

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

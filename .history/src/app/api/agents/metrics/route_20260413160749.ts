import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"

export const dynamic = "force-dynamic"

const IS_POSTGRES = (process.env.DATABASE_URL || "").startsWith("postgresql")

// GET /api/agents/metrics?period=7d|30d|90d
export async function GET(req: NextRequest) {
  const prisma = await getPrismaFromRequest(req)
  const period = req.nextUrl.searchParams.get("period") ?? "30d"
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30
  // created_at nas tabelas interactions/messages é timestamp Unix em ms
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000
  // ai_analyses usa DATETIME (ISO) — manter string ISO para essa tabela
  const sinceIso = new Date(sinceMs).toISOString()

  try {
    // 1. Todos os agentes ativos
    const agents = await prisma.$queryRaw<{ id: string; name: string; mode: string; connection_ids: string }[]>`
      SELECT id, name, mode, connection_ids FROM agents WHERE is_active = true
    `

    // 2. Mensagens respondidas por agente
    const actionRows = IS_POSTGRES
      ? await prisma.$queryRawUnsafe<{ agent_id: string; cnt: string; escalated: string }[]>(
          `SELECT
            metadata::jsonb->>'agentId' as agent_id,
            COUNT(*) as cnt,
            SUM(CASE WHEN (metadata::jsonb->>'escalated')::int = 1 THEN 1 ELSE 0 END) as escalated
          FROM interactions
          WHERE type = 'agent_action'
            AND created_at >= $1
            AND metadata::jsonb->>'agentId' IS NOT NULL
          GROUP BY metadata::jsonb->>'agentId'`,
          sinceMs
        )
      : await prisma.$queryRawUnsafe<{ agent_id: string; cnt: string; escalated: string }[]>(`
          SELECT
            json_extract(metadata, '$.agentId') as agent_id,
            COUNT(*) as cnt,
            SUM(CASE WHEN json_extract(metadata, '$.escalated') = 1 THEN 1 ELSE 0 END) as escalated
          FROM interactions
          WHERE type = 'agent_action'
            AND created_at >= ${sinceMs}
            AND json_extract(metadata, '$.agentId') IS NOT NULL
          GROUP BY json_extract(metadata, '$.agentId')
        `)

    // 3. Sentimento final por conversa no período
    const sentimentRows = await prisma.$queryRaw<{ conversation_id: string; sentiment_score: number; extracted_data: string | null; connection_id: string | null }[]>`
      SELECT a.conversation_id, a.sentiment_score, a.extracted_data, c.connection_id
      FROM ai_analyses a
      LEFT JOIN conversations c ON c.id = a.conversation_id
      WHERE a.conversation_id IS NOT NULL
        AND a.created_at >= ${sinceIso}
        AND a.id IN (
          SELECT MAX(b.id) FROM ai_analyses b
          WHERE b.conversation_id IS NOT NULL AND b.created_at >= ${sinceIso}
          GROUP BY b.conversation_id
        )
    `

    // 4. Conversas resolvidas por conexão
    const resolvedRows = await prisma.$queryRaw<{ connection_id: string | null; cnt: number }[]>`
      SELECT connection_id, COUNT(*) as cnt
      FROM conversations
      WHERE status = 'resolved' AND updated_at >= ${sinceIso}
      GROUP BY connection_id
    `

    // 5. Tendência diária de mensagens por agente
    const trendRows = IS_POSTGRES
      ? await prisma.$queryRawUnsafe<{ day: string; agent_id: string; cnt: string }[]>(
          `SELECT
            TO_CHAR(TO_TIMESTAMP(created_at / 1000), 'YYYY-MM-DD') as day,
            metadata::jsonb->>'agentId' as agent_id,
            COUNT(*) as cnt
          FROM interactions
          WHERE type = 'agent_action'
            AND created_at >= $1
            AND metadata::jsonb->>'agentId' IS NOT NULL
          GROUP BY day, metadata::jsonb->>'agentId'
          ORDER BY day ASC`,
          sinceMs
        )
      : await prisma.$queryRawUnsafe<{ day: string; agent_id: string; cnt: string }[]>(`
          SELECT
            date(datetime(created_at / 1000, 'unixepoch')) as day,
            json_extract(metadata, '$.agentId') as agent_id,
            COUNT(*) as cnt
          FROM interactions
          WHERE type = 'agent_action'
            AND created_at >= ${sinceMs}
            AND json_extract(metadata, '$.agentId') IS NOT NULL
          GROUP BY day, json_extract(metadata, '$.agentId')
          ORDER BY day ASC
        `)

    // 6. Tempo médio de resposta — diff entre incoming e próxima outgoing por conversa
    const responseTimes = await prisma.$queryRawUnsafe<{ conversation_id: string; diff_seconds: string }[]>(
      `SELECT
        m1.conversation_id,
        AVG(CAST((m2.created_at - m1.created_at) AS DOUBLE PRECISION) / 1000.0) as diff_seconds
      FROM messages m1
      JOIN messages m2 ON m2.conversation_id = m1.conversation_id
        AND m2.direction = 'outgoing'
        AND m2.created_at > m1.created_at
      WHERE m1.direction = 'incoming'
        AND m1.created_at >= $1
      GROUP BY m1.conversation_id`,
      sinceMs
    )

    // 7. Conversas por conexão (para mapear agente → tempo médio)
    const convConnectionRows = await prisma.$queryRaw<{ id: string; connection_id: string | null }[]>`
      SELECT id, connection_id FROM conversations WHERE created_at >= ${sinceIso}
    `

    // ── Mapa connectionId → agentId ────────────────────────────────────────────
    const connectionToAgent = new Map<string, string>()
    for (const a of agents) {
      try {
        const ids: string[] = JSON.parse(a.connection_ids || "[]")
        for (const id of ids) connectionToAgent.set(id, a.id)
      } catch { /* ignore */ }
    }

    // ── Sentimentos por agente ─────────────────────────────────────────────────
    const sentimentByAgent = new Map<string, { pos: number; neu: number; neg: number }>()
    for (const row of sentimentRows) {
      const agentId = row.connection_id ? connectionToAgent.get(row.connection_id) : null
      if (!agentId) continue
      // Tenta ler label do extracted_data; se não existir, calcula pelo score
      let label = "neutro"
      if (row.extracted_data) {
        try {
          const ed = JSON.parse(row.extracted_data)
          if (ed.label === "positivo" || ed.label === "negativo" || ed.label === "neutro") {
            label = ed.label
          } else {
            // extracted_data existe mas não tem label — usa score
            const s = Number(row.sentiment_score)
            if (s >= 20) label = "positivo"
            else if (s <= -20) label = "negativo"
          }
        } catch { /* ignore */ }
      } else {
        const s = Number(row.sentiment_score)
        if (s >= 20) label = "positivo"
        else if (s <= -20) label = "negativo"
      }
      const cur = sentimentByAgent.get(agentId) ?? { pos: 0, neu: 0, neg: 0 }
      if (label === "positivo") cur.pos++
      else if (label === "negativo") cur.neg++
      else cur.neu++
      sentimentByAgent.set(agentId, cur)
    }

    // ── Resolvidos por agente ──────────────────────────────────────────────────
    const resolvedByAgent = new Map<string, number>()
    for (const row of resolvedRows) {
      const agentId = row.connection_id ? connectionToAgent.get(row.connection_id) : null
      if (!agentId) continue
      resolvedByAgent.set(agentId, (resolvedByAgent.get(agentId) ?? 0) + Number(row.cnt))
    }

    // ── Trend por agente ───────────────────────────────────────────────────────
    const trendByAgent = new Map<string, { day: string; cnt: number }[]>()
    for (const row of trendRows) {
      if (!row.agent_id) continue
      const arr = trendByAgent.get(row.agent_id) ?? []
      arr.push({ day: row.day, cnt: Number(row.cnt) })
      trendByAgent.set(row.agent_id, arr)
    }

    // ── Tempo médio por agente ─────────────────────────────────────────────────
    const avgResponseByConv = new Map(responseTimes.map((r) => [r.conversation_id, Number(r.diff_seconds)]))
    const avgRespByAgent = new Map<string, number[]>()
    for (const conv of convConnectionRows) {
      const agentId = conv.connection_id ? connectionToAgent.get(conv.connection_id) : null
      if (!agentId) continue
      const t = avgResponseByConv.get(conv.id)
      if (t !== undefined && t > 0 && t < 86400) { // ignora > 24h (agente estava offline)
        const arr = avgRespByAgent.get(agentId) ?? []
        arr.push(t)
        avgRespByAgent.set(agentId, arr)
      }
    }

    // ── Monta métricas por agente ──────────────────────────────────────────────
    const actionMap = new Map(actionRows.map((r) => [r.agent_id, r]))

    const agentMetrics = agents.map((agent) => {
      const actions = actionMap.get(agent.id)
      const messagesReplied = Number(actions?.cnt ?? 0)
      const escalated = Number(actions?.escalated ?? 0)
      const escalationRate = messagesReplied > 0 ? Math.round((escalated / messagesReplied) * 100) : 0
      const resolved = resolvedByAgent.get(agent.id) ?? 0
      const sentiment = sentimentByAgent.get(agent.id) ?? { pos: 0, neu: 0, neg: 0 }
      const totalSentiment = sentiment.pos + sentiment.neu + sentiment.neg
      const satisfactionScore = totalSentiment > 0
        ? Math.round(((sentiment.pos - sentiment.neg) / totalSentiment) * 100)
        : null
      const respTimes = avgRespByAgent.get(agent.id) ?? []
      const avgResponseSeconds = respTimes.length > 0
        ? Math.round(respTimes.reduce((a, b) => a + b, 0) / respTimes.length)
        : null
      const trend = trendByAgent.get(agent.id) ?? []
      return { id: agent.id, name: agent.name, mode: agent.mode, messagesReplied, escalated, escalationRate, resolved, sentiment, satisfactionScore, avgResponseSeconds, trend }
    })

    // ── Totais consolidados (todos os agentes) ─────────────────────────────────
    const totalMessages = agentMetrics.reduce((s, a) => s + a.messagesReplied, 0)
    const totalEscalated = agentMetrics.reduce((s, a) => s + a.escalated, 0)
    const totalResolved = agentMetrics.reduce((s, a) => s + a.resolved, 0)
    const totalSentiment = agentMetrics.reduce(
      (s, a) => ({ pos: s.pos + a.sentiment.pos, neu: s.neu + a.sentiment.neu, neg: s.neg + a.sentiment.neg }),
      { pos: 0, neu: 0, neg: 0 }
    )
    const totalSentCount = totalSentiment.pos + totalSentiment.neu + totalSentiment.neg
    const globalSatisfaction = totalSentCount > 0
      ? Math.round(((totalSentiment.pos - totalSentiment.neg) / totalSentCount) * 100)
      : null
    const allRespTimes = Array.from(avgRespByAgent.values()).flat()
    const globalAvgResponse = allRespTimes.length > 0
      ? Math.round(allRespTimes.reduce((a, b) => a + b, 0) / allRespTimes.length)
      : null
    const globalEscalationRate = totalMessages > 0 ? Math.round((totalEscalated / totalMessages) * 100) : 0

    // Tendência global diária
    const globalTrendMap = new Map<string, number>()
    for (const row of trendRows) {
      if (!row.day) continue
      globalTrendMap.set(row.day, (globalTrendMap.get(row.day) ?? 0) + Number(row.cnt))
    }
    const globalTrend = Array.from(globalTrendMap.entries())
      .map(([day, cnt]) => ({ day, cnt }))
      .sort((a, b) => a.day.localeCompare(b.day))

    return NextResponse.json({
      success: true,
      data: {
        period,
        all: {
          messagesReplied: totalMessages,
          escalated: totalEscalated,
          escalationRate: globalEscalationRate,
          resolved: totalResolved,
          sentiment: totalSentiment,
          satisfactionScore: globalSatisfaction,
          avgResponseSeconds: globalAvgResponse,
          trend: globalTrend,
        },
        agents: agentMetrics,
      },
    })
  } catch (error) {
    console.error("[AgentMetrics] Erro:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}

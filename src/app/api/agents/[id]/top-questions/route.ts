import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// Palavras irrelevantes para filtragem
const STOP_WORDS = new Set([
  "a","o","e","de","do","da","em","um","uma","para","com","por","que","se","no","na",
  "os","as","dos","das","nos","nas","ao","à","ou","mas","eu","você","vc","me","te","ok",
  "sim","não","bom","dia","tarde","noite","oi","olá","ola","tudo","bem","obrigado","obrigada",
])

function normalize(text: string): string {
  return text.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function extractKeywords(text: string): string[] {
  return normalize(text).split(" ").filter((w) => w.length > 2 && !STOP_WORDS.has(w))
}

function buildTopicKey(text: string): string {
  const kw = extractKeywords(text)
  // Chave = primeiras 3 palavras-chave ordenadas (para agrupar variações)
  return kw.slice(0, 3).sort().join("|")
}

// GET /api/agents/[id]/top-questions?period=7d|30d|90d&limit=10
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const period = req.nextUrl.searchParams.get("period") ?? "30d"
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "10", 10)
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000

  try {
    // Busca conexões do agente
    const agentRow = await prisma.$queryRaw<{ connection_ids: string }[]>`
      SELECT connection_ids FROM agents WHERE id = ${params.id}
    `
    if (!agentRow.length) return NextResponse.json({ success: false, error: "Agente não encontrado" }, { status: 404 })

    let connectionIds: string[] = []
    try { connectionIds = JSON.parse(agentRow[0].connection_ids || "[]") } catch { /* ignore */ }
    if (!connectionIds.length) return NextResponse.json({ success: true, data: { questions: [] } })

    // Busca conversas atendidas pelo agente (via connection_id)
    const convRows = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM conversations WHERE connection_id IN (${connectionIds.map(() => "?").join(",")})`,
      ...connectionIds
    )
    const convIds = convRows.map((c) => c.id)
    if (!convIds.length) return NextResponse.json({ success: true, data: { questions: [] } })

    // Busca mensagens incoming de texto nessas conversas no período
    const messages = await prisma.$queryRawUnsafe<{ content: string; metadata: string | null; message_type: string }[]>(
      `SELECT content, metadata, message_type FROM messages
       WHERE direction = 'incoming'
         AND created_at >= ${sinceMs}
         AND conversation_id IN (${convIds.map(() => "?").join(",")})
         AND (message_type = 'text' OR (message_type = 'audio' AND metadata IS NOT NULL))
       ORDER BY created_at DESC
       LIMIT 500`,
      ...convIds
    )

    // Agrupa por tópico
    const topicMap = new Map<string, { label: string; count: number; examples: string[] }>()

    for (const msg of messages) {
      let text = msg.content || ""

      // Para áudio: usa transcrição do metadata
      if (msg.message_type === "audio" && msg.metadata) {
        try {
          const meta = JSON.parse(msg.metadata)
          if (meta.transcript) text = meta.transcript
          else continue // pula áudio sem transcrição
        } catch { continue }
      }

      if (!text || text.length < 5) continue
      // Ignora mensagens muito curtas ou que são só emojis/números
      if (!/[a-zA-ZÀ-ú]{3,}/.test(text)) continue

      const key = buildTopicKey(text)
      if (!key) continue

      const existing = topicMap.get(key)
      if (existing) {
        existing.count++
        if (existing.examples.length < 2 && !existing.examples.includes(text.slice(0, 80))) {
          existing.examples.push(text.slice(0, 80))
        }
      } else {
        topicMap.set(key, { label: text.slice(0, 80), count: 1, examples: [text.slice(0, 80)] })
      }
    }

    // Ordena por frequência e pega top N
    const questions = Array.from(topicMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map((q, i) => ({ rank: i + 1, label: q.label, count: q.count }))

    return NextResponse.json({ success: true, data: { questions } })
  } catch (error) {
    console.error("[TopQuestions] Erro:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}

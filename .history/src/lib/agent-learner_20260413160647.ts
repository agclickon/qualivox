/**
 * Módulo de aprendizado por conversa (RAG Dinâmico — Fase 8.6)
 * Indexa conversas como conhecimento dos agentes IA.
 */

import { prisma } from "@/lib/prisma"
import { getPrismaForConnection } from "@/lib/prisma-tenant"
import { chunkText } from "@/lib/text-extractor"
import { generateEmbedding } from "@/lib/embeddings"
import { randomUUID } from "crypto"

// ── chunkAndEmbed ─────────────────────────────────────────────────────────────

/**
 * Divide o conteúdo em chunks, gera embeddings e salva AgentKnowledgeChunk via raw SQL.
 * Retorna o total de chunks criados.
 */
export async function chunkAndEmbed(
  agentId: string,
  knowledgeId: string,
  content: string,
  db: typeof prisma = prisma
): Promise<number> {
  const chunks = chunkText(content)
  if (chunks.length === 0) return 0

  // Apaga chunks anteriores (re-indexação)
  await db.$executeRawUnsafe(
    `DELETE FROM agent_knowledge_chunks WHERE knowledge_id = ?`,
    knowledgeId
  )

  let created = 0
  for (let i = 0; i < chunks.length; i++) {
    const text = chunks[i]
    const embedding = await generateEmbedding(text)
    const embeddingJson = JSON.stringify(embedding)
    const chunkId = randomUUID()

    await db.$executeRawUnsafe(
      `INSERT INTO agent_knowledge_chunks (id, knowledge_id, agent_id, chunk_index, text, embedding, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      chunkId,
      knowledgeId,
      agentId,
      i,
      text,
      embeddingJson
    )
    created++
  }

  // Atualiza chunkCount no knowledge record via raw SQL (campos novos)
  await db.$executeRawUnsafe(
    `UPDATE agent_knowledge SET chunk_count = ?, updated_at = datetime('now') WHERE id = ?`,
    created,
    knowledgeId
  )

  return created
}

// ── indexConversation ─────────────────────────────────────────────────────────

/**
 * Indexa uma conversa como conhecimento do agente.
 * Se autoApprove=true: gera embeddings imediatamente.
 * Se autoApprove=false: salva com reviewStatus="pending" para revisão manual.
 */
export async function indexConversation(
  agentId: string,
  conversationId: string,
  autoApprove: boolean,
  db: typeof prisma = prisma
): Promise<{ knowledgeId: string; chunkCount: number } | null> {
  try {
    // Busca mensagens da conversa
    const messages = await db.$queryRaw<
      Array<{ direction: string; content: string; created_at: string }>
    >`
      SELECT m.direction, m.content, m.created_at
      FROM messages m
      WHERE m.conversation_id = ${conversationId}
        AND (m.message_type = 'text' OR m.message_type IS NULL)
        AND m.content IS NOT NULL
        AND m.content != ''
      ORDER BY m.created_at ASC
    `

    if (!messages || messages.length === 0) return null

    // Busca nome do lead para o título
    const convRows = await db.$queryRaw<
      Array<{ lead_name: string | null; created_at: string }>
    >`
      SELECT l.name as lead_name, c.created_at
      FROM conversations c
      LEFT JOIN leads l ON l.id = c.lead_id
      WHERE c.id = ${conversationId}
      LIMIT 1
    `

    const leadName = convRows[0]?.lead_name || "Lead"
    const convDate = convRows[0]?.created_at
      ? new Date(convRows[0].created_at).toLocaleDateString("pt-BR")
      : new Date().toLocaleDateString("pt-BR")

    // Formata como diálogo
    const dialogLines = messages.map((m) => {
      const role = m.direction === "outgoing" ? "Agente" : "Lead"
      return `${role}: ${m.content}`
    })
    const content = dialogLines.join("\n")

    const fileName = `Conversa ${leadName} ${convDate}`
    const fileSize = Buffer.byteLength(content, "utf8")
    const knowledgeId = randomUUID()
    const reviewStatus = autoApprove ? "approved" : "pending"
    const status = autoApprove ? "indexed" : "pending"

    // Cria registro em AgentKnowledge via raw SQL
    await db.$executeRawUnsafe(
      `INSERT INTO agent_knowledge
         (id, agent_id, file_name, file_type, file_size, content, status, chunk_count,
          source_type, conv_source, review_status, created_at, updated_at)
       VALUES (?, ?, ?, 'conversation', ?, ?, ?, 0, 'conversation', ?, ?, datetime('now'), datetime('now'))`,
      knowledgeId,
      agentId,
      fileName,
      fileSize,
      content,
      status,
      conversationId,
      reviewStatus
    )

    let chunkCount = 0
    if (autoApprove) {
      chunkCount = await chunkAndEmbed(agentId, knowledgeId, content, db)
      // Atualiza status para indexed com chunk count final
      await db.$executeRawUnsafe(
        `UPDATE agent_knowledge SET status = 'indexed', chunk_count = ?, updated_at = datetime('now') WHERE id = ?`,
        chunkCount,
        knowledgeId
      )
    }

    return { knowledgeId, chunkCount }
  } catch (err) {
    console.error("[AgentLearner] Erro ao indexar conversa:", err)
    return null
  }
}

// ── triggerLearningForConversation ────────────────────────────────────────────

/**
 * Dispara indexação para todos os agentes ativos vinculados à conexão da conversa.
 * Fire-and-forget: nunca lança erro.
 */
export async function triggerLearningForConversation(
  conversationId: string
): Promise<void> {
  try {
    // Resolve db do tenant pelo connectionId da conversa
    // Primeiro busca no banco global para obter o connectionId
    const convRowsGlobal = await prisma.$queryRaw<Array<{ connection_id: string | null }>>`
      SELECT connection_id FROM conversations WHERE id = ${conversationId} LIMIT 1
    `
    let connectionId = convRowsGlobal[0]?.connection_id

    // Obtém o db do tenant correto
    const { getPrismaForConnection } = await import("@/lib/prisma-tenant")
    const db = connectionId ? await getPrismaForConnection(connectionId) : prisma

    // Busca connectionId no banco do tenant (pode ser diferente)
    const convRows = await db.$queryRaw<Array<{ connection_id: string | null }>>`
      SELECT connection_id FROM conversations WHERE id = ${conversationId} LIMIT 1
    `
    connectionId = convRows[0]?.connection_id
    if (!connectionId) return

    // Busca agentes ativos com learningPolicy != "disabled" via raw SQL
    const agents = await db.$queryRaw<
      Array<{ id: string; connection_ids: string; learning_policy: string }>
    >`
      SELECT id, connection_ids, learning_policy
      FROM agents
      WHERE is_active = true
        AND learning_policy != 'disabled'
    `

    for (const agent of agents) {
      // Verifica se este agente está vinculado à conexão
      let connIds: string[] = []
      try {
        connIds = JSON.parse(agent.connection_ids || "[]")
      } catch {
        continue
      }
      if (!connIds.includes(connectionId)) continue

      const autoApprove = agent.learning_policy === "auto"
      // Fire-and-forget por agente
      indexConversation(agent.id, conversationId, autoApprove, db).catch((err) => {
        console.error(`[AgentLearner] Erro no agente ${agent.id}:`, err)
      })
    }
  } catch (err) {
    console.error("[AgentLearner] triggerLearningForConversation erro:", err)
  }
}

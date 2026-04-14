import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"
import { chunkAndEmbed } from "@/lib/agent-learner"

// PATCH /api/agents/[id]/knowledge/[knowledgeId]/review
// Aprova ou rejeita um item de conhecimento pendente
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; knowledgeId: string } }
) {
  const prisma = await getPrismaFromRequest(req)
  const userRole = req.headers.get("x-user-role")
  if (userRole !== "super_admin" && userRole !== "admin") {
    return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { action } = body as { action: "approve" | "reject" }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ success: false, error: "action deve ser 'approve' ou 'reject'" }, { status: 400 })
    }

    // Busca o registro via raw SQL (campos novos)
    const rows = await prisma.$queryRaw<
      Array<{ id: string; agent_id: string; content: string; review_status: string }>
    >`
      SELECT id, agent_id, content, review_status
      FROM agent_knowledge
      WHERE id = ${params.knowledgeId} AND agent_id = ${params.id}
      LIMIT 1
    `

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, error: "Registro não encontrado" }, { status: 404 })
    }

    const record = rows[0]

    if (action === "approve") {
      // Atualiza status e review_status
      await prisma.$executeRawUnsafe(
        `UPDATE agent_knowledge SET review_status = 'approved', status = 'indexed', updated_at = datetime('now') WHERE id = ?`,
        record.id
      )
      // Gera embeddings
      await chunkAndEmbed(record.agent_id, record.id, record.content)
    } else {
      // Rejeita
      await prisma.$executeRawUnsafe(
        `UPDATE agent_knowledge SET review_status = 'rejected', status = 'error', updated_at = datetime('now') WHERE id = ?`,
        record.id
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[KnowledgeReview] PATCH error:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}

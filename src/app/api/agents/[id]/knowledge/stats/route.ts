import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/agents/[id]/knowledge/stats
// Retorna estatísticas de conhecimento do agente
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const agentId = params.id

    // totalFiles: sourceType = "file"
    const filesRows = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count FROM agent_knowledge
      WHERE agent_id = ${agentId} AND source_type = 'file'
    `
    const totalFiles = Number(filesRows[0]?.count ?? 0)

    // totalChunks: total de chunks do agente
    const chunksRows = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count FROM agent_knowledge_chunks
      WHERE agent_id = ${agentId}
    `
    const totalChunks = Number(chunksRows[0]?.count ?? 0)

    // totalConversations: sourceType = "conversation" AND reviewStatus = "approved"
    const convsRows = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count FROM agent_knowledge
      WHERE agent_id = ${agentId}
        AND source_type = 'conversation'
        AND review_status = 'approved'
    `
    const totalConversations = Number(convsRows[0]?.count ?? 0)

    // pendingReview: reviewStatus = "pending"
    const pendingRows = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count FROM agent_knowledge
      WHERE agent_id = ${agentId} AND review_status = 'pending'
    `
    const pendingReview = Number(pendingRows[0]?.count ?? 0)

    return NextResponse.json({
      success: true,
      data: { totalFiles, totalChunks, totalConversations, pendingReview },
    })
  } catch (error) {
    console.error("[KnowledgeStats] GET error:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}

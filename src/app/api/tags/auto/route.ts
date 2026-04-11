import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * POST /api/tags/auto
 * Chamado pelo agente de IA para aplicar tags automaticamente a um lead.
 *
 * Body: {
 *   leadId: string,
 *   tagIds: string[],       // tags a aplicar
 *   removeOthers?: boolean, // se true, remove tags de fonte "ai" que não estejam em tagIds
 *   appliedBy?: string,     // id do agente/user que aplicou
 * }
 *
 * Retorna: { applied: LeadTag[], removed: number }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      leadId?: string
      tagIds?: string[]
      removeOthers?: boolean
      appliedBy?: string
    }

    if (!body.leadId) {
      return NextResponse.json({ success: false, error: "leadId obrigatório" }, { status: 400 })
    }
    if (!Array.isArray(body.tagIds) || body.tagIds.length === 0) {
      return NextResponse.json({ success: false, error: "tagIds obrigatório" }, { status: 400 })
    }

    // Verificar que o lead existe
    const lead = await prisma.lead.findUnique({ where: { id: body.leadId } })
    if (!lead) return NextResponse.json({ success: false, error: "Lead não encontrado" }, { status: 404 })

    // Verificar tags ativas
    const tags = await prisma.tag.findMany({
      where: { id: { in: body.tagIds }, isActive: true },
    })
    if (tags.length === 0) {
      return NextResponse.json({ success: false, error: "Nenhuma tag ativa encontrada" }, { status: 400 })
    }

    // Remover tags de IA que não estão na nova lista (se solicitado)
    let removed = 0
    if (body.removeOthers) {
      const del = await prisma.leadTag.deleteMany({
        where: {
          leadId: body.leadId,
          source: "ai",
          tagId: { notIn: body.tagIds },
        },
      })
      removed = del.count
    }

    // Upsert todas as tags solicitadas
    const applied = await Promise.all(
      tags.map((tag) =>
        prisma.leadTag.upsert({
          where: { leadId_tagId: { leadId: body.leadId!, tagId: tag.id } },
          create: {
            leadId: body.leadId!,
            tagId: tag.id,
            source: "ai",
            appliedBy: body.appliedBy ?? null,
          },
          update: {
            source: "ai",
            appliedBy: body.appliedBy ?? null,
            appliedAt: new Date(),
          },
          include: { tag: true },
        })
      )
    )

    return NextResponse.json({ success: true, data: { applied, removed } })
  } catch (e: unknown) {
    console.error("[tags/auto]", e)
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Erro interno" }, { status: 500 })
  }
}

/**
 * GET /api/tags/auto?leadId=xxx
 * Retorna sugestão de tags para um lead baseado nas mensagens recentes.
 * Útil para o frontend mostrar sugestões com badge "IA".
 */
export async function GET(req: NextRequest) {
  const leadId = req.nextUrl.searchParams.get("leadId")
  if (!leadId) return NextResponse.json({ success: false, error: "leadId obrigatório" }, { status: 400 })

  // Buscar tags aplicadas por IA no lead
  const aiTags = await prisma.leadTag.findMany({
    where: { leadId, source: "ai" },
    include: { tag: true },
    orderBy: { appliedAt: "desc" },
  })

  return NextResponse.json({ success: true, data: aiTags })
}

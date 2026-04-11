import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/leads/[id]/notes
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const notes = await prisma.interaction.findMany({
      where: { leadId: params.id, type: "note" },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    })
    return NextResponse.json({ success: true, data: { notes } })
  } catch (error) {
    console.error("[Notes] GET error:", error)
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } }, { status: 500 })
  }
}

// POST /api/leads/[id]/notes
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}))
    const { content, userId } = body

    if (!content?.trim()) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Conteúdo obrigatório" } }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({ where: { id: params.id }, select: { id: true } })
    if (!lead) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Lead não encontrado" } }, { status: 404 })
    }

    const note = await prisma.interaction.create({
      data: {
        leadId: params.id,
        userId: userId ?? null,
        type: "note",
        content: content.trim(),
        channel: "sistema",
      },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    })

    return NextResponse.json({ success: true, data: { note } }, { status: 201 })
  } catch (error) {
    console.error("[Notes] POST error:", error)
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } }, { status: 500 })
  }
}
